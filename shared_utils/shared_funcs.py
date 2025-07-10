
# Example: shared_utils/signal_processing.py

import numpy as np

from scipy.signal import butter, filtfilt


FS = 10000  # Sampling frequency (Hz), constant for all signals

def compute_fft(signal, FS):
    """
    Compute FFT with windowing and zero-padding.
    Args:
        signal: 1D array-like, real-valued signal
        FS: Sampling frequency (Hz), positive float/int
    Returns:
        fft_magnitude: Magnitude spectrum (array)
        freq_axis: Frequency axis (array, Hz)
    """
    signal = np.asarray(signal, dtype=float).flatten()
    if signal.ndim != 1:
        raise ValueError("Signal must be 1D")
    if FS <= 0:
        raise ValueError("Sampling frequency FS must be positive")
    points = len(signal)
    if points < 2:
        raise ValueError("Signal must have at least 2 points")
    sigma = points / (FS * 10)
    t = np.arange(points) / FS
    window = np.exp(-0.5 * ((t - t[-1]/2) / sigma)**2)
    windowed_signal = signal * window

    next_pow2 = int(2 ** np.ceil(np.log2(points)))
    zero_filled = np.zeros(next_pow2)
    zero_filled[:points] = windowed_signal

    fft = np.fft.rfft(zero_filled)
    fft_magnitude = np.abs(fft) / points
    freq_axis = np.fft.rfftfreq(len(zero_filled), d=1/FS)
    return fft_magnitude, freq_axis



def compute_complex_fft(signal, FS):
    """Compute FFT returning real and imaginary components separately."""
    points = len(signal)
    sigma = points / (FS * 10)
    t = np.arange(points) / FS
    window = np.exp(-0.5 * ((t - t[-1]/2) / sigma)**2)
    windowed_signal = signal * window

    next_pow2 = 2 ** np.ceil(np.log2(points))
    zero_filled = np.zeros(int(next_pow2 * 2))
    zero_filled[:points] = windowed_signal

    fft_complex = np.fft.rfft(zero_filled)
    
    # Normalize and separate components
    fft_complex_normalized = fft_complex / points
    fft_real = np.real(fft_complex_normalized)
    fft_imaginary = np.imag(fft_complex_normalized)
    fft_magnitude = np.abs(fft_complex_normalized)
    
    freq_axis = np.fft.rfftfreq(len(zero_filled), d=1/FS)
    
    return fft_real, fft_imaginary, fft_magnitude, freq_axis





import numpy as np

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

# There is no import of compute_fft or compute_complex_fft in this file.
# Only signal_to_signal_operation is defined here.











