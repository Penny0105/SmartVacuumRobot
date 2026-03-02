// ===== AIR QUALITY MAP - Bản đồ nồng độ bụi Việt Nam =====

// Air Quality Map variables
let airQualityMap;
let airQualityMarkers = [];
const API_KEY = 'a071a09fb6fd7a53980342c9dba2af78'; // OpenWeatherMap API

// GeoJSON ranh giới tỉnh thật
const GEOJSON_URL = 'https://raw.githubusercontent.com/Vizzuality/growasia_calculator/master/public/vietnam.geojson';
let provincesLayer = null;
const aqiDataByProvince = {}; // Lưu AQI theo tên tỉnh

// Mapping tên tỉnh trong GeoJSON → tên trong code
const provinceNameMap = {
  'Hồ Chí Minh city': 'TP.HCM',
  'Hồ Chí Minh': 'TP.HCM',
  'Thừa Thiên - Huế': 'Huế',
  'Thừa Thiên-Huế': 'Huế',
  'Bà Rịa - Vũng Tàu': 'Bà Rịa-Vũng Tàu',
  'Dak Nong': 'Đắk Nông',
  'Đak Nông': 'Đắk Nông',
  'Đăk Nông': 'Đắk Nông',
  'DakNong': 'Đắk Nông',
  'Daknong': 'Đắk Nông',
  'Dắk Nông': 'Đắk Nông',
  'Dak Lak': 'Đắk Lắk',
  'Đak Lak': 'Đắk Lắk',
  'DakLak': 'Đắk Lắk',
  'Daklak': 'Đắk Lắk',
  'Dắk Lắk': 'Đắk Lắk'
}

