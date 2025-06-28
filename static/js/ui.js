// ui.js
import { state } from './state.js';
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
    setupConstOpDropdown();
    setupAnalyzeDropdown();
    setupOperationsDropdown();
    setupFilterDropdown();

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
    // Save the current signal as the overlay
    state.overlays = [{
        signal: new Float32Array(state.signalData),
        time_axis: new Float32Array(state.time_axis),
        fft: new Float32Array(state.fftMagnitudes),
        freq: new Float32Array(state.fftFreqAxis)
    }];
    alert('Overlay added! Now generate a new main signal.');
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

function setupConstOpDropdown() {
    const constOpBtn = document.getElementById('constOpBtn');
    const constOpContent = document.querySelector('.const-op-content');
    if (constOpBtn && constOpContent) {
        constOpBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            constOpContent.classList.toggle('show');
        });
        document.addEventListener('click', function(e) {
            if (!constOpContent.contains(e.target) && e.target !== constOpBtn) {
                constOpContent.classList.remove('show');
            }
        });
        const operationButtons = [
            { id: 'constOpBtn_add', op: 'add' },
            { id: 'constOpBtn_subtract', op: 'subtract' },
            { id: 'constOpBtn_multiply', op: 'multiply' },
            { id: 'constOpBtn_divide', op: 'divide' }
        ];
        operationButtons.forEach(({ id, op }) => {
            const button = document.getElementById(id);
            button.addEventListener('click', async () => {
                if (!state.signalData.length || !state.fs) {
                    alert('Please generate a signal first');
                    return;
                }
                const row = button.closest('.const-op-row');
                const constantInput = row.querySelector('.const-op-input');
                const constant = parseFloat(constantInput.value);
                if (isNaN(constant)) {
                    alert('Please enter a valid constant value');
                    return;
                }
                const data = {
                    signal: Array.from(state.signalData),
                    operation: op,
                    constant: constant,
                    fs: state.fs
                };
                try {
                    const response = await fetch('/api/apply_operation', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    const result = await response.json();
                    if (response.ok) {
                        state.signalData = new Float32Array(result.signal);
                        state.fftMagnitudes = new Float32Array(result.fft);
                        state.fftFreqAxis = new Float32Array(result.freq_axis);
                        const points = state.signalData.length;
                        state.time_axis = new Float32Array(points);
                        for (let i = 0; i < points; i++) {
                            state.time_axis[i] = i / state.fs;
                        }
                        plotAll();
                    } else {
                        alert(result.error);
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('Failed to apply operation');
                }
            });
        });
    }
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
                            state.time_axis[i] = i / state.fs;
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

function setupFilterDropdown() {
    const filterBtn = document.getElementById('filterBtn');
    const filterDropdown = filterBtn?.nextElementSibling;
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
    }
}