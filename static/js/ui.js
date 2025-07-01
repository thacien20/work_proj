// ui.js
import { state, FS } from './state.js';
import { generateSignal, simulateRCCircuit } from './signal.js';
import { plotAll } from './plotting.js';

window.addEventListener('DOMContentLoaded', () => {
    console.log('ui.js loaded');
    // No canvas or initZoom needed for Plotly

    // Optionally, resize Plotly plot on window resize
    window.addEventListener('resize', () => {
        if (document.getElementById('plot')) {
            Plotly.Plots.resize('plot');
        }
    });

    generateSignal();
    setupAnalyzeDropdown();
    setupOperationsDropdown();

    document.getElementById('generateBtn').onclick = generateSignal;
    document.getElementById('addOverlayBtn').onclick = addOverlay;

    // Files dropdown setup
    const filesBtn = document.getElementById('filesBtn');
    const fileDropdown = document.querySelector('.file-dropdown');
    const fileDropdownContent = document.querySelector('.file-dropdown-content');
    if (filesBtn && fileDropdownContent) {
        filesBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            fileDropdown.classList.toggle('show');
        });
        document.addEventListener('click', function(e) {
            if (!fileDropdownContent.contains(e.target) && e.target !== filesBtn) {
                fileDropdown.classList.remove('show');
            }
        });
    }

    // Filter dropdown logic
    const filterBtn = document.getElementById('filterBtn');
    const filterDropdown = document.getElementById('filterDropdownContent');
    if (filterBtn && filterDropdown) {
        filterBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            filterDropdown.classList.toggle('show');
        });
        document.addEventListener('click', function(e) {
            if (!filterDropdown.contains(e.target) && e.target !== filterBtn) {
                filterDropdown.classList.remove('show');
            }
        });
        // Add filter button listeners
        document.getElementById('filterBtn_highPass').onclick = () => applyFilter('highpass');
        document.getElementById('filterBtn_lowPass').onclick = () => applyFilter('lowpass');
        document.getElementById('filterBtn_bandPass').onclick = () => applyFilter('bandpass');
    }

    // Set default values for multi-frequency fields when multi is selected
    const signalTypeSelect = document.getElementById('signalType');
    const multiFreqInput = document.getElementById('multiFrequencies');
    const multiAmpInput = document.getElementById('multiAmplitudes');
    const addOverlayBtn = document.getElementById('addOverlayBtn');
    const freqSingleGroup = document.getElementById('frequency').closest('.form-group');
    const multiFreqGroup = document.getElementById('multiFreqGroup');
    const multiAmpGroup = document.getElementById('multiAmpGroup');
    const phaseGroup = document.getElementById('phaseGroup');
    const phaseValue = document.getElementById('phaseValue');
    const freqInput = document.getElementById('frequency');

    if (signalTypeSelect && multiFreqInput && multiAmpInput && addOverlayBtn && freqSingleGroup && multiFreqGroup && multiAmpGroup && phaseGroup && phaseValue) {
        signalTypeSelect.addEventListener('change', function() {
            if (this.value === 'multi') {
                // Only set if empty or user hasn't changed
                if (!multiFreqInput.value.trim()) multiFreqInput.value = '120, 200, 300';
                if (!multiAmpInput.value.trim()) multiAmpInput.value = '1 1 1';
                // addOverlayBtn.style.display = 'none'; // REMOVE THIS LINE
                freqSingleGroup.style.display = 'none';
                multiFreqGroup.style.display = '';
                multiAmpGroup.style.display = '';
                phaseGroup.style.display = 'none';
            } else {
                addOverlayBtn.style.display = '';
                freqSingleGroup.style.display = '';
                multiFreqGroup.style.display = 'none';
                multiAmpGroup.style.display = 'none';
                phaseGroup.style.display = '';
                phaseValue.value = '0';
            }
            // Add: update UI for noise signal types
            if (this.value === 'random' || this.value === 'gaussian') {
                // Hide frequency and phase for noise types
                freqSingleGroup.style.display = 'none';
                phaseGroup.style.display = 'none';
                multiFreqGroup.style.display = 'none';
                multiAmpGroup.style.display = 'none';
            }
        });
        // On page load, set correct visibility
        if (signalTypeSelect.value === 'multi') {
            // addOverlayBtn.style.display = 'none'; // REMOVE THIS LINE
            freqSingleGroup.style.display = 'none';
            multiFreqGroup.style.display = '';
            multiAmpGroup.style.display = '';
            phaseGroup.style.display = 'none';
        } else {
            multiFreqGroup.style.display = 'none';
            multiAmpGroup.style.display = 'none';
            phaseGroup.style.display = '';
            phaseValue.value = '0';
        }
        phaseValue.addEventListener('input', function() {
            let val = parseInt(phaseValue.value, 10) || 0;
            if (val < 0) val = 0;
            if (val > 360) val = 360;
            // Instead of reassigning the const, just set the value
            this.value = val;
            document.getElementById('generateBtn').click();
        });
    }

    // RC Circuit Simulation button event listener
    const rcSimBtn = document.getElementById('rcSimBtn');
    if (rcSimBtn) {
        rcSimBtn.addEventListener('click', async () => {
            const R = parseFloat(document.getElementById('rcR').value);
            const C = parseFloat(document.getElementById('rcC').value);
            const V_in = parseFloat(document.getElementById('rcVin').value);
            const duration = parseFloat(document.getElementById('rcDuration').value);
            const points = parseInt(document.getElementById('rcPoints').value);
            if (isNaN(R) || isNaN(C) || isNaN(V_in) || isNaN(duration) || isNaN(points)) {
                alert('Please enter valid RC circuit parameters.');
                return;
            }
            try {
                const result = await simulateRCCircuit(R, C, V_in, duration, points);
                // Plot RC circuit response using Plotly
                Plotly.newPlot('plot', [{
                    x: result.t,
                    y: result.V_out,
                    type: 'scatter',
                    mode: 'lines',
                    name: 'RC Step Response',
                    line: { color: '#0074D9' }
                }], {
                    title: 'RC Circuit Step Response',
                    xaxis: { title: 'Time (s)' },
                    yaxis: { title: 'V_out (V)' }
                });
            } catch (err) {
                alert('RC Circuit Error: ' + err.message);
            }
        });
    }
});

