// audio.js - Enhanced Heart Sound Audio Processor with Heart Rate Detection

const filterSettings = {
    lowCutoff: 20,   // Slightly above 0 to avoid instability
    highCutoff: 50,
    sampleRate: 16000
};



// Heart rate detection settings
const heartRateDetector = {
    threshold: 5000,           // Amplitude threshold for peak detection (adjust based on your signal strength)
    minTimeBetweenBeats: 300,  // Minimum time (ms) between beats (prevents detecting the same beat twice)
    recentPeaks: [],           // Store timestamps of recent peaks
    lastPeakTime: 0,           // Last detected peak time
    samplesSinceLastPeak: 0,   // Counter for samples since last peak
    currentHeartRate: 0        // Current calculated heart rate in BPM
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

// Volume control with smooth ramping
function applyVolume(inputArray, volume) {
    const output = new Int16Array(inputArray.length);
    const rampSamples = Math.min(100, inputArray.length);

    for (let i = 0; i < inputArray.length; i++) {
        const rampFactor = i < rampSamples ? (i / rampSamples) :
                          i > inputArray.length - rampSamples ?
                          ((inputArray.length - i) / rampSamples) : 1;

        output[i] = Math.min(32767, Math.max(-32768,
            Math.round(inputArray[i] * volume * rampFactor)));
    }

    return output;
}

// Heart rate detection function
function detectHeartRate(audioData) {
    const samples = new Int16Array(audioData);
    const sampleRate = filterSettings.sampleRate;
    let peakDetected = false;
    
    // Use a sliding window approach to find peaks
    const windowSize = 32; // Adjust based on your needs
    
    for (let i = windowSize; i < samples.length - windowSize; i++) {
        // Check if current sample is a local maximum
        let isPeak = true;
        for (let j = i - windowSize; j <= i + windowSize; j++) {
            if (j !== i && samples[j] >= samples[i]) {
                isPeak = false;
                break;
            }
        }
        
        // Check if the peak is above threshold
        if (isPeak && Math.abs(samples[i]) > heartRateDetector.threshold) {
            const currentTime = Date.now();
            const timeSinceLastPeak = currentTime - heartRateDetector.lastPeakTime;
            
            // Only count it if it's not too close to the previous peak
            if (timeSinceLastPeak > heartRateDetector.minTimeBetweenBeats) {
                heartRateDetector.recentPeaks.push(currentTime);
                heartRateDetector.lastPeakTime = currentTime;
                peakDetected = true;
                
                // Keep only recent peaks (last 10 seconds)
                const cutoffTime = currentTime - 10000;
                heartRateDetector.recentPeaks = heartRateDetector.recentPeaks.filter(time => time > cutoffTime);
                
                // Calculate heart rate
                calculateHeartRate();
                
                // Break after finding a peak in this buffer
                break;
            }
        }
    }
    
    // Log heart rate if a peak was detected and we updated the calculation
    if (peakDetected) {
        console.log(`Heart Rate: ${heartRateDetector.currentHeartRate} BPM`);
    }
    
    return peakDetected;
}

// Calculate heart rate based on recent peaks
function calculateHeartRate() {
    const peaks = heartRateDetector.recentPeaks;
    
    if (peaks.length >= 2) {
        const timeSpan = peaks[peaks.length - 1] - peaks[0]; // ms
        const numBeats = peaks.length - 1;
        
        if (timeSpan > 0) {
            // Calculate beats per minute
            heartRateDetector.currentHeartRate = Math.round((numBeats / timeSpan) * 60000);
            
            // Sanity check - heart rates are typically between 40-200 BPM
            if (heartRateDetector.currentHeartRate < 40 || heartRateDetector.currentHeartRate > 200) {
                // Likely a detection error, so don't update
                return false;
            }
            
            return true;
        }
    }
    
    return false;
}

// Main audio processing pipeline
function processAudioData(rawData) {
    try {
        const int16Data = new Int16Array(rawData);
        let processedData = useFilter ? applyBandpassFilter(int16Data) : int16Data;
        const volumeAdjusted = applyVolume(processedData, currentVolume);
        
        // Detect heart rate from processed audio data
        detectHeartRate(volumeAdjusted);
        
        return volumeAdjusted.buffer;
    } catch (error) {
        console.error("Audio processing error:", error);
        updateStatus?.(`Audio error: ${error.message}`, 'error');
        return rawData; // Fallback
    }
}

// Optional: Frequency response visualization
function plotFrequencyResponse() {
    const frequencies = [];
    const magnitudes = [];

    for (let freq = 10; freq <= 2000; freq += 10) {
        const omega = 2 * Math.PI * freq / filterSettings.sampleRate;
        const { b0, b1, b2, a0, a1, a2 } = heartSoundFilter;

        const real_num = b0 + b1 * Math.cos(-omega) + b2 * Math.cos(-2 * omega);
        const real_den = a0 + a1 * Math.cos(-omega) + a2 * Math.cos(-2 * omega);

        const mag = Math.abs(real_num / real_den);
        const magnitude = 20 * Math.log10(mag);

        frequencies.push(freq);
        magnitudes.push(magnitude);
    }

    return { frequencies, magnitudes };
}

// Reset heart rate detector
function resetHeartRateDetector() {
    heartRateDetector.recentPeaks = [];
    heartRateDetector.lastPeakTime = 0;
    heartRateDetector.samplesSinceLastPeak = 0;
    heartRateDetector.currentHeartRate = 0;
}

// Export (if used as a module)
if (typeof module !== 'undefined') {
    module.exports = {
        processAudioData,
        resetFilterState,
        plotFrequencyResponse,
        applyVolume,
        applyBandpassFilter,
        heartSoundFilter,
        detectHeartRate,
        resetHeartRateDetector
    };
}