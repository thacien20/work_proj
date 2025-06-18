from flask import Flask, request, jsonify, send_from_directory
import numpy as np

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

    window = np.hamming(points)
    windowed_signal = signal * window

    # Zero-fill to twice the length
    zero_filled = np.zeros(2 * points)
    zero_filled[:points] = windowed_signal

    fft = np.fft.fft(zero_filled)
    fft_magnitude = np.abs(fft)[:points]  # Only first half (since now 2*points)
    fft_magnitude /= np.max(fft_magnitude) if np.max(fft_magnitude) != 0 else 1

    freq_axis = np.fft.fftfreq(2 * points, d=1/points)[:points]

    return jsonify({
        'signal': signal.tolist(),
        'fft': fft_magnitude.tolist(),
        'freq_axis': freq_axis.tolist()
    })

if __name__ == '__main__':
    app.run(debug=True)
