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
}

// Send command to server
function sendCommand(cmd) {
  fetch('/send_command?cmd=' + cmd)
    .then(response => {
      if (response.ok) {
        isConnected = true;
        updateStatus();
        if (cmd === 'go' && !runtimeInterval) {
          startRuntime();
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
    modeBtn.innerHTML = '<span class="icon-manual"></span> CHẾ ĐỘ THỦ CÔNG';
    modeBtn.classList.add('auto-mode');
    modeStatus.innerHTML = '⚡ Chế độ: <strong>Tự động</strong>';
  } else {
    currentMode = 'manual';
    sendCommand('manual');
    modeBtn.innerHTML = '<span class="icon-auto"></span> CHẾ ĐỘ TỰ ĐỘNG';
    modeBtn.classList.remove('auto-mode');
    modeStatus.innerHTML = '🎮 Chế độ: <strong>Thủ công</strong>';
  }
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

// Refresh camera stream
function refreshCamera() {
  const img = document.getElementById('cameraStream');
  if (img && currentPage === 'home') {
    img.src = '/camera_stream?' + new Date().getTime();
  }
}
