from flask import Flask, request, jsonify, render_template, send_file
import numpy as np
import os
from werkzeug.utils import secure_filename
from scipy import signal  # Add this import for RC circuit simulation
from scipy.integrate import quad

from config import Config
from signal_generation import generate_signal  # <-- updated import

from shared_utils.shared_funcs import compute_complex_fft, compute_fft, FS
from file_utils import allowed_file
from waveforms import get_waveforms
from Filters import apply_filter
from filters_view import filter_visualization
from deconvolution import deconvolve_signal
from circuits.circuits import (
    rc_circuit_response,
    rl_circuit_response,
    rlc_circuit_response
)
from circuit_diagrams import draw_rc_circuit, draw_rl_circuit, draw_rlc_circuit
from circuits_app import circuits_blueprint

# Import new modular features
from features.basic_signals import basic_signals_blueprint
from mathlab import mathlab_bp
from mathlab.mathlab_app import calculate_integral

app = Flask(__name__, static_folder=Config.STATIC_FOLDER)
app.config.from_object(Config)

# Register blueprints for modular features
app.register_blueprint(circuits_blueprint, url_prefix='/circuits')
app.register_blueprint(basic_signals_blueprint, url_prefix='/basic_signals')
app.register_blueprint(mathlab_bp, url_prefix='/')

os.makedirs(app.config['STATIC_FOLDER'], exist_ok=True)

