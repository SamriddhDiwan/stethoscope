// Heart Sound Filter
class HeartSoundFilter {
    constructor() {
        this.settings = {
            lowCutoff: 50,
            highCutoff: 500,
            sampleRate: 16000
        };
        this.reset();
        this.calculateCoefficients();
    }

    reset() {
        this.x1 = this.x2 = this.y1 = this.y2 = 0;
    }

    calculateCoefficients() {
        const { lowCutoff, highCutoff, sampleRate } = this.settings;
        const nyquist = 0.5 * sampleRate;
        const low = Math.max(0.001, lowCutoff / nyquist);
        const high = Math.min(0.499, highCutoff / nyquist);
        const bandwidth = high - low;
        const center = 2 * Math.PI * Math.sqrt(low * high);
        
        this.b0 = bandwidth;
        this.b1 = 0;
        this.b2 = -bandwidth;
        this.a0 = 1 + bandwidth;
        this.a1 = -2 * Math.cos(center);
        this.a2 = 1 - bandwidth;
    }

    processSample(input) {
        const output = (this.b0 * input + this.b1 * this.x1 + this.b2 * this.x2 - 
                       this.a1 * this.y1 - this.a2 * this.y2) / this.a0;
        
        this.x2 = this.x1;
        this.x1 = input;
        this.y2 = this.y1;
        this.y1 = output;
        
        return Math.max(-32768, Math.min(32767, output));
    }

    processBuffer(inputArray) {
        const output = new Int16Array(inputArray.length);
        for (let i = 0; i < inputArray.length; i++) {
            output[i] = this.processSample(inputArray[i]);
        }
        return output;
    }
}

// Noise Reducer
class AdaptiveNoiseReducer {
    constructor() {
        this.noiseProfile = null;
        this.sensitivity = 0.7;
    }
    
    process(buffer) {
        if (!this.noiseProfile) this.learnNoise(buffer);
        const output = new Int16Array(buffer.length);
        for (let i = 0; i < buffer.length; i++) {
            const noiseEstimate = this.noiseProfile[i % this.noiseProfile.length] * this.sensitivity;
            output[i] = Math.abs(buffer[i]) > noiseEstimate 
                ? buffer[i] - noiseEstimate * Math.sign(buffer[i])
                : 0;
        }
        return output;
    }
    
    learnNoise(buffer) {
        const sampleSize = Math.min(1600, buffer.length);
        this.noiseProfile = new Int16Array(sampleSize);
        for (let i = 0; i < sampleSize; i++) {
            this.noiseProfile[i] = Math.abs(buffer[i]);
        }
    }
}

// Harmonic Enhancer
class HarmonicEnhancer {
    constructor() {
        this.gain = 1.3;
    }
    
    process(buffer) {
        const output = new Int16Array(buffer.length);
        for (let i = 0; i < buffer.length; i++) {
            const sample = buffer[i] / 32768;
            const distorted = Math.tanh(sample * 1.5) * 32768 * this.gain;
            output[i] = Math.max(-32768, Math.min(32767, distorted));
        }
        return output;
    }
}

// Heartbeat Gate
class HeartbeatGate {
    constructor() {
        this.energyThreshold = 10000;
        this.silenceSamples = 0;
    }
    
    process(buffer) {
        const output = new Int16Array(buffer.length);
        let inEvent = false;
        
        for (let i = 0; i < buffer.length; i++) {
            const energy = Math.pow(buffer[i], 2);
            
            if (energy > this.energyThreshold) {
                inEvent = true;
                this.silenceSamples = 0;
                output[i] = buffer[i];
            } 
            else if (inEvent && this.silenceSamples < 1600) {
                this.silenceSamples++;
                output[i] = buffer[i];
            } 
            else {
                inEvent = false;
                output[i] = 0;
            }
        }
        return output;
    }
}