// Initialize dark mode
function addDarkmodeWidget() {
    new Darkmode().showWidget();
}
window.addEventListener('load', addDarkmodeWidget);

// DOM elements
// In main.js (top of file)
window.currentVolume = 1.0;
window.useFilter = true;
const connectBtn = document.getElementById("connectBtn");
const pauseBtn = document.getElementById("pauseBtn");
const continueBtn = document.getElementById("continueBtn");
const recordBtn = document.getElementById("recordBtn");
const downloadLink = document.getElementById("downloadLink");
const uploadBtn = document.getElementById("uploadBtn");
const statusDiv = document.getElementById("status");
const volumeLabel = document.getElementById("volumeLabel");
const filterToggle = document.getElementById("filterToggle");
const filterStatus = document.getElementById("filterStatus");

// Shared variables
let player;
let ws;
let currentVolume = 1.0;
let isRecording = false;
let recordStartTime;
const RECORD_DURATION = 10000; // 10 seconds
let recordedChunks = [];
let useFilter = true;

// Initialize graph
initGraph();

// Toggle filter function
filterToggle.addEventListener('change', function() {
    useFilter = this.checked;
    filterStatus.textContent = useFilter ? "Filtered Audio" : "Raw Audio";
    
    // Reset filter state when toggling
    resetFilterState();
    
    updateStatus(`Audio mode switched to ${useFilter ? 'filtered' : 'raw'}`, 'success');
});

// UI control functions
function changeVolume(e) {
    currentVolume = parseFloat(e.target.value);
    volumeLabel.textContent = `${currentVolume.toFixed(1)}x`;
    if (player) {
        player.volume(currentVolume);
    }
}

function pause() {
    if (player) {
        player.pause();
        pauseBtn.disabled = true;
        continueBtn.disabled = false;
        updateStatus("Playback paused", 'recording');
    }
}

function continuePlay() {
    if (player) {
        player.continue();
        pauseBtn.disabled = false;
        continueBtn.disabled = true;
        updateStatus("Playback resumed", 'success');
    }
}

function updateStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + (type || '');
}

// WebSocket connection with audio processing
function connect() {
    updateStatus("Connecting to WebSocket...", 'recording');
    connectBtn.disabled = true;
    pauseBtn.disabled = false;
    recordBtn.disabled = false;

    // Initialize PCM player
    player = new PCMPlayer({
        inputCodec: 'Int16',
        channels: 1,
        sampleRate: 16000,
        flushTime: 200,
    });

    const WS_URL = 'ws://192.168.187.139:8080'; // Replace with your server address
    ws = new WebSocket(WS_URL);
    ws.binaryType = 'arraybuffer';

    ws.onopen = function() {
        updateStatus("Connected to WebSocket server", 'success');
    };

    ws.onmessage = function(event) {
        if (continueBtn.disabled) {
            try {
                // Process the audio (filter + volume)
                const processedData = processAudioData(event.data);
                
                // Feed to player
                player.feed(processedData);
                
                // Update graph (using first 100 samples)
                const samples = new Int16Array(processedData);
                updateGraph(samples);

                // If recording, store the processed data
                if (isRecording) {
                    recordedChunks.push(processedData);
                }
            } catch (error) {
                updateStatus(`Audio processing error: ${error}`, 'error');
            }
        }
    };

    ws.onerror = function(error) {
        updateStatus(`WebSocket Error: ${error.message}`, 'error');
        connectBtn.disabled = false;
        pauseBtn.disabled = true;
        recordBtn.disabled = true;
        player = null;
    };

    ws.onclose = function() {
        updateStatus("WebSocket connection closed", 'recording');
        connectBtn.disabled = false;
        pauseBtn.disabled = true;
        recordBtn.disabled = true;
        if (player) {
            player.destroy();
            player = null;
        }
    };
}