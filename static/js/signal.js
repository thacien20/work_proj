// signal.js
import { state, FS } from './state.js';
import { plotAll } from './plotting.js';

export function generateSignal() {
    // Use only in-plot controls for all parameters
    const freqInput = document.getElementById('frequency_inplot');
    const signalType = document.getElementById('signalType_inplot').value;
    let frequency, frequencies = null;
    if (signalType === 'multi') {
        // Accept both comma and/or space as separators for frequencies
        frequencies = freqInput.value.split(/[\s,]+/).map(s => parseFloat(s.trim())).filter(x => !isNaN(x));
    } else {
        frequency = parseFloat(freqInput.value);
    }
    let points = parseInt(document.getElementById('points_inplot').value);
    const noise = parseFloat(document.getElementById('noise_inplot').value);
    const phase = parseFloat(document.getElementById('phase_inplot').value) || 0; // Get phase value

    // Multi-frequency fields
    let amplitudes = null;
    if (signalType === 'multi') {
        const ampStr = document.getElementById('multiAmplitudes').value;
        // Accept both comma and/or space as separators for amplitudes
        if (ampStr.trim() !== '') {
            amplitudes = ampStr.split(/[,\s]+/).map(s => parseFloat(s.trim())).filter(x => !isNaN(x));
        }
    }

    // Validation
    if (signalType === 'multi') {
        if (!frequencies || !frequencies.length) {
            alert('Please enter at least one valid frequency for multi-frequency signal.');
            return;
        }
    } else {
        if (!frequency || frequency <= 0.1 || frequency > 1000) {
            alert('Please enter a valid frequency between 0.1 and 1000 Hz.');
            return;
        }
    }
    if (!points || points < 1024 || points > 65000) {
        alert('Please enter a valid number of points between 1024 and 65000.');
        return;
    }

    // Derive samplingFrequency and points for multi to ensure good frequency resolution
    let adjustedPoints;
    if (signalType === 'multi') {
        const minFreq = Math.min(...frequencies);
        const maxFreq = Math.max(...frequencies);
        if (maxFreq > 1000) {
            alert('Maximum allowed frequency is 1000 Hz. Please lower your highest frequency.');
            return;
        }
        // Use FS as a constant, do not assign to it!
        // Ensure at least 20 periods of the lowest frequency are captured
        const minDuration = Math.max(1, 20 / minFreq); // at least 1s or 20 cycles of lowest freq
        adjustedPoints = Math.round(FS * minDuration);
        // Artificially increase points for better resolution
        adjustedPoints = Math.round(adjustedPoints * 2); // Double the points
        // Clamp to allowed range
        if (adjustedPoints < 1024) adjustedPoints = 1024;
        if (adjustedPoints > 10000) adjustedPoints = 10500;
        document.getElementById('points_inplot').value = adjustedPoints;
        console.log(`Multi: minFreq=${minFreq}, minDuration=${minDuration}, adjustedPoints=${adjustedPoints}`);
    } else {
        if (frequency > 1000) {
            alert('Maximum allowed frequency is 1000 Hz. Please enter a lower frequency.');
            return;
        }
        // For single-type signals, use the points value directly from the HTML input (unrestricted)
        // Do not assign FS here! Just use adjustedPoints = points;
        adjustedPoints = points;
        document.getElementById('points_inplot').value = adjustedPoints;
        console.log(`Single: freq=${frequency}, points=${adjustedPoints}`);
    }
    console.log(`Using FS: ${FS} Hz, points: ${adjustedPoints}`);

    // Prepare payload
    const payload = { points: adjustedPoints, noise, signalType, fs: FS, phase }; // Include phase
    if (signalType === 'multi') {
        payload.frequencies = frequencies;
        if (amplitudes) payload.amplitudes = amplitudes;
    } else {
        payload.frequency = frequency;
    }

    if (signalType === 'expdecay') {
        const tau = parseFloat(document.getElementById('tau_inplot').value);
        if (!isNaN(tau)) {
            payload.tau = tau;
        }
    }

    fetch('/api/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
        state.frequency = frequency;
        // Always use FS for time axis, and match length to returned signal
        const n = data.signal.length;
        state.time_axis = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            state.time_axis[i] = i / FS;
        }
        state.fftMagnitudes = new Float32Array(data.fft);
        state.fftFreqAxis = new Float32Array(data.freq_axis);
        
        // Store complex FFT data for inverse FFT
        if (data.fft_complex_real && data.fft_complex_imag) {
            const fftReal = new Float32Array(data.fft_complex_real);
            const fftImag = new Float32Array(data.fft_complex_imag);
            // Create complex array (real + imaginary)
            state.fftComplex = [];
            for (let i = 0; i < fftReal.length; i++) {
                state.fftComplex.push([fftReal[i], fftImag[i]]); // [real, imag] pairs
            }
        }
        
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

export async function simulateRCCircuit(R, C, V_in, duration, points) {
    const payload = { R, C, V_in, duration, points };
    const response = await fetch('/api/rc_circuit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'RC circuit simulation failed');
    return result; // { t: [...], V_out: [...] }
}

async function simulateRLCCircuit(R, L, C, V_in, duration, points) {
    const payload = { R, L, C, V_in, duration, points };
    const response = await fetch('/api/rlc_circuit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'RLC circuit simulation failed');
    return result;
}
export { simulateRLCCircuit };

window.signalToSignalOperation = signalToSignalOperation;