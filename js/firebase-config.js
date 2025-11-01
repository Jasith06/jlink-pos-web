// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyC9LacuzRJxswEETpZR2B0UUGSFWjIy540",
    authDomain: "jlink-38a3d.firebaseapp.com",
    databaseURL: "https://jlink-38a3d-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "jlink-38a3d",
    storageBucket: "jlink-38a3d.firebasestorage.app",
    messagingSenderId: "656810229652",
    appId: "1:656810229652:web:557261a441412e27b11981"
};

// Initialize Firebase
try {
    const app = firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    const auth = firebase.auth();

    console.log("✅ Firebase initialized successfully");

    // Make them globally available
    window.firebaseApp = app;
    window.database = database;
    window.auth = auth;

} catch (error) {
    console.error("❌ Firebase initialization error:", error);
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebaseConfig };
}