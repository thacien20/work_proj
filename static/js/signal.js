// signal.js
import { state } from './state.js'; // Note the change to named import
import { plotAll } from './plotting.js';

export function generateSignal() {
    const frequency = parseFloat(document.getElementById('frequency').value);
    const points = parseInt(document.getElementById('points').value);
    const noise = parseFloat(document.getElementById('noise').value);
    const signalType = document.getElementById('signalType').value;
    const customFormula = document.getElementById('customFormula').value;

    fetch('/api/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency, points, noise, signalType, customFormula })
    })
    .then(async response => {
        if (!response.ok) {
            let errMsg = 'Unknown error';
            try {
                const errData = await response.json();
                errMsg = errData.error || JSON.stringify(errData);
            } catch (e) {
                errMsg = response.statusText;
            }
            alert('Backend error: ' + errMsg);
            return;
        }
        return response.json();
    })
    .then(data => {
        if (!data) return;
        state.signalData = new Float32Array(data.signal);
        state.fftMagnitudes = new Float32Array(data.fft);
        state.fftFreqAxis = new Float32Array(data.freq_axis);
        console.log("Signal/FFT loaded", state.signalData.length);
        state.timeZoom = 1;
        state.timePan = 0;
        state.fftZoom = 1;
        state.fftPan = 0;
        plotAll();
    })
    .catch(err => {
        alert('Network or JS error: ' + err);
        console.error('Fetch error:', err);
    });
}