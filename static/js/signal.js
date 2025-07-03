// signal.js
import { state, FS } from './state.js';
import { plotAll } from './plotting.js';

// Global abort controller for managing fetch requests
let currentAbortController = null;

// Cleanup function for ongoing requests
function cleanup() {
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
    }
}

// Add cleanup on page unload
window.addEventListener('beforeunload', cleanup);
window.addEventListener('pagehide', cleanup);

export function generateSignal() {
    return new Promise((resolve, reject) => {
        // Cancel any ongoing request
        if (currentAbortController) {
            currentAbortController.abort();
        }
        
        // Create new abort controller for this request
        currentAbortController = new AbortController();
        
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
                reject(new Error('Invalid frequencies for multi-frequency signal'));
                return;
            }
        } else {
            if (!frequency || frequency <= 0.1 || frequency > 1000) {
                alert('Please enter a valid frequency between 0.1 and 1000 Hz.');
                reject(new Error('Invalid frequency'));
                return;
            }
        }
        if (!points || points < 1024 || points > 65000) {
            alert('Please enter a valid number of points between 1024 and 65000.');
            reject(new Error('Invalid points'));
            return;
        }

        // Derive samplingFrequency and points for multi to ensure good frequency resolution
        let adjustedPoints;
        if (signalType === 'multi') {
            const minFreq = Math.min(...frequencies);
            const maxFreq = Math.max(...frequencies);
            if (maxFreq > 1000) {
                alert('Maximum allowed frequency is 1000 Hz. Please lower your highest frequency.');
                reject(new Error('Frequency too high'));
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
                reject(new Error('Frequency too high'));
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
            body: JSON.stringify(payload),
            signal: currentAbortController.signal // Attach the abort signal
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
                reject(new Error(errMsg));
                return;
            }
            return response.json();
        })
        .then(data => {
            if (!data) {
                reject(new Error('No data returned'));
                return;
            }
            
            // Check if we're waiting for an overlay signal
            if (state.waitingForOverlay) {
                // The new signal becomes an overlay, restore the original as main
                if (state.originalSignal) {
                    // Add the new signal as overlay
                    state.overlays = [{
                        signal: new Float32Array(data.signal),
                        time_axis: (() => {
                            const n = data.signal.length;
                            const timeAxis = new Float32Array(n);
                            for (let i = 0; i < n; i++) {
                                timeAxis[i] = i / FS;
                            }
                            return timeAxis;
                        })(),
                        fft: new Float32Array(data.fft),
                        freq: new Float32Array(data.freq_axis)
                    }];
                    
                    // Restore the original signal as main
                    state.signalData = state.originalSignal.signal;
                    state.time_axis = state.originalSignal.time_axis;
                    state.fftMagnitudes = state.originalSignal.fft;
                    state.fftFreqAxis = state.originalSignal.freq;
                    if (state.originalSignal.fftReal && state.originalSignal.fftImaginary) {
                        state.fftReal = state.originalSignal.fftReal;
                        state.fftImaginary = state.originalSignal.fftImaginary;
                    }
                }
                
                // Reset overlay waiting state
                state.waitingForOverlay = false;
                window.waitingForOverlay = false;
                
                // Reset button appearance
                const addOverlayBtn = document.getElementById('addOverlayBtn_inplot');
                if (addOverlayBtn) {
                    addOverlayBtn.textContent = 'Add Overlay';
                    addOverlayBtn.style.backgroundColor = '';
                }
                
                alert('New signal added as overlay. Original signal restored as main signal.');
            } else if (state.originalSignal && state.overlays.length > 0) {
                // We have both original signal and overlay(s), this is an overlay update
                // Update the overlay while preserving the original signal
                console.log('Updating existing overlay while preserving original signal');
                
                // Update the overlay with the new signal
                state.overlays = [{
                    signal: new Float32Array(data.signal),
                    time_axis: (() => {
                        const n = data.signal.length;
                        const timeAxis = new Float32Array(n);
                        for (let i = 0; i < n; i++) {
                            timeAxis[i] = i / FS;
                        }
                        return timeAxis;
                    })(),
                    fft: new Float32Array(data.fft),
                    freq: new Float32Array(data.freq_axis)
                }];
                
                // Keep the original signal as main (don't change it)
                // The original signal is already in state.signalData, time_axis, etc.
                // Just make sure it's properly restored
                state.signalData = state.originalSignal.signal;
                state.time_axis = state.originalSignal.time_axis;
                state.fftMagnitudes = state.originalSignal.fft;
                state.fftFreqAxis = state.originalSignal.freq;
                if (state.originalSignal.fftReal && state.originalSignal.fftImaginary) {
                    state.fftReal = state.originalSignal.fftReal;
                    state.fftImaginary = state.originalSignal.fftImaginary;
                }
                
                console.log('Overlay updated successfully');
            } else {
                // Normal signal generation
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
                
                // Store complex FFT data for proper iFFT
                if (data.fft_real && data.fft_imaginary) {
                    state.fftReal = new Float32Array(data.fft_real);
                    state.fftImaginary = new Float32Array(data.fft_imaginary);
                }
            }
            
            plotAll();
            resolve(); // Resolve the promise when done
        })
        .catch(err => {
            // Check if the error is an AbortError (request was aborted)
            if (err.name === 'AbortError') {
                console.log('Request aborted');
                return; // Ignore abort errors
            }
            alert('Network or JS error: ' + err);
            console.error('Fetch error:', err);
            reject(err);
        });
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
        }),
        signal: currentAbortController.signal // Attach the abort signal
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
        body: JSON.stringify(payload),
        signal: currentAbortController.signal // Attach the abort signal
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
        body: JSON.stringify(payload),
        signal: currentAbortController.signal // Attach the abort signal
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'RLC circuit simulation failed');
    return result;
}
export { simulateRLCCircuit };

window.signalToSignalOperation = signalToSignalOperation;