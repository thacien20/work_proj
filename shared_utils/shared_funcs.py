
# Example: shared_utils/signal_processing.py

import numpy as np

from scipy.signal import butter, filtfilt


FS = 10000  # Sampling frequency (Hz), constant for all signals

def compute_fft(signal, FS):
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






