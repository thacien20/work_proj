"""
Basic Signals Feature - Flask Blueprint
Educational signal generation and visualization module

This module provides:
- Simple signal generation (sine, square, triangle, sawtooth)
- Basic signal properties visualization
- Interactive parameter adjustment
- Educational content and explanations
"""

from flask import Blueprint, render_template, request, jsonify
import numpy as np
import json

# Create the blueprint for basic signals feature
basic_signals_blueprint = Blueprint(
    'basic_signals',
    __name__,
    template_folder='templates',
    static_folder='static',
    static_url_path='/static/basic_signals'
)

# Default signal parameters
DEFAULT_PARAMS = {
    'frequency': 1.0,
    'amplitude': 1.0,
    'phase': 0.0,
    'duration': 2.0,
    'sample_rate': 100
}

@basic_signals_blueprint.route('/')
def basic_signals_home():
    """Main page for basic signals feature"""
    return render_template('basic_signals.html', title='Basic Signals')

@basic_signals_blueprint.route('/api/generate', methods=['POST'])
def generate_basic_signal():
    """
    Generate a basic signal with specified parameters
    
    Expected JSON payload:
    {
        "signal_type": "sine|square|triangle|sawtooth",
        "frequency": float,
        "amplitude": float,
        "phase": float,
        "duration": float,
        "sample_rate": int
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Extract parameters with defaults
        signal_type = data.get('signal_type', 'sine')
        frequency = float(data.get('frequency', DEFAULT_PARAMS['frequency']))
        amplitude = float(data.get('amplitude', DEFAULT_PARAMS['amplitude']))
        phase = float(data.get('phase', DEFAULT_PARAMS['phase']))
        duration = float(data.get('duration', DEFAULT_PARAMS['duration']))
        sample_rate = int(data.get('sample_rate', DEFAULT_PARAMS['sample_rate']))
        
        # Validate parameters
        if frequency <= 0 or frequency > sample_rate/2:
            return jsonify({'error': 'Frequency must be positive and less than Nyquist frequency'}), 400
        
        if amplitude <= 0:
            return jsonify({'error': 'Amplitude must be positive'}), 400
        
        if duration <= 0:
            return jsonify({'error': 'Duration must be positive'}), 400
        
        # Generate time array
        t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
        
        # Generate signal based on type
        if signal_type == 'sine':
            y = amplitude * np.sin(2 * np.pi * frequency * t + phase)  # phase in radians
        elif signal_type == 'cosine':
            y = amplitude * np.cos(2 * np.pi * frequency * t + phase)  # phase in radians
        elif signal_type == 'square':
            y = amplitude * np.sign(np.sin(2 * np.pi * frequency * t + phase))
        elif signal_type == 'triangle':
            y = amplitude * (2/np.pi) * np.arcsin(np.sin(2 * np.pi * frequency * t + phase))
        elif signal_type == 'sawtooth':
            y = amplitude * (2/np.pi) * np.arctan(np.tan(np.pi * frequency * t + phase/2))
        else:
            return jsonify({'error': f'Unknown signal type: {signal_type}'}), 400
        
        # Calculate basic signal properties
        properties = {
            'peak_amplitude': float(np.max(np.abs(y))),
            'rms_value': float(np.sqrt(np.mean(y**2))),
            'mean_value': float(np.mean(y)),
            'period': 1.0 / frequency,
            'frequency': frequency,
            'sample_rate': sample_rate,
            'duration': duration,
            'num_samples': len(y)
        }
        
        # Return signal data and properties
        return jsonify({
            'success': True,
            'signal': {
                'time': t.tolist(),
                'amplitude': y.tolist(),
                'type': signal_type,
                'properties': properties
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Signal generation failed: {str(e)}'}), 500

@basic_signals_blueprint.route('/api/signal_info/<signal_type>')
def get_signal_info(signal_type):
    """
    Get educational information about a specific signal type
    """
    signal_info = {
        'sine': {
            'name': 'Sine Wave',
            'description': 'A smooth, periodic oscillation representing pure frequency.',
            'formula': 'y(t) = A * sin(2πft + φ)',
            'properties': [
                'Fundamental waveform in signal processing',
                'Represents pure frequency with no harmonics',
                'Smooth and continuous',
                'Common in audio and RF applications'
            ],
            'applications': [
                'Audio tones',
                'AC power signals',
                'Carrier waves in communication',
                'Test signals in electronics'
            ]
        },
        'cosine': {
            'name': 'Cosine Wave',
            'description': 'A smooth, periodic oscillation phase-shifted 90° from sine.',
            'formula': 'y(t) = A * cos(2πft + φ)',
            'properties': [
                'Phase-shifted version of sine wave',
                'Starts at maximum amplitude at t=0',
                'Smooth and continuous',
                'Fundamental in trigonometry and signal processing'
            ],
            'applications': [
                'Quadrature signals',
                'Phase-locked loops',
                'Trigonometric calculations',
                'Signal demodulation'
            ]
        },
        'square': {
            'name': 'Square Wave',
            'description': 'A periodic wave that alternates between high and low states.',
            'formula': 'y(t) = A * sign(sin(2πft + φ))',
            'properties': [
                'Sharp transitions between states',
                'Rich in odd harmonics',
                'Used in digital systems',
                'Easy to generate electronically'
            ],
            'applications': [
                'Digital clock signals',
                'Pulse-width modulation',
                'Logic circuits',
                'Switch-mode power supplies'
            ]
        },
        'triangle': {
            'name': 'Triangle Wave',
            'description': 'A periodic wave with linear rise and fall segments.',
            'formula': 'y(t) = A * (2/π) * arcsin(sin(2πft + φ))',
            'properties': [
                'Linear rise and fall',
                'Rich in odd harmonics (less than square)',
                'Symmetric about zero',
                'Smooth transitions'
            ],
            'applications': [
                'Voltage-controlled oscillators',
                'Frequency modulation',
                'Audio synthesis',
                'Ramp generators'
            ]
        },
        'sawtooth': {
            'name': 'Sawtooth Wave',
            'description': 'A periodic wave with linear rise and sharp fall (or vice versa).',
            'formula': 'y(t) = A * (2/π) * arctan(tan(πft + φ/2))',
            'properties': [
                'Linear ramp followed by sharp transition',
                'Rich in all harmonics',
                'Asymmetric waveform',
                'Creates buzzing sound in audio'
            ],
            'applications': [
                'Audio synthesis',
                'Oscilloscope time base',
                'Frequency sweep generators',
                'Analog-to-digital conversion'
            ]
        }
    }
    
    if signal_type not in signal_info:
        return jsonify({'error': f'Unknown signal type: {signal_type}'}), 404
    
    return jsonify({
        'success': True,
        'info': signal_info[signal_type]
    })

@basic_signals_blueprint.route('/api/compare', methods=['POST'])
def compare_signals():
    """
    Generate multiple signals for comparison
    """
    try:
        data = request.get_json()
        if not data or 'signals' not in data:
            return jsonify({'error': 'No signals specified for comparison'}), 400
        
        signals_data = data['signals']
        duration = float(data.get('duration', DEFAULT_PARAMS['duration']))
        sample_rate = int(data.get('sample_rate', DEFAULT_PARAMS['sample_rate']))
        
        # Generate time array
        t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
        
        results = []
        
        for signal_config in signals_data:
            signal_type = signal_config.get('type', 'sine')
            frequency = float(signal_config.get('frequency', DEFAULT_PARAMS['frequency']))
            amplitude = float(signal_config.get('amplitude', DEFAULT_PARAMS['amplitude']))
            phase = float(signal_config.get('phase', DEFAULT_PARAMS['phase']))
            
            # Generate signal
            if signal_type == 'sine':
                y = amplitude * np.sin(2 * np.pi * frequency * t + phase)
            elif signal_type == 'cosine':
                y = amplitude * np.cos(2 * np.pi * frequency * t + phase)
            elif signal_type == 'square':
                y = amplitude * np.sign(np.sin(2 * np.pi * frequency * t + phase))
            elif signal_type == 'triangle':
                y = amplitude * (2/np.pi) * np.arcsin(np.sin(2 * np.pi * frequency * t + phase))
            elif signal_type == 'sawtooth':
                y = amplitude * (2/np.pi) * np.arctan(np.tan(np.pi * frequency * t + phase/2))
            else:
                continue
            
            results.append({
                'type': signal_type,
                'amplitude': y.tolist(),
                'config': signal_config,
                'properties': {
                    'peak_amplitude': float(np.max(np.abs(y))),
                    'rms_value': float(np.sqrt(np.mean(y**2))),
                    'frequency': frequency
                }
            })
        
        return jsonify({
            'success': True,
            'time': t.tolist(),
            'signals': results
        })
        
    except Exception as e:
        return jsonify({'error': f'Signal comparison failed: {str(e)}'}), 500

@basic_signals_blueprint.route('/api/trigonometry', methods=['POST'])
def generate_trigonometry():
    """
    Generate trigonometry visualizations
    
    Expected JSON payload:
    {
        "mode": "unit_circle|identities|phase_shift",
        "angle": float,
        "frequency": float,
        "duration": float,
        "sample_rate": int
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        mode = data.get('mode', 'unit_circle')
        angle = float(data.get('angle', 0))
        frequency = float(data.get('frequency', 1.0))
        duration = float(data.get('duration', 2.0))
        sample_rate = int(data.get('sample_rate', 200))
        
        # Generate time array
        t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
        
        if mode == 'unit_circle':
            # Generate sine and cosine waves
            sine_wave = np.sin(2 * np.pi * frequency * t)
            cosine_wave = np.cos(2 * np.pi * frequency * t)
            
            return jsonify({
                'success': True,
                'mode': mode,
                'sine_wave': {
                    'time': t.tolist(),
                    'amplitude': sine_wave.tolist()
                },
                'cosine_wave': {
                    'time': t.tolist(),
                    'amplitude': cosine_wave.tolist()
                }
            })
            
        elif mode == 'identities':
            # Demonstrate trigonometric identity: sin²(x) + cos²(x) = 1
            sine_wave = np.sin(2 * np.pi * frequency * t)
            cosine_wave = np.cos(2 * np.pi * frequency * t)
            identity_left = sine_wave**2 + cosine_wave**2
            identity_right = np.ones_like(t)
            
            return jsonify({
                'success': True,
                'mode': mode,
                'time': t.tolist(),
                'identity_left': identity_left.tolist(),
                'identity_right': identity_right.tolist(),
                'identity_name': 'sin²(x) + cos²(x) = 1'
            })
            
        elif mode == 'phase_shift':
            # Show phase relationship between signals
            phase_shift = np.radians(angle)
            original_signal = np.sin(2 * np.pi * frequency * t)
            phase_shifted_signal = np.sin(2 * np.pi * frequency * t + phase_shift)
            
            return jsonify({
                'success': True,
                'mode': mode,
                'time': t.tolist(),
                'original_signal': original_signal.tolist(),
                'phase_shifted_signal': phase_shifted_signal.tolist(),
                'phase_shift': angle
            })
            
        else:
            return jsonify({'error': f'Unknown trigonometry mode: {mode}'}), 400
            
    except Exception as e:
        return jsonify({'error': f'Trigonometry generation failed: {str(e)}'}), 500
