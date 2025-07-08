import numpy as np
from scipy.signal import butter, freqz, lfilter

FS = 10000  # Sampling frequency (Hz)

# Utility to get filter coefficients
from Filters import butter_lowpass, butter_highpass, butter_bandpass

def get_filter_coeffs(filter_type, cutoff=None, lowcut=None, highcut=None, order=4, fs=FS):
    if filter_type == 'lowpass':
        return butter_lowpass(cutoff, fs, order)
    elif filter_type == 'highpass':
        return butter_highpass(cutoff, fs, order)
    elif filter_type == 'bandpass':
        return butter_bandpass(lowcut, highcut, fs, order)
    else:
        raise ValueError('Invalid filter type')

def filter_visualization(filter_type, cutoff=None, lowcut=None, highcut=None, order=4, fs=FS):
    b, a = get_filter_coeffs(filter_type, cutoff, lowcut, highcut, order, fs)
    # Impulse response
    impulse = np.zeros(100)
    impulse[0] = 1
    response = lfilter(b, a, impulse)
    # Frequency response
    w, h = freqz(b, a, worN=8000)
    freq = 0.5 * fs * w / np.pi
    magnitude = np.abs(h)
    phase = np.angle(h)
    return {
        'impulse': response.tolist(),
        'impulse_x': list(range(100)),
        'freq': freq.tolist(),
        'magnitude': magnitude.tolist(),
        'phase': phase.tolist()
    }
