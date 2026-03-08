// ===== HOME PAGE - Robot Control Functions =====

// Global state
let currentMode = 'manual';
let isConnected = false;
let runtimeSeconds = 0;
let runtimeInterval = null;
let distanceUpdateInterval = null;

let weatherInterval = null;
let stuckCheckInterval = null;
let dustAlertDismissed = false; // Đã dismiss thông báo bụi trong phiên này

// Initialize home page functions
function initHomePage() {
  // Restart timers
  updateRealTimeClock();
  
  // Prevent context menu on buttons
  document.querySelectorAll('.control-btn').forEach(btn => {
    btn.addEventListener('contextmenu', e => e.preventDefault());
  });

  // Cập nhật UI nút theo mode hiện tại (khi quay lại trang home)
  updateDirectionButtons();

  // Cập nhật quãng đường real-time mỗi 1 giây
  if (distanceUpdateInterval) clearInterval(distanceUpdateInterval);
  distanceUpdateInterval = setInterval(updateActiveSession, 1000);
  updateActiveSession(); // Cập nhật ngay

  // Khởi tạo dropdown tỉnh & tải thời tiết
  initProvinceSelector();
  loadHomeWeather();
  if (weatherInterval) clearInterval(weatherInterval);
  weatherInterval = setInterval(loadHomeWeather, 5 * 60 * 1000); // Refresh 5 phút

  // Kiểm tra robot bị kẹt mỗi 2 giây
  if (stuckCheckInterval) clearInterval(stuckCheckInterval);
  stuckCheckInterval = setInterval(checkStuckStatus, 2000);

  // Kết nối lại camera stream ngay khi quay lại trang home
  refreshCamera();
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

// Cập nhật quãng đường + thời gian từ server (active session)
function updateActiveSession() {
  if (currentPage !== 'home') return;
  fetch('/api/active_session')
    .then(res => res.json())
    .then(data => {
      const distEl = document.getElementById('distance-display');
      const unitEl = document.getElementById('distance-unit');
      if (data.active) {
        // Cập nhật runtime từ server
        runtimeSeconds = data.duration;
        updateRuntimeDisplay();
        // Cập nhật quãng đường
        if (distEl) {
          if (data.distance >= 1000) {
            distEl.textContent = (data.distance / 1000).toFixed(2);
            if (unitEl) unitEl.textContent = 'km';
          } else {
            distEl.textContent = data.distance.toFixed(2);
            if (unitEl) unitEl.textContent = 'm';
          }
        }
      } else {
        if (distEl && runtimeSeconds === 0) {
          distEl.textContent = '0.00';
          if (unitEl) unitEl.textContent = 'm';
        }
      }
    })
    .catch(() => {});
}

// ===== WEATHER + AIR QUALITY ON HOME PAGE =====

// Khởi tạo dropdown chọn tỉnh
function initProvinceSelector() {
  const select = document.getElementById('home-province-select');
  if (!select || typeof vietnamCities === 'undefined') return;

  // Xóa options cũ (giữ option đầu)
  select.innerHTML = '<option value="">-- Chọn tỉnh --</option>';
  vietnamCities.forEach((city, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = city.name;
    select.appendChild(opt);
  });

  // Restore từ localStorage
  const saved = localStorage.getItem('home_province_idx');
  if (saved !== null && vietnamCities[saved]) {
    select.value = saved;
  }
}

// Khi user chọn tỉnh khác
function changeHomeProvince() {
  const select = document.getElementById('home-province-select');
  if (!select) return;
  localStorage.setItem('home_province_idx', select.value);
  loadHomeWeather();
}

// Tải thời tiết + AQI cho tỉnh đã chọn
async function loadHomeWeather() {
  if (currentPage !== 'home') return;
  const container = document.getElementById('weather-home-content');
  if (!container) return;

  const idx = localStorage.getItem('home_province_idx');
  if (idx === null || idx === '' || typeof vietnamCities === 'undefined' || !vietnamCities[idx]) {
    container.innerHTML = '<div class="weather-placeholder">Chọn tỉnh để xem thời tiết</div>';
    return;
  }

  const city = vietnamCities[idx];
  container.innerHTML = '<div class="weather-loading"><div class="spinner-border spinner-border-sm" role="status"></div> Đang tải...</div>';

  try {
    // Fetch cả 2 API song song
    const [weatherRes, aqiRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&appid=${API_KEY}&units=metric&lang=vi`),
      fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${city.lat}&lon=${city.lon}&appid=${API_KEY}`)
    ]);

    if (!weatherRes.ok || !aqiRes.ok) throw new Error('API error');

    const weather = await weatherRes.json();
    const aqiData = await aqiRes.json();

    const pm25 = aqiData.list[0].components.pm2_5 || 0;
    const aqi = calculateAQI(pm25);
    const aqiLevel = getAQILevel(aqi);
    const aqiColor = getMarkerColor(aqiLevel);
    const aqiText = getAQIText(aqiLevel);

    // Weather icon từ OpenWeatherMap
    const iconCode = weather.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

    container.innerHTML = `
      <div class="weather-main">
        <img src="${iconUrl}" alt="weather" class="weather-icon-img">
        <span class="weather-temp">${weather.main.temp.toFixed(1)}°C</span>
      </div>
      <div class="weather-desc">${weather.weather[0].description}</div>
      <div class="weather-details">
        <span>💧 ${weather.main.humidity}%</span>
        <span>💨 ${weather.wind.speed.toFixed(1)} m/s</span>
      </div>
      <div class="weather-aqi">
        <span class="aqi-home-badge" style="background:${aqiColor}">AQI ${aqi} — ${aqiText}</span>
        <span class="weather-pm25">PM2.5: ${pm25.toFixed(1)} μg/m³</span>
      </div>
    `;

    // Kiểm tra ngưỡng AQI và hiện thông báo
    checkDustAlert(aqi, pm25, aqiLevel, aqiColor, aqiText, city.name);
  } catch (err) {
    console.error('Weather load error:', err);
    container.innerHTML = '<div class="weather-placeholder">⚠️ Không tải được dữ liệu</div>';
  }
}

