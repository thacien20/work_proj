// state.js
export const FS = 10000; // Sampling frequency (Hz), constant for all signals
export const state = {
    signalData: new Float32Array(), // Main signal data (time domain)
    time_axis: new Float32Array(), // Time axis for signal data (seconds)
    fftMagnitudes: new Float32Array(), // FFT magnitude data
    fftFreqAxis: new Float32Array(), // Frequency axis for FFT (Hz)
    fftReal: new Float32Array(), // FFT real part (for proper iFFT)
    fftImaginary: new Float32Array(), // FFT imaginary part (for proper iFFT)
    frequency: null, // Input frequency (Hz) from UI, set by signal.js
    originalSignal: null, // Store the original signal when adding overlays
    waitingForOverlay: false, // Track if we're waiting for an overlay to be generated
    overlays: [], // Array of overlay signals {signal, time_axis, fft, freq}
    filteredActive: false, // Track if a filter is active (if not already present)
    filteredSignal: null,  // Store filtered signal (if not already present)
    filteredFft: null,     // Store filtered FFT (if not already present)
    filteredFftFreq: null, // Store filtered FFT frequency axis (if not already present)
    filterResponse: null,  // Store filter response data {freq, mag, phase, impulse, impulse_x} for subplot display
    filterImpulse: null,   // Store filter impulse response for deconvolution (persists after filter application)
    realFFT: null,         // Store Real FFT data {real, imaginary, magnitude, freq} for Real FFT analysis
    plotHistory: [] // Stack of plot actions for undo (e.g., {type: 'overlay'}, {type: 'filter'})
};

// Cleanup function to clear state and free memory
export function clearState() {
    state.signalData = new Float32Array();
    state.time_axis = new Float32Array();
    state.fftMagnitudes = new Float32Array();
    state.fftFreqAxis = new Float32Array();
    state.fftReal = new Float32Array();
    state.fftImaginary = new Float32Array();
    state.frequency = null;
    state.originalSignal = null;
    state.waitingForOverlay = false;
    state.overlays = [];
    state.filteredActive = false;
    state.filteredSignal = null;
    state.filteredFft = null;
    state.filteredFftFreq = null;
    state.filterResponse = null;
    state.filterImpulse = null;
    state.realFFT = null;
    state.plotHistory = [];
}