let lastSignalSnapshot = null;
let waitingForOverlay = false;

function addOverlay() {
    if (!state.signalData.length || !state.fftMagnitudes.length || !state.fftFreqAxis.length) {
        alert('Generate a main signal first before adding an overlay.');
        return;
    }
    // Save the current signal as the overlay (replace any previous overlay)
    state.overlays = [{
        signal: new Float32Array(state.signalData),
        time_axis: new Float32Array(state.time_axis),
        fft: new Float32Array(state.fftMagnitudes),
        freq: new Float32Array(state.fftFreqAxis)
    }];
    state.plotHistory.push({type: 'overlay'}); // Track overlay for undo
    // Do NOT clear or replace the main signal here!
    plotAll();
    alert('Signal saved as overlay. Now generate a new signal to compare.');
}

// Patch generateSignal to clear overlays if not waiting for overlay and show multi warning
if (!window._generateSignalPatched) {
    const originalGenerateSignal = generateSignal;
    window.generateSignal = async function(...args) {
        await originalGenerateSignal.apply(this, args);
        // Do not touch overlays unless addOverlay was just used
        if (signalTypeSelect && signalTypeSelect.value === 'multi') {
            showMultiWarning();
        }
    };
    window._generateSignalPatched = true;
}

function setupAnalyzeDropdown() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const analyzeDropdown = document.getElementById('analyzeDropdown');
    if (analyzeBtn && analyzeDropdown) {
        analyzeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            analyzeDropdown.classList.toggle('show');
        });
        document.addEventListener('click', function(e) {
            if (!analyzeDropdown.contains(e.target) && e.target !== analyzeBtn) {
                analyzeDropdown.classList.remove('show');
            }
        });
    }
}

