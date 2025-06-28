import numexpr
import numpy as np

FS = 10000  # Sampling frequency (Hz), constant for all signals

# Existing SAFE_FUNCTIONS (unchanged)
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
        return np.sin(2 * np.pi * frequency * t)

def compute_fft(signal):
    """Compute FFT with windowing and zero-padding using constant FS."""
    points = len(signal)
    sigma = points / (FS * 10)
    t = np.arange(points) / FS
    window = np.exp(-0.5 * ((t - t[-1]/2) / sigma)**2)
    windowed_signal = signal * window

    next_pow2 = 2 ** np.ceil(np.log2(points))
    zero_filled = np.zeros(int(next_pow2 * 2))
    zero_filled[:points] = windowed_signal

    fft = np.fft.rfft(zero_filled)
    fft_magnitude = np.abs(fft) / points
    freq_axis = np.fft.rfftfreq(len(zero_filled), d=1/FS)
    return fft_magnitude, freq_axis

def operations(signal, operation, constant):
    """Apply mathematical operation to the signal with a constant."""
    if not isinstance(signal, np.ndarray):
        signal = np.array(signal)
    
    if operation == 'add':
        return signal + constant
    elif operation == 'subtract':
        return signal - constant
    elif operation == 'multiply':
        return signal * constant
    elif operation == 'divide':
        if constant == 0:
            raise ValueError("Cannot divide by zero")
        return signal / constant
    else:
        raise ValueError(f"Invalid operation: {operation}")

def signal_to_signal_operation(signal1, signal2, operation):
    """Apply element-wise operation between two signals of the same length."""
    if not isinstance(signal1, np.ndarray):
        signal1 = np.array(signal1)
    if not isinstance(signal2, np.ndarray):
        signal2 = np.array(signal2)
    if signal1.shape != signal2.shape:
        raise ValueError("Signals must have the same shape")
    if operation == 'add':
        return signal1 + signal2
    elif operation == 'subtract':
        return signal1 - signal2
    elif operation == 'multiply':
        return signal1 * signal2
    elif operation == 'divide':
        if np.any(signal2 == 0):
            raise ValueError("Cannot divide by zero in signal2")
        return signal1 / signal2
    else:
        raise ValueError(f"Invalid operation: {operation}")