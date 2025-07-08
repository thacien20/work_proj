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




