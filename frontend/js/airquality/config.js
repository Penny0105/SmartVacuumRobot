// ===== AIR QUALITY MAP - Config & Constants =====

// Map & marker state
let airQualityMap;
let airQualityMarkers = [];

// OpenWeatherMap API Key
const API_KEY = 'a071a09fb6fd7a53980342c9dba2af78';

// GeoJSON ranh giới tỉnh thật
const GEOJSON_URL = 'https://raw.githubusercontent.com/Vizzuality/growasia_calculator/master/public/vietnam.geojson';
let provincesLayer = null;

// Lưu AQI theo tên tỉnh (dùng để tô màu GeoJSON)
const aqiDataByProvince = {};

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
};
