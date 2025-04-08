// audio.js - Audio Processing Functions

// Volume Control with Smooth Ramping
function applyVolume(inputArray, volume) {
    const output = new Int16Array(inputArray.length);
    const rampSamples = Math.min(100, inputArray.length); // Smooth transitions
    
    for (let i = 0; i < inputArray.length; i++) {
        const rampFactor = i < rampSamples ? (i/rampSamples) : 
                         i > inputArray.length - rampSamples ? 
                         ((inputArray.length - i)/rampSamples) : 1;
        
        output[i] = Math.min(32767, Math.max(-32768, 
            Math.round(inputArray[i] * volume * rampFactor)));
    }
    return output;
}

// Filter State Management
function resetFilterState() {
    if (window.audioProcessors?.filter) {
        window.audioProcessors.filter.reset();
    }
}

// Main Audio Processing Pipeline
function processAudioData(rawData) {
    try {
        let data = new Int16Array(rawData);
        const processors = window.audioProcessors;
        
        // Processing chain - order matters!
        if (processors.enabled.noiseReduction) {
            data = processors.noiseReducer.process(data);
        }
        
        if (window.useFilter) {
            console.log("i work");
            data = processors.filter.processBuffer(data);
        }
        
        if (processors.enabled.harmonicBoost) {
            data = processors.harmonicEnhancer.process(data);
        }
        
        if (processors.enabled.beatDetection) {
            console.log("i am enabled");
            data = processors.heartbeatGate.process(data);
        }
        
        return applyVolume(data, window.currentVolume).buffer;
    } catch (error) {
        console.error("Audio processing error:", error);
        if (window.updateStatus) {
            window.updateStatus(`Processing error: ${error.message}`, 'error');
        }
        return rawData;
    }
}

// Initialize Audio Processors (if not already initialized)
if (!window.audioProcessors) {
    window.audioProcessors = {
        filter: new HeartSoundFilter(),
        noiseReducer: new AdaptiveNoiseReducer(),
        harmonicEnhancer: new HarmonicEnhancer(),
        heartbeatGate: new HeartbeatGate(),
        enabled: {
            noiseReduction: true,
            harmonicBoost: false,
            beatDetection: false
        }
    };
}