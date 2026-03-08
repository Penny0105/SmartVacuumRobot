const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const http = require('http');
const { 
  startSession, endSession, getSessions, getSessionStats, 
  deleteSession, clearAllSessions, closeDB 
} = require('./database');

// Parse JSON body
app.use(express.json());

// ===== Session tracking =====
// Tốc độ robot ước tính (m/s) - dựa trên analogWrite(200/255) ≈ 78% duty cycle
const ROBOT_SPEED = 0.15; // 0.15 m/s khi di chuyển thẳng
const ROBOT_TURN_SPEED = 0.08; // 0.08 m/s khi rẽ (quay tại chỗ, ít dịch chuyển hơn)

let activeSessionId = null; // ID phiên đang hoạt động
let sessionStartTime = null; // Thời điểm bắt đầu phiên
let movingStartTime = null; // Thời điểm bắt đầu di chuyển (tính distance)
let sessionDistance = 0; // Quãng đường tích lũy trong phiên (mét)
let currentMovement = null; // Lệnh di chuyển hiện tại ('F','B','L','R' hoặc null)
let sessionMode = null; // 'auto' hoặc 'manual'

// Tự động tạo folder public/ nếu chưa có
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Serve static files từ frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// Biến lưu lệnh hiện tại để ESP32 polling
let currentCommand = 'S'; // Mặc định là Stop
let esp32StreamUrl = null; // URL stream MJPEG từ ESP32-CAM

// ===== STUCK DETECTION STATE =====
let stuckStatus = {
  isStuck: false,
  type: null,       // 1 = kẹt không gian chật, 2 = mất tín hiệu cảm biến
  timestamp: null,
  acknowledged: false
};

// Giao diện web - serve index.html từ frontend folder
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ESP32 đăng ký IP khi kết nối WiFi (ESP32 gọi endpoint này khi boot)
app.get('/register_esp32', (req, res) => {
  const ip = req.query.ip;
  if (ip) {
    esp32StreamUrl = `http://${ip}:81/stream`;
    console.log('✅ ESP32 registered! Stream URL:', esp32StreamUrl);
    res.send('OK');
  } else {
    res.status(400).send('Missing IP');
  }
});

// Frontend lấy URL stream MJPEG từ ESP32
app.get('/esp32_stream_url', (req, res) => {
  res.json({ url: esp32StreamUrl, connected: esp32StreamUrl !== null });
});

// Endpoint gửi lệnh đến ESP32 (lưu vào biến để ESP32 polling)
app.get('/send_command', (req, res) => {
  const cmd = req.query.cmd;
  
  // Map lệnh từ web UI sang lệnh Arduino
  const commandMap = {
    'go': 'F',
    'back': 'B',
    'left': 'L',
    'right': 'R',
    'stop': 'S',
    'auto': 'A',
    'manual': 'M'
  };
  
  currentCommand = commandMap[cmd] || 'S';
  console.log('Command received from web:', cmd, '-> Mapped to:', currentCommand);

  // ===== Session + Distance tracking =====
  if (cmd === 'auto') {
    // Bắt đầu phiên tự động
    finishCurrentSession(); // Kết thúc phiên cũ nếu có
    sessionMode = 'auto';
    activeSessionId = startSession('auto');
    sessionStartTime = Date.now();
    sessionDistance = 0;
    movingStartTime = Date.now(); // Auto mode = luôn di chuyển
    currentMovement = 'F';
    console.log('📋 Bắt đầu phiên TỰ ĐỘNG #' + activeSessionId);
  } else if (cmd === 'manual') {
    // Kết thúc phiên tự động, bắt đầu phiên manual (chờ di chuyển)
    finishCurrentSession();
    sessionMode = 'manual';
    currentMovement = null;
    movingStartTime = null;
  } else if (['go', 'back', 'left', 'right'].includes(cmd)) {
    // Bắt đầu di chuyển
    if (sessionMode !== 'auto') {
      // Trong manual mode: bắt đầu phiên mới nếu chưa có
      if (!activeSessionId) {
        activeSessionId = startSession('manual');
        sessionStartTime = Date.now();
        sessionDistance = 0;
        console.log('📋 Bắt đầu phiên THỦ CÔNG #' + activeSessionId);
      }
      // Tích lũy distance từ lệnh trước (nếu đang di chuyển)
      accumulateDistance();
      // Bắt đầu đo lệnh mới
      currentMovement = currentCommand;
      movingStartTime = Date.now();
    }
  } else if (cmd === 'stop') {
    // Dừng di chuyển - tích lũy distance
    accumulateDistance();
    currentMovement = null;
    movingStartTime = null;
    
    // Trong manual mode: kết thúc phiên khi dừng
    if (sessionMode === 'manual' && activeSessionId) {
      finishCurrentSession();
    }
  }

  res.send('OK');
});