function setupOperationsDropdown() {
    const operationsBtn = document.getElementById('operationsBtn');
    const operationsContent = document.getElementById('operationsDropdown');
    if (operationsBtn && operationsContent) {
        operationsBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            operationsContent.classList.toggle('show');
        });
        document.addEventListener('click', function(e) {
            if (!operationsContent.contains(e.target) && e.target !== operationsBtn) {
                operationsContent.classList.remove('show');
            }
        });
        const operationButtons = [
            { id: 'opsBtn_add', op: 'add' },
            { id: 'opsBtn_subtract', op: 'subtract' },
            { id: 'opsBtn_multiply', op: 'multiply' },
            { id: 'opsBtn_divide', op: 'divide' }
        ];
        operationButtons.forEach(({ id, op }) => {
            const button = document.getElementById(id);
            button.addEventListener('click', async () => {
                if (state.overlays.length > 0) {
                    const overlay = state.overlays[state.overlays.length - 1];
                    try {
                        const result = await window.signalToSignalOperation(
                            state.signalData,
                            overlay.signal,
                            op,
                            state.fs
                        );
                        state.signalData = new Float32Array(result.signal);
                        state.fftMagnitudes = new Float32Array(result.fft);
                        state.fftFreqAxis = new Float32Array(result.freq_axis);
                        const points = state.signalData.length;
                        state.time_axis = new Float32Array(points);
                        for (let i = 0; i < points; i++) {
                            state.time_axis[i] = i / FS;
                        }
                        plotAll();
                    } catch (error) {
                        alert(error.message);
                    }
                } else {
                    alert('You must add an overlay before using Operations.');
                }
            });
        });
    }
}

document.getElementById('clearBtn').onclick = function() {
    state.signalData = new Float32Array();
    state.time_axis = new Float32Array();
    state.fftMagnitudes = new Float32Array();
    state.fftFreqAxis = new Float32Array();
    state.overlays = [];
    state.filteredSignal = undefined;
    state.filteredActive = false;
    state.filteredFft = undefined;
    state.filteredFftFreq = undefined;
    plotAll();
}

async function applyFilter(type) {
    // Error handling: block if no signal is present
    if (!state.signalData || state.signalData.length === 0) {
        alert('Please generate a signal before applying a filter.');
        return;
    }
    let params = { filterType: type, fs: FS, order: 4 };
    if (type === 'lowpass') {
        params.cutoff = prompt('Lowpass cutoff frequency (Hz, 10-1000):', 200) || 200;
    } else if (type === 'highpass') {
        params.cutoff = prompt('Highpass cutoff frequency (Hz, 1-990):', 100) || 100;
    } else if (type === 'bandpass') {
        params.lowcut = prompt('Bandpass LOW cutoff (Hz, 1-990):', 100) || 100;
        params.highcut = prompt('Bandpass HIGH cutoff (Hz, 10-1000):', 300) || 300;
    }
    // Send current signal to backend
    const signal = Array.from(state.signalData);
    const response = await fetch('/api/filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, signal })
    });
    const data = await response.json();
    if (data.filtered) {
        state.filteredSignal = new Float32Array(data.filtered);
        state.filteredActive = true;
        // FFT of filtered signal
        if (data.filtered_fft && data.filtered_freq_axis) {
            state.filteredFft = new Float32Array(data.filtered_fft);
            state.filteredFftFreq = new Float32Array(data.filtered_freq_axis);
        } else {
            state.filteredFft = null;
            state.filteredFftFreq = null;
        }
        state.plotHistory.push({type: 'filter'}); // Track filter for undo
        plotAll();
    } else {
        let msg = data.error || 'Unknown error';
        if (msg.includes('length of the input vector') || msg.includes('padlen')) {
            msg = 'Please generate data first before applying a filter.';
        }
        alert('Filter error: ' + msg);
    }
}

let filterViewActive = false;
let lastFilterFreqResponse = null;

