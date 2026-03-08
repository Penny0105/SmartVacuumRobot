#include <NewPing.h>        // Thư viện cảm biến siêu âm

// Định nghĩa chân L298N
const int LeftMotorForward = 13;
const int LeftMotorBackward = 12;
const int RightMotorForward = 11;
const int RightMotorBackward = 10;
const int ena = 6;
const int enb = 5;

// Định nghĩa chân cảm biến siêu âm SR04
#define trig_pin_left 2
#define echo_pin_left 3
#define trig_pin_front 7
#define echo_pin_front 4
#define trig_pin_right 8
#define echo_pin_right 9

// Cảm biến hồng ngoại LM393
#define ir_pin A0

#define maximum_distance 200
boolean goesForward = false;
int distance = 100;
bool autoMode = false; // Mặc định chế độ thủ công

// ===== STUCK DETECTION =====
// Loại 1: Kẹt trong không gian chật (tránh vật cản liên tục)
unsigned long stuckSpaceWindowStart = 0;
int avoidanceCount = 0;
const int STUCK_SPACE_THRESHOLD = 20;      // ≥20 lần tránh trong 30s = kẹt
const unsigned long STUCK_SPACE_WINDOW = 30000; // 30 giây

// Loại 2: Không nhận được cảm biến nào trong 30s
unsigned long lastValidSensorTime = 0;
const unsigned long STUCK_NO_SENSOR_TIMEOUT = 30000; // 30 giây

bool stuckAlertSent = false; // Chỉ gửi 1 lần cho đến khi hết kẹt
unsigned long lastStuckAlertTime = 0;
const unsigned long STUCK_ALERT_COOLDOWN = 15000; // 15s cooldown giữa 2 lần báo

NewPing sonarLeft(trig_pin_left, echo_pin_left, maximum_distance);
NewPing sonarFront(trig_pin_front, echo_pin_front, maximum_distance);
NewPing sonarRight(trig_pin_right, echo_pin_right, maximum_distance);

void setup() {
  Serial.begin(115200); // UART với ESP32
  pinMode(RightMotorForward, OUTPUT);
  pinMode(LeftMotorForward, OUTPUT);
  pinMode(LeftMotorBackward, OUTPUT);
  pinMode(RightMotorBackward, OUTPUT);
  pinMode(ena, OUTPUT);
  pinMode(enb, OUTPUT);
  pinMode(ir_pin, INPUT);

  // Khởi tạo khoảng cách ban đầu
  for (int i = 0; i < 4; i++) {
    distance = readFront();
    delay(100);
  }

  // Thiết lập tốc độ động cơ
  analogWrite(ena, 200);
  analogWrite(enb, 200);
}

void loop() {
  // Đọc lệnh UART từ ESP32
  static char cmdBuffer[10];
  static int cmdIndex = 0;
  while (Serial.available() > 0 && cmdIndex < sizeof(cmdBuffer) - 1) {
    char c = Serial.read();
    if (c == 'F' || c == 'B' || c == 'L' || c == 'R' || c == 'S' || c == 'A' || c == 'M') {
      cmdBuffer[cmdIndex++] = c;
      cmdBuffer[cmdIndex] = '\0';
      handleCommand(cmdBuffer[0]);
      cmdIndex = 0;
    }
    delay(1);
  }

  // Chế độ tự động
  if (autoMode) {
    static unsigned long lastActionTime = 0;
    static int autoState = 0; // 0=quét, 1=dừng, 2=lùi, 3=chọn hướng, 4=rẽ
    unsigned long currentTime = millis();

    // ===== STUCK DETECTION =====
    // Reset cửa sổ đếm avoidance mỗi 30s
    if (currentTime - stuckSpaceWindowStart > STUCK_SPACE_WINDOW) {
      avoidanceCount = 0;
      stuckSpaceWindowStart = currentTime;
    }

    // Kiểm tra kẹt loại 2: không nhận cảm biến nào trong 30s
    checkStuckNoSensor(currentTime);

    if (autoState == 0) {
      // State 0: Quét cảm biến - chỉ kiểm tra khi không đang tránh vật cản
      int irState = digitalRead(ir_pin);
      if (irState == HIGH) {
        // Phát hiện hố → bắt đầu chuỗi tránh
        moveStop();
        autoState = 1;
        lastActionTime = currentTime;
        avoidanceCount++;
        checkStuckSpace(currentTime);
      } else {
        distance = readFront();
        if (distance <= 10) {
          // Phát hiện vật cản → bắt đầu chuỗi tránh
          moveStop();
          autoState = 1;
          lastActionTime = currentTime;
          avoidanceCount++;
          checkStuckSpace(currentTime);
        } else {
          // An toàn → đi thẳng
          moveForward();
        }
      }
    } else if (autoState == 1 && currentTime - lastActionTime >= 300) {
      moveBackward();
      autoState = 2;
      lastActionTime = currentTime;
    } else if (autoState == 2 && currentTime - lastActionTime >= 400) {
      moveStop();
      autoState = 3;
      lastActionTime = currentTime;
    } else if (autoState == 3 && currentTime - lastActionTime >= 300) {
      int distanceRight = readRight();
      int distanceLeft = readLeft();
      if (distanceRight >= distanceLeft) {
        turnRight();
      } else {
        turnLeft();
      }
      autoState = 4;
      lastActionTime = currentTime;
    } else if (autoState == 4 && currentTime - lastActionTime >= 500) {
      moveStop();
      autoState = 0;
      // Nếu đã thoát kẹt (ít avoidance) → cho phép báo lại
      if (avoidanceCount < STUCK_SPACE_THRESHOLD) {
        stuckAlertSent = false;
      }
    }
  }
}

