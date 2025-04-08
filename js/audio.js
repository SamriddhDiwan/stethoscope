// audio.js - Enhanced Heart Sound Audio Processor

// Filter configuration with wider frequency range
const filterSettings = {
    lowCutoff: 0,     // Lower cutoff frequency (Hz) - preserves more heart sound detail
    highCutoff: 80,  // Higher cutoff frequency (Hz) - captures murmurs better
    sampleRate: 16000  // Sample rate (Hz)
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
        // Butterworth bandpass filter design
        const { lowCutoff, highCutoff, sampleRate } = filterSettings;
        
        // Normalize frequencies
        const nyquist = 0.5 * sampleRate;
        const low = Math.max(0.001, lowCutoff / nyquist);
        const high = Math.min(0.499, highCutoff / nyquist);
        
        // Calculate bandwidth and center frequency
        const bandwidth = high - low;
        const center = 2 * Math.PI * Math.sqrt(low * high);
        
        // 2nd order Butterworth coefficients
        this.b0 = bandwidth;
        this.b1 = 0;
        this.b2 = -bandwidth;
        this.a0 = 1 + bandwidth;
        this.a1 = -2 * Math.cos(center);
        this.a2 = 1 - bandwidth;
    }

    processSample(input) {
        // Direct Form II implementation (more numerically stable)
        const output = (this.b0 * input + 
                       this.b1 * this.x1 + 
                       this.b2 * this.x2 - 
                       this.a1 * this.y1 - 
                       this.a2 * this.y2) / this.a0;
        
        // Update state variables
        this.x2 = this.x1;
        this.x1 = input;
        this.y2 = this.y1;
        this.y1 = output;
        
        return Math.max(-32768, Math.min(32767, output)); // Clamp to 16-bit range
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

// Volume control with smooth ramping to avoid clicks
function applyVolume(inputArray, volume) {
    const output = new Int16Array(inputArray.length);
    const rampSamples = Math.min(100, inputArray.length); // Smooth volume transitions
    
    // Apply volume with smooth transition at start and end
    for (let i = 0; i < inputArray.length; i++) {
        const rampFactor = i < rampSamples ? (i/rampSamples) : 
                          i > inputArray.length - rampSamples ? 
                          ((inputArray.length - i)/rampSamples) : 1;
        
        output[i] = Math.min(32767, Math.max(-32768, 
            Math.round(inputArray[i] * volume * rampFactor)));
    }
    return output;
}

// Main audio processing pipeline
function processAudioData(rawData) {
    try {
        const int16Data = new Int16Array(rawData);
        let processedData = useFilter ? applyBandpassFilter(int16Data) : int16Data;
        return applyVolume(processedData, currentVolume).buffer;
    } catch (error) {
        console.error("Audio processing error:", error);
        updateStatus(`Audio error: ${error.message}`, 'error');
        return rawData; // Fallback to original if processing fails
    }
}

// Optional: Frequency response visualization
function plotFrequencyResponse() {
    // This would generate frequency response data for visualization
    const frequencies = [];
    const magnitudes = [];
    
    // Test frequencies from 10Hz to 2000Hz
    for (let freq = 10; freq <= 2000; freq += 10) {
        const omega = 2 * Math.PI * freq / filterSettings.sampleRate;
        let real = 0, imag = 0;
        
        // Calculate filter response at this frequency
        const { b0, b1, b2, a0, a1, a2 } = heartSoundFilter;
        const numerator = b0 + b1 * Math.cos(-omega) + b2 * Math.cos(-2*omega);
        const denominator = a0 + a1 * Math.cos(-omega) + a2 * Math.cos(-2*omega);
        const magnitude = 20 * Math.log10(Math.abs(numerator/denominator));
        
        frequencies.push(freq);
        magnitudes.push(magnitude);
    }
    
    return { frequencies, magnitudes };
}