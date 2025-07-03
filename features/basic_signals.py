# Basic Signals Module - Educational signal generation and visualization
from flask import Blueprint, render_template, request, jsonify
import numpy as np
import json
from shared_signal_utils import SignalGenerator, ModulationGenerator, SignalAnalyzer

# Create blueprint for basic signals feature
basic_signals_blueprint = Blueprint('basic_signals', __name__)

@basic_signals_blueprint.route('/')
def basic_signals_home():
    """Main page for basic signals feature"""
    return render_template('basic_signals/index.html')

@basic_signals_blueprint.route('/api/generate', methods=['POST'])
def generate_basic_signal():
    """Generate basic signal types for educational purposes"""
    try:
        data = request.get_json()
        
        # Extract parameters
        signal_type = data.get('type', 'sine')
        frequency = float(data.get('frequency', 1.0))
        amplitude = float(data.get('amplitude', 1.0))
        phase = float(data.get('phase', 0.0))
        duration = float(data.get('duration', 1.0))
        sample_rate = int(data.get('sample_rate', 1000))
        
        # Use shared signal generator
        t, y = SignalGenerator.generate_signal(
            signal_type, frequency, amplitude, phase, duration, sample_rate
        )
        
        # Return signal data
        return jsonify({
            'success': True,
            'signal': {
                'time': t.tolist(),
                'amplitude': y.tolist(),
                'type': signal_type,
                'frequency': frequency,
                'sample_rate': sample_rate,
                'duration': duration
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@basic_signals_blueprint.route('/api/analyze', methods=['POST'])
def analyze_signal():
    """Analyze signal properties (RMS, peak, frequency content)"""
    try:
        data = request.get_json()
        signal_data = np.array(data['signal'])
        sample_rate = data.get('sample_rate', 1000)
        
        # Use shared signal analyzer
        analysis = SignalAnalyzer.analyze_signal(signal_data, sample_rate)
        
        return jsonify({
            'success': True,
            'analysis': analysis
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@basic_signals_blueprint.route('/api/modulate', methods=['POST'])
def modulate_signal():
    """Generate modulated signals (AM, FM, PM)"""
    try:
        data = request.get_json()
        
        modulation_type = data.get('type', 'am')
        carrier_freq = float(data.get('carrier_freq', 10.0))
        modulating_freq = float(data.get('modulating_freq', 1.0))
        duration = float(data.get('duration', 1.0))
        sample_rate = int(data.get('sample_rate', 1000))
        
        if modulation_type == 'am':
            modulation_index = float(data.get('modulation_index', 0.5))
            t, y = ModulationGenerator.amplitude_modulation(
                carrier_freq, modulating_freq, modulation_index, duration, sample_rate
            )
        elif modulation_type == 'fm':
            frequency_deviation = float(data.get('frequency_deviation', 10.0))
            t, y = ModulationGenerator.frequency_modulation(
                carrier_freq, modulating_freq, frequency_deviation, duration, sample_rate
            )
        else:
            return jsonify({'error': f'Unknown modulation type: {modulation_type}'}), 400
        
        return jsonify({
            'success': True,
            'signal': {
                'time': t.tolist(),
                'amplitude': y.tolist(),
                'type': modulation_type,
                'carrier_freq': carrier_freq,
                'modulating_freq': modulating_freq,
                'sample_rate': sample_rate,
                'duration': duration
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
