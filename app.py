from flask import Flask, request, jsonify, send_from_directory, render_template
from functools import lru_cache
import numpy as np
import os
from werkzeug.utils import secure_filename

from config import Config
from signal_generation import generate_signal  # <-- updated import
from signal_processing import compute_fft, operations, FS
from file_utils import allowed_file
from waveforms import get_waveforms

app = Flask(__name__, static_folder=Config.STATIC_FOLDER)
app.config.from_object(Config)

os.makedirs(app.config['STATIC_FOLDER'], exist_ok=True)

@app.route('/')
def serve_index():
    return render_template('index.html')

@app.route('/api/signal', methods=['POST'])
def generate_signal_endpoint():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    try:
        frequency = float(data['frequency']) if 'frequency' in data and data['frequency'] is not None else None
        points = int(data['points'])
        noise = float(data.get('noise', 0.0))
        signal_type = data.get('signalType', 'sine')
        custom_formula = data.get('customFormula', '')
        # Multi-frequency support
        frequencies = data.get('frequencies', None)
        amplitudes = data.get('amplitudes', None)
        if frequencies is not None:
            frequencies = [float(f) for f in frequencies]
        if amplitudes is not None:
            amplitudes = [float(a) for a in amplitudes]
    except (KeyError, ValueError, TypeError):
        return jsonify({'error': 'Invalid or missing parameters'}), 400

    if points <= 0 or points > Config.MAX_POINTS:
        return jsonify({'error': f'Points must be between 1 and {Config.MAX_POINTS}'}), 400
    if signal_type == 'multi':
        if not frequencies or not isinstance(frequencies, list):
            return jsonify({'error': 'Frequencies list required for multi signal type'}), 400
    elif frequency is None or frequency <= 0 or noise < 0 or noise > 1:
        return jsonify({'error': 'Invalid parameter values'}), 400

    t = np.arange(points) / FS

    try:
        signal = generate_signal(t, frequency, signal_type, custom_formula, frequencies, amplitudes)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    if noise > 0:
        signal += (np.random.rand(points) - 0.5) * noise

    fft_magnitude, freq_axis = compute_fft(signal)

    return jsonify({
        'signal': signal.tolist(),
        'fft': fft_magnitude.tolist(),
        'freq_axis': freq_axis.tolist()
    })

@app.route('/api/apply_operation', methods=['POST'])
def apply_operation():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    try:
        signal = np.array(data['signal'])
        operation = data['operation']
        constant = float(data['constant'])
    except (KeyError, ValueError):
        return jsonify({'error': 'Invalid or missing parameters'}), 400

    try:
        modified_signal = operations(signal, operation, constant)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    fft_magnitude, freq_axis = compute_fft(modified_signal)

    return jsonify({
        'signal': modified_signal.tolist(),
        'fft': fft_magnitude.tolist(),
        'freq_axis': freq_axis.tolist()
    })

@app.route('/api/upload', methods=['POST'])
def upload_signal():
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
    return jsonify(get_waveforms())

@app.route('/api/signal_operation', methods=['POST'])
def signal_operation():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    try:
        signal1 = np.array(data['signal1'])
        signal2 = np.array(data['signal2'])
        operation = data['operation']
    except (KeyError, ValueError):
        return jsonify({'error': 'Invalid or missing parameters'}), 400
    try:
        from signal_processing import signal_to_signal_operation, compute_fft
        result_signal = signal_to_signal_operation(signal1, signal2, operation)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    fft_magnitude, freq_axis = compute_fft(result_signal)
    return jsonify({
        'signal': result_signal.tolist(),
        'fft': fft_magnitude.tolist(),
        'freq_axis': freq_axis.tolist()
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)