// All 63 provinces and cities of Vietnam
const vietnamCities = [
  // Northern Region (Miền Bắc)
  { name: 'Hà Nội', lat: 21.0285, lon: 105.8542, size: 0.35 },
  { name: 'Hải Phòng', lat: 20.8449, lon: 106.6881, size: 0.3 },
  { name: 'Hà Giang', lat: 22.8026, lon: 104.9784, size: 0.4 },
  { name: 'Cao Bằng', lat: 22.6663, lon: 106.2581, size: 0.35 },
  { name: 'Lào Cai', lat: 22.4809, lon: 103.9755, size: 0.35 },
  { name: 'Lai Châu', lat: 22.3864, lon: 103.4702, size: 0.3 },
  { name: 'Điện Biên', lat: 21.3833, lon: 103.0167, size: 0.35 },
  { name: 'Sơn La', lat: 21.3256, lon: 103.9188, size: 0.4 },
  { name: 'Yên Bái', lat: 21.7168, lon: 104.8986, size: 0.3 },
  { name: 'Tuyên Quang', lat: 21.8236, lon: 105.2280, size: 0.3 },
  { name: 'Lạng Sơn', lat: 21.8537, lon: 106.7611, size: 0.3 },
  { name: 'Quảng Ninh', lat: 21.0064, lon: 107.2925, size: 0.35 },
  { name: 'Bắc Giang', lat: 21.2819, lon: 106.1974, size: 0.25 },
  { name: 'Bắc Kạn', lat: 22.1475, lon: 105.8348, size: 0.25 },
  { name: 'Thái Nguyên', lat: 21.5671, lon: 105.8252, size: 0.3 },
  { name: 'Phú Thọ', lat: 21.2680, lon: 105.2045, size: 0.3 },
  { name: 'Vĩnh Phúc', lat: 21.3088, lon: 105.5474, size: 0.25 },
  { name: 'Bắc Ninh', lat: 21.1214, lon: 106.1110, size: 0.2 },
  { name: 'Hải Dương', lat: 20.9373, lon: 106.3145, size: 0.25 },
  { name: 'Hưng Yên', lat: 20.6464, lon: 106.0511, size: 0.2 },
  { name: 'Hòa Bình', lat: 20.8136, lon: 105.3388, size: 0.3 },
  { name: 'Hà Nam', lat: 20.5835, lon: 105.9230, size: 0.2 },
  { name: 'Nam Định', lat: 20.4388, lon: 106.1621, size: 0.25 },
  { name: 'Thái Bình', lat: 20.4463, lon: 106.3365, size: 0.25 },
  { name: 'Ninh Bình', lat: 20.2506, lon: 105.9745, size: 0.25 },
  
  // North Central Region (Bắc Trung Bộ)
  { name: 'Thanh Hóa', lat: 19.8067, lon: 105.7851, size: 0.4 },
  { name: 'Nghệ An', lat: 18.6791, lon: 105.6812, size: 0.45 },
  { name: 'Hà Tĩnh', lat: 18.3333, lon: 105.9000, size: 0.3 },
  { name: 'Quảng Bình', lat: 17.4676, lon: 106.6220, size: 0.35 },
  { name: 'Quảng Trị', lat: 16.7404, lon: 107.1854, size: 0.3 },
  { name: 'Huế', lat: 16.4637, lon: 107.5909, size: 0.3 },
  
  // South Central Coast (Duyên hải Nam Trung Bộ)
  { name: 'Đà Nẵng', lat: 16.0544, lon: 108.2022, size: 0.25 },
  { name: 'Quảng Nam', lat: 15.5394, lon: 108.0191, size: 0.4 },
  { name: 'Quảng Ngãi', lat: 15.1214, lon: 108.8044, size: 0.35 },
  { name: 'Bình Định', lat: 13.7830, lon: 109.2190, size: 0.35 },
  { name: 'Phú Yên', lat: 13.0955, lon: 109.0929, size: 0.3 },
  { name: 'Khánh Hòa', lat: 12.2388, lon: 109.1967, size: 0.35 },
  { name: 'Ninh Thuận', lat: 11.6739, lon: 108.8629, size: 0.3 },
  { name: 'Bình Thuận', lat: 10.9334, lon: 108.1008, size: 0.35 },
  
  // Central Highlands (Tây Nguyên)
  { name: 'Kon Tum', lat: 14.3497, lon: 108.0004, size: 0.35 },
  { name: 'Gia Lai', lat: 13.9833, lon: 108.0000, size: 0.4 },
  { name: 'Đắk Lắk', lat: 12.6667, lon: 108.0500, size: 0.4 },
  { name: 'Đắk Nông', lat: 12.2646, lon: 107.6098, size: 0.3 },
  { name: 'Lâm Đồng', lat: 11.9465, lon: 108.4419, size: 0.35 },
  
  // Southeast Region (Đông Nam Bộ)
  { name: 'TP.HCM', lat: 10.8231, lon: 106.6297, size: 0.3 },
  { name: 'Bình Phước', lat: 11.7511, lon: 106.7234, size: 0.35 },
  { name: 'Bình Dương', lat: 11.3254, lon: 106.4770, size: 0.25 },
  { name: 'Đồng Nai', lat: 10.9510, lon: 106.8444, size: 0.3 },
  { name: 'Tây Ninh', lat: 11.3351, lon: 106.1098, size: 0.3 },
  { name: 'Bà Rịa-Vũng Tàu', lat: 10.5417, lon: 107.2429, size: 0.3 },
  
  // Mekong Delta (Đồng bằng sông Cửu Long)
  { name: 'Long An', lat: 10.6958, lon: 106.2431, size: 0.3 },
  { name: 'Tiền Giang', lat: 10.4493, lon: 106.3420, size: 0.25 },
  { name: 'Bến Tre', lat: 10.2433, lon: 106.3759, size: 0.25 },
  { name: 'Trà Vinh', lat: 9.8127, lon: 106.2992, size: 0.25 },
  { name: 'Vĩnh Long', lat: 10.2399, lon: 105.9722, size: 0.2 },
  { name: 'Đồng Tháp', lat: 10.4938, lon: 105.6881, size: 0.3 },
  { name: 'An Giang', lat: 10.5216, lon: 105.1258, size: 0.3 },
  { name: 'Kiên Giang', lat: 10.0125, lon: 105.0808, size: 0.35 },
  { name: 'Cần Thơ', lat: 10.0452, lon: 105.7469, size: 0.25 },
  { name: 'Hậu Giang', lat: 9.7579, lon: 105.6412, size: 0.2 },
  { name: 'Sóc Trăng', lat: 9.6025, lon: 105.9740, size: 0.25 },
  { name: 'Bạc Liêu', lat: 9.2515, lon: 105.7278, size: 0.25 },
  { name: 'Cà Mau', lat: 9.1527, lon: 105.1960, size: 0.3 }
];

