// ===== AIR QUALITY MAP - Vietnam Cities Data (63 tỉnh/thành) =====

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
