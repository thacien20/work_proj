// ui.js
import { state, FS } from './state.js';
import { generateSignal } from './signal.js';
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
                addOverlayBtn.style.display = 'none';
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
        });
        // On page load, set correct visibility
        if (signalTypeSelect.value === 'multi') {
            addOverlayBtn.style.display = 'none';
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

// Patch generateSignal to clear overlays if not waiting for overlay
// Only patch if not already patched (avoid assignment to const)
if (!window._generateSignalPatched) {
    const originalGenerateSignal = generateSignal;
    window.generateSignal = async function(...args) {
        await originalGenerateSignal.apply(this, args);
        // Do not touch overlays unless addOverlay was just used
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

// --- Filter View Main Plot Logic ---
const filterViewBtn = document.getElementById('filterBtn_view');
if (filterViewBtn) {
    filterViewBtn.onclick = async function() {
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
    };
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