from flask import Blueprint, request, jsonify, render_template
import numpy as np
from circuits.circuits import (  # Updated import path to reflect file location
    rc_circuit_response,
    rl_circuit_response,
    rlc_circuit_response,
    differentiator_circuit_response,
    integrator_circuit_response
)
from shared_utils.shared_funcs import compute_fft, FS

circuits_blueprint = Blueprint('circuits', __name__)

@circuits_blueprint.route('/')
def circuits_home():
    """Main circuits analysis page"""
    return render_template('circuits.html')

@circuits_blueprint.route('/differentiator', methods=['POST'])
def simulate_differentiator():
    data = request.get_json()
    R = data.get('R', 1000)
    C = data.get('C', 1e-6)
    V_in = data.get('V_in', 1.0)
    duration = data.get('duration', 0.05)
    points = data.get('points', 500)
    t, V_out = differentiator_circuit_response(R, C, V_in, duration, points)
    return jsonify({'t': t.tolist(), 'V_out': V_out.tolist()})

@circuits_blueprint.route('/integrator', methods=['POST'])
def simulate_integrator():
    data = request.get_json()
    R = data.get('R', 1000)
    C = data.get('C', 1e-6)
    V_in = data.get('V_in', 1.0)
    duration = data.get('duration', 0.05)
    points = data.get('points', 500)
    t, V_out = integrator_circuit_response(R, C, V_in, duration, points)
    return jsonify({'t': t.tolist(), 'V_out': V_out.tolist()})

@circuits_blueprint.route('/rc', methods=['POST'])
def simulate_rc():
    data = request.get_json()
    R = data.get('R', 1000)
    C = data.get('C', 1e-6)
    V_in = data.get('V_in', 1.0)
    duration = data.get('duration', 0.05)
    points = data.get('points', 500)
    t, V_out, I_out = rc_circuit_response(R, C, V_in, duration, points)
    return jsonify({'t': t.tolist(), 'V_out': V_out.tolist(), 'I_out': I_out.tolist()})

@circuits_blueprint.route('/rl', methods=['POST'])
def simulate_rl():
    data = request.get_json()
    R = data.get('R', 1000)
    L = data.get('L', 0.1)
    V_in = data.get('V_in', 1.0)
    duration = data.get('duration', 0.05)
    points = data.get('points', 500)
    t, V_out, I_out = rl_circuit_response(R, L, V_in, duration, points)
    return jsonify({'t': t.tolist(), 'V_out': V_out.tolist(), 'I_out': I_out.tolist()})