// Initialize Air Quality Map
function initAirQualityMap() {
  if (!document.getElementById('leaflet-map')) {
    console.error('Map container not found');
    return;
  }

  // Remove existing map if any
  if (airQualityMap) {
    airQualityMap.remove();
  }

  // Create map centered on Vietnam
  airQualityMap = L.map('leaflet-map', {
    center: [16.0, 106.5],
    zoom: 6,
    minZoom: 5,
    maxZoom: 12,
    maxBounds: [[7.0, 100.0], [24.0, 112.0]],
    maxBoundsViscosity: 1.0
  });

  // Add OpenStreetMap base tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18
  }).addTo(airQualityMap);

  // Load GeoJSON ranh giới tỉnh thật
  fetch(GEOJSON_URL)
    .then(res => res.json())
    .then(data => {
      provincesLayer = L.geoJSON(data, {
        style: getProvinceStyle,
        onEachFeature: onEachProvinceFeature
      }).addTo(airQualityMap);

      refreshMapData(); // Bắt đầu tải dữ liệu AQI
    })
    .catch(err => {
      console.error('Lỗi load GeoJSON:', err);
      refreshMapData();
    });

  // Setup refresh button
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.onclick = refreshMapData;
  }

  // Setup search
  initSearchProvince();
  
  console.log('Air Quality Map initialized with real province boundaries from GeoJSON');
}

// Zoom to specific city
function zoomToCity(lat, lon, cityName) {
  if (airQualityMap) {
    airQualityMap.setView([lat, lon], 8);
    const infoDisplay = document.getElementById('city-info-display');
    if (infoDisplay) {
      infoDisplay.innerHTML = `<p class="text-primary small mb-0"><i class="bi bi-geo-alt-fill"></i> Đang xem: <strong>${cityName}</strong></p>`;
    }
  }
}

// Reset map view
function resetMapView() {
  if (airQualityMap) {
    airQualityMap.setView([16.0, 106.5], 6);
    const infoDisplay = document.getElementById('city-info-display');
    if (infoDisplay) {
      infoDisplay.innerHTML = `<p class="text-muted small mb-0"><i class="bi bi-cursor"></i> Click vào marker để xem chi tiết từng thành phố</p>`;
    }
  }
}

// Refresh all city data
async function refreshMapData() {
  const infoDisplay = document.getElementById('city-info-display');
  if (infoDisplay) {
    infoDisplay.innerHTML = '<div class="spinner-border spinner-border-sm text-primary" role="status"><span class="visually-hidden">Loading...</span></div> <small>Đang tải dữ liệu 63 tỉnh...</small>';
  }
  
  // Clear existing markers only
  airQualityMarkers.forEach(marker => {
    if (airQualityMap) {
      airQualityMap.removeLayer(marker);
    }
  });
  airQualityMarkers = [];

  // Fetch data for each city
  let successCount = 0;
  
  for (const city of vietnamCities) {
    const result = await fetchCityData(city);
    if (result) successCount++;
  }

  // Cập nhật màu tỉnh sau khi có hết dữ liệu
  if (provincesLayer) {
    provincesLayer.setStyle(getProvinceStyle);
  }

  if (infoDisplay) {
    if (successCount === 0) {
      infoDisplay.innerHTML = `
        <div class="alert alert-warning small mb-0" role="alert">
          <strong>⏳ API Key chưa kích hoạt!</strong><br>
          Vui lòng đợi 1-2 giờ sau khi đăng ký OpenWeatherMap.
        </div>
      `;
    } else if (successCount < vietnamCities.length) {
      infoDisplay.innerHTML = `<p class="text-warning small mb-0"><i class="bi bi-exclamation-triangle-fill"></i> Đã tải ${successCount}/63 tỉnh</p>`;
    } else {
      infoDisplay.innerHTML = `<p class="text-success small mb-0"><i class="bi bi-check-circle-fill"></i> Đã tải 63 tỉnh</p>`;
    }
  }
}

