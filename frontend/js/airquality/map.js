// ===== AIR QUALITY MAP - Map Initialization & Interaction =====

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
