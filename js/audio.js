// audio.js - Enhanced Heart Sound Audio Processor

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



// Main audio processing pipeline
function processAudioData(rawData) {
    try {
        const int16Data = new Int16Array(rawData);
        let processedData = useFilter ? applyBandpassFilter(int16Data) : int16Data;
        return applyVolume(processedData, currentVolume).buffer;
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

// Export (if used as a module)
if (typeof module !== 'undefined') {
    module.exports = {
        processAudioData,
        resetFilterState,
        plotFrequencyResponse,
        applyVolume,
        applyBandpassFilter,
        heartSoundFilter
    };
}
