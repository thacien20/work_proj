import numpy as np
import numexpr

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

def generate_signal(t, frequency, signal_type, custom_formula=None):
    """Generate different types of signals."""
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
            raise ValueError(f"Invalid custom formula: {str(e)}")
    else:
        return np.sin(2 * np.pi * frequency * t)  # Default to sine wave

def compute_fft(signal, fs):
    """Compute FFT with windowing and zero-padding."""
    points = len(signal)
    sigma = points / (fs * 10)  # Adjust sigma based on fs
    t = np.arange(points) / fs
    window = np.exp(-0.5 * ((t - t[-1]/2) / sigma)**2)
    windowed_signal = signal * window

    next_pow2 = 2 ** np.ceil(np.log2(points))
    zero_filled = np.zeros(int(next_pow2 * 2))  # Extra padding
    zero_filled[:points] = windowed_signal

    fft = np.fft.rfft(zero_filled)
    fft_magnitude = np.abs(fft) / points  # Normalize
    freq_axis = np.fft.rfftfreq(len(zero_filled), d=1/fs)
    return fft_magnitude, freq_axis