// Tích lũy quãng đường từ lần di chuyển gần nhất
function accumulateDistance() {
  if (movingStartTime && currentMovement) {
    const elapsed = (Date.now() - movingStartTime) / 1000; // giây
    const speed = (currentMovement === 'L' || currentMovement === 'R') 
                  ? ROBOT_TURN_SPEED : ROBOT_SPEED;
    sessionDistance += speed * elapsed;
  }
}

// Kết thúc phiên hoạt động hiện tại
function finishCurrentSession() {
  if (activeSessionId && sessionStartTime) {
    accumulateDistance(); // Tích lũy lần cuối
    const duration = Math.round((Date.now() - sessionStartTime) / 1000); // giây
    const distance = Math.round(sessionDistance * 100) / 100; // làm tròn 2 chữ số
    endSession(activeSessionId, duration, distance);
    console.log(`📋 Kết thúc phiên #${activeSessionId}: ${duration}s, ${distance}m`);
  }
  activeSessionId = null;
  sessionStartTime = null;
  movingStartTime = null;
  sessionDistance = 0;
  currentMovement = null;
}

// API: Lấy thông tin phiên đang hoạt động (frontend hiển thị real-time)
app.get('/api/active_session', (req, res) => {
  if (activeSessionId && sessionStartTime) {
    // Tính distance tạm thời (không tích lũy vĩnh viễn)
    let tempDistance = sessionDistance;
    if (movingStartTime && currentMovement) {
      const elapsed = (Date.now() - movingStartTime) / 1000;
      const speed = (currentMovement === 'L' || currentMovement === 'R') 
                    ? ROBOT_TURN_SPEED : ROBOT_SPEED;
      tempDistance += speed * elapsed;
    }
    const duration = Math.round((Date.now() - sessionStartTime) / 1000);
    res.json({
      active: true,
      id: activeSessionId,
      mode: sessionMode,
      duration,
      distance: Math.round(tempDistance * 100) / 100
    });
  } else {
    res.json({ active: false });
  }
});

// Endpoint để ESP32 polling lệnh
// Lệnh mode (A/M) chỉ gửi 1 lần rồi reset về 'S'
// Lệnh di chuyển (F/B/L/R/S) giữ nguyên cho đến khi user thay đổi
app.get('/get_command', (req, res) => {
  // Chỉ log khi lệnh khác 'S' (tránh spam log)
  if (currentCommand !== 'S') console.log('📤 ESP32 nhận lệnh:', currentCommand);
  res.send(currentCommand);
  // Lệnh chuyển mode chỉ cần gửi 1 lần - reset để không lặp lại
  if (currentCommand === 'A' || currentCommand === 'M') {
    currentCommand = 'S';
  }
});

// Camera stream - proxy MJPEG stream từ ESP32 qua server
// Chỉ cho phép 1 kết nối proxy tại một thời điểm (ESP32 chỉ serve 1 stream)
let activeCameraProxyReq = null;

