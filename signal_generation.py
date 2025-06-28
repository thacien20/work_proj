import numpy as np

def generate_sine(t, frequency):
    return np.sin(2 * np.pi * frequency * t)

def generate_square(t, frequency):
    return np.sign(np.sin(2 * np.pi * frequency * t))

def generate_triangle(t, frequency):
    return 2 * np.abs(2 * ((t * frequency) % 1) - 1) - 1

def generate_multi_sine(t, frequencies, amplitudes=None):
    if amplitudes is None:
        amplitudes = [1.0] * len(frequencies)
    signal = np.zeros_like(t)
    for f, a in zip(frequencies, amplitudes):
        signal += a * np.sin(2 * np.pi * f * t)
    return signal

def generate_custom(t, formula, frequency):
    # Use eval with caution! Sanitize input in production.
    return eval(formula, {"t": t, "frequency": frequency, "np": np, "sin": np.sin, "cos": np.cos, "pi": np.pi})

def generate_signal(t, frequency, signal_type, custom_formula="", frequencies=None, amplitudes=None):
    if signal_type == "sine":
        return generate_sine(t, frequency)
    elif signal_type == "square":
        return generate_square(t, frequency)
    elif signal_type == "triangle":
        return generate_triangle(t, frequency)
    elif signal_type == "multi":
        if frequencies is None:
            raise ValueError("Frequencies list required for multi signal type")
        return generate_multi_sine(t, frequencies, amplitudes)
    elif signal_type == "custom":
        return generate_custom(t, custom_formula, frequency)
    else:
        raise ValueError("Unsupported signal type")