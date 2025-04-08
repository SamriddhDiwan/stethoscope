function startRecording() {
    if (isRecording) return;

    recordedChunks = [];
    isRecording = true;
    recordStartTime = Date.now();
    recordBtn.disabled = true;
    recordBtn.textContent = "Recording...";
    updateStatus("Recording started...", 'recording');

    // Reset filter state for new recording
    resetFilterState();

    // Update progress
    const progressInterval = setInterval(() => {
        if (!isRecording) {
            clearInterval(progressInterval);
            return;
        }
        const elapsed = Date.now() - recordStartTime;
        const remaining = Math.max(0, RECORD_DURATION - elapsed);
        recordBtn.textContent = `Recording... (${Math.round(remaining/1000)}s)`;
    }, 200);

    // Auto-stop timer
    setTimeout(stopRecording, RECORD_DURATION);
}

function stopRecording() {
    if (!isRecording) return;

    isRecording = false;
    recordBtn.disabled = false;
    recordBtn.textContent = "Record 10 Seconds";

    if (recordedChunks.length === 0) {
        updateStatus("No audio data recorded", 'error');
        return;
    }

    try {
        // Create WAV file from processed chunks
        const wavBlob = createWavBlob(recordedChunks, 1, 16000);
        const audioUrl = URL.createObjectURL(wavBlob);

        // Set up download
        downloadLink.href = audioUrl;
        downloadLink.download = `heart_sound_${new Date().toISOString().replace(/[:.]/g, '-')}.wav`;
        downloadLink.style.display = 'inline-block';
        uploadBtn.style.display = 'inline-block';

        updateStatus(`Recording complete! Size: ${formatBytes(wavBlob.size)}`, 'success');
    } catch (error) {
        updateStatus(`Error creating WAV file: ${error}`, 'error');
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function createWavBlob(chunks, channels, sampleRate) {
    // Calculate total bytes
    const totalBytes = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);

    // Create WAV header
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* RIFF chunk length */
    view.setUint32(4, 36 + totalBytes, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* Format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* Format chunk length */
    view.setUint32(16, 16, true);
    /* Sample format (raw) */
    view.setUint16(20, 1, true);
    /* Channel count */
    view.setUint16(22, channels, true);
    /* Sample rate */
    view.setUint32(24, sampleRate, true);
    /* Byte rate */
    view.setUint32(28, sampleRate * channels * 2, true);
    /* Block align */
    view.setUint16(32, channels * 2, true);
    /* Bits per sample */
    view.setUint16(34, 16, true);
    /* Data chunk identifier */
    writeString(view, 36, 'data');
    /* Data chunk length */
    view.setUint32(40, totalBytes, true);

    // Combine header and audio data
    const merged = new Uint8Array(44 + totalBytes);
    merged.set(new Uint8Array(header), 0);

    let offset = 44;
    chunks.forEach(chunk => {
        merged.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
    });

    return new Blob([merged], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}