// Fetch weather and AQI data for a city
async function fetchCityData(city) {
  try {
    // Fetch air pollution data
    const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${city.lat}&lon=${city.lon}&appid=${API_KEY}`;
    const aqiResponse = await fetch(aqiUrl);
    
    if (!aqiResponse.ok) {
      if (aqiResponse.status === 401) {
        console.error('❌ API Key chưa kích hoạt! Vui lòng đợi 1-2 giờ sau khi đăng ký.');
        throw new Error('API Key chưa kích hoạt (401 Unauthorized)');
      }
      throw new Error(`HTTP ${aqiResponse.status}: ${aqiResponse.statusText}`);
    }
    
    const aqiData = await aqiResponse.json();

    // Fetch weather data
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&appid=${API_KEY}&units=metric&lang=vi`;
    const weatherResponse = await fetch(weatherUrl);
    
    if (!weatherResponse.ok) {
      throw new Error(`HTTP ${weatherResponse.status}: ${weatherResponse.statusText}`);
    }
    
    const weatherData = await weatherResponse.json();

    // Validate data structure
    if (!aqiData.list || !aqiData.list[0] || !aqiData.list[0].components) {
      console.error('Invalid AQI data structure:', aqiData);
      throw new Error('Dữ liệu AQI không hợp lệ');
    }

    // Calculate AQI from PM2.5 using EPA standard
    const pm25 = aqiData.list[0].components.pm2_5 || 0;
    const pm10 = aqiData.list[0].components.pm10 || 0;
    const aqi = calculateAQI(pm25);
    const aqiLevel = getAQILevel(aqi);
    const markerColor = getMarkerColor(aqiLevel);

    // Lưu AQI để tô màu GeoJSON
    const displayName = provinceNameMap[city.name] || city.name;
    aqiDataByProvince[displayName] = { aqi, color: markerColor, level: aqiLevel };

    // Create marker with pin icon
    const marker = L.marker([city.lat, city.lon], {
      icon: L.divIcon({
        className: 'custom-marker',
        html: `<div style="position: relative;">
          <i class="bi bi-geo-alt-fill" style="font-size: 32px; color: ${markerColor}; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>
          <div style="position: absolute; top: 6px; left: 50%; transform: translateX(-50%); background: white; color: #1e293b; padding: 2px 6px; border-radius: 10px; font-weight: bold; font-size: 11px; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">${aqi}</div>
        </div>`,
        iconSize: [32, 40],
        iconAnchor: [16, 40]
      })
    }).addTo(airQualityMap);

    // Add popup with detailed info (Bootstrap styled)
    const popupContent = `
      <div class="card border-0" style="min-width: 250px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div class="card-header text-white" style="background: ${markerColor}; border-radius: 8px 8px 0 0;">
          <h6 class="mb-0"><i class="bi bi-geo-alt"></i> ${city.name}</h6>
        </div>
        <div class="card-body p-3">
          <div class="row g-2 small">
            <div class="col-6">
              <div class="d-flex align-items-center">
                <i class="bi bi-thermometer-half text-danger me-1"></i>
                <strong>${weatherData.main.temp.toFixed(1)}°C</strong>
              </div>
            </div>
            <div class="col-6">
              <div class="d-flex align-items-center">
                <i class="bi bi-droplet-fill text-primary me-1"></i>
                <strong>${weatherData.main.humidity}%</strong>
              </div>
            </div>
            <div class="col-6">
              <div class="d-flex align-items-center">
                <i class="bi bi-wind text-info me-1"></i>
                <strong>${weatherData.wind.speed.toFixed(1)} m/s</strong>
              </div>
            </div>
            <div class="col-6">
              <div class="d-flex align-items-center">
                <i class="bi bi-cloud text-secondary me-1"></i>
                <strong>${weatherData.weather[0].description}</strong>
              </div>
            </div>
          </div>
          <hr class="my-2">
          <div class="text-center">
            <div class="badge" style="background: ${markerColor}; font-size: 1.2rem; padding: 8px 16px;">${aqi}</div>
            <p class="mt-2 mb-1"><strong>${getAQIText(aqiLevel)}</strong></p>
            <small class="text-muted">PM2.5: ${pm25.toFixed(1)} | PM10: ${pm10.toFixed(1)} μg/m³</small>
          </div>
        </div>
      </div>
    `;
    marker.bindPopup(popupContent, { maxWidth: 300 });

    airQualityMarkers.push(marker);

    return true;
  } catch (error) {
    console.error(`Error fetching data for ${city.name}:`, error);
    return false;
  }
}

