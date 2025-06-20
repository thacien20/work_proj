from flask import Flask, request, jsonify, send_from_directory,render_template
import numpy as np
import numexpr
import os
from functools import lru_cache
import logging
from werkzeug.utils import secure_filename

# --- Configuration ---
class Config:
    STATIC_FOLDER = 'static'
    DEFAULT_FREQUENCY = 10.30
    DEFAULT_POINTS = 2048
    DEFAULT_NOISE = 0.1
    MAX_POINTS = 100000
    ALLOWED_EXTENSIONS = {'csv', 'txt'}
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload size

app = Flask(__name__, static_folder=Config.STATIC_FOLDER)
app.config.from_object(Config)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure the static folder exists
os.makedirs(app.config['STATIC_FOLDER'], exist_ok=True)

# Safe functions for custom formula evaluation
SAFE_FUNCTIONS = {
    't': None,  # Will be set dynamically
    'frequency': None,  # Will be set dynamically
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
    """Generates a signal based on parameters and returns its FFT."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Get parameters with defaults
        frequency = float(data.get('frequency', Config.DEFAULT_FREQUENCY))
        points = int(data.get('points', Config.DEFAULT_POINTS))
        noise = float(data.get('noise', Config.DEFAULT_NOISE))
        signal_type = data.get('signalType', 'sine')
        custom_formula = data.get('customFormula', '')

        # Input validation
        if points <= 0 or points > Config.MAX_POINTS:
            return jsonify({'error': f'Points must be between 1 and {Config.MAX_POINTS}'}), 400
        if frequency <= 0:
            return jsonify({'error': 'Frequency must be positive'}), 400
        if noise < 0 or noise > 1:
            return jsonify({'error': 'Noise must be between 0 and 1'}), 400

        # Generate time array
        t = np.arange(points) / points

        # Generate signal based on type
        if signal_type == 'sine':
            signal = np.sin(2 * np.pi * frequency * t)
        elif signal_type == 'square':
            signal = np.sign(np.sin(2 * np.pi * frequency * t))
        elif signal_type == 'triangle':
            signal = 2 * np.abs(2 * (t * frequency - np.floor(t * frequency + 0.5))) - 1
        elif signal_type == 'custom' and custom_formula.strip():
            try:
                local_dict = {
                    't': t,
                    'frequency': frequency,
                    'pi': np.pi
                }
                signal = numexpr.evaluate(custom_formula, local_dict=local_dict)
            except Exception as e:
                return jsonify({'error': f'Custom formula error: {str(e)}'}), 400
        else:
            signal = np.sin(2 * np.pi * frequency * t)

        # Add noise
        if noise > 0:
            signal += (np.random.rand(points) - 0.5) * noise

        # Apply window
        window = np.hamming(points)
        windowed_signal = signal * window

        # Compute FFT
        fft = np.fft.rfft(windowed_signal)
        fft_magnitude = np.abs(fft)
        
        # Normalize FFT
        max_magnitude = np.max(fft_magnitude)
        if max_magnitude > 0:
            fft_magnitude = fft_magnitude / max_magnitude

        # Generate frequency axis
        freq_axis = np.fft.rfftfreq(points, d=1/points)

        return jsonify({
            'signal': signal.tolist(),
            'fft': fft_magnitude.tolist(),
            'freq_axis': freq_axis.tolist()
        })

    except ValueError as ve:
        logger.error(f"Value error: {ve}")
        return jsonify({'error': f'Invalid parameter value: {str(ve)}'}), 400
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

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
        except Exception as e:
            logger.warning(f"Custom formula error: {e}")
            raise ValueError(f"Invalid custom formula: {str(e)}")
    else:
        return np.sin(2 * np.pi * frequency * t)  # Default to sine wave

def _compute_fft(signal):
    """Helper function to compute FFT with windowing and zero-padding."""
    points = len(signal)
    window = np.hamming(points)
    windowed_signal = signal * window
    
    # Zero-pad to next power of 2 for better FFT performance
    next_pow2 = 2 ** np.ceil(np.log2(points))
    zero_filled = np.zeros(int(next_pow2))
    zero_filled[:points] = windowed_signal
    
    fft = np.fft.rfft(zero_filled)
    fft_magnitude = np.abs(fft)
    
    # Normalize
    max_magnitude = np.max(fft_magnitude)
    if max_magnitude > 0:
        fft_magnitude /= max_magnitude
    
    freq_axis = np.fft.rfftfreq(len(zero_filled), d=1/points)
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
        try:
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['STATIC_FOLDER'], 'uploads', filename)
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            file.save(filepath)
            
            # Process the file (implement your CSV parsing here)
            # For now just return success
            return jsonify({
                'message': 'File uploaded successfully',
                'filename': filename
            }), 200
        except Exception as e:
            logger.error(f"File upload error: {e}", exc_info=True)
            return jsonify({'error': 'Failed to process uploaded file'}), 500
    else:
        return jsonify({'error': 'File type not allowed'}), 400

def _allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/api/waveforms', methods=['GET'])
@lru_cache(maxsize=32)
def get_waveform_types():
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
    logger.info(f"Serving static files from: {os.path.abspath(app.config['STATIC_FOLDER'])}")
    app.run(debug=True, host='0.0.0.0', port=5000)