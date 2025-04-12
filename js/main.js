// Initialize dark mode
function addDarkmodeWidget() {
    new Darkmode().showWidget();
}
window.addEventListener('load', addDarkmodeWidget);

// DOM elements
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


const filterSettings = {
    lowCutoff: 20,   // Slightly above 0 to avoid instability
    highCutoff: 50,
    sampleRate: 16000
};

// Advanced IIR Filter implementation
class HeartSoundFilter {
    constructor() {
        this.reset();
        this.calculateCoefficients();
    }

    reset() {
        this.x1 = 0; this.x2 = 0;  // Previous input samples
        this.y1 = 0; this.y2 = 0;  // Previous output samples
    }

    calculateCoefficients() {
        const { lowCutoff, highCutoff, sampleRate } = filterSettings;

        const nyquist = sampleRate / 2;
        const low = lowCutoff / nyquist;
        const high = highCutoff / nyquist;

        const omega = Math.PI * (high + low);
        const bandwidth = Math.PI * (high - low);
        const alpha = Math.sin(bandwidth) / (2 * Math.SQRT2); // Q = sqrt(2)/2 for Butterworth
        const cos_omega = Math.cos(omega);

        // Bandpass filter coefficients
        const b0 = alpha;
        const b1 = 0;
        const b2 = -alpha;
        const a0 = 1 + alpha;
        const a1 = -2 * cos_omega;
        const a2 = 1 - alpha;

        // Normalize
        this.b0 = b0 / a0;
        this.b1 = b1 / a0;
        this.b2 = b2 / a0;
        this.a0 = 1;
        this.a1 = a1 / a0;
        this.a2 = a2 / a0;
    }

    processSample(input) {
        const output = this.b0 * input +
                       this.b1 * this.x1 +
                       this.b2 * this.x2 -
                       this.a1 * this.y1 -
                       this.a2 * this.y2;

        // Update states
        this.x2 = this.x1;
        this.x1 = input;
        this.y2 = this.y1;
        this.y1 = output;

        return Math.max(-32768, Math.min(32767, output)); // Clamp to 16-bit
    }

    processBuffer(inputArray) {
        const output = new Int16Array(inputArray.length);
        for (let i = 0; i < inputArray.length; i++) {
            output[i] = this.processSample(inputArray[i]);
        }
        return output;
    }
}

// Initialize the filter instance
const heartSoundFilter = new HeartSoundFilter();

// Filter state management
function resetFilterState() {
    heartSoundFilter.reset();
}

// Main filter application function
function applyBandpassFilter(inputArray) {
    return heartSoundFilter.processBuffer(inputArray);
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