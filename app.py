from flask import Flask, request, jsonify
import numpy as np
from scipy.signal import butter, filtfilt, find_peaks
import scipy.io.wavfile as wav
import os

app = Flask(__name__)

def bandpass_filter(data, lowcut, highcut, fs, order=4):
    nyquist = 0.5 * fs
    low = lowcut / nyquist
    high = highcut / nyquist
    b, a = butter(order, [low, high], btype='band')
    return filtfilt(b, a, data)

def analyze_heartbeat(filepath):
    fs, data = wav.read(filepath)

    if len(data.shape) == 2:
        data = data.mean(axis=1)
    data = data / np.max(np.abs(data))

    duration = len(data) / fs
    filtered = bandpass_filter(data, 20, 150, fs)
    squared = filtered ** 2
    smoothed = np.convolve(squared, np.ones(int(0.1 * fs)) / int(0.1 * fs), mode='same')

    peaks, _ = find_peaks(smoothed, distance=fs * 0.4, height=np.max(smoothed) * 0.2)
    heart_rate = (len(peaks) / duration) * 60

    return {
        "heart_rate_bpm": round(heart_rate, 2),
        "num_beats": len(peaks),
        "duration_seconds": round(duration, 2)
    }

@app.route('/analyze', methods=['POST'])
def analyze():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    filepath = os.path.join("uploads", file.filename)
    os.makedirs("uploads", exist_ok=True)
    file.save(filepath)

    try:
        result = analyze_heartbeat(filepath)
        os.remove(filepath)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
