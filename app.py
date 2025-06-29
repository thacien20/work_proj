from flask import Flask, request, jsonify, send_from_directory, render_template
from functools import lru_cache
import numpy as np
import os
from werkzeug.utils import secure_filename

from config import Config
from signal_generation import generate_signal  # <-- updated import
from signal_processing import compute_fft, FS
from file_utils import allowed_file
from waveforms import get_waveforms
from Filters import apply_filter
from filters_view import filter_visualization
from deconvolution import deconvolve_signal

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

    # Handle tau and amplitude for expdecay
    tau = float(data.get('tau', 0.05)) if signal_type == 'expdecay' else 0.05
    amplitude = float(data.get('amplitude', 1.0)) if signal_type == 'expdecay' else 1.0

    try:
        if signal_type == 'expdecay':
            signal = generate_signal(t, frequency, signal_type, frequencies, amplitudes, tau=tau, amplitude=amplitude)
        else:
            signal = generate_signal(t, frequency, signal_type, frequencies, amplitudes)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    if noise > 0:
        signal += (np.random.rand(points) - 0.5) * noise

    fft_magnitude, freq_axis = compute_fft(signal, FS)

    return jsonify({
        'signal': signal.tolist(),
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
    fft_magnitude, freq_axis = compute_fft(result_signal, FS)
    return jsonify({
        'signal': result_signal.tolist(),
        'fft': fft_magnitude.tolist(),
        'freq_axis': freq_axis.tolist()
    })

@app.route('/api/filter', methods=['POST'])
def filter_signal():
    data = request.get_json()
    signal = np.array(data['signal'])
    filter_type = data['filterType']
    order = int(data.get('order', 4))
    fs = data.get('fs', FS)
    cutoff = data.get('cutoff')
    lowcut = data.get('lowcut')
    highcut = data.get('highcut')

    from Filters import apply_filter

    try:
        if filter_type == 'lowpass' or filter_type == 'highpass':
            filtered = apply_filter(signal, filter_type, cutoff=float(cutoff), order=order, fs=fs)
        elif filter_type == 'bandpass':
            filtered = apply_filter(signal, filter_type, lowcut=float(lowcut), highcut=float(highcut), order=order, fs=fs)
        else:
            return jsonify({'error': 'Invalid filter type'}), 400
        # Compute FFT of filtered signal
        fft_magnitude, freq_axis = compute_fft(filtered, FS)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

    return jsonify({'filtered': filtered.tolist(), 'filtered_fft': fft_magnitude.tolist(), 'filtered_freq_axis': freq_axis.tolist()})

@app.route('/api/filter_view', methods=['POST'])
def filter_view():
    data = request.get_json()
    filter_type = data.get('filterType')
    order = int(data.get('order', 4))
    fs = data.get('fs', FS)
    cutoff = data.get('cutoff')
    lowcut = data.get('lowcut')
    highcut = data.get('highcut')
    try:
        if filter_type == 'lowpass' or filter_type == 'highpass':
            result = filter_visualization(filter_type, cutoff=float(cutoff), order=order, fs=fs)
        elif filter_type == 'bandpass':
            result = filter_visualization(filter_type, lowcut=float(lowcut), highcut=float(highcut), order=order, fs=fs)
        else:
            return jsonify({'error': 'Invalid filter type'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    return jsonify(result)

@app.route('/api/apply_filter_fft', methods=['POST'])
def apply_filter_fft_endpoint():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    try:
        signal = np.array(data['signal'], dtype=np.float64)
        # filter_freq is a list of [real, imag] pairs
        filter_freq_pairs = data['filter_freq']
        filter_freq = np.array([complex(re, im) for re, im in filter_freq_pairs], dtype=np.complex128)
    except Exception as e:
        return jsonify({'error': f'Invalid input: {e}'}), 400
    # Zero-pad both to the same length (next power of 2 for efficiency)
    n = max(len(signal), len(filter_freq))
    n_fft = 2 ** int(np.ceil(np.log2(n)))
    signal_padded = np.zeros(n_fft)
    filter_padded = np.zeros(n_fft, dtype=np.complex128)
    signal_padded[:len(signal)] = signal
    filter_padded[:len(filter_freq)] = filter_freq
    # FFT of signal
    signal_fft = np.fft.fft(signal_padded)
    # Multiply in frequency domain
    filtered_fft = signal_fft * filter_padded
    # Inverse FFT to get filtered signal
    filtered_signal = np.fft.ifft(filtered_fft).real
    # Return only the original signal length
    filtered_signal = filtered_signal[:len(signal)]
    # Compute FFT of filtered signal (magnitude and freq axis)
    from signal_processing import compute_fft, FS
    filtered_fft_mag, filtered_freq_axis = compute_fft(filtered_signal, FS)
    return jsonify({
        'filtered': filtered_signal.tolist(),
        'filtered_fft': filtered_fft_mag.tolist(),
        'filtered_freq_axis': filtered_freq_axis.tolist()
    })

@app.route('/api/deconvolve', methods=['POST'])
def deconvolve_endpoint():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    try:
        filtered = np.array(data['filtered'], dtype=np.float64)
        filter_impulse = np.array(data['filter_impulse'], dtype=np.float64)
        eps = float(data.get('eps', 1e-6))
    except Exception as e:
        return jsonify({'error': f'Invalid input: {e}'}), 400
    result = deconvolve_signal(filtered, filter_impulse, eps)
    return jsonify({
        'deconvolved': result['deconvolved'].tolist(),
        'deconv_fft': result['deconv_fft'].tolist(),
        'deconv_freq_axis': result['deconv_freq_axis'].tolist(),
        'unstable': result['unstable']
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)