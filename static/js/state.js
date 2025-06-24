// state.js
export const state = {
    signalData: new Float32Array(), // Main signal data (time domain)
    time_axis: new Float32Array(), // Time axis for signal data (seconds)
    fftMagnitudes: new Float32Array(), // FFT magnitude data
    fftFreqAxis: new Float32Array(), // Frequency axis for FFT (Hz)
    fs: null, // Sampling frequency (Hz), set by signal.js
    frequency: null, // Input frequency (Hz) from UI, set by signal.js
    timeZoom: 1, // Zoom level for time domain (1 = full view)
    timePan: null, // Pan position for time domain (null = centered)
    fftZoom: 1, // Zoom level for frequency domain (1 = full view)
    fftPan: null, // Pan position for frequency domain (null = centered)
    overlays: [] // Array of overlay signals {signal, time_axis, fft, freq}
};