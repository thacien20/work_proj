from flask import Flask, request, jsonify, send_from_directory
import numpy as np
import os

app = Flask(__name__, static_folder='.', static_url_path='')

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/api/signal', methods=['POST'])
def generate_signal():
    data = request.json
    frequency = float(data['frequency'])
    points = int(data['points'])
    noise = float(data['noise'])

    t = np.arange(points) / points
    signal = np.sin(2 * np.pi * frequency * t) + (np.random.rand(points) - 0.5) * noise
    fft = np.fft.fft(signal)
    fft_magnitude = np.abs(fft)[:points // 2]
    fft_magnitude /= np.max(fft_magnitude) if np.max(fft_magnitude) != 0 else 1

    return jsonify({
        'signal': signal.tolist(),
        'fft': fft_magnitude.tolist()
    })

if __name__ == '__main__':
    app.run(debug=True)
