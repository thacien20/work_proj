import numpy as np
from scipy.signal import butter, filtfilt

FS = 10000  # Sampling frequency (Hz), constant for all signals

def butter_lowpass(cutoff, fs=FS, order=4):
    nyq = 0.5 * fs
    normal_cutoff = cutoff / nyq
    b, a = butter(order, normal_cutoff, btype='low', analog=False)
    return b, a

def butter_highpass(cutoff, fs=FS, order=4):
    nyq = 0.5 * fs
    normal_cutoff = cutoff / nyq
    b, a = butter(order, normal_cutoff, btype='high', analog=False)
    return b, a

def butter_bandpass(lowcut, highcut, fs=FS, order=4):
    nyq = 0.5 * fs
    low = lowcut / nyq
    high = highcut / nyq
    b, a = butter(order, [low, high], btype='band', analog=False)
    return b, a

def apply_filter(signal, filter_type, cutoff=None, lowcut=None, highcut=None, order=4, fs=FS):
    if filter_type == 'lowpass':
        b, a = butter_lowpass(cutoff, fs, order)
    elif filter_type == 'highpass':
        b, a = butter_highpass(cutoff, fs, order)
    elif filter_type == 'bandpass':
        b, a = butter_bandpass(lowcut, highcut, fs, order)
    else:
        raise ValueError('Invalid filter type')
    return filtfilt(b, a, signal)
