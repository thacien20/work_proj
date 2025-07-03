import numpy as np
from scipy.signal import butter, filtfilt

FS = 10000  # Sampling frequency (Hz), constant for all signals

def compute_fft(signal,FS):
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

def compute_simple_fft(signal, FS):
    """Compute FFT without windowing for better inverse FFT reconstruction."""
    points = len(signal)
    
    # Simple FFT without windowing or excessive zero-padding
    fft_complex = np.fft.rfft(signal)
    
    # Create frequency axis
    freq_axis = np.fft.rfftfreq(points, d=1/FS)
    
    # Separate real and imaginary parts
    fft_real = np.real(fft_complex)
    fft_imaginary = np.imag(fft_complex)
    fft_magnitude = np.abs(fft_complex)
    
    return fft_real, fft_imaginary, fft_magnitude, freq_axis

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

def compute_inverse_fft(fft_complex_data, original_length, FS):
    """Compute inverse FFT to convert frequency domain back to time domain.
    
    Args:
        fft_complex_data: Complex FFT data (real + imaginary parts)
        original_length: Length of the original signal
        FS: Sampling frequency
    """
    # Convert list to numpy array if needed
    if not isinstance(fft_complex_data, np.ndarray):
        fft_complex_data = np.array(fft_complex_data)
    
    # Perform inverse FFT (simple, no scaling needed since we used simple FFT)
    reconstructed_signal = np.fft.irfft(fft_complex_data, n=original_length)
    
    # Create time axis
    time_axis = np.arange(original_length) / FS
    
    return reconstructed_signal, time_axis