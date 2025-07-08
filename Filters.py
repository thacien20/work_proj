import numpy as np
from scipy.signal import butter, filtfilt

FS = 10000  # Sampling frequency (Hz), constant for all signals

# Design a lowpass Butterworth filter
# cutoff: cutoff frequency (Hz), fs: sampling frequency, order: filter order
# Returns filter coefficients (b, a)
def butter_lowpass(cutoff, fs=FS, order=4):
    nyq = 0.5 * fs  # Nyquist frequency
    normal_cutoff = cutoff / nyq  # Normalized cutoff (0-1)
    b, a = butter(order, normal_cutoff, btype='low', analog=False)
    return b, a

# Design a highpass Butterworth filter
# cutoff: cutoff frequency (Hz), fs: sampling frequency, order: filter order
# Returns filter coefficients (b, a)
def butter_highpass(cutoff, fs=FS, order=4):
    nyq = 0.5 * fs
    normal_cutoff = cutoff / nyq
    b, a = butter(order, normal_cutoff, btype='high', analog=False)
    return b, a

# Design a bandpass Butterworth filter
# lowcut: low cutoff (Hz), highcut: high cutoff (Hz), fs: sampling frequency, order: filter order
# Returns filter coefficients (b, a)
def butter_bandpass(lowcut, highcut, fs=FS, order=4):
    nyq = 0.5 * fs
    low = lowcut / nyq  # Normalized low cutoff
    high = highcut / nyq  # Normalized high cutoff
    b, a = butter(order, [low, high], btype='band', analog=False)
    return b, a

# Apply a digital filter to a signal using zero-phase filtering
# signal: input array, filter_type: 'lowpass', 'highpass', or 'bandpass'
# cutoff/lowcut/highcut: cutoff frequencies (Hz), order: filter order, fs: sampling frequency
# Returns filtered signal (same length as input)
def apply_filter(signal, filter_type, cutoff=None, lowcut=None, highcut=None, order=4, fs=FS):
    if filter_type == 'lowpass':
        b, a = butter_lowpass(cutoff, fs, order)
    elif filter_type == 'highpass':
        b, a = butter_highpass(cutoff, fs, order)
    elif filter_type == 'bandpass':
        b, a = butter_bandpass(lowcut, highcut, fs, order)
    else:
        raise ValueError('Invalid filter type')
    # filtfilt applies the filter forward and backward for zero phase distortion
    return filtfilt(b, a, signal)
