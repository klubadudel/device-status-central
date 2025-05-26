
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database"; // Import Realtime Database

// IMPORTANT: CRITICAL FOR FIREBASE AUTHENTICATION AND DATABASE TO FUNCTION.
// Ensure you have these environment variables set in your .env.local file (create one if it doesn't exist).
// These values come from your Firebase project settings (Project Overview -> Project settings -> General -> Your apps -> SDK setup and configuration).

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "YOUR_FALLBACK_API_KEY", // Fallback for safety
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL, // Add Realtime Database URL
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const missingCriticalVars = [];
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_FALLBACK_API_KEY") missingCriticalVars.push("NEXT_PUBLIC_FIREBASE_API_KEY");
if (!firebaseConfig.authDomain) missingCriticalVars.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
if (!firebaseConfig.projectId) missingCriticalVars.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
if (!firebaseConfig.databaseURL) {
    missingCriticalVars.push("NEXT_PUBLIC_FIREBASE_DATABASE_URL");
    console.error("Firebase Config Error: NEXT_PUBLIC_FIREBASE_DATABASE_URL is missing. Realtime Database features will not work correctly.");
}


if (missingCriticalVars.length > 0 && missingCriticalVars.some(v => v !== "NEXT_PUBLIC_FIREBASE_DATABASE_URL" || (v === "NEXT_PUBLIC_FIREBASE_DATABASE_URL" && !firebaseConfig.databaseURL))) {
  console.error(
    "CRITICAL Firebase Config Error: The following required environment variables are missing or undefined: " +
    missingCriticalVars.join(", ") +
    ". Please ensure they are correctly set in your .env.local file and that the file is being loaded.",
    "Current partial config being used by Firebase SDK:", firebaseConfig
  );
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app); // Export Realtime Database instance

// Log to confirm initialization and RTDB URL
console.log("Firebase Initialized. Project ID:", firebaseConfig.projectId);
if (rtdb && rtdb.app.options.databaseURL) {
    console.log("Firebase Realtime Database URL Configured:", rtdb.app.options.databaseURL);
} else if (firebaseConfig.databaseURL) {
    console.warn("Firebase Realtime Database URL present in config but rtdb instance might not be fully resolved for logging URL here. Configured URL:", firebaseConfig.databaseURL);
} else {
    console.error("Firebase Realtime Database URL is NOT configured. RTDB features will fail.");
}
// console.log("Firestore instance:", db ? "OK" : "Failed");
// console.log("Realtime Database instance:", rtdb ? "OK" : "Failed");
// console.log("Auth instance:", auth ? "OK" : "Failed");
