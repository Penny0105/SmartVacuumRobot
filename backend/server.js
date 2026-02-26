const express = require('express');
const app = express();
const multer = require('multer');
const upload = multer();
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Middleware để xử lý body request
app.use(express.json());

// Serve static files từ frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// Biến lưu lệnh hiện tại để ESP32 polling
let currentCommand = 'S'; // Mặc định là Stop

// Giao diện web - serve index.html từ frontend folder
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Endpoint nhận frame từ ESP32
app.post('/stream', upload.single('frame'), (req, res) => {
  if (req.file) {
    fs.writeFileSync(path.join(__dirname, 'public/current_frame.jpg'), req.file.buffer);
    res.send('OK');
  } else {
    res.status(400).send('No frame received');
  }
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
app.get('/get_command', (req, res) => {
  res.send(currentCommand);
  console.log('ESP32 polled command:', currentCommand);
  // Reset về Stop sau khi gửi lệnh di chuyển (trừ Auto/Manual)
  if (currentCommand !== 'A' && currentCommand !== 'M') {
    currentCommand = 'S';
  }
});

// Stream camera cho web
app.get('/camera_stream', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/current_frame.jpg'));
});

// Khởi động server
app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});