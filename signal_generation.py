import numpy as np

def generate_sine(t, frequency, phase=0):
    # phase in degrees
    return np.sin(2 * np.pi * frequency * t + np.deg2rad(phase))

def generate_square(t, frequency, phase=0):
    return np.sign(np.sin(2 * np.pi * frequency * t + np.deg2rad(phase)))

def generate_triangle(t, frequency, phase=0):
    # Triangle with phase shift
    return 2 * np.abs(2 * (((t + phase/360/frequency) * frequency) % 1) - 1) - 1

def generate_multi_sine(t, frequencies, amplitudes=None, phase=0):
    if amplitudes is None:
        amplitudes = [1.0] * len(frequencies)
    signal = np.zeros_like(t)
    for f, a in zip(frequencies, amplitudes):
        signal += a * np.sin(2 * np.pi * f * t + np.deg2rad(phase))
    return signal

def generate_exponential_decay(t, tau=0.03, amplitude=1.0):
    """Generate an exponential decay signal: amplitude * exp(-t / tau)"""
    return amplitude * np.exp(-t / tau)

def generate_white_noise(t, amplitude=1.0, distribution='gaussian'):
    """Generate white noise. Distribution can be 'gaussian' (default) or 'uniform'."""
    if distribution == 'gaussian':
        return amplitude * np.random.normal(0, 1, size=len(t))
    elif distribution == 'uniform':
        return amplitude * (np.random.rand(len(t)) * 2 - 1)  # Uniform in [-1, 1]
    else:
        raise ValueError("Unsupported distribution for white noise: {}".format(distribution))

def generate_signal(t, frequency, signal_type, frequencies=None, amplitudes=None, phase=0, tau=0.05, amplitude=1.0, noise_type=None):
    # Accept both dash and underscore variants for noise types
    normalized_type = signal_type.replace('-', '_').lower()
    if normalized_type == "sine":
        return generate_sine(t, frequency, phase)
    elif normalized_type == "square":
        return generate_square(t, frequency, phase)
    elif normalized_type == "triangle":
        return generate_triangle(t, frequency, phase)
    elif normalized_type == "multi":
        if frequencies is None:
            raise ValueError("Frequencies list required for multi signal type")
        return generate_multi_sine(t, frequencies, amplitudes, phase)
    elif normalized_type == "expdecay":
        return generate_exponential_decay(t, tau=tau, amplitude=amplitude)
    elif normalized_type in ["random", "gaussian"]:
        if normalized_type == "random":
            distribution = 'uniform'
        elif normalized_type == "gaussian":
            distribution = 'gaussian'
        return generate_white_noise(t, amplitude=amplitude, distribution=distribution)
    else:
        raise ValueError(f"Unsupported signal type: {signal_type}")



