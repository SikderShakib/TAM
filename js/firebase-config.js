/* TAM — Firebase configuration (Cloud Mode)
   Leave FIREBASE_CONFIG as null → LOCAL mode (data in this browser only).
   Paste your NEW Firebase project's web config here → CLOUD mode:
   login accounts + one shared database for the team.
   IMPORTANT: Create a NEW Firebase project for TAM. Do NOT reuse the OTW
   project — TAM data and OTW data must stay separate.
   This config is not a secret; security comes from login + firestore.rules. */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAzwFzI09AeQ0KjCKWAAJBvK87eLjeNNDU",
  authDomain: "tam-fund.firebaseapp.com",
  projectId: "tam-fund",
  storageBucket: "tam-fund.firebasestorage.app",
  messagingSenderId: "112667337479",
  appId: "1:112667337479:web:82ad18265aff1339699ba2"
};
