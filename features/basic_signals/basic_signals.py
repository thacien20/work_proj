from flask import Blueprint, request, jsonify
from shared_utils.shared_funcs import compute_fft
import numpy as np

basic_signals = Blueprint('basic_signals', __name__)

@basic_signals.route('/api/fft', methods=['POST'])
def api_fft():
    data = request.get_json()
    signal = data.get('signal', [])
    # Ensure signal is a numpy array for compute_fft
    signal = np.asarray(signal, dtype=np.float64)
    fft_result = compute_fft(signal)
    # If compute_fft returns a tuple (magnitude, freq_axis), extract magnitude
    if isinstance(fft_result, tuple):
        fft_magnitude = fft_result[0]
    else:
        fft_magnitude = fft_result
    # Only call .tolist() if it's a numpy array
    if hasattr(fft_magnitude, 'tolist'):
        fft_magnitude = fft_magnitude.tolist()
    return jsonify({'fft': fft_magnitude})