@app.route('/')
def serve_index():
    # Make sure this path is correct and index.html exists in your templates folder
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
        phase = float(data.get('phase', 0.0))  # Extract phase parameter
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
            signal = generate_signal(t, frequency, signal_type, frequencies, amplitudes, phase=phase, tau=tau, amplitude=amplitude)
        elif signal_type in ['random', 'gaussian']:
            # Map frontend types to backend logic
            noise_type = data.get('noise_type', 'gaussian')
            signal = generate_signal(t, frequency, signal_type, None, None, phase=phase, amplitude=amplitude, noise_type=noise_type)
        else:
            signal = generate_signal(t, frequency, signal_type, frequencies, amplitudes, phase=phase)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    if noise > 0:
        signal += (np.random.rand(points) - 0.5) * noise

    # Compute both regular FFT and complex FFT
    fft_magnitude, freq_axis = compute_fft(signal, FS)
    fft_real, fft_imaginary, fft_magnitude_complex, freq_axis_complex = compute_complex_fft(signal, FS)

    return jsonify({
        'signal': signal.tolist(),
        'fft': fft_magnitude.tolist(),
        'freq_axis': freq_axis.tolist(),
        'fft_real': fft_real.tolist(),
        'fft_imaginary': fft_imaginary.tolist(),
        'fft_complex_magnitude': fft_magnitude_complex.tolist(),
        'fft_complex_freq': freq_axis_complex.tolist()
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
        from shared_utils.shared_funcs import compute_fft, compute_complex_fft, signal_to_signal_operation
        result_signal = signal_to_signal_operation(signal1, signal2, operation)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    fft_magnitude, freq_axis = compute_fft(result_signal, FS)
    fft_real, fft_imaginary, fft_magnitude_complex, freq_axis_complex = compute_complex_fft(result_signal, FS)
    return jsonify({
        'signal': result_signal.tolist(),
        'fft': fft_magnitude.tolist(),
        'freq_axis': freq_axis.tolist(),
        'fft_real': fft_real.tolist(),
        'fft_imaginary': fft_imaginary.tolist()
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
    from shared_utils.shared_funcs import compute_fft, FS
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

@app.route('/api/rc_circuit', methods=['POST'])
def rc_circuit_simulation():
    """
    Simulate the step response of an RC circuit.
    Expects JSON: {"R": float, "C": float, "V_in": float, "duration": float, "points": int}
    Returns: {"t": [...], "V_out": [...], "I_out": [...]}
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    try:
        R = float(data.get('R', 1000))  # Ohms
        C = float(data.get('C', 1e-6))  # Farads
        V_in = float(data.get('V_in', 1.0))  # Input step voltage
        duration = float(data.get('duration', 0.05))  # seconds
        points = int(data.get('points', 500))
        t, V_out, I_out = rc_circuit_response(R, C, V_in, duration, points)
    except Exception:
        return jsonify({'error': 'Invalid or missing parameters'}), 400
    return jsonify({'t': t.tolist(), 'V_out': V_out.tolist(), 'I_out': I_out.tolist()})

@app.route('/api/rl_circuit', methods=['POST'])
def rl_circuit_simulation():
    """
    Simulate the step response of an RL circuit.
    Expects JSON: {"R": float, "L": float, "V_in": float, "duration": float, "points": int}
    Returns: {"t": [...], "I_out": [...], "V_out": [...]}
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    try:
        R = float(data.get('R', 1000))  # Ohms
        L = float(data.get('L', 1e-3))  # Henrys
        V_in = float(data.get('V_in', 1.0))  # Input step voltage
        duration = float(data.get('duration', 0.05))  # seconds
        points = int(data.get('points', 500))
        t, I_out, V_out = rl_circuit_response(R, L, V_in, duration, points)
    except Exception:
        return jsonify({'error': 'Invalid or missing parameters'}), 400
    return jsonify({'t': t.tolist(), 'I_out': I_out.tolist(), 'V_out': V_out.tolist()})

@app.route('/api/rlc_circuit', methods=['POST'])
def rlc_circuit_simulation():
    """
    Simulate the step response of a series RLC circuit.
    Expects JSON: {"R": float, "L": float, "C": float, "V_in": float, "duration": float, "points": int}
    Returns: {"t": [...], "V_out": [...], "I_out": [...]}
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    try:
        R = float(data.get('R', 1000))
        L = float(data.get('L', 1e-3))
        C = float(data.get('C', 1e-6))
        V_in = float(data.get('V_in', 1.0))
        duration = float(data.get('duration', 0.05))
        points = int(data.get('points', 500))
        t, V_out, I_out = rlc_circuit_response(R, L, C, V_in, duration, points)
    except Exception:
        return jsonify({'error': 'Invalid or missing parameters'}), 400
    return jsonify({'t': t.tolist(), 'V_out': V_out.tolist(), 'I_out': I_out.tolist()})

@app.route('/api/diagram/<circuit_type>')
def serve_circuit_diagram(circuit_type):
    if circuit_type == 'rc':
        filename = os.path.join(app.static_folder, 'diagrams', 'rc_circuit.png')
        draw_rc_circuit(filename)
    elif circuit_type == 'rl':
        filename = os.path.join(app.static_folder, 'diagrams', 'rl_circuit.png')
        draw_rl_circuit(filename)
    elif circuit_type == 'rlc':
        filename = os.path.join(app.static_folder, 'diagrams', 'rlc_circuit.png')
        draw_rlc_circuit(filename)
    else:
        return jsonify({'error': 'Unknown circuit type'}), 400
    return send_file(filename, mimetype='image/png')

@app.route('/circuits')
def serve_circuits():
    return render_template('circuits.html')

@app.route('/api/real_fft', methods=['POST'])
def real_fft_endpoint():
    """Compute and return real and imaginary FFT components."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    try:
        signal = np.array(data['signal'])
        fs = data.get('fs', FS)
    except (KeyError, ValueError):
        return jsonify({'error': 'Invalid or missing signal data'}), 400
    
    if len(signal) == 0:
        return jsonify({'error': 'Signal cannot be empty'}), 400
    
    try:
        # FIX: Import from shared_utils.shared_funcs, not signal_processing
        from shared_utils.shared_funcs import compute_complex_fft
        fft_real, fft_imaginary, fft_magnitude, freq_axis = compute_complex_fft(signal, fs)
        
        return jsonify({
            'fft_real': fft_real.tolist(),
            'fft_imaginary': fft_imaginary.tolist(),
            'fft_magnitude': fft_magnitude.tolist(),
            'freq_axis': freq_axis.tolist()
        })
    except Exception as e:
        return jsonify({'error': f'FFT computation failed: {str(e)}'}), 500

@app.route('/api/ifft', methods=['POST'])
def ifft_endpoint():
    """Compute inverse FFT from frequency domain data."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    try:
        # Get the complex FFT data (real and imaginary parts)
        fft_real = np.array(data['fft_real'])
        fft_imaginary = np.array(data['fft_imaginary'])
        fs = data.get('fs', FS)
    except (KeyError, ValueError):
        return jsonify({'error': 'Invalid or missing FFT data'}), 400
    
    if len(fft_real) == 0 or len(fft_imaginary) == 0:
        return jsonify({'error': 'FFT data cannot be empty'}), 400
    
    try:
        # Reconstruct the complex FFT from real and imaginary parts
        fft_complex = fft_real + 1j * fft_imaginary
        
        # Since we used rfft, we need to reconstruct the full spectrum for ifft
        # The rfft result is the positive frequency half, we need to mirror it
        n_samples = 2 * (len(fft_complex) - 1)
        
        # Create the full complex spectrum
        full_spectrum = np.zeros(n_samples, dtype=complex)
        full_spectrum[:len(fft_complex)] = fft_complex
        # Mirror the spectrum (conjugate symmetry for real signals)
        # Skip DC (index 0) and Nyquist (last element if n_samples is even)
        full_spectrum[len(fft_complex):] = np.conj(fft_complex[-2:0:-1])
        
        # Perform inverse FFT
        reconstructed_signal = np.fft.ifft(full_spectrum).real
        
        # Create time axis
        num_samples = len(reconstructed_signal)
        time_axis = np.linspace(0, num_samples / fs, num_samples, endpoint=False)
        
        # Compute FFT of the reconstructed signal to show both domains
        from shared_utils.shared_funcs import compute_fft
        reconstructed_fft_magnitude, reconstructed_freq_axis = compute_fft(reconstructed_signal, fs)
        
        return jsonify({
            'reconstructed_signal': reconstructed_signal.tolist(),
            'time_axis': time_axis.tolist(),
            'reconstructed_fft': reconstructed_fft_magnitude.tolist(),
            'reconstructed_freq_axis': reconstructed_freq_axis.tolist(),
            'num_samples': num_samples
        })
    except Exception as e:
        return jsonify({'error': f'iFFT computation failed: {str(e)}'}), 500

@app.route('/evaluate_integral', methods=['POST'])
def evaluate_integral():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    try:
        # Use the shared calculate_integral function
        result = calculate_integral(data)
        if 'result' in result and 'latex' in result:
            # For plotting, also return x/y if available (for definite integrals)
            response = {
                'result': result['result'],
                'latex': result['latex']
            }
            if 'x' in result and 'y' in result:
                response['x'] = result['x']
                response['y'] = result['y']
            return jsonify(response)
        else:
            return jsonify({'error': result.get('result', 'Integral computation failed')}), 400
    except Exception as e:
        return jsonify({'error': f'Integral computation failed: {str(e)}'}), 400

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)