// --- Filter View Main Plot Logic ---
const filterViewBtn = document.getElementById('filterBtn_view');
if (filterViewBtn) {
    filterViewBtn.onclick = async function() {
        // Error handling: block if no signal is present
        if (!state.signalData || state.signalData.length === 0) {
            alert('Please generate a signal before viewing a filter response.');
            return;
        }
        // Prompt user for filter type and parameters
        const filterType = prompt('Enter filter type (lowpass, highpass, bandpass):', 'lowpass');
        if (!filterType) return;
        let params = { filterType, fs: FS, order: 4 };
        if (filterType === 'lowpass') {
            params.cutoff = prompt('Lowpass cutoff frequency (Hz, 10-1000):', 200) || 200;
        } else if (filterType === 'highpass') {
            params.cutoff = prompt('Highpass cutoff frequency (Hz, 1-990):', 100) || 100;
        } else if (filterType === 'bandpass') {
            params.lowcut = prompt('Bandpass LOW cutoff (Hz, 1-990):', 100) || 100;
            params.highcut = prompt('Bandpass HIGH cutoff (Hz, 10-1000):', 300) || 300;
        } else {
            alert('Invalid filter type.');
            return;
        }
        // Fetch filter visualization data from backend
        const response = await fetch('/api/filter_view', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        const data = await response.json();
        if (data.error) {
            alert('Error: ' + data.error);
            return;
        }
        // Plot impulse, magnitude, and phase responses in the main plot area
        const plotDiv = document.getElementById('plot');
        Plotly.newPlot(plotDiv, [
            {
                x: data.impulse_x,
                y: data.impulse,
                type: 'scatter',
                mode: 'lines+markers',
                name: 'Impulse Response',
                yaxis: 'y1',
                xaxis: 'x1'
            },
            {
                x: data.freq,
                y: data.magnitude,
                type: 'scatter',
                mode: 'lines',
                name: 'Magnitude',
                yaxis: 'y2',
                xaxis: 'x2'
            },
            {
                x: data.freq,
                y: data.phase,
                type: 'scatter',
                mode: 'lines',
                name: 'Phase',
                yaxis: 'y3',
                xaxis: 'x3'
            }
        ], {
            grid: {rows: 3, columns: 1, pattern: 'independent'},
            height: 800,
            width: 900,
            showlegend: true,
            margin: { l: 80, r: 40, t: 40, b: 70 }, // Added margin for axis labels
            xaxis: {title: 'Sample (n)'},
            yaxis: {title: 'Amplitude'},
            xaxis2: {title: 'Frequency (Hz)'},
            yaxis2: {title: 'Magnitude'},
            xaxis3: {title: 'Frequency (Hz)'},
            yaxis3: {title: 'Phase (radians)'}
        });
        // Store the filter's frequency response for later use
        lastFilterFreqResponse = data.magnitude.map((mag, i) => {
            const phase = data.phase[i];
            return [mag * Math.cos(phase), mag * Math.sin(phase)]; // [real, imag]
        });
        filterViewActive = true;
        // Change Add Overlay button to Apply (both original and draggable versions)
        const addOverlayBtn = document.getElementById('addOverlayBtn');
        const addOverlayBtn2 = document.getElementById('addOverlayBtn2');
        
        if (addOverlayBtn) addOverlayBtn.textContent = 'Apply';
        if (addOverlayBtn2) addOverlayBtn2.textContent = 'Apply';
        
        const applyFunction = async function() {
            // Prompt user for which signal to apply filter to
            let choice = 'main';
            if (state.overlays.length > 0) {
                choice = prompt('Apply filter to which signal? (main/overlay)', 'main');
            }
            let signal = null;
            if (choice === 'overlay') {
                signal = Array.from(state.overlays[0].signal);
            } else {
                signal = Array.from(state.signalData);
            }
            // Zero-pad filter FFT to match signal length
            let n = Math.max(signal.length, lastFilterFreqResponse.length);
            let n_fft = 1;
            while (n_fft < n) n_fft *= 2;
            // Interpolate filter FFT to match signal FFT bins if needed
            let filter_fft = lastFilterFreqResponse;
            if (filter_fft.length !== n_fft) {
                // Simple zero-padding or truncation
                let tmp = new Array(n_fft).fill([0, 0]);
                for (let i = 0; i < Math.min(filter_fft.length, n_fft); i++) {
                    tmp[i] = filter_fft[i];
                }
                filter_fft = tmp;
            }
            // Call backend to apply filter in frequency domain
            const resp = await fetch('/api/apply_filter_fft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signal, filter_freq: filter_fft })
            });
            const result = await resp.json();
            if (result.filtered) {
                // Plot both the original and filtered signals and their FFTs for comparison
                // Define consistent colors
                const originalColor = '#000000'; // black
                const filteredColor = '#1f77b4'; // blue
                Plotly.newPlot('plot', [
                    // Time domain: original
                    {
                        x: Array.from({length: state.signalData.length}, (_, i) => i / FS),
                        y: Array.from(state.signalData),
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Original Signal',
                        line: { color: originalColor },
                        xaxis: 'x1',
                        yaxis: 'y1'
                    },
                    // Time domain: filtered
                    {
                        x: Array.from({length: result.filtered.length}, (_, i) => i / FS),
                        y: result.filtered,
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Filtered (FFT)',
                        line: { color: filteredColor },
                        xaxis: 'x1',
                        yaxis: 'y1'
                    },
                    // Frequency domain: original
                    {
                        x: Array.from(state.fftFreqAxis),
                        y: Array.from(state.fftMagnitudes),
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Original FFT',
                        line: { color: originalColor, dash: 'dot' },
                        xaxis: 'x2',
                        yaxis: 'y2'
                    },
                    // Frequency domain: filtered
                    {
                        x: result.filtered_freq_axis,
                        y: result.filtered_fft,
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Filtered FFT Magnitude',
                        line: { color: filteredColor, dash: 'dot' },
                        xaxis: 'x2',
                        yaxis: 'y2'
                    }
                ], {
                    grid: {rows: 2, columns: 1, pattern: 'independent'},
                    height: 700,
                    width: 900,
                    showlegend: true,
                    margin: { l: 80, r: 40, t: 40, b: 70 },
                    xaxis: {title: 'Time (s)'},
                    yaxis: {title: 'Amplitude'},
                    xaxis2: {title: 'Frequency (Hz)'},
                    yaxis2: {title: 'Magnitude'}
                });
                // Show Deconvolution button
                const deconvBtn = document.getElementById('deconvBtn');
                const deconvSliderContainer = document.getElementById('deconv-slider-container');
                const deconvRegSlider = document.getElementById('deconvRegSlider');
                const deconvRegValue = document.getElementById('deconvRegValue');
                let lastDeconvParams = {
                    filtered: result.filtered,
                    filter_impulse: data.impulse,
                    epsilon: 1e-6
                };
                function updateDeconvRegValue() {
                    const exp = parseFloat(deconvRegSlider.value);
                    const val = Math.pow(10, exp);
                    deconvRegValue.textContent = '1e' + exp;
                    return val;
                }
                if (deconvBtn && deconvSliderContainer && deconvRegSlider && deconvRegValue) {
                    deconvBtn.style.display = '';
                    // Also show the deconvolution button in the draggable canvas
                    const deconvBtn2 = document.getElementById('deconvBtn2');
                    if (deconvBtn2) {
                        deconvBtn2.style.display = '';
                    }
                    deconvSliderContainer.style.display = '';
                    deconvRegSlider.value = '-6';
                    deconvRegValue.textContent = '1e-6';
                    let callDeconv = async (epsilon) => {
                        try {
                            const resp = await fetch('/api/deconvolve', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    filtered: lastDeconvParams.filtered,
                                    filter_impulse: lastDeconvParams.filter_impulse,
                                    epsilon: epsilon
                                })
                            });
                            const deconv = await resp.json();
                            if (deconv.error) {
                                alert('Deconvolution error: ' + deconv.error);
                                return;
                            }
                            const deconvColor = '#2ca02c';
                            Plotly.newPlot('plot', [
                                {
                                    x: Array.from({length: deconv.deconvolved.length}, (_, i) => i / FS),
                                    y: deconv.deconvolved,
                                    type: 'scatter',
                                    mode: 'lines',
                                    name: 'Deconvolved Signal',
                                    line: { color: deconvColor },
                                    xaxis: 'x1',
                                    yaxis: 'y1'
                                },
                                {
                                    x: deconv.deconv_freq_axis, // <-- use correct key from backend
                                    y: deconv.deconv_fft,       // <-- use correct key from backend
                                    type: 'scatter',
                                    mode: 'lines',
                                    name: 'Deconvolved FFT',
                                    line: { color: deconvColor },
                                    xaxis: 'x2',
                                    yaxis: 'y2',
                                    showlegend: true // show legend for FFT
                                }
                            ], {
                                grid: {rows: 2, columns: 1, pattern: 'independent'},
                                height: 700,
                                width: 900,
                                showlegend: true,
                                margin: { l: 80, r: 40, t: 40, b: 70 },
                                xaxis: {title: 'Time (s)'},
                                yaxis: {title: 'Amplitude'},
                                xaxis2: {title: 'Frequency (Hz)'},
                                yaxis2: {title: 'Magnitude'}
                            });
                            if (deconv.unstable) {
                                alert('Warning: Deconvolution result may be unstable or noisy.');
                            }
                        } catch (err) {
                            alert('Deconvolution failed: ' + err.message);
                        }
                    };
                    deconvBtn.onclick = async function() {
                        const epsilon = updateDeconvRegValue();
                        await callDeconv(epsilon);
                    };
                    deconvRegSlider.oninput = async function() {
                        const epsilon = updateDeconvRegValue();
                        await callDeconv(epsilon);
                    };
                }
                
                // Restore Add Overlay button functionality
                restoreAddOverlayButton();
            } else {
                alert('Error applying filter: ' + (result.error || 'Unknown error'));
                // Also restore on error
                restoreAddOverlayButton();
            }
        };
        
        // Assign the apply function to both buttons
        if (addOverlayBtn) addOverlayBtn.onclick = applyFunction;
        if (addOverlayBtn2) addOverlayBtn2.onclick = applyFunction;
    };
}

