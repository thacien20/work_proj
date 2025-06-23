from flask import Flask, request, jsonify, send_from_directory, render_template
from functools import lru_cache
import numpy as np
import os
from werkzeug.utils import secure_filename

from config import Config
from signal_processing import generate_signal, compute_fft
from file_utils import allowed_file
from waveforms import get_waveforms

app = Flask(__name__, static_folder=Config.STATIC_FOLDER)
app.config.from_object(Config)

# Ensure the static folder exists
os.makedirs(app.config['STATIC_FOLDER'], exist_ok=True)

@app.route('/')
def serve_index():
    """Serves the main HTML page."""
    return render_template('index.html')

@app.route('/api/signal', methods=['POST'])
def generate_signal_endpoint():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Get parameters
    try:
        frequency = float(data['frequency'])
        points = int(data['points'])
        noise = float(data.get('noise', 0.0))
        signal_type = data.get('signalType', 'sine')
        custom_formula = data.get('customFormula', '')
        fs = float(data['samplingFrequency'])
    except (KeyError, ValueError):
        return jsonify({'error': 'Invalid or missing parameters'}), 400

    # Validation
    if points <= 0 or points > Config.MAX_POINTS:
        return jsonify({'error': f'Points must be between 1 and {Config.MAX_POINTS}'}), 400
    if frequency <= 0 or noise < 0 or noise > 1 or fs <= 0:
        return jsonify({'error': 'Invalid parameter values'}), 400

    # Generate time array
    t = np.arange(points) / fs

    # Generate signal
    try:
        signal = generate_signal(t, frequency, signal_type, custom_formula)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    # Add noise
    if noise > 0:
        signal += (np.random.rand(points) - 0.5) * noise

    # Compute FFT
    fft_magnitude, freq_axis = compute_fft(signal, fs)

    return jsonify({
        'signal': signal.tolist(),
        'fft': fft_magnitude.tolist(),
        'freq_axis': freq_axis.tolist()
    })

@app.route('/api/upload', methods=['POST'])
def upload_signal():
    """Endpoint for uploading signal data files."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename, app.config['ALLOWED_EXTENSIONS']):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['STATIC_FOLDER'], 'Uploads', filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        file.save(filepath)
        return jsonify({'message': 'File uploaded successfully', 'filename': filename}), 200
    return jsonify({'error': 'File type not allowed'}), 400

@app.route('/api/waveforms', methods=['GET'])
@lru_cache(maxsize=32)
def waveforms_endpoint():
    """Returns available waveform types with descriptions."""
    return jsonify(get_waveforms())

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
