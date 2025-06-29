import numpy as np

def generate_sine(t, frequency, phase=0):
    # phase in degrees
    return np.sin(2 * np.pi * frequency * t + np.deg2rad(phase))

def generate_square(t, frequency, phase=0):
    return np.sign(np.sin(2 * np.pi * frequency * t + np.deg2rad(phase)))

def generate_triangle(t, frequency, phase=0):
    # Triangle with phase shift
    return 2 * np.abs(2 * (((t + phase/360/frequency) * frequency) % 1) - 1) - 1

def generate_multi_sine(t, frequencies, amplitudes=None):
    if amplitudes is None:
        amplitudes = [1.0] * len(frequencies)
    signal = np.zeros_like(t)
    for f, a in zip(frequencies, amplitudes):
        signal += a * np.sin(2 * np.pi * f * t)
    return signal

def generate_exponential_decay(t, tau=0.05, amplitude=1.0):
    """Generate an exponential decay signal: amplitude * exp(-t / tau)"""
    return amplitude * np.exp(-t / tau)

def generate_signal(t, frequency, signal_type, frequencies=None, amplitudes=None, phase=0, tau=0.05, amplitude=1.0):
    if signal_type == "sine":
        return generate_sine(t, frequency, phase)
    elif signal_type == "square":
        return generate_square(t, frequency, phase)
    elif signal_type == "triangle":
        return generate_triangle(t, frequency, phase)
    elif signal_type == "multi":
        if frequencies is None:
            raise ValueError("Frequencies list required for multi signal type")
        return generate_multi_sine(t, frequencies, amplitudes)
    elif signal_type == "expdecay":
        return generate_exponential_decay(t, tau=tau, amplitude=amplitude)
    else:
        raise ValueError("Unsupported signal type")