// Style cho GeoJSON tỉnh
function getProvinceStyle(feature) {
  const name = feature.properties.name;
  const mappedName = provinceNameMap[name] || name;
  const data = aqiDataByProvince[mappedName];

  if (!data) {
    return {
      fillColor: '#94a3b8',
      fillOpacity: 0.2,
      color: '#64748b',
      weight: 1
    };
  }

  return {
    fillColor: data.color,
    fillOpacity: 0.55,
    color: '#1e293b',
    weight: 1.5,
    opacity: 0.8
  };
}

// Hover + click popup cho từng tỉnh
function onEachProvinceFeature(feature, layer) {
  const name = feature.properties.name;
  const mappedName = provinceNameMap[name] || name;
  const data = aqiDataByProvince[mappedName];

  layer.on({
    mouseover: function() {
      this.setStyle({ fillOpacity: 0.75, weight: 3 });
    },
    mouseout: function() {
      this.setStyle(getProvinceStyle(feature));
    }
  });

  // Popup khi click tỉnh
  if (data) {
    layer.bindPopup(`
      <div style="min-width: 220px; font-family: 'Segoe UI', Tahoma, sans-serif;">
        <h6 style="margin: 0 0 8px 0; color: #1e293b;"><i class="bi bi-map"></i> ${mappedName}</h6>
        <div style="text-align: center; padding: 12px;">
          <span style="font-size: 2.5rem; font-weight: bold; color: ${data.color}">${data.aqi}</span><br>
          <small style="color: #64748b;">Chỉ số AQI</small><br>
          <span style="display: inline-block; margin-top: 8px; padding: 4px 12px; background: ${data.color}; color: white; border-radius: 12px; font-size: 0.9rem;">${getAQIText(data.level)}</span>
        </div>
      </div>
    `);
  }
}

