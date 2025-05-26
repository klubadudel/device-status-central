// functions/src/index.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK.
// This needs to be done only once.
// It uses the project's service account credentials by default when deployed.
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

// HTTP-triggered function to update device status
// Your ESP8266 would make a POST request to the URL of this function.
export const updateDeviceStatus = functions.https.onRequest(
  async (request, response) => {
    // Basic security: Check for a secret key if you want to add some
    // protection. You'd configure this secret key on your ESP8266.
    // const SECRET_KEY = functions.config().esp?.secret_key ||
    //   "YOUR_FALLBACK_SECRET_KEY";
    // if (request.headers["x-secret-key"] !== SECRET_KEY) {
    //   functions.logger.warn(
    //     "Unauthorized update attempt", // Shortened string
    //     { headers: request.headers }
    //   );
    //   response.status(401).send("Unauthorized");
    //   return;
    // }

    if (request.method !== "POST") {
      response.status(405)
        .send("Method Not Allowed (Only POST is supported)");
      return;
    }

    const {deviceId, status} = request.body;

    if (!deviceId || !status) {
      response.status(400)
        .send("Missing deviceId or status in request body");
      return;
    }

    if (status !== "online" && status !== "offline") {
      response.status(400)
        .send("Invalid status. Must be 'online' or 'offline'.");
      return;
    }

    try {
      const deviceRef = db.collection("devices").doc(deviceId);
      await deviceRef.update({
        status: status,
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      });
      functions.logger.info(`Device ${deviceId} status updated to ${status}`);
      response.status(200)
        .send(`Device ${deviceId} status updated to ${status}`);
    } catch (error) {
      functions.logger.error(`Error updating device ${deviceId}:`, error);
      response.status(500).send("Error updating device status.");
    }
  });

// You can add more functions here as needed.