// Function to restore Add Overlay button functionality
function restoreAddOverlayButton() {
    const addOverlayBtn = document.getElementById('addOverlayBtn');
    const addOverlayBtn2 = document.getElementById('addOverlayBtn2');
    
    if (addOverlayBtn) {
        addOverlayBtn.textContent = 'Add Overlay';
        addOverlayBtn.onclick = addOverlay;
    }
    if (addOverlayBtn2) {
        addOverlayBtn2.textContent = 'Add Overlay';
        addOverlayBtn2.onclick = addOverlay;
    }
    filterViewActive = false;
}

// --- Live Plot Animation ---
const livePlotBtn = document.getElementById('livePlotBtn');
if (livePlotBtn) {
    livePlotBtn.onclick = function() {
        // Use the current main signal and time axis
        const y = state.signalData;
        const x = state.time_axis;
        if (!y || !x || y.length === 0 || x.length === 0) {
            alert('Please generate a signal first!');
            return;
        }
        let current = 1;
        const chunk = 5; // Number of points to add per frame
        Plotly.newPlot('plot', [{
            x: [],
            y: [],
            mode: 'lines',
            line: {color: 'red'}
        }], {margin: {t: 20}});
        function animate() {
            if (current <= y.length) {
                Plotly.react('plot', [{
                    x: Array.from(x).slice(0, current),
                    y: Array.from(y).slice(0, current),
                    mode: 'lines',
                    line: {color: 'red'}
                }], {margin: {t: 20}});
                current += chunk;
                setTimeout(animate, 30); // Adjust speed here
            }
        }
        animate();
    };
}