// Calculate AQI from PM2.5 using EPA standard formula
function calculateAQI(pm25) {
  const breakpoints = [
    { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50 },
    { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
    { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
    { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
    { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500 }
  ];

  let bp = breakpoints[breakpoints.length - 1];
  for (let i = 0; i < breakpoints.length; i++) {
    if (pm25 >= breakpoints[i].cLow && pm25 <= breakpoints[i].cHigh) {
      bp = breakpoints[i];
      break;
    }
  }

  const aqi = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (pm25 - bp.cLow) + bp.iLow;
  return Math.round(aqi);
}

// Get AQI level category
function getAQILevel(aqi) {
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'moderate';
  if (aqi <= 150) return 'unhealthy';
  if (aqi <= 200) return 'bad';
  return 'hazardous';
}

// Get marker color based on AQI level
function getMarkerColor(level) {
  const colors = {
    'good': '#10b981',
    'moderate': '#fbbf24',
    'unhealthy': '#f97316',
    'bad': '#ef4444',
    'hazardous': '#9333ea'
  };
  return colors[level] || '#94a3b8';
}

// Get AQI text description
function getAQIText(level) {
  const texts = {
    'good': 'Tốt',
    'moderate': 'Trung bình',
    'unhealthy': 'Kém',
    'bad': 'Xấu',
    'hazardous': 'Nguy hại'
  };
  return texts[level] || 'Không xác định';
}

// ===== SEARCH PROVINCE FUNCTIONS =====

// Normalize Vietnamese text for search (remove diacritics)
function normalizeVietnamese(str) {
  return str.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().trim();
}

// Initialize search functionality
function initSearchProvince() {
  const searchInput = document.getElementById('searchProvince');
  const searchResults = document.getElementById('searchResults');
  const clearBtn = document.getElementById('clearSearchBtn');

  if (!searchInput) return;

  searchInput.addEventListener('input', function() {
    const query = this.value.trim();
    clearBtn.style.display = query ? 'block' : 'none';

    if (query.length < 1) {
      searchResults.style.display = 'none';
      return;
    }

    const normalizedQuery = normalizeVietnamese(query);
    const matches = vietnamCities.filter(city => {
      const normalizedName = normalizeVietnamese(city.name);
      return normalizedName.includes(normalizedQuery);
    });

    if (matches.length === 0) {
      searchResults.innerHTML = '<div class="p-2 text-muted small text-center">Không tìm thấy tỉnh/thành phố</div>';
      searchResults.style.display = 'block';
      return;
    }

    searchResults.innerHTML = matches.map(city => {
      const data = aqiDataByProvince[city.name];
      const aqiBadge = data 
        ? `<span class="badge" style="background:${data.color}; font-size:0.7rem;">${data.aqi}</span>` 
        : '<span class="badge bg-secondary" style="font-size:0.7rem;">--</span>';
      return `
        <div class="search-result-item d-flex justify-content-between align-items-center px-3 py-2" 
          style="cursor: pointer; border-bottom: 1px solid #f1f5f9;" 
          onmouseover="this.style.background='#f1f5f9'" 
          onmouseout="this.style.background='white'"
          onclick="selectSearchResult('${city.name}', ${city.lat}, ${city.lon})">
          <span class="small" style="color: #1e293b;"><i class="bi bi-geo-alt text-primary me-1"></i>${city.name}</span>
          ${aqiBadge}
        </div>`;
    }).join('');
    searchResults.style.display = 'block';
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.style.display = 'none';
    }
  });

  // Keyboard navigation
  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      searchResults.style.display = 'none';
      this.blur();
    }
    if (e.key === 'Enter') {
      const firstItem = searchResults.querySelector('.search-result-item');
      if (firstItem) firstItem.click();
    }
  });
}

// Select a search result
function selectSearchResult(cityName, lat, lon) {
  const searchInput = document.getElementById('searchProvince');
  const searchResults = document.getElementById('searchResults');

  searchInput.value = cityName;
  searchResults.style.display = 'none';

  // Zoom to city
  if (airQualityMap) {
    airQualityMap.setView([lat, lon], 9);

    // Show AQI info
    const data = aqiDataByProvince[cityName];
    const infoDisplay = document.getElementById('city-info-display');
    if (infoDisplay && data) {
      infoDisplay.innerHTML = `
        <p class="small mb-0">
          <i class="bi bi-geo-alt-fill" style="color:${data.color}"></i>
          <strong>${cityName}</strong> — AQI: 
          <span class="badge" style="background:${data.color};">${data.aqi}</span>
          ${getAQIText(data.level)}
        </p>`;
    } else if (infoDisplay) {
      infoDisplay.innerHTML = `<p class="text-primary small mb-0"><i class="bi bi-geo-alt-fill"></i> Đang xem: <strong>${cityName}</strong></p>`;
    }
  }
}

// Clear search
function clearSearch() {
  const searchInput = document.getElementById('searchProvince');
  const searchResults = document.getElementById('searchResults');
  const clearBtn = document.getElementById('clearSearchBtn');

  searchInput.value = '';
  searchResults.style.display = 'none';
  clearBtn.style.display = 'none';
  searchInput.focus();
}
