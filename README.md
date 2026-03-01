# 🤖 Smart Vacuum Robot - Robot Hút Bụi Thông Minh

Dự án robot hút bụi tự động điều khiển qua web, sử dụng ESP32-CAM để stream camera và Arduino Uno để điều khiển động cơ, tích hợp cảm biến siêu âm và hồng ngoại để tránh vật cản và phát hiện hố.
## 📋 Mục Lục

- [Tính Năng](#-tính-năng)
- [Phần Cứng](#️-phần-cứng)
- [Cấu Trúc Dự Án](#-cấu-trúc-dự-án)
- [Kết Nối Phần Cứng](#-kết-nối-phần-cứng)
- [Cài Đặt](#-cài-đặt)
- [Cách Sử Dụng](#-cách-sử-dụng)
- [API Endpoints](#-api-endpoints)
- [Screenshots](#-screenshots)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Tính Năng

### 🎮 Điều Khiển
- **Chế độ thủ công**: Điều khiển robot bằng giao diện web (Tiến, Lùi, Trái, Phải)
- **Chế độ tự động**: Robot tự động tránh vật cản và phát hiện hố

### 📹 Camera Trực Tiếp
- Stream video real-time từ ESP32-CAM
- Độ phân giải QVGA (320x240) tối ưu băng thông
- Refresh rate: 500ms/frame

### 🛡️ An Toàn
- 3 cảm biến siêu âm HC-SR04 (trái, trước, phải) - phát hiện vật cản
- Cảm biến hồng ngoại LM393 - phát hiện hố
- Logic non-blocking với `millis()` - không dùng `delay()`

### 🌐 Giao Diện Web
- Responsive design (desktop + mobile)
- Hiển thị trạng thái kết nối real-time
- Giao diện hiện đại với glassmorphism effect

---

## 🛠️ Phần Cứng

### Vi Điều Khiển
| Linh Kiện | Chức Năng |
|-----------|-----------|
| **ESP32-CAM** | Client WiFi, stream camera, gửi/nhận lệnh qua UART |
| **Arduino Uno** | Điều khiển động cơ, đọc cảm biến |

### Module & Cảm Biến
| Linh Kiện | Số Lượng | Chức Năng |
|-----------|----------|-----------|
| **L298N** | 1 | Driver động cơ DC |
| **HC-SR04** | 3 | Cảm biến siêu âm (trái, trước, phải) |
| **LM393** | 1 | Cảm biến hồng ngoại (phát hiện hố) |
| **Động cơ DC** | 2-4 | Động cơ bánh xe |

  

## 📁 Cấu Trúc Dự Án

```
SmartVacuumRobot/
├── frontend/                # Giao diện web
│   └── index.html          # HTML/CSS/JS giao diện người dùng
│
├── backend/                 # Node.js server
│   ├── server.js           # Express server, API endpoints
│   └── public/             # Lưu frame camera (auto-generated)
│
├── hardware/               # Code phần cứng
│   ├── esp32/
│   │   └── esp32.ino      # ESP32-CAM client code
│   └── arduino/
│       └── arduino.ino    # Arduino Uno control code
│
├── database/               # (Reserved cho tương lai)
├── package.json            # Node.js dependencies
├── .gitignore             # Git ignore rules
└── README.md              # Tài liệu này
```

---

## 🔌 Kết Nối Phần Cứng

### 1️⃣ ESP32-CAM ↔ Arduino (UART Communication)
| ESP32-CAM | Arduino Uno | Chức Năng |
|-----------|-------------|-----------|
| GPIO15 (TX) | Pin 0 (RX) | Truyền dữ liệu từ ESP32 → Arduino |
| GPIO14 (RX) | Pin 1 (TX) | Nhận dữ liệu từ Arduino → ESP32 |
| GND | GND | Mass chung |

> **⚠️ Lưu ý**: Khi upload code lên Arduino, cần **ngắt kết nối** pin RX/TX (0/1) với ESP32, sau đó nối lại.

---

### 2️⃣ Arduino ↔ L298N Motor Driver
| Arduino Uno | L298N | Chức Năng |
|-------------|-------|-----------|
| Pin 13 | IN1 | Động cơ trái - Tiến |
| Pin 12 | IN2 | Động cơ trái - Lùi |
| Pin 11 | IN3 | Động cơ phải - Tiến |
| Pin 10 | IN4 | Động cơ phải - Lùi |
| Pin 6 (PWM) | ENA | Điều khiển tốc độ động cơ trái |
| Pin 5 (PWM) | ENB | Điều khiển tốc độ động cơ phải |
| GND | GND | Mass chung |

---

### 3️⃣ L298N ↔ Động Cơ DC
| L298N Output | Kết Nối |
|--------------|---------|
| OUT1, OUT2 | Động cơ trái (Left Motor) |
| OUT3, OUT4 | Động cơ phải (Right Motor) |

---

### 4️⃣ Arduino ↔ Cảm Biến Siêu Âm (HC-SR04)
| Arduino Uno | HC-SR04 | Vị Trí |
|-------------|---------|--------|
| Pin 2 | Trig | **Siêu âm trái** |
| Pin 3 | Echo | **Siêu âm trái** |
| Pin 7 | Trig | **Siêu âm trước** |
| Pin 4 | Echo | **Siêu âm trước** |
| Pin 8 | Trig | **Siêu âm phải** |
| Pin 9 | Echo | **Siêu âm phải** |
| 5V | VCC | Nguồn (cả 3 cảm biến) |
| GND | GND | Mass (cả 3 cảm biến) |

---

### 5️⃣ Arduino ↔ Cảm Biến Hồng Ngoại (LM393)
| Arduino Uno | LM393 | Chức Năng |
|-------------|-------|-----------|
| Pin A0 | OUT | Tín hiệu phát hiện hố (HIGH = có hố) |
| 5V | VCC | Nguồn |
| GND | GND | Mass |

---

### 6️⃣ Nguồn Điện
| Module | Nguồn | Ghi Chú |
|--------|-------|---------|
| **ESP32-CAM** | 5V/1A | Adapter hoặc pin, cần dòng ổn định |
| **Arduino Uno** | USB hoặc 7-12V DC Jack | USB để debug, Jack cho hoạt động độc lập |
| **L298N** | 7-12V DC (2A+) | Nguồn riêng cho động cơ, GND chung với Arduino |
| **Sensors** | 5V từ Arduino | HC-SR04 và LM393 lấy nguồn từ pin 5V Arduino |

> **⚠️ Quan trọng**: 
> - **GND phải chung** giữa tất cả các module (ESP32, Arduino, L298N)
> - ESP32-CAM cần nguồn 5V/1A ổn định, **không dùng USB máy tính** (không đủ dòng)
> - L298N cần nguồn riêng 7-12V để cấp cho động cơ

---

### 📐 Sơ Đồ Tổng Quan
```
┌─────────────┐    UART (RX/TX)    ┌──────────────┐
│  ESP32-CAM  │◄──────────────────►│  Arduino Uno │
│ (WiFi Client)│                    │  (Controller)│
└─────────────┘                    └───────┬──────┘
     ↓ 5V/1A                               │
                                           │ Digital Pins
                    ┌──────────────────────┼─────────────────┐
                    │                      │                 │
              ┌─────▼─────┐         ┌─────▼────┐     ┌─────▼────┐
              │   L298N   │         │ HC-SR04  │     │  LM393   │
              │  (Motor)  │         │  (x3)    │     │   (IR)   │
              └─────┬─────┘         └──────────┘     └──────────┘
                    │ 7-12V                 ↑ 5V          ↑ 5V
              ┌─────┴─────┐                 │             │
              │  Motor L  │                 └─────────────┘
              │  Motor R  │              (Powered by Arduino 5V)
              └───────────┘
```

---

## 💻 Cài Đặt

### Yêu Cầu
- **Node.js** v18+ ([Download](https://nodejs.org/))
- **Arduino IDE** ([Download](https://www.arduino.cc/en/software))
- **ESP32 Board Manager** trong Arduino IDE

### Bước 1: Clone Repository
```bash
git clone https://github.com/Penny0105/SmartVacuumRobot.git
cd SmartVacuumRobot
```

### Bước 2: Cài Đặt Dependencies
```bash
npm install
```

### Bước 3: Upload Code lên Phần Cứng

#### Arduino Uno:
1. Mở `hardware/arduino/arduino.ino` trong Arduino IDE
2. Cài thư viện `NewPing` (Tools → Manage Libraries → Tìm "NewPing")
3. Chọn Board: `Arduino Uno`
4. Chọn Port tương ứng
5. Upload

#### ESP32-CAM:
1. Mở `hardware/esp32/esp32.ino` trong Arduino IDE
2. Cài ESP32 board: File → Preferences → Additional Board Manager URLs:
   ```
   https://dl.espressif.com/dl/package_esp32_index.json
   ```
3. Tools → Board → Boards Manager → Tìm "ESP32" và cài đặt
4. Chọn Board: `AI Thinker ESP32-CAM`
5. **Cấu hình WiFi** (dòng 7-8):
   ```cpp
   const char* ssid = "TenWiFi";        // Đổi thành WiFi của bạn
   const char* password = "MatKhau";    // Đổi password
   ```
6. **Cấu hình IP server** (dòng 10):
   ```cpp
   const char* serverUrl = "http://192.168.1.100:5000";  // IP laptop
   ```
   > Tìm IP laptop: `ipconfig` (Windows) hoặc `ifconfig` (Mac/Linux)
7. Upload (cần FTDI programmer, GPIO0 nối GND khi upload)

---

## 🚀 Cách Sử Dụng

### 1️⃣ Khởi Động Server
```bash
cd backend
node server.js
```

Server sẽ chạy tại: `http://localhost:5000`

### 2️⃣ Kiểm Tra IP Laptop
- **Windows**: Mở CMD → `ipconfig` → Tìm IPv4 Address
- **Mac/Linux**: Terminal → `ifconfig` hoặc `ip addr`

### 3️⃣ Truy Cập Giao Diện
- **Trên laptop**: `http://localhost:5000`
- **Trên điện thoại** (cùng mạng WiFi): `http://192.168.1.100:5000`

### 4️⃣ Điều Khiển
- **Nhấn giữ** nút để di chuyển
- **Thả nút** để dừng
- **Chuyển chế độ**: Click nút "CHẾ ĐỘ TỰ ĐỘNG" / "CHẾ ĐỘ THỦ CÔNG"

---

## 🔌 API Endpoints

| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| `GET` | `/` | Giao diện web chính |
| `POST` | `/stream` | Nhận frame camera từ ESP32 |
| `GET` | `/get_command` | ESP32 polling lệnh từ server |
| `GET` | `/send_command?cmd=<cmd>` | Web gửi lệnh điều khiển |
| `GET` | `/camera_stream` | Lấy frame camera mới nhất |

### Lệnh Điều Khiển
| Lệnh Web | Lệnh Arduino | Chức Năng |
|----------|--------------|-----------|
| `go` | `F` | Tiến |
| `back` | `B` | Lùi |
| `left` | `L` | Rẽ trái |
| `right` | `R` | Rẽ phải |
| `stop` | `S` | Dừng |
| `auto` | `A` | Chế độ tự động |
| `manual` | `M` | Chế độ thủ công |

---

## 📸 Screenshots

### Giao Diện Desktop
```
┌─────────────────────────────────────────────────────┐
│  🤖 Robot Hút Bụi Thông Minh                        │
│  ● Đã kết nối                                       │
├────────────────────┬────────────────────────────────┤
│  ⚙️ Điều Khiển     │  📹 Camera Trực Tiếp           │
│                    │  ┌──────────────────────────┐  │
│      [▲ TIẾN]      │  │  🔴 LIVE                 │  │
│                    │  │                          │  │
│  [◄ TRÁI] [PHẢI ►] │  │    [Camera Stream]       │  │
│                    │  │                          │  │
│      [▼ LÙI]       │  └──────────────────────────┘  │
│                    │                                │
│  [⚡ CHẾ ĐỘ TỰ ĐỘNG] │  🎮 Chế độ: Thủ công         │
└────────────────────┴────────────────────────────────┘
```

---

## 🐛 Troubleshooting

### ESP32 không kết nối WiFi
- ✅ Kiểm tra SSID và password trong code
- ✅ Đảm bảo WiFi là 2.4GHz (ESP32 không hỗ trợ 5GHz)
- ✅ Xem Serial Monitor (115200 baud) để debug

### Camera không hiển thị
- ✅ Kiểm tra IP server trong ESP32 code
- ✅ Đảm bảo folder `backend/public/` tồn tại
- ✅ ESP32 cần nguồn 5V/1A ổn định (không dùng USB máy tính)

### Robot không di chuyển
- ✅ Kiểm tra kết nối UART (RX ↔ TX chéo nhau)
- ✅ Kiểm tra GND chung giữa ESP32, Arduino, L298N
- ✅ Đảm bảo L298N có nguồn riêng 7-12V

### Lỗi `npm install`
```bash
# Windows: Bật quyền chạy scripts
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm install
```

### Port 5000 đã được sử dụng
Đổi port trong `backend/server.js`:
```javascript
app.listen(3000, () => {  // Đổi 5000 → 3000
  console.log('Server running on http://localhost:3000');
});
```

---

## 📝 License

MIT License - Copyright (c) 2026

---

## 👥 Contributors

- **Penny** - Initial work - [GitHub](https://github.com/Penny0105)

---

## 🙏 Acknowledgments

- [ESP32-CAM Documentation](https://github.com/espressif/esp32-camera)
- [NewPing Library](https://bitbucket.org/teckel12/arduino-new-ping/wiki/Home)
- [Express.js](https://expressjs.com/)

---

**⭐ Nếu bạn thấy dự án hữu ích, hãy cho một star trên GitHub!**