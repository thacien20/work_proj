// state.js
export const FS = 10000; // Sampling frequency (Hz), constant for all signals
export const state = {
    signalData: new Float32Array(), // Main signal data (time domain)
    time_axis: new Float32Array(), // Time axis for signal data (seconds)
    fftMagnitudes: new Float32Array(), // FFT magnitude data
    fftFreqAxis: new Float32Array(), // Frequency axis for FFT (Hz)
    frequency: null, // Input frequency (Hz) from UI, set by signal.js
    overlays: [], // Array of overlay signals {signal, time_axis, fft, freq}
    filteredActive: false, // Track if a filter is active (if not already present)
    filteredSignal: null,  // Store filtered signal (if not already present)
    filteredFft: null,     // Store filtered FFT (if not already present)
    filteredFftFreq: null, // Store filtered FFT frequency axis (if not already present)
    filterResponse: null,  // Store filter response data {freq, mag, phase, impulse, impulse_x} for subplot display
    filterImpulse: null,   // Store filter impulse response for deconvolution (persists after filter application)
    plotHistory: [] // Stack of plot actions for undo (e.g., {type: 'overlay'}, {type: 'filter'})
};