// ===== DUST/AQI ALERT - Cảnh báo bụi vượt ngưỡng =====

const DUST_ALERT_LEVELS = {
  'unhealthy': {
    icon: '😷',
    title: 'Chất lượng không khí KÉM!',
    advice: 'Nhóm nhạy cảm (trẻ em, người già, bệnh hô hấp) nên hạn chế ra ngoài. Đóng cửa sổ và bật máy lọc không khí nếu có.'
  },
  'bad': {
    icon: '🤢',
    title: 'Chất lượng không khí XẤU!',
    advice: 'Mọi người nên hạn chế hoạt động ngoài trời. Đeo khẩu trang N95 nếu phải ra ngoài. Đóng kín cửa.'
  },
  'hazardous': {
    icon: '☠️',
    title: 'Không khí NGUY HẠI!',
    advice: 'CẢNH BÁO KHẨN: Tránh ra ngoài hoàn toàn! Đóng kín cửa, bật máy lọc không khí. Nguy hiểm cho sức khỏe mọi người.'
  }
};

function checkDustAlert(aqi, pm25, level, color, text, cityName) {
  const alertInfo = DUST_ALERT_LEVELS[level];
  
  // AQI <= 100 (good/moderate) → ẩn thông báo, reset dismiss
  if (!alertInfo) {
    dustAlertDismissed = false;
    hideDustAlert();
    return;
  }

  // Đã dismiss rồi thì không hiện lại (cho đến khi AQI về safe rồi lên lại)
  if (dustAlertDismissed) return;

  showDustAlert(aqi, pm25, level, color, text, cityName, alertInfo);
}

