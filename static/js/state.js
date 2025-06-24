// state.js
export const state = {
    signalData: new Float32Array(),
    time_axis: new Float32Array(),
    fftMagnitudes: new Float32Array(),
    fftFreqAxis: new Float32Array(),
    fs: 0,
    frequency: 0, // Add this to store the input frequency
    timeZoom: 1,
    timePan: 0,
    fftZoom: 1,
    fftPan: 0,
    overlays: []
};