// --- Custom Legend Logic ---
function renderCustomLegend() {
    // No-op: legend logic removed, legend will remain empty.
    const legendDiv = document.getElementById('custom-legend');
    if (!legendDiv) return;
    legendDiv.innerHTML = '';
}

// Patch plotAll to also update the legend
if (!window._plotAllPatched) {
    const originalPlotAll = plotAll;
    window.plotAll = function(...args) {
        originalPlotAll.apply(this, args);
        renderCustomLegend();
    };
    window._plotAllPatched = true;
}

// Add Undo button logic for overlays and filters
const undoBtn = document.getElementById('undo-btn');
if (undoBtn) {
    undoBtn.onclick = function() {
        const lastAction = state.plotHistory.pop();
        if (!lastAction) return;
        if (lastAction.type === 'overlay') {
            state.overlays = [];
        } else if (lastAction.type === 'filter') {
            state.filteredActive = false;
            state.filteredSignal = null;
            state.filteredFft = null;
            state.filteredFftFreq = null;
        }
        plotAll();
    };
}

// Add a button to show memory state - button now exists in HTML, just add functionality
const showStateBtn = document.getElementById('showStateBtn');
if (showStateBtn) {
    showStateBtn.onclick = function() {
        let msg = '';
        const mainLen = state.signalData && state.signalData.length ? state.signalData.length : 0;
        const overlayLen = (state.overlays && state.overlays.length && state.overlays[state.overlays.length-1].signal.length) ? state.overlays[state.overlays.length-1].signal.length : 0;
        msg += 'Main signal: ' + (mainLen ? `${mainLen} points` : 'none') + '\n';
        msg += 'Overlay: ' + (overlayLen ? `${overlayLen} points` : 'none') + '\n';
        msg += 'Filtered signal: ' + (state.filteredSignal && state.filteredSignal.length ? `${state.filteredSignal.length} points` : 'none') + '\n';
        msg += 'Filtered active: ' + (state.filteredActive ? 'yes' : 'no') + '\n';
        if (state.filteredActive && state.filteredSignal && state.filteredSignal.length) {
            msg += '\nIf you apply a filter now, it will act on the main signal (not the overlay or filtered signal).';
        } else if (mainLen) {
            msg += '\nIf you apply a filter now, it will act on the main signal.';
        } else {
            msg += '\nNo main signal present: filtering is not possible.';
        }
        if (state.overlays && state.overlays.length) {
            msg += '\nIf you perform an operation (add, subtract, etc), it will use both the main signal and the overlay.';
        }
        // Compare lengths and show warning if different
        if (mainLen && overlayLen && mainLen !== overlayLen) {
            msg += '\n\n%RED%Different sample size detected ! Operations might not work !%ENDRED%';
        }
        // Show as plain alert, but replace %RED%...%ENDRED% with red text if possible
        if (msg.includes('%RED%')) {
            // Try to show as HTML if possible
            const htmlMsg = msg.replace(/%RED%(.+?)%ENDRED%/g, '<span style="color:red;">$1</span>').replace(/\n/g, '<br>');
            const win = window.open('', '', 'width=500,height=400');
            win.document.write('<html><body style="font-family:sans-serif;font-size:1.1em;padding:2em;">' + htmlMsg + '<br><br><button onclick="window.close()" style="font-size:1em;">Close</button></body></html>');
            win.document.close();
        } else {
            alert(msg);
        }
    };
}

