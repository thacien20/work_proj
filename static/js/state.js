// state.js
export const state = {
    signalData: new Float32Array(), // Main signal data (time domain)
    time_axis: new Float32Array(), // Time axis for signal data (seconds)
    fftMagnitudes: new Float32Array(), // FFT magnitude data
    fftFreqAxis: new Float32Array(), // Frequency axis for FFT (Hz)
    fs: null, // Sampling frequency (Hz), set by signal.js
    frequency: null, // Input frequency (Hz) from UI, set by signal.js
    
    overlays: [] // Array of overlay signals {signal, time_axis, fft, freq}
};