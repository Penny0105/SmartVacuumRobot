/* Dự án Robot hút bụi thông minh với ESP32-CAM (chế độ client) */
#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include "esp_http_server.h"
#define CAMERA_MODEL_AI_THINKER

const char* ssid = "Penny";         // Tên WiFi
const char* password = "123456789";    // Mật khẩu WiFi

const char* serverUrl = "http://10.238.109.248:5000";  // IP laptop chạy Node.js (thay bằng IP của bạn)

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

HardwareSerial uartSerial(2);  // Sử dụng UART2 để giao tiếp với Arduino

// ===== MJPEG Stream Server trên port 81 (tham khảo từ esp_camera_webserver) =====
#define PART_BOUNDARY "123456789000000000000987654321"
static const char* _STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* _STREAM_BOUNDARY = "\r\n--" PART_BOUNDARY "\r\n";
static const char* _STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";
httpd_handle_t stream_httpd = NULL;

// Handler stream MJPEG - gửi frame liên tục cho browser
static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t *fb = NULL;
  esp_err_t res = ESP_OK;
  char part_buf[64];

  res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
  if (res != ESP_OK) return res;

  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  while (true) {
    fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("Camera capture failed in stream");
      res = ESP_FAIL;
      break;
    }

    size_t hlen = snprintf(part_buf, 64, _STREAM_PART, fb->len);
    res = httpd_resp_send_chunk(req, part_buf, hlen);
    if (res == ESP_OK)
      res = httpd_resp_send_chunk(req, (const char *)fb->buf, fb->len);
    if (res == ESP_OK)
      res = httpd_resp_send_chunk(req, _STREAM_BOUNDARY, strlen(_STREAM_BOUNDARY));

    esp_camera_fb_return(fb);
    if (res != ESP_OK) break;
  }

  return res;
}

// Khởi động stream server trên port 81
void startStreamServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 81;
  config.ctrl_port = 32769;

  httpd_uri_t stream_uri = {
    .uri = "/stream",
    .method = HTTP_GET,
    .handler = stream_handler,
    .user_ctx = NULL
  };

  if (httpd_start(&stream_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(stream_httpd, &stream_uri);
    Serial.println("MJPEG stream server started on port 81");
  }
}

// Đăng ký IP của ESP32 với Node.js server
void registerWithServer() {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  String url = String(serverUrl) + "/register_esp32?ip=" + WiFi.localIP().toString();
  http.begin(url);
  int code = http.GET();
  if (code > 0) Serial.println("Registered with server. Stream: http://" + WiFi.localIP().toString() + ":81/stream");
  else Serial.println("Failed to register with server");
  http.end();
}

void setup() {
  Serial.begin(115200);  // Khởi tạo Serial để debug
  Serial.setDebugOutput(true);  // Bật debug output
  Serial.println("Starting ESP32-CAM (client mode)...");  // In thông báo khởi động

  // Kết nối WiFi (chế độ Station - kết nối vào mạng có sẵn)
  Serial.println("Connecting to WiFi...");
  WiFi.mode(WIFI_STA);           // Bắt buộc set STA mode trước khi begin
  WiFi.setSleep(false);          // Tắt WiFi sleep để ổn định stream
  WiFi.begin(ssid, password);

  // Chờ kết nối tối đa 20 giây, nếu thất bại thì restart ESP32
  int wifiTimeout = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    wifiTimeout++;
    if (wifiTimeout > 40) {  // 40 x 500ms = 20 giây
      Serial.println("\nWiFi connection failed! Restarting...");
      ESP.restart();
    }
  } 
  Serial.println("");
  Serial.println("WiFi connected");  // Thông báo kết nối thành công
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());

  // Khởi tạo camera
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
  config.xclk_freq_hz = 10000000; // Giảm tần số XCLK để ổn định camera
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_QVGA; // Độ phân giải QVGA để giảm tải
  config.jpeg_quality = 15; // Chất lượng JPEG trung bình
  config.fb_count = 1; // Số frame buffer

  esp_err_t err = esp_camera_init(&config);  // Khởi tạo camera
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    while (true);  // Dừng nếu camera lỗi
  } else {
    Serial.println("Camera initialized successfully");
    sensor_t * s = esp_camera_sensor_get();
    s->set_framesize(s, FRAMESIZE_QVGA);  // Đặt lại độ phân giải
    s->set_quality(s, 15);  // Đặt chất lượng
  }

  // Khởi tạo UART và gửi lệnh mặc định: chế độ manual
  uartSerial.begin(115200, SERIAL_8N1, RXD, TXD);  // Bắt đầu giao tiếp UART với Arduino
  uartSerial.print('M');  // Gửi lệnh 'M' (manual mode)
  Serial.println("UART initialized, sent 'M' to Arduino");

  // Khởi động MJPEG stream server và đăng ký IP với Node.js
  startStreamServer();
  registerWithServer();
}

void loop() {
  checkCommands();  // Kiểm tra lệnh từ server

  // Đăng ký lại với server mỗi 30 giây (phòng khi server restart)
  static unsigned long lastRegister = 0;
  if (millis() - lastRegister > 30000) {
    registerWithServer();
    lastRegister = millis();
  }

  delay(200);
}

// Hàm kiểm tra lệnh từ server Node.js
void checkCommands() {
  HTTPClient http;
  http.begin(String(serverUrl) + "/get_command");  // Endpoint lấy lệnh từ server
  int httpResponseCode = http.GET();

  if (httpResponseCode > 0) {
    String command = http.getString();  // Nhận lệnh ('F', 'B', 'L', 'R', 'A', 'M')
    uartSerial.print(command.charAt(0));  // Gửi lệnh đến Arduino
    Serial.println("Sent command to Arduino: " + command);
  } else {
    Serial.println("Error getting command");
  }

  http.end();
}