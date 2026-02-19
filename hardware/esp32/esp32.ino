/* ESP32 Camera Car with Web Control and Dust Sensor */
#include "esp_camera.h"
#include <WiFi.h>
#define CAMERA_MODEL_AI_THINKER

const char* ssid = "Penny";         // Tên WiFi
const char* password = "123456789";    // Mật khẩu WiFi

#if defined(CAMERA_MODEL_AI_THINKER)
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22
#else
#error "Camera model not selected"
#endif

// UART pins for communication with Arduino
#define RXD 14  // RX from Arduino TX
#define TXD 15  // TX to Arduino RX

// Dust sensor GP2Y1010AU0F pins
#define DUST_LED_PIN 2     // GPIO2 để bật LED hồng ngoại
#define DUST_OUT_PIN 13    // GPIO13 (ADC1_CH5) để đọc analog output
#define SAMPLING_TIME 280  // Thời gian lấy mẫu 0.28ms
#define DELTA_TIME 40      // Thời gian chờ 0.04ms
#define SLEEP_TIME 9680    // Thời gian nghỉ 9.68ms

HardwareSerial uartSerial(2);  // Use UART2

String WiFiAddr = "";  // Lưu địa chỉ IP động

// Biến toàn cục cho cảm biến bụi
float dustDensity = 0.0;  // Nồng độ bụi mg/m³

void startCameraServer();
void readDustSensor();

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  Serial.println("Starting ESP32-CAM...");

  // Cấu hình chân cảm biến bụi
  pinMode(DUST_LED_PIN, OUTPUT);
  digitalWrite(DUST_LED_PIN, HIGH);  // Tắt LED (active LOW)

  // Kết nối WiFi (Station mode)
  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi connected");
  WiFiAddr = WiFi.localIP().toString();
  Serial.print("Camera Ready! Use 'http://");
  Serial.print(WiFiAddr);
  Serial.println("' to connect");

  // Kiểm tra khởi tạo camera
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 10000000; // Giảm tần số XCLK để ổn định
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_QVGA; // Giảm độ phân giải để giảm tải
  config.jpeg_quality = 15; // Tăng chất lượng JPEG nhẹ
  config.fb_count = 1; // Chỉ dùng 1 frame buffer

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    // Không return, tiếp tục chạy WiFi
  } else {
    Serial.println("Camera initialized successfully");
    sensor_t * s = esp_camera_sensor_get();
    s->set_framesize(s, FRAMESIZE_QVGA);
    s->set_quality(s, 15);
  }

  // Khởi động server
  startCameraServer();
  Serial.println("Camera server started");

  // Gửi lệnh mặc định: chế độ manual
  uartSerial.begin(115200, SERIAL_8N1, RXD, TXD);
  uartSerial.print('M');
  Serial.println("UART initialized, sent 'M' to Arduino");
}

void loop() {
  // Đọc cảm biến bụi mỗi 1 giây
  readDustSensor();
  delay(1000);

  // Kiểm tra kết nối WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, reconnecting...");
    WiFi.reconnect();
  }
}

void readDustSensor() {
  // Bật LED hồng ngoại (active LOW)
  digitalWrite(DUST_LED_PIN, LOW);
  delayMicroseconds(SAMPLING_TIME);  // Chờ 0.28ms

  // Đọc giá trị ADC từ GPIO13
  int voMeasured = analogRead(DUST_OUT_PIN);

  // Tắt LED
  delayMicroseconds(DELTA_TIME);  // Chờ 0.04ms
  digitalWrite(DUST_LED_PIN, HIGH);

  // Chờ 9.68ms để hoàn thành chu kỳ 10ms
  delayMicroseconds(SLEEP_TIME);

  // Tính điện áp (ESP32 ADC 12-bit, vRef = 3.3V)
  float vpd = 3.3 / 4096.0;  // Điện áp trên mỗi đơn vị ADC
  float calcVoltage = voMeasured * vpd;

  // Tính nồng độ bụi (mg/m³) theo Linear Equation
  dustDensity = 0.17 * calcVoltage - 0.1;
  if (dustDensity < 0) dustDensity = 0;  // Tránh giá trị âm

  Serial.printf("Raw Signal (0-4095): %d, Voltage: %.2fV, Dust Density: %.2f mg/m³\n", 
                voMeasured, calcVoltage, dustDensity);
}