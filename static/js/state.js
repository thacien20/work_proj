// state.js
export const FS = 10000; // Sampling frequency (Hz), constant for all signals
export const state = {
    signalData: new Float32Array(), // Main signal data (time domain)
    time_axis: new Float32Array(), // Time axis for signal data (seconds)
    fftMagnitudes: new Float32Array(), // FFT magnitude data
    fftFreqAxis: new Float32Array(), // Frequency axis for FFT (Hz)
    frequency: null, // Input frequency (Hz) from UI, set by signal.js
    overlays: [] // Array of overlay signals {signal, time_axis, fft, freq}
};