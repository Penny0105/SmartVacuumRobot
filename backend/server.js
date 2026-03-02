const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');

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
  res.send('OK');
});

// Endpoint để ESP32 polling lệnh
// Không reset command ở đây - Web UI sẽ gửi 'stop' khi user thả nút (mouseup/touchend)
app.get('/get_command', (req, res) => {
  res.send(currentCommand);
});

// Camera stream - redirect tới ESP32 MJPEG stream
app.get('/camera_stream', (req, res) => {
  if (esp32StreamUrl) {
    res.redirect(esp32StreamUrl);
  } else {
    res.status(204).send(); // Chưa có ESP32 kết nối
  }
});

// Khởi động server
app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});