function showDustAlert(aqi, pm25, level, color, text, cityName, info) {
  const toast = document.getElementById('dust-alert-toast');
  if (!toast) return;

  document.getElementById('dust-alert-icon').textContent = info.icon;
  document.getElementById('dust-alert-title').textContent = `${cityName}: ${info.title}`;
  document.getElementById('dust-alert-text').textContent = info.advice;
  
  const aqiBadge = document.getElementById('dust-alert-aqi');
  aqiBadge.textContent = `AQI ${aqi} — ${text}`;
  aqiBadge.style.background = color;
  
  document.getElementById('dust-alert-pm25').textContent = `PM2.5: ${pm25.toFixed(1)} μg/m³`;

  // Đặt class level cho border/shadow
  toast.className = `dust-alert-toast level-${level}`;
  toast.style.display = 'flex';
}

function hideDustAlert() {
  const toast = document.getElementById('dust-alert-toast');
  if (toast) toast.style.display = 'none';
}

function dismissDustAlert() {
  dustAlertDismissed = true;
  hideDustAlert();
}

// Reload camera stream thủ công (khi bị đơ/crash)
function reloadCamera() {
  const img = document.getElementById('cameraStream');
  const overlay = document.getElementById('camera-waiting-overlay');
  if (img) {
    img.dataset.streaming = 'false';
    img.src = '';
  }
  if (overlay) overlay.style.display = 'flex';
  // Kết nối lại sau 500ms
  setTimeout(refreshCamera, 500);
}

// Refresh camera stream - kết nối tới MJPEG stream từ ESP32
function refreshCamera() {
  if (currentPage !== 'home') return;

  const img = document.getElementById('cameraStream');
  const overlay = document.getElementById('camera-waiting-overlay');
  if (!img) return;

  // Nếu đang stream rồi thì không cần làm gì
  if (img.dataset.streaming === 'true') return;

  // Kiểm tra ESP32 đã kết nối chưa, rồi dùng server proxy
  fetch('/esp32_stream_url')
    .then(res => res.json())
    .then(data => {
      if (data.connected) {
        // Kết nối qua server proxy (server pipe stream từ ESP32)
        img.src = '/camera_stream?' + Date.now();
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

// ===== STUCK DETECTION - Phát hiện robot bị kẹt =====

const STUCK_MESSAGES = {
  1: {
    title: '⚠️ Robot bị kẹt trong không gian chật!',
    desc: 'Robot phát hiện vật cản liên tục từ nhiều phía. Có thể đang bị kẹt trong góc hẹp hoặc gầm bàn ghế.'
  },
  2: {
    title: '🚫 Robot không phản hồi cảm biến!',
    desc: 'Không nhận được tín hiệu từ bất kỳ cảm biến nào trong 30 giây. Bánh xe có thể bị kẹt hoặc robot đang mắc kẹt ở vị trí khuất cảm biến.'
  }
};

// Poll server kiểm tra trạng thái kẹt
function checkStuckStatus() {
  if (currentPage !== 'home') return;
  
  fetch('/api/stuck_status')
    .then(res => res.json())
    .then(data => {
      const alertEl = document.getElementById('stuck-alert');
      if (!alertEl) return;
      
      if (data.isStuck && !data.acknowledged) {
        // Hiển thị thông báo kẹt
        const info = STUCK_MESSAGES[data.type] || STUCK_MESSAGES[1];
        document.getElementById('stuck-title').textContent = info.title;
        document.getElementById('stuck-desc').textContent = info.desc;
        
        // Hiển thị thời gian phát hiện
        const time = new Date(data.timestamp);
        document.getElementById('stuck-time').textContent = 
          '🕐 Phát hiện lúc: ' + time.toLocaleTimeString('vi-VN');
        
        alertEl.style.display = 'flex';
      } else {
        alertEl.style.display = 'none';
      }
    })
    .catch(() => {});
}

// Xác nhận đã biết robot bị kẹt
function acknowledgeStuck() {
  fetch('/api/stuck_acknowledge', { method: 'POST' })
    .then(res => res.json())
    .then(() => {
      const alertEl = document.getElementById('stuck-alert');
      if (alertEl) alertEl.style.display = 'none';
    })
    .catch(() => {});
}

// Chuyển sang chế độ thủ công để giải cứu robot
function switchToManual() {
  acknowledgeStuck();
  if (currentMode === 'auto') {
    toggleMode(); // Chuyển sang manual
  }
}
