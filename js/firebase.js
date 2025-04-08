const firebaseConfig = {
    apiKey: "AIzaSyBt5XCrUZd2QnO0No4aoUcTkLsTw3zPl2A",
    authDomain: "remote-stethoscope.firebaseapp.com",
    projectId: "remote-stethoscope",
    storageBucket: "remote-stethoscope.appspot.com",
    messagingSenderId: "278785615905",
    appId: "1:278785615905:web:3e0fdd05539af815335b60",
    measurementId: "G-5G99972VC9"
};

async function uploadToCloud() {
    if (recordedChunks.length === 0) {
        updateStatus("No recording to upload", 'error');
        return;
    }

    uploadBtn.disabled = true;
    uploadBtn.textContent = "Uploading...";
    updateStatus("Uploading recording to cloud...", 'recording');

    try {
        const wavBlob = createWavBlob(recordedChunks, 1, 16000);
        
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        const filename = `heart_sound_${Date.now()}.wav`;
        const storageRef = firebase.storage().ref(`recordings/${filename}`);
        await storageRef.put(wavBlob);

        const downloadURL = await storageRef.getDownloadURL();
        await firebase.firestore().collection("recordings").add({
            filename,
            downloadURL,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            duration: 10,
            size: wavBlob.size,
            volume: currentVolume,
            filtered: useFilter
        });

        uploadBtn.textContent = "Upload to Cloud";
        updateStatus("Recording uploaded successfully!", 'success');
    } catch (error) {
        console.error("Upload failed:", error);
        updateStatus(`Upload failed: ${error.message}`, 'error');
        uploadBtn.textContent = "Upload Failed";
    } finally {
        uploadBtn.disabled = false;
    }
}