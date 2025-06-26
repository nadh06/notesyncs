// lib/firebase.js

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// import { getStorage } from 'firebase/storage'; // Uncomment if you plan to use Firebase Storage

// MANDATORY global variables from Canvas environment (these are typically injected at runtime)
const firebaseConfigFromEnv = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

// User's provided firebaseConfig from .env.local (fallback)
const userProvidedFirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Uncomment if you have this
};

// Determine which config to use. Prefer Canvas injected config if available.
const currentFirebaseConfig = Object.keys(firebaseConfigFromEnv).length > 0
  ? firebaseConfigFromEnv
  : userProvidedFirebaseConfig;

// Initialize Firebase App
let app;
if (!getApps().length) {
  // If no Firebase app is initialized, initialize it
  app = initializeApp(currentFirebaseConfig);
} else {
  // Otherwise, get the existing Firebase app instance
  app = getApp();
}

// Get Firebase service instances
export const auth = getAuth(app);
export const db = getFirestore(app);
// export const storage = getStorage(app); // Export if using storage