// Show persistent warning if 'multi' signal type is selected or generated
function showMultiWarningBox(show) {
    const box = document.getElementById('multi-warning');
    if (!box) return;
    if (show) {
        box.style.display = '';
        box.textContent = '⚠️ Multi signal type may have a different size than other signals. If you want to compare another signal to a multi signal, generate the multi signal first, then add overlays. Do not overlay a multi signal onto a non-multi signal.';
    } else {
        box.style.display = 'none';
        box.textContent = '';
    }
}
if (signalTypeSelect) {
    signalTypeSelect.addEventListener('change', function() {
        showMultiWarningBox(this.value === 'multi');
    });
    // On page load
    showMultiWarningBox(signalTypeSelect.value === 'multi');
}
// Also show after generating a multi signal
if (!window._generateSignalPatched) {
    const originalGenerateSignal = generateSignal;
    window.generateSignal = async function(...args) {
        await originalGenerateSignal.apply(this, args);
        if (signalTypeSelect && signalTypeSelect.value === 'multi') {
            showMultiWarningBox(true);
        }
    };
    window._generateSignalPatched = true;
}

// RC Circuit Simulation button event listener
const rcSimBtn = document.getElementById('rcSimBtn');
if (rcSimBtn) {
    rcSimBtn.addEventListener('click', async () => {
        const R = parseFloat(document.getElementById('rcR').value);
        const C = parseFloat(document.getElementById('rcC').value);
        const V_in = parseFloat(document.getElementById('rcVin').value);
        const duration = parseFloat(document.getElementById('rcDuration').value);
        const points = parseInt(document.getElementById('rcPoints').value);
        if (isNaN(R) || isNaN(C) || isNaN(V_in) || isNaN(duration) || isNaN(points)) {
            alert('Please enter valid RC circuit parameters.');
            return;
        }
        try {
            const result = await simulateRCCircuit(R, C, V_in, duration, points);
            // Plot RC circuit response using Plotly
            Plotly.newPlot('plot', [{
                x: result.t,
                y: result.V_out,
                type: 'scatter',
                mode: 'lines',
                name: 'RC Step Response',
                line: { color: '#0074D9' }
            }], {
                title: 'RC Circuit Step Response',
                xaxis: { title: 'Time (s)' },
                yaxis: { title: 'V_out (V)' }
            });
        } catch (err) {
            alert('RC Circuit Error: ' + err.message);
        }
    });
}

// Section toggle logic
const signalSection = document.getElementById('signal-section');
const circuitSection = document.getElementById('rc-circuit-section');
const showSignalBtn = document.getElementById('showSignalBtn');
const showCircuitBtn = document.getElementById('showCircuitBtn');
if (showSignalBtn && showCircuitBtn && signalSection && circuitSection) {
    showSignalBtn.addEventListener('click', () => {
        signalSection.style.display = '';
        circuitSection.style.display = 'none';
    });
    showCircuitBtn.addEventListener('click', () => {
        signalSection.style.display = 'none';
        circuitSection.style.display = '';
    });
}