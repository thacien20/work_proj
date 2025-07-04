from flask import Blueprint, request, jsonify, render_template
import numpy as np
from circuits import differentiator_circuit_response, integrator_circuit_response

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

@circuits_blueprint.route('/modulation', methods=['POST'])
def simulate_modulation():
    """
    Generate modulated signals (AM, FM, PM) - Advanced signal processing
    
    Expected JSON payload:
    {
        "modulation_type": "AM|FM|PM",
        "carrier_frequency": float,
        "modulating_frequency": float,
        "modulation_index": float,
        "duration": float,
        "sample_rate": int
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        modulation_type = data.get('modulation_type', 'AM')
        carrier_freq = float(data.get('carrier_frequency', 10.0))
        modulating_freq = float(data.get('modulating_frequency', 1.0))
        modulation_index = float(data.get('modulation_index', 0.5))
        duration = float(data.get('duration', 2.0))
        sample_rate = int(data.get('sample_rate', 200))
        
        # Validate parameters
        if carrier_freq <= modulating_freq:
            return jsonify({'error': 'Carrier frequency must be higher than modulating frequency'}), 400
        
        # Generate time array
        t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
        
        # Generate modulating signal
        modulating_signal = np.sin(2 * np.pi * modulating_freq * t)
        
        # Generate carrier signal
        carrier_signal = np.sin(2 * np.pi * carrier_freq * t)
        
        # Generate modulated signal based on type
        if modulation_type == 'AM':
            # Amplitude Modulation: y(t) = (1 + m*cos(2πfm*t)) * cos(2πfc*t)
            modulated_signal = (1 + modulation_index * modulating_signal) * carrier_signal
        elif modulation_type == 'FM':
            # Frequency Modulation: s(t) = A_c * cos(2πf_c*t + 2πk_f*∫m(τ)dτ)
            # For m(t) = sin(2πfm*t), the integral is: ∫sin(2πfm*t)dt = -cos(2πfm*t)/(2πfm)
            # FM: The instantaneous frequency varies with the modulating signal
            fm_integral = -np.cos(2 * np.pi * modulating_freq * t) / (2 * np.pi * modulating_freq)
            modulated_signal = np.cos(2 * np.pi * carrier_freq * t + 
                                    2 * np.pi * modulation_index * fm_integral)
        elif modulation_type == 'PM':
            # Phase Modulation: s(t) = A_c * cos(2πf_c*t + k_p*m(t))
            # PM: The instantaneous phase varies directly with the modulating signal
            modulated_signal = np.cos(2 * np.pi * carrier_freq * t + 
                                    modulation_index * modulating_signal)
        else:
            return jsonify({'error': f'Unknown modulation type: {modulation_type}'}), 400
        
        return jsonify({
            'success': True,
            'modulation_type': modulation_type,
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
        
    except Exception as e:
        return jsonify({'error': f'Modulation generation failed: {str(e)}'}), 500
