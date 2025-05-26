#include <Arduino.h>
#line 1 "C:\\ESP\\sketch_may15a\\sketch_may15a.ino"
#include <EmonLib.h>
#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include "config.h"

#define SENSOR_PIN A0
#define LED_PIN 2
const float CURRENT_THRESHOLD = 0.3;

// Firebase
FirebaseData firebaseData;
FirebaseAuth firebaseAuth;
FirebaseConfig firebaseConfig;

// Auth token
String idToken = "";

// NTP
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "time.windows.com", 0, 60000);

// EnergyMonitor
EnergyMonitor ctSensor;

// Allowed digital pins for digital read/pinMode
const int PIN_D0 = 16;  // GPIO16 (D0)
const int PIN_D1 = 5;   // GPIO5  (D1)
const int PIN_D2 = 4;   // GPIO4  (D2)
const int PIN_D3 = 0;   // GPIO0  (D3)
const int PIN_D4 = 2;   // GPIO2  (D4)
const int PIN_D5 = 14;  // GPIO14 (D5)
const int PIN_D6 = 12;  // GPIO12 (D6)
const int PIN_D7 = 13;  // GPIO13 (D7)
const int PIN_D8 = 15;  // GPIO15 (D8)

// Struct to hold device info
struct SensorDevice {
  String deviceId;
  int pin;
};

std::vector<SensorDevice> devices; // List of configured devices

// Flag to indicate if NTP time is valid
bool ntpTimeValid = false;

// Check if pin is allowed for digital IO
#line 52 "C:\\ESP\\sketch_may15a\\sketch_may15a.ino"
bool isAllowedDigitalPin(int pin);
#line 58 "C:\\ESP\\sketch_may15a\\sketch_may15a.ino"
bool isAnalogPin(int pin);
#line 62 "C:\\ESP\\sketch_may15a\\sketch_may15a.ino"
void setup();
#line 133 "C:\\ESP\\sketch_may15a\\sketch_may15a.ino"
void loop();
#line 167 "C:\\ESP\\sketch_may15a\\sketch_may15a.ino"
void fetchDeviceMappings();
#line 209 "C:\\ESP\\sketch_may15a\\sketch_may15a.ino"
void uploadToFirebase(const String& deviceId, bool deviceStatus);
#line 229 "C:\\ESP\\sketch_may15a\\sketch_may15a.ino"
void syncRTDBToFirestore(const String& deviceId);
#line 276 "C:\\ESP\\sketch_may15a\\sketch_may15a.ino"
void getAuthToken();
#line 52 "C:\\ESP\\sketch_may15a\\sketch_may15a.ino"
bool isAllowedDigitalPin(int pin) {
  return (pin == PIN_D0 || pin == PIN_D1 || pin == PIN_D2 || pin == PIN_D3 ||
          pin == PIN_D4 || pin == PIN_D5 || pin == PIN_D6 || pin == PIN_D7 || pin == PIN_D8);
}

// Check if pin is A0 analog pin
bool isAnalogPin(int pin) {
  return (pin == A0);
}

void setup() {
  Serial.begin(115200);
  Serial.println("Starting setup...");

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);

  ctSensor.current(SENSOR_PIN, 20);

  // Connect to Wi-Fi
  Serial.print("Connecting to Wi-Fi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    digitalWrite(LED_PIN, LOW);
    delay(200);
    digitalWrite(LED_PIN, HIGH);
    delay(200);
  }
  digitalWrite(LED_PIN, HIGH);
  Serial.println("\nWi-Fi Connected!");
  Serial.println(WiFi.localIP());

  // Initialize NTP
  Serial.print("Initializing NTP... ");
  timeClient.begin();

  int retries = 0;
  ntpTimeValid = false;
  while (retries < 5) {
    if (timeClient.update()) {
      ntpTimeValid = true;
      break;
    }
    Serial.println("Retrying NTP sync...");
    delay(1000);
    retries++;
  }

  if (!ntpTimeValid) {
    Serial.println("Trying forceUpdate()...");
    if (timeClient.forceUpdate()) {
      ntpTimeValid = true;
      Serial.println("NTP time updated successfully by forceUpdate.");
    } else {
      Serial.println("forceUpdate() also failed.");
    }
  }

  if (!ntpTimeValid) {
    Serial.println("NTP sync failed. Setting fallback offset (UTC).");
    timeClient.setTimeOffset(0);
  } else {
    Serial.println("NTP time synced.");
  }

  // Firebase setup
  Serial.println("Initializing Firebase...");
  firebaseConfig.host = FIREBASE_HOST;
  firebaseConfig.api_key = FIREBASE_API_KEY;
  firebaseAuth.user.email = FIREBASE_EMAIL;
  firebaseAuth.user.password = FIREBASE_PASSWORD;

  Firebase.begin(&firebaseConfig, &firebaseAuth);
  Firebase.reconnectWiFi(true);
  Serial.println("Firebase Initialized.");

  getAuthToken(); // Get initial token
  fetchDeviceMappings(); // Pull deviceId <-> pin mapping
}