app.get('/camera_stream', (req, res) => {
  if (!esp32StreamUrl) {
    return res.status(204).send(); // Chưa có ESP32 kết nối
  }

  // Hủy kết nối proxy cũ để ESP32 có thể nhận kết nối mới
  if (activeCameraProxyReq) {
    activeCameraProxyReq.destroy();
    activeCameraProxyReq = null;
    console.log('🔄 Đóng kết nối camera proxy cũ');
  }

  // Tạo proxy request mới tới ESP32 MJPEG stream
  const proxyReq = http.get(esp32StreamUrl, (streamRes) => {
    // Forward headers từ ESP32 sang browser
    res.setHeader('Content-Type', streamRes.headers['content-type'] || 'multipart/x-mixed-replace;boundary=123456789000000000000987654321');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Pipe dữ liệu MJPEG từ ESP32 → Server → Browser
    streamRes.pipe(res);

    // Cleanup khi browser ngắt kết nối
    req.on('close', () => {
      streamRes.destroy();
      proxyReq.destroy();
      if (activeCameraProxyReq === proxyReq) {
        activeCameraProxyReq = null;
        console.log('📷 Browser ngắt camera stream, đã cleanup proxy');
      }
    });
  });

  proxyReq.on('error', (err) => {
    console.log('Camera proxy error:', err.message);
    if (!res.headersSent) {
      res.status(502).send('ESP32 stream unavailable');
    }
    if (activeCameraProxyReq === proxyReq) {
      activeCameraProxyReq = null;
    }
  });

  // Timeout 5s nếu ESP32 không phản hồi
  proxyReq.setTimeout(5000, () => {
    console.log('Camera proxy timeout - ESP32 không phản hồi');
    proxyReq.destroy();
    if (!res.headersSent) {
      res.status(504).send('ESP32 stream timeout');
    }
    if (activeCameraProxyReq === proxyReq) {
      activeCameraProxyReq = null;
    }
  });

  activeCameraProxyReq = proxyReq;
});

// ===== STUCK DETECTION ENDPOINTS =====

// ESP32 báo robot bị kẹt (gọi từ ESP32)
app.get('/report_stuck', (req, res) => {
  const type = parseInt(req.query.type) || 1;
  stuckStatus = {
    isStuck: true,
    type: type,
    timestamp: new Date().toISOString(),
    acknowledged: false
  };
  const typeText = type === 1 ? 'KẸT KHÔNG GIAN CHẬT' : 'MẤT TÍN HIỆU CẢM BIẾN';
  console.log(`🚨 ROBOT BỊ KẸT! Loại ${type}: ${typeText}`);
  res.send('OK');
});

// Frontend poll trạng thái kẹt
app.get('/api/stuck_status', (req, res) => {
  res.json(stuckStatus);
});

// Frontend xác nhận đã biết (dismiss thông báo)
app.post('/api/stuck_acknowledge', (req, res) => {
  stuckStatus.acknowledged = true;
  stuckStatus.isStuck = false;
  console.log('✅ Stuck alert acknowledged');
  res.json({ success: true });
});

// ===== API Endpoints cho Nhật Ký Hoạt Động =====

// Lấy danh sách sessions (có phân trang, lọc theo mode)
app.get('/api/sessions', (req, res) => {
  const { page = 1, limit = 15, mode = '' } = req.query;
  const result = getSessions({
    page: parseInt(page),
    limit: parseInt(limit),
    mode
  });
  res.json(result);
});

// Lấy thống kê sessions
app.get('/api/sessions/stats', (req, res) => {
  res.json(getSessionStats());
});

// Xóa 1 session
app.delete('/api/sessions/:id', (req, res) => {
  const result = deleteSession(parseInt(req.params.id));
  if (result.changes > 0) {
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: 'Session not found' });
  }
});

// Xóa tất cả sessions
app.delete('/api/sessions', (req, res) => {
  clearAllSessions();
  res.json({ success: true });
});

// Khởi động server
app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});

// Đóng database + kết thúc session khi tắt server
process.on('SIGINT', () => {
  finishCurrentSession();
  closeDB();
  process.exit(0);
});
process.on('SIGTERM', () => {
  finishCurrentSession();
  closeDB();
  process.exit(0);
});