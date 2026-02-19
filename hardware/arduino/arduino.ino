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
    static int autoState = 0;
    unsigned long currentTime = millis();
    int irState = digitalRead(ir_pin); // Đọc hồng ngoại
    if (irState == HIGH) { // Phát hiện hố
      if (autoState == 0) {
        moveStop();
        autoState = 1;
        lastActionTime = currentTime;
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
          autoState = 4;
          lastActionTime = currentTime;
        } else {
          turnLeft();
          autoState = 5;
          lastActionTime = currentTime;
        }
      } else if ((autoState == 4 || autoState == 5) && currentTime - lastActionTime >= 300) {
        moveStop();
        autoState = 0;
        distance = readFront();
      }
    } else {
      // Tránh vật cản bằng siêu âm
      distance = readFront();
      if (distance <= 20) {
        if (autoState == 0) {
          moveStop();
          autoState = 1;
          lastActionTime = currentTime;
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
            autoState = 4;
            lastActionTime = currentTime;
          } else {
            turnLeft();
            autoState = 5;
            lastActionTime = currentTime;
          }
        } else if ((autoState == 4 || autoState == 5) && currentTime - lastActionTime >= 300) {
          moveStop();
          autoState = 0;
          distance = readFront();
        }
      } else {
        moveForward();
        autoState = 0;
      }
    }
  }
}

void handleCommand(char cmd) {
  switch (cmd) {
    case 'A':
      autoMode = true;
      moveStop();
      Serial.println("Auto mode enabled");
      break;
    case 'M':
      autoMode = false;
      moveStop();
      Serial.println("Manual mode enabled");
      break;
    default:
      if (!autoMode) {
        switch (cmd) {
          case 'F': moveForward(); Serial.println("Forward command executed"); break;
          case 'B': moveBackward(); Serial.println("Backward command executed"); break;
          case 'L': turnLeft(); Serial.println("Left command executed"); break;
          case 'R': turnRight(); Serial.println("Right command executed"); break;
          case 'S': moveStop(); Serial.println("Stop command executed"); break;
        }
      }
      break;
  }
}

int readRight() {
  delay(70);
  int cm = sonarRight.ping_cm();
  if (cm == 0) {
    cm = maximum_distance;
  }
  return cm;
}

int readLeft() {
  delay(70);
  int cm = sonarLeft.ping_cm();
  if (cm == 0) {
    cm = maximum_distance;
  }
  return cm;
}

int readFront() {
  delay(70);
  int cm = sonarFront.ping_cm();
  if (cm == 0) {
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
  digitalWrite(LeftMotorForward, HIGH);
  digitalWrite(RightMotorBackward, HIGH);
  digitalWrite(LeftMotorBackward, LOW);
  digitalWrite(RightMotorForward, LOW);
}

void turnLeft() {
  analogWrite(ena, 200);
  analogWrite(enb, 200);
  digitalWrite(LeftMotorBackward, HIGH);
  digitalWrite(RightMotorForward, HIGH);
  digitalWrite(LeftMotorForward, LOW);
  digitalWrite(RightMotorBackward, LOW);
}