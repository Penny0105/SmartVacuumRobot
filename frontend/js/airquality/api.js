// ===== AIR QUALITY MAP - API Data Fetching =====

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