void handleCommand(char cmd) {
  switch (cmd) {
    case 'A':
      if (!autoMode) {  // Chỉ xử lý nếu chưa ở chế độ tự động
        autoMode = true;
        moveStop();
        resetStuckDetection();
        Serial.println("Auto mode enabled");
      }
      break;
    case 'M':
      if (autoMode) {  // Chỉ xử lý nếu chưa ở chế độ thủ công
        autoMode = false;
        moveStop();
        resetStuckDetection();
        Serial.println("Manual mode enabled");
      }
      break;
    default:
      if (!autoMode) {
        switch (cmd) {
          case 'F': moveForward(); break;
          case 'B': moveBackward(); break;
          case 'L': turnLeft(); break;
          case 'R': turnRight(); break;
          case 'S': moveStop(); break;
        }
      }
      break;
  }
}

int readRight() {
  delay(70);
  int cm = sonarRight.ping_cm();
  if (cm != 0) {
    lastValidSensorTime = millis();
  } else {
    cm = maximum_distance;
  }
  return cm;
}

int readLeft() {
  delay(70);
  int cm = sonarLeft.ping_cm();
  if (cm != 0) {
    lastValidSensorTime = millis();
  } else {
    cm = maximum_distance;
  }
  return cm;
}

int readFront() {
  delay(70);
  int cm = sonarFront.ping_cm();
  if (cm != 0) {
    lastValidSensorTime = millis();
  } else {
    cm = maximum_distance;
  }
  return cm;
}

void moveStop() {
  digitalWrite(RightMotorForward, LOW);
  digitalWrite(LeftMotorForward, LOW);
  digitalWrite(RightMotorBackward, LOW);
  digitalWrite(LeftMotorBackward, LOW);
  goesForward = false;
}

void moveForward() {
  analogWrite(ena, 200);
  analogWrite(enb, 200);
  digitalWrite(LeftMotorForward, HIGH);
  digitalWrite(RightMotorForward, HIGH);
  digitalWrite(LeftMotorBackward, LOW);
  digitalWrite(RightMotorBackward, LOW);
  goesForward = true;
}

void moveBackward() {
  analogWrite(ena, 200);
  analogWrite(enb, 200);
  digitalWrite(LeftMotorBackward, HIGH);
  digitalWrite(RightMotorBackward, HIGH);
  digitalWrite(LeftMotorForward, LOW);
  digitalWrite(RightMotorForward, LOW);
  goesForward = false;
}

void turnRight() {
  analogWrite(ena, 200);
  analogWrite(enb, 200);
  digitalWrite(LeftMotorBackward, HIGH);
  digitalWrite(RightMotorForward, HIGH);
  digitalWrite(LeftMotorForward, LOW);
  digitalWrite(RightMotorBackward, LOW);
}

void turnLeft() {
  analogWrite(ena, 200);
  analogWrite(enb, 200);
  digitalWrite(LeftMotorForward, HIGH);
  digitalWrite(RightMotorBackward, HIGH);
  digitalWrite(LeftMotorBackward, LOW);
  digitalWrite(RightMotorForward, LOW);
}

// ===== STUCK DETECTION FUNCTIONS =====

// Loại 1: Kiểm tra kẹt trong không gian chật
void checkStuckSpace(unsigned long currentTime) {
  if (avoidanceCount >= STUCK_SPACE_THRESHOLD && !stuckAlertSent 
      && (currentTime - lastStuckAlertTime > STUCK_ALERT_COOLDOWN)) {
    Serial.println("STUCK:1");
    stuckAlertSent = true;
    lastStuckAlertTime = currentTime;
  }
}

// Loại 2: Kiểm tra không nhận cảm biến nào trong 30s
void checkStuckNoSensor(unsigned long currentTime) {
  if (lastValidSensorTime > 0 
      && currentTime - lastValidSensorTime > STUCK_NO_SENSOR_TIMEOUT
      && !stuckAlertSent
      && (currentTime - lastStuckAlertTime > STUCK_ALERT_COOLDOWN)) {
    Serial.println("STUCK:2");
    stuckAlertSent = true;
    lastStuckAlertTime = currentTime;
  }
}

// Reset stuck detection (khi chuyển mode)
void resetStuckDetection() {
  avoidanceCount = 0;
  stuckSpaceWindowStart = millis();
  lastValidSensorTime = millis();
  stuckAlertSent = false;
}