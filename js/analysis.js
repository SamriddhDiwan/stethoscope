async function analyzeHeartRate() {
    const fileInput = document.getElementById('heartAudioInput');
    const resultText = document.getElementById('analysisResult');

    if (fileInput.files.length === 0) {
        resultText.innerText = 'Please select a WAV file.';
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    resultText.innerText = 'Analyzing...';

    try {
        const response = await fetch('http://localhost:5000/analyze', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            resultText.innerText = `❤️ Heart Rate: ${result.heart_rate_bpm} BPM\n🫀 Beats Detected: ${result.num_beats}`;
        } else {
            resultText.innerText = `❌ Error: ${result.error}`;
        }
    } catch (err) {
        resultText.innerText = `⚠️ Failed to connect to analysis server: ${err}`;
    }
}
