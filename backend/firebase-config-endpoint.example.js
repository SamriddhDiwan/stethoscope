// backend/firebase-config-endpoint.js
// EXAMPLE: Node.js + Express backend endpoint to serve Firebase config securely
// This prevents hardcoding secrets in client-side code

const express = require('express');
const app = express();

// Middleware to verify authentication token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No authorization token' });
    }
    // Verify token against your auth system (Firebase Auth, JWT, etc.)
    // This is a placeholder - implement proper verification
    next();
};

// Endpoint to serve Firebase config
app.get('/api/firebase-config', verifyToken, (req, res) => {
    // Load from environment variables (NOT hardcoded)
    const firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID
    };

    // Validate config is loaded
    if (!firebaseConfig.apiKey) {
        return res.status(500).json({ error: 'Firebase config not configured' });
    }

    res.json(firebaseConfig);
});

app.listen(3000, () => console.log('Config server running on port 3000'));