@circuits_blueprint.route('/api/rlc_circuit', methods=['POST'])
def rlc_circuit_simulation():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Extract parameters with defaults
        R = float(data.get('R', 100))
        L = float(data.get('L', 0.5))
        C = float(data.get('C', 10e-6))
        V_in = float(data.get('V_in', 5.0))
        duration = float(data.get('duration', 0.05))
        points = int(data.get('points', 1000))

        # Get circuit response
        t, V_out, I_out = rlc_circuit_response(R, L, C, V_in, duration, points)

        # Convert numpy arrays to lists and handle NaN values
        t_list = [float(x) if not np.isnan(x) else None for x in t]
        v_list = [float(x) if not np.isnan(x) else None for x in V_out]
        i_list = [float(x) if not np.isnan(x) else None for x in I_out] if I_out is not None else []

        return jsonify({
            'time': t_list,
            'voltage': v_list,
            'current': i_list
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@circuits_blueprint.route('/modulation', methods=['POST'])
def simulate_modulation():
    """Generate modulated signals (AM, FM, QM) - Advanced signal processing"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Common parameters
        modulation_type = data.get('modulation_type', 'AM')
        duration = float(data.get('duration', 0.5))
        sample_rate = int(data.get('sample_rate', 10000))
        t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
        
        if modulation_type == 'AM':
            # AM-specific parameters
            carrier_freq = float(data.get('carrier_frequency', 100.0))
            modulating_freq = float(data.get('modulating_frequency', 10.0))
            modulation_index = float(data.get('modulation_index', 0.8))
            
            # Generate signals
            modulating_signal = np.sin(2 * np.pi * modulating_freq * t)
            carrier_signal = np.sin(2 * np.pi * carrier_freq * t)
            modulated_signal = (1 + modulation_index * modulating_signal) * carrier_signal

            return jsonify({
                'success': True,
                'modulation_type': 'AM',
                'time': t.tolist(),
                'modulated_signal': modulated_signal.tolist(),
                'carrier_signal': carrier_signal.tolist(),
                'modulating_signal': modulating_signal.tolist(),
                'parameters': {
                    'carrier_frequency': carrier_freq,
                    'modulating_frequency': modulating_freq,
                    'modulation_index': modulation_index
                }
            })
            
        elif modulation_type == 'FM':
            # FM-specific parameters
            carrier_freq = float(data.get('carrier_frequency', 100.0))
            modulating_freq = float(data.get('modulating_frequency', 10.0))
            modulation_index = float(data.get('modulation_index', 5.0))  # Beta can be > 1
            
            # Generate signals
            modulating_signal = np.sin(2 * np.pi * modulating_freq * t)
            carrier_signal = np.sin(2 * np.pi * carrier_freq * t)
            # Frequency Modulation formula
            modulated_signal = np.cos(2 * np.pi * carrier_freq * t + modulation_index * modulating_signal)
            
            return jsonify({
                'success': True,
                'modulation_type': 'FM',
                'time': t.tolist(),
                'modulated_signal': modulated_signal.tolist(),
                'carrier_signal': carrier_signal.tolist(),
                'modulating_signal': modulating_signal.tolist(),
                'parameters': {
                    'carrier_frequency': carrier_freq,
                    'modulating_frequency': modulating_freq,
                    'modulation_index': modulation_index
                }
            })
            
        elif modulation_type == 'QM':
            # QM-specific parameters
            carrier_freq = float(data.get('carrier_frequency', 100.0))
            i_freq = float(data.get('i_frequency', 15.0))
            q_freq = float(data.get('q_frequency', 20.0))
            phase_shift = float(data.get('phase_shift', 90.0))
            
            # Generate I/Q signals
            I = np.sin(2 * np.pi * i_freq * t)
            Q = np.sin(2 * np.pi * q_freq * t + np.deg2rad(phase_shift))
            
            # Generate carrier and quadrature carrier
            carrier = np.cos(2 * np.pi * carrier_freq * t)
            quad_carrier = np.sin(2 * np.pi * carrier_freq * t)
            
            # Generate modulated signal
            quadrature_modulated_signal = I * carrier + Q * quad_carrier
            
            return jsonify({
                'success': True,
                'modulation_type': 'QM',
                'time': t.tolist(),
                'quadrature_modulated_signal': quadrature_modulated_signal.tolist(),
                'I': I.tolist(),
                'Q': Q.tolist(),
                'parameters': {
                    'carrier_frequency': carrier_freq,
                    'i_frequency': i_freq,
                    'q_frequency': q_freq,
                    'phase_shift': phase_shift
                }
            })
        else:
            return jsonify({'error': f'Unknown modulation type: {modulation_type}'}), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@circuits_blueprint.route('/fft_qm', methods=['POST'])
def fft_quadrature_modulation():
    """Compute FFT of the quadrature modulated signal (QM)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        # Expect the quadrature modulated signal and sample rate
        qm_signal = data.get('quadrature_modulated_signal')
        sample_rate = data.get('sample_rate', None)
        if qm_signal is None:
            return jsonify({'error': 'quadrature_modulated_signal is required'}), 400
        if sample_rate is None:
            sample_rate = FS  # Use FS from shared_funcs.py if not provided
        qm_signal = np.array(qm_signal)
        # Compute FFT
        freqs, fft_magnitude = compute_fft(qm_signal, sample_rate)
        return jsonify({
            'success': True,
            'frequencies': freqs.tolist(),
            'magnitude': fft_magnitude.tolist()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


