// ===== HOME PAGE - Robot Control Functions =====

// Global state
let currentMode = 'manual';
let isConnected = false;
let runtimeSeconds = 0;
let runtimeInterval = null;

// Initialize home page functions
function initHomePage() {
  // Restart timers
  updateDustLevel();
  updateRealTimeClock();
  
  // Prevent context menu on buttons
  document.querySelectorAll('.control-btn').forEach(btn => {
    btn.addEventListener('contextmenu', e => e.preventDefault());
  });

  // Cập nhật UI nút theo mode hiện tại (khi quay lại trang home)
  updateDirectionButtons();
}

// Send command to server
function sendCommand(cmd) {
  // Chặn lệnh điều hướng khi đang ở chế độ tự động
  if (currentMode === 'auto' && ['go', 'back', 'left', 'right'].includes(cmd)) {
    return;
  }

  fetch('/send_command?cmd=' + cmd)
    .then(response => {
      if (response.ok) {
        isConnected = true;
        updateStatus();

        // Quản lý runtime timer
        if (['go', 'back', 'left', 'right'].includes(cmd)) {
          startRuntime();
        } else if (cmd === 'stop') {
          stopRuntime();
        }
      }
    })
    .catch(error => {
      console.error('Error:', error);
      isConnected = false;
      updateStatus();
    });
}

// Toggle between auto and manual mode
function toggleMode() {
  const modeBtn = document.getElementById('modeBtn');
  const modeStatus = document.getElementById('mode-status');
  
  if (currentMode === 'manual') {
    currentMode = 'auto';
    sendCommand('auto');
    startRuntime(); // Auto mode bắt đầu chạy
    if (modeBtn) {
      modeBtn.innerHTML = '<span class="icon-manual"></span> CHẾ ĐỘ THỦ CÔNG';
      modeBtn.classList.add('auto-mode');
    }
    if (modeStatus) {
      modeStatus.innerHTML = '⚡ Chế độ: <strong>Tự động</strong>';
    }
  } else {
    currentMode = 'manual';
    sendCommand('manual');
    stopRuntime();
    if (modeBtn) {
      modeBtn.innerHTML = '<span class="icon-auto"></span> CHẾ ĐỘ TỰ ĐỘNG';
      modeBtn.classList.remove('auto-mode');
    }
    if (modeStatus) {
      modeStatus.innerHTML = '🎮 Chế độ: <strong>Thủ công</strong>';
    }
  }

  // Cập nhật trạng thái nút điều hướng
  updateDirectionButtons();
}

// Bật/tắt nút điều hướng theo chế độ
function updateDirectionButtons() {
  const dirBtns = document.querySelectorAll('.control-btn.forward, .control-btn.backward, .control-btn.left, .control-btn.right');
  dirBtns.forEach(btn => {
    if (currentMode === 'auto') {
      btn.disabled = true;
      btn.style.opacity = '0.4';
      btn.style.cursor = 'not-allowed';
    } else {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    }
  });
}

// Update connection status
function updateStatus() {
  const statusText = document.getElementById('status-text');
  if (statusText) {
    if (isConnected) {
      statusText.textContent = 'Đã kết nối';
    } else {
      statusText.textContent = 'Mất kết nối';
    }
  }
}

// Runtime timer
function startRuntime() {
  if (runtimeInterval) return;
  runtimeInterval = setInterval(() => {
    runtimeSeconds++;
    updateRuntimeDisplay();
  }, 1000);
}

function stopRuntime() {
  if (runtimeInterval) {
    clearInterval(runtimeInterval);
    runtimeInterval = null;
  }
}

function updateRuntimeDisplay() {
  const hours = Math.floor(runtimeSeconds / 3600);
  const minutes = Math.floor((runtimeSeconds % 3600) / 60);
  const seconds = runtimeSeconds % 60;
  
  const runtimeElement = document.getElementById('runtime');
  if (runtimeElement) {
    runtimeElement.textContent = 
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}

// Real-time clock
function updateRealTimeClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const dateStr = now.toLocaleDateString('vi-VN', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const timeElement = document.getElementById('real-time');
  const dateElement = document.getElementById('real-date');
  
  if (timeElement) {
    timeElement.textContent = `${hours}:${minutes}:${seconds}`;
  }
  
  if (dateElement) {
    dateElement.textContent = dateStr;
  }
}

// Simulate dust level updates
function updateDustLevel() {
  const dustLevel = Math.floor(Math.random() * 30) + 15; // 15-45 μg/m³
  const dustElement = document.getElementById('dust-level');
  if (dustElement) {
    dustElement.textContent = dustLevel;
  }
}

// Refresh camera stream - kết nối tới MJPEG stream từ ESP32
function refreshCamera() {
  if (currentPage !== 'home') return;

  const img = document.getElementById('cameraStream');
  const overlay = document.getElementById('camera-waiting-overlay');
  if (!img) return;

  // Nếu đang stream rồi thì không cần làm gì
  if (img.dataset.streaming === 'true') return;

  // Lấy URL stream MJPEG từ server
  fetch('/esp32_stream_url')
    .then(res => res.json())
    .then(data => {
      if (data.url && data.connected) {
        // Kết nối tới MJPEG stream của ESP32
        img.src = data.url;
        img.dataset.streaming = 'true';

        img.onload = () => {
          if (overlay) overlay.style.display = 'none';
          isConnected = true;
          updateStatus();
        };

        img.onerror = () => {
          // Stream bị ngắt hoặc ESP32 mất kết nối
          img.dataset.streaming = 'false';
          img.src = '';
          if (overlay) overlay.style.display = 'flex';
          isConnected = false;
          updateStatus();
        };
      } else {
        // ESP32 chưa kết nối
        if (overlay) overlay.style.display = 'flex';
      }
    })
    .catch(() => {
      if (overlay) overlay.style.display = 'flex';
    });
}
