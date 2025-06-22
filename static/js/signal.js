import { state } from './state.js'; // Note the change to named import
import { plotAll } from './plotting.js';

export function generateSignal() {
    const frequency = parseFloat(document.getElementById('frequency').value);
    const points = parseInt(document.getElementById('points').value); // Assume this exists in HTML
    const noise = parseFloat(document.getElementById('noise').value);
    const signalType = document.getElementById('signalType').value;
    const customFormula = document.getElementById('customFormula').value;

    // Basic validation
    if (!frequency || frequency <= 0 || frequency > 1000) {
        alert('Please enter a valid frequency between 0.1 and 1000 Hz.');
        return;
    }
    if (!points || points <= 0) {
        alert('Please enter a valid number of points.');
        return;
    }

    // Derive samplingFrequency (e.g., 4x frequency with a minimum of 1000 Hz)
    const samplingFrequency = Math.max(4 * frequency, 1000); // Ensure at least 1000 Hz or 4x frequency
    console.log(`Derived samplingFrequency: ${samplingFrequency} Hz`);

    // Warn if points are insufficient for Nyquist
    if (samplingFrequency < 2 * frequency) {
        alert('Warning: Sampling frequency is below Nyquist rate (2x frequency). Results may be aliased.');
    }

    fetch('/api/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency, points, noise, signalType, customFormula, samplingFrequency })
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
        // Calculate time_axis in frontend
        state.time_axis = new Float32Array(points);
        for (let i = 0; i < points; i++) {
            state.time_axis[i] = i / samplingFrequency;
        }
        state.fftMagnitudes = new Float32Array(data.fft);
        state.fftFreqAxis = new Float32Array(data.freq_axis);
        console.log("Signal/FFT loaded", state.signalData.length, "Time axis range:", [state.time_axis[0], state.time_axis[state.time_axis.length - 1]]);
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