void loop() {
  Serial.println("Loop running...");
  Serial.print("WiFi RSSI: ");
  Serial.println(WiFi.RSSI());

  for (auto& device : devices) {
    if (isAnalogPin(device.pin)) {
      // Skip digitalRead on analog pin, or handle analog input here if needed
      Serial.printf("Device %s is on analog pin A0; skipping digital read.\n", device.deviceId.c_str());
      continue;
    }
    if (!isAllowedDigitalPin(device.pin)) {
      Serial.printf("Device %s has invalid pin %d, skipping.\n", device.deviceId.c_str(), device.pin);
      continue;
    }

    int pinValue = digitalRead(device.pin);
    Serial.printf("Checking device %s on pin %d: value=%d\n", device.deviceId.c_str(), device.pin, pinValue);

    if (pinValue == LOW) { // Sensor plugged in (pin pulled low)
      double current = ctSensor.calcIrms(1480);
      bool isOn = current > CURRENT_THRESHOLD;
      Serial.printf("Device %s (Pin %d) Current: %.3f A — %s\n",
                    device.deviceId.c_str(), device.pin, current, isOn ? "ON" : "OFF");
      uploadToFirebase(device.deviceId, isOn);
      syncRTDBToFirestore(device.deviceId);
    } else {
      Serial.printf("Device %s not plugged in.\n", device.deviceId.c_str());
    }
  }

  delay(1000);
}

void fetchDeviceMappings() {
  if (!Firebase.getJSON(firebaseData, "/devices")) {
    Serial.println("Failed to fetch device mappings: " + firebaseData.errorReason());
    return;
  }

  FirebaseJson& json = firebaseData.jsonObject();
  size_t count = json.iteratorBegin();

  for (size_t i = 0; i < count; i++) {
    int type;
    String deviceId, dummy;

    json.iteratorGet(i, type, deviceId, dummy);

    String pinPath = "/devices/" + deviceId + "/pin";
    if (Firebase.get(firebaseData, pinPath)) {
      int pin = firebaseData.intData();

      // Accept only allowed pins or A0 analog pin
      if (!(isAllowedDigitalPin(pin) || isAnalogPin(pin))) {
        Serial.printf("Device %s has disallowed pin %d. Ignoring.\n", deviceId.c_str(), pin);
        continue;
      }

      if (isAllowedDigitalPin(pin)) {
        pinMode(pin, INPUT_PULLUP); // Setup digital input pins
      }

      devices.push_back({deviceId, pin});
      Serial.printf("Loaded device: %s on pin %d\n", deviceId.c_str(), pin);
    } else {
      Serial.printf("Failed to get pin for device %s: %s\n",
                    deviceId.c_str(), firebaseData.errorReason().c_str());
    }
  }

  json.iteratorEnd();

  Serial.printf("Total devices loaded: %d\n", (int)devices.size());
}

void uploadToFirebase(const String& deviceId, bool deviceStatus) {
  String status = deviceStatus ? "online" : "offline";
  String timestamp = String(timeClient.getEpochTime());
  String path = "/devices/" + deviceId;

  Serial.print("Uploading status for device " + deviceId + "...");
  if (Firebase.setString(firebaseData, path + "/status", status)) {
    Serial.println("Status uploaded: " + status);
  } else {
    Serial.println("Firebase Error (status): " + firebaseData.errorReason());
  }

  Serial.print("Uploading timestamp...");
  if (Firebase.setString(firebaseData, path + "/last_updated", timestamp)) {
    Serial.println("Timestamp uploaded: " + timestamp);
  } else {
    Serial.println("Firebase Error (timestamp): " + firebaseData.errorReason());
  }
}

void syncRTDBToFirestore(const String& deviceId) {
  String path = "/devices/" + deviceId + "/status";
  String rtdbStatus;

  if (!Firebase.getString(firebaseData, path)) {
    Serial.println("Firebase Error (RTDB): " + firebaseData.errorReason());
    return;
  }

  rtdbStatus = firebaseData.stringData();
  Serial.println("RTDB status for " + deviceId + ": " + rtdbStatus);

  if (idToken == "") {
    Serial.println("Error: ID token is empty. Re-authenticating...");
    getAuthToken();
    if (idToken == "") {
      Serial.println("Re-authentication failed. Skipping Firestore sync.");
      return;
    }
  }

  String firestorePath = "devices/" + deviceId;
  String firestoreUrl = "https://firestore.googleapis.com/v1/projects/" + String(FIREBASE_PROJECT_ID) + "/databases/(default)/documents/" + firestorePath;

  String jsonPayload = "{ \"fields\": { \"status\": { \"stringValue\": \"" + rtdbStatus + "\" }, \"timestamp\": { \"timestampValue\": \"" + String(timeClient.getEpochTime()) + "\" } } }";

  WiFiClientSecure secureClient;
  secureClient.setInsecure();

  HTTPClient http;
  http.begin(secureClient, firestoreUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + idToken);

  int httpResponseCode = http.PATCH(jsonPayload);

  if (httpResponseCode == 200) {
    Serial.println("Synced " + deviceId + " to Firestore.");
  } else {
    Serial.print("Error syncing to Firestore. Code: ");
    Serial.println(httpResponseCode);
    Serial.println(http.getString());
  }

  http.end();
}

void getAuthToken() {
  if (!ntpTimeValid) {
    Serial.println("NTP time not updated. Skipping token request.");
    return;
  }

  WiFiClientSecure secureClient;
  secureClient.setInsecure();

  HTTPClient http;
  String url = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + String(FIREBASE_API_KEY);
  String postData = "{\"email\":\"" + String(FIREBASE_EMAIL) + "\",\"password\":\"" + String(FIREBASE_PASSWORD) + "\",\"returnSecureToken\":true}";

  http.begin(secureClient, url);
  http.addHeader("Content-Type", "application/json");

  int httpResponseCode = http.POST(postData);
  if (httpResponseCode == 200) {
    String response = http.getString();
    int idTokenStart = response.indexOf("\"idToken\":\"") + 11;
    int idTokenEnd = response.indexOf("\"", idTokenStart);
    idToken = response.substring(idTokenStart, idTokenEnd);
    Serial.println("Auth token acquired.");
  } else {
    Serial.print("Failed to get Auth Token. HTTP Code: ");
    Serial.println(httpResponseCode);
    Serial.println(http.getString());
  }

  http.end();
}

