// signal.js
import { state } from './state.js';
import { plotAll } from './plotting.js';

export function generateSignal() {
    const frequency = parseFloat(document.getElementById('frequency').value);
    const points = parseInt(document.getElementById('points').value);
    const noise = parseFloat(document.getElementById('noise').value);
    const signalType = document.getElementById('signalType').value;
    const customFormula = document.getElementById('customFormula').value;

    // Validation
    if (!frequency || frequency <= 0.1 || frequency > 1000) {
        alert('Please enter a valid frequency between 0.1 and 1000 Hz.');
        return;
    }
    if (!points || points < 1024 || points > 65000) {
        alert('Please enter a valid number of points between 1024 and 65000.');
        return;
    }
    if (signalType === 'custom' && !customFormula.trim()) {
        alert('Please enter a custom formula for custom signal type.');
        return;
    }

    // Derive samplingFrequency
    const samplingFrequency = Math.max(4 * frequency, 10000); // Ensure at least 10000 Hz or 4x frequency
    console.log(`Derived samplingFrequency: ${samplingFrequency} Hz`);

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
        state.fs = samplingFrequency;
        state.frequency = frequency;
        state.time_axis = new Float32Array(points);
        for (let i = 0; i < points; i++) {
            state.time_axis[i] = i / samplingFrequency;
        }
        state.fftMagnitudes = new Float32Array(data.fft);
        state.fftFreqAxis = new Float32Array(data.freq_axis);
        plotAll();
    })
    .catch(err => {
        alert('Network or JS error: ' + err);
        console.error('Fetch error:', err);
    });
}

export async function signalToSignalOperation(signal1, signal2, operation, fs) {
    const response = await fetch('/api/signal_operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            signal1: Array.from(signal1),
            signal2: Array.from(signal2),
            operation,
            fs
        })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Operation failed');
    return result;
}

window.signalToSignalOperation = signalToSignalOperation;