// firebase.js - Firebase Configuration and Upload Functions

// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBt5XCrUZd2QnO0No4aoUcTkLsTw3zPl2A",
    authDomain: "remote-stethoscope.firebaseapp.com",
    projectId: "remote-stethoscope",
    storageBucket: "remote-stethoscope.firebasestorage.app",
    messagingSenderId: "278785615905",
    appId: "1:278785615905:web:3e0fdd05539af815335b60",
    measurementId: "G-5G99972VC9"
  };

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Firebase services
const storage = firebase.storage();
const firestore = firebase.firestore();

// Upload function
async function uploadToCloud() {
    if (!recordedChunks || recordedChunks.length === 0) {
        updateStatus("No recording to upload", 'error');
        return;
    }

    const uploadBtn = document.getElementById("uploadBtn");
    try {
        uploadBtn.disabled = true;
        uploadBtn.textContent = "Uploading...";
        updateStatus("Uploading recording to cloud...", 'recording');

        // Create WAV file
        const wavBlob = createWavBlob(recordedChunks, 1, 16000);
        const filename = `heart_sound_${Date.now()}.wav`;
        const storageRef = storage.ref(`recordings/${filename}`);
        
        // Upload to Storage
        await storageRef.put(wavBlob);
        const downloadURL = await storageRef.getDownloadURL();

        // Add to Firestore
        await firestore.collection("recordings").add({
            filename,
            downloadURL,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            duration: 10,
            size: wavBlob.size,
            volume: currentVolume,
            filtered: useFilter
        });

        updateStatus("Recording uploaded successfully!", 'success');
        uploadBtn.textContent = "Upload to Cloud";
    } catch (error) {
        console.error("Upload failed:", error);
        updateStatus(`Upload failed: ${error.message}`, 'error');
        uploadBtn.textContent = "Upload Failed";
    } finally {
        uploadBtn.disabled = false;
    }
}

// Make function available globally
window.uploadToCloud = uploadToCloud;