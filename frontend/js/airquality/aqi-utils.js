// ===== AIR QUALITY MAP - AQI Calculation Utilities =====

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
