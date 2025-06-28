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

def generate_custom(t, formula, frequency):
    # Use eval with caution! Sanitize input in production.
    return eval(formula, {"t": t, "frequency": frequency, "np": np, "sin": np.sin, "cos": np.cos, "pi": np.pi})

def generate_signal(t, frequency, signal_type, custom_formula="", frequencies=None, amplitudes=None, phase=0):
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
    elif signal_type == "custom":
        return generate_custom(t, custom_formula, frequency)
    else:
        raise ValueError("Unsupported signal type")
    


    #below is the block that allows me to test the code
    # This block is for testing purposes only and should not be included in production code.


if __name__ == "__main__":
    import matplotlib.pyplot as plt
    import numpy as np

    # Prompt user for signal type and parameters
    print("Signal types: sine, square, triangle, multi, custom")
    signal_type = input("Enter signal type: ").strip()
    t = np.linspace(0, 1, 1000, endpoint=False)

    if signal_type == "multi":
        freq_str = input("Enter frequencies (comma or space separated): ")
        frequencies = [float(f) for f in freq_str.replace(',', ' ').split()]
        amp_str = input("Enter amplitudes (comma or space separated, optional, default=1): ")
        if amp_str.strip():
            amplitudes = [float(a) for a in amp_str.replace(',', ' ').split()]
        else:
            amplitudes = None
        y = generate_signal(t, 0, "multi", frequencies=frequencies, amplitudes=amplitudes)
        label = f"multi: {frequencies}"
    elif signal_type == "custom":
        frequency = float(input("Enter frequency: "))
        formula = input("Enter custom formula (use t, frequency, np, sin, cos, pi): ")
        y = generate_signal(t, frequency, "custom", custom_formula=formula)
        label = "custom"
    else:
        frequency = float(input("Enter frequency: "))
        y = generate_signal(t, frequency, signal_type)
        label = signal_type

    plt.plot(t, y, label=label)
    plt.legend()
    plt.title("Signal Generator Test")
    plt.xlabel("Time (s)")
    plt.ylabel("Amplitude")
    plt.grid(True)
    plt.show()
