## Device Firmware (ESP8266 + SCT-013)

This project includes an embedded system for monitoring power usage of branch devices (e.g., AC, refrigerators) using an ESP8266 microcontroller and SCT-013 current sensor.

You can find the source code and setup guide here: [`device-firmware/`](./device-firmware/)

- Real-time data reporting to Firebase Realtime Database
- Wi-Fi auto-config (via captive portal)
- Configurable upload intervals and device IDs

## Libraries Used

- `FirebaseESP8266.h` – Firebase client library for ESP8266
- `WiFiManager.h` – Handles smart Wi-Fi configuration via captive portal
- `EmonLib.h` – Calculates RMS current from analog input
- `NTPClient.h` – Synchronizes time with network time servers
- `WiFiClientSecure.h` – Enables HTTPS requests from ESP8266
- `WiFiUdp.h` – UDP support required by NTPClient
- `config.h` – Project-specific settings (Wi-Fi, Firebase credentials, etc.)

---

## 🛠 config.h Example

```cpp
#ifndef CONFIG_H
#define CONFIG_H

#define WIFI_SSID "your_wifi_ssid"
#define WIFI_PASSWORD "your_wifi_password"

#define FIREBASE_HOST "your-project-id.firebaseio.com"
#define FIREBASE_API_KEY "your-firebase-api-key"

#define FIREBASE_EMAIL "your-firebase-email"
#define FIREBASE_PASSWORD "your-firebase-password"

#define FIREBASE_PROJECT_ID "your-firebase-project-id"
#define FIREBASE_AUTH_TOKEN "your-auth-token"

#endif

