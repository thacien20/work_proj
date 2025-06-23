from flask import Flask, request, jsonify, send_from_directory, render_template
import numpy as np
import numexpr
import os
from functools import lru_cache

# --- Configuration ---
class Config:
    STATIC_FOLDER = 'static'
    MAX_POINTS = 100000  # Keep only necessary configuration
    ALLOWED_EXTENSIONS = {'csv', 'txt'}
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload size

app = Flask(__name__, static_folder=Config.STATIC_FOLDER)
app.config.from_object(Config)

# Ensure the static folder exists
os.makedirs(app.config['STATIC_FOLDER'], exist_ok=True)

# Safe functions for custom formula evaluation
SAFE_FUNCTIONS = {
    'pi': np.pi,
    'sin': np.sin,
    'cos': np.cos,
    'tan': np.tan,
    'sinh': np.sinh,
    'cosh': np.cosh,
    'tanh': np.tanh,
    'exp': np.exp,
    'log': np.log,
    'log10': np.log10,
    'sqrt': np.sqrt,
    'abs': np.abs,
    'sign': np.sign,
    'floor': np.floor,
    'ceil': np.ceil,
    'round': np.round
}

@app.route('/')
def serve_index():
    """Serves the main HTML page."""
    return render_template('index.html')

@app.route('/api/signal', methods=['POST'])
def generate_signal():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Get parameters
    frequency = float(data['frequency'])
    points = int(data['points'])
    noise = float(data.get('noise', 0.0))
    signal_type = data.get('signalType', 'sine')
    custom_formula = data.get('customFormula', '')
    fs = float(data['samplingFrequency'])

    # Validation
    if points <= 0 or points > Config.MAX_POINTS:
        return jsonify({'error': f'Points must be between 1 and {Config.MAX_POINTS}'}), 400
    if frequency <= 0 or noise < 0 or noise > 1 or fs <= 0:
        return jsonify({'error': 'Invalid parameter values'}), 400

    # Generate time array
    t = np.arange(points) / fs

    # Generate signal
    if signal_type == 'sine':
        signal = np.sin(2 * np.pi * frequency * t)
    elif signal_type == 'square':
        signal = np.sign(np.sin(2 * np.pi * frequency * t))
    elif signal_type == 'triangle':
        signal = 2 * np.abs(2 * (t * frequency - np.floor(t * frequency + 0.5))) - 1
    elif signal_type == 'custom' and custom_formula.strip():
        try:
            local_dict = {'t': t, 'frequency': frequency, 'pi': np.pi}
            signal = numexpr.evaluate(custom_formula, local_dict=local_dict)
        except Exception as e:
            return jsonify({'error': f'Custom formula error: {str(e)}'}), 400
    else:
        signal = np.sin(2 * np.pi * frequency * t)

    # Add noise
    if noise > 0:
        signal += (np.random.rand(points) - 0.5) * noise

    # Apply Gaussian window
    sigma = points / (fs * 10)  # Adjust for desired width
    window = np.exp(-0.5 * ((t - t[-1]/2) / sigma)**2)
    windowed_signal = signal * window

    # Zero-padding
    next_pow2 = 2 ** np.ceil(np.log2(points))
    zero_filled = np.zeros(int(next_pow2 * 2))  # Extra padding for smoothness
    zero_filled[:points] = windowed_signal

    # Compute FFT
    fft = np.fft.rfft(zero_filled)
    fft_magnitude = np.abs(fft) / points  # Normalize
    freq_axis = np.fft.rfftfreq(len(zero_filled), d=1/fs)

    return jsonify({
        'signal': signal.tolist(),
        'fft': fft_magnitude.tolist(),
        'freq_axis': freq_axis.tolist()
    })























def _generate_signal(t, frequency, signal_type, custom_formula=None):
    """Helper function to generate different types of signals."""
    if signal_type == 'sine':
        return np.sin(2 * np.pi * frequency * t)
    elif signal_type == 'square':
        return np.sign(np.sin(2 * np.pi * frequency * t))
    elif signal_type == 'triangle':
        return 2 * np.abs(2 * (t * frequency - np.floor(t * frequency + 0.5))) - 1
    elif signal_type == 'sawtooth':
        return 2 * (t * frequency - np.floor(t * frequency + 0.5))
    elif signal_type == 'custom' and custom_formula:
        try:
            safe_dict = SAFE_FUNCTIONS.copy()
            safe_dict['t'] = t
            safe_dict['frequency'] = frequency
            return numexpr.evaluate(custom_formula, local_dict=safe_dict)
        except Exception:
            raise ValueError("Invalid custom formula")
    else:
        return np.sin(2 * np.pi * frequency * t)  # Default to sine wave

def _compute_fft(signal):
    """Helper function to compute FFT with windowing and zero-padding."""
    points = len(signal)

    sigma = 0.005;

    window = np.exp(-0.5 * ((np.arange(points) - points/2) / sigma)**2)
    windowed_signal = signal * window



    windowed_signal = signal * window

    next_pow2 = 2 ** np.ceil(np.log2(points))
    zero_filled = np.zeros(int(next_pow2))
    zero_filled[:points] = windowed_signal
    
    fft = np.fft.rfft(zero_filled)
    fft_magnitude = np.abs(fft)
    freq_axis = np.fft.rfftfreq(len(zero_filled), d=1/fs)
    return fft_magnitude, freq_axis

@app.route('/api/upload', methods=['POST'])
def upload_signal():
    """Endpoint for uploading signal data files."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and _allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['STATIC_FOLDER'], 'uploads', filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        file.save(filepath)
        return jsonify({'message': 'File uploaded successfully', 'filename': filename}), 200
    return jsonify({'error': 'File type not allowed'}), 400

def _allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/api/waveforms', methods=['GET'])
@lru_cache(maxsize=32)
def get_waveforms():
    """Returns available waveform types with descriptions."""
    return jsonify({
        'waveforms': [
            {'id': 'sine', 'name': 'Sine Wave', 'description': 'Standard sinusoidal waveform'},
            {'id': 'square', 'name': 'Square Wave', 'description': 'Digital-style waveform with sharp transitions'},
            {'id': 'triangle', 'name': 'Triangle Wave', 'description': 'Linear rise and fall waveform'},
            {'id': 'sawtooth', 'name': 'Sawtooth Wave', 'description': 'Linear rise with sharp fall waveform'},
            {'id': 'custom', 'name': 'Custom Formula', 'description': 'Define your own waveform using mathematical expressions'}
        ]
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)