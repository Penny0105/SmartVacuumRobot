// ===== AIR QUALITY MAP - Search Province Functions =====

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
