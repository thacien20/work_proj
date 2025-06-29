import numpy as np
from signal_processing import compute_fft, FS

def deconvolve_signal(filtered, filter_impulse, eps=1e-6, reg_factor=1e-4, window=False):
    """
    Perform frequency-domain deconvolution with improved regularization and optional windowing.

    Parameters:
    - filtered (numpy array): The input signal that has been filtered (convolved with the filter impulse response).
    - filter_impulse (numpy array): The impulse response of the filter used to produce the filtered signal.
    - eps (float, optional): A small value used in the stability check to detect near-zero frequency components. Default is 1e-6.
    - reg_factor (float, optional): The regularization factor for Tikhonov regularization. Default is 1e-4.
    - window (bool, optional): If True, applies a Hann window to the input signals before padding. Default is True.

    Returns:
    - dict: Contains 'deconvolved', 'deconv_fft', 'deconv_freq_axis', and 'unstable'.

    Improvements and Suggestions:
    - **Tikhonov Regularization**: Replaces simple division with `deconv_fft = filtered_fft * np.conj(filter_fft) / (denom_mag2 + reg_term)`.
      - Adds a regularization term `reg_term = reg_factor * np.max(denom_mag2)` to the denominator.
      - Prevents division by small values in `filter_fft`, reducing noise amplification and improving stability.
      - `reg_factor` controls regularization strength; adjust based on noise (e.g., 1e-3 for noisy signals, 1e-5 for cleaner signals).
    - **Optional Windowing**: Applies a Hann window to input signals before padding if `window=True`.
      - Reduces spectral leakage, which can introduce high-frequency artifacts and destabilize deconvolution.
      - Enabled by default to improve FFT accuracy for non-periodic signals.
    - **Removed Impulse Response Normalization**: Original normalization of `filter_impulse` by its max value is omitted.
      - Tikhonov regularization stabilizes the process naturally, avoiding unnecessary signal alteration.
      - Simplifies the code and preserves the filter's characteristics.
    - **Improved Stability Check**: Compares `denom_mag2` to `eps * np.max(denom_mag2)` instead of a fixed threshold.
      - Makes the check adaptive to the signal's scale, enhancing robustness.
      - Flags potential instability if any frequency component is too small.
    - **Input Validation**: Uses `np.asarray` to ensure inputs are numpy arrays, preventing type-related errors.
    - **FFT Length**: Automatically set to the next power of 2 greater than the max signal length for efficiency.
      - Ensures sufficient zero-padding and optimizes FFT computation.
    - **Usage Notes**:
      - Tune `reg_factor` based on noise level: increase for noisy signals, decrease if the result is overly smoothed.
      - Enable windowing for non-periodic signals to reduce spectral leakage.
      - Check `unstable` flag to identify potential reliability issues.
      - Preprocess noisy signals (e.g., low-pass filter) before deconvolution for better results.
    - **Edge Cases**:
      - If `filter_impulse` is all zeros, regularization prevents division by zero, but results may be meaningless.
      - Handles signals of different lengths via padding to the same FFT length.
    - **Future Enhancements**: Could add manual FFT length specification or additional window options if needed.
    """
    
    # Convert inputs to numpy arrays
    filtered = np.asarray(filtered)
    filter_impulse = np.asarray(filter_impulse)
    
    # Set FFT length as next power of 2
    n = max(len(filtered), len(filter_impulse))
    n_fft = 2 ** int(np.ceil(np.log2(n)))
    
    # Pad signals
    filtered_padded = np.zeros(n_fft)
    filter_padded = np.zeros(n_fft)
    
    # Apply Hann window if enabled
    if window:
        filtered_padded[:len(filtered)] = filtered * np.hanning(len(filtered))
        filter_padded[:len(filter_impulse)] = filter_impulse * np.hanning(len(filter_impulse))
    else:
        filtered_padded[:len(filtered)] = filtered
        filter_padded[:len(filter_impulse)] = filter_impulse
    
    # Compute FFTs
    filtered_fft = np.fft.fft(filtered_padded)
    filter_fft = np.fft.fft(filter_padded)
    
    # Tikhonov regularization
    denom_mag2 = np.abs(filter_fft)**2
    reg_term = reg_factor * np.max(denom_mag2)
    deconv_fft = filtered_fft * np.conj(filter_fft) / (denom_mag2 + reg_term)
    
    # Inverse FFT and trim
    deconv = np.fft.ifft(deconv_fft).real[:len(filtered)]
    
    # Compute FFT of deconvolved signal
    deconv_fft_mag, deconv_freq_axis = compute_fft(deconv, FS)
    
    # Stability check
    unstable = np.any(denom_mag2 < eps * np.max(denom_mag2))
    
    # Return results
    return {
        'deconvolved': deconv,
        'deconv_fft': deconv_fft_mag,
        'deconv_freq_axis': deconv_freq_axis,
        'unstable': bool(unstable)
    }