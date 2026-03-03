const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const { addLog, getLogs, getStats, deleteLog, clearAllLogs, closeDB } = require('./database');

// Parse JSON body
app.use(express.json());

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
    addLog('connection', 'ESP32 kết nối', `IP: ${ip}, Stream: ${esp32StreamUrl}`, 'esp32');
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

  // Ghi log lệnh điều khiển (bỏ qua 'stop' để tránh spam)
  const cmdLabels = {
    'go': 'Tiến', 'back': 'Lùi', 'left': 'Rẽ trái', 'right': 'Rẽ phải',
    'stop': 'Dừng', 'auto': 'Bật tự động', 'manual': 'Bật thủ công'
  };
  const logType = (cmd === 'auto' || cmd === 'manual') ? 'mode' : 'command';
  if (cmd !== 'stop') {
    addLog(logType, cmdLabels[cmd] || cmd, `Lệnh: ${cmd} → ${currentCommand}`, 'web');
  }

  res.send('OK');
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

// Camera stream - redirect tới ESP32 MJPEG stream
app.get('/camera_stream', (req, res) => {
  if (esp32StreamUrl) {
    res.redirect(esp32StreamUrl);
  } else {
    res.status(204).send(); // Chưa có ESP32 kết nối
  }
});

// ===== API Endpoints cho Nhật Ký Hoạt Động =====

// Lấy danh sách logs (có phân trang, lọc)
app.get('/api/logs', (req, res) => {
  const { page = 1, limit = 20, type = '', search = '' } = req.query;
  const result = getLogs({
    page: parseInt(page),
    limit: parseInt(limit),
    type,
    search
  });
  res.json(result);
});

// Lấy thống kê logs
app.get('/api/logs/stats', (req, res) => {
  res.json(getStats());
});

// Xóa 1 log
app.delete('/api/logs/:id', (req, res) => {
  const result = deleteLog(parseInt(req.params.id));
  if (result.changes > 0) {
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: 'Log not found' });
  }
});

// Xóa tất cả logs
app.delete('/api/logs', (req, res) => {
  clearAllLogs();
  addLog('system', 'Xóa nhật ký', 'Đã xóa toàn bộ nhật ký hoạt động', 'web');
  res.json({ success: true });
});

// Ghi log khởi động server
addLog('system', 'Server khởi động', `Server chạy tại http://localhost:5000`, 'system');

// Khởi động server
app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});

// Đóng database khi tắt server
process.on('SIGINT', () => {
  closeDB();
  process.exit(0);
});
process.on('SIGTERM', () => {
  closeDB();
  process.exit(0);
});