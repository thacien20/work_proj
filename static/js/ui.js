// ui.js
import { state } from './state.js';
import { generateSignal } from './signal.js';
import { plotAll, initZoom } from './plotting.js';

window.addEventListener('DOMContentLoaded', () => {
    console.log('ui.js loaded');
    const canvas = document.getElementById('combinedCanvas');
    initZoom(canvas);

    function resizeCanvas() {
        const container = document.querySelector('.canvas-container');
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight || 600;
        plotAll();
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    generateSignal();
    setupConstOpDropdown();
    setupAnalyzeDropdown();
    setupOperationsDropdown();
    setupFilterDropdown();

    document.getElementById('generateBtn').onclick = generateSignal;
    document.getElementById('addOverlayBtn').onclick = addOverlay;
    document.getElementById('resetZoomBtn').onclick = resetZoom;

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
});

function resetZoom() {
    state.timeZoom = 1;
    state.timePan = null;
    state.fftZoom = 1;
    state.fftPan = null;
    state.intensityZoom = 1; // Reset vertical zoom
    state.magnitudeZoom = 1; // Reset vertical zoom
    plotAll();
}

function addOverlay() {
    if (!state.signalData.length || !state.fftMagnitudes.length || !state.fftFreqAxis.length) {
        alert('Generate a main signal first before adding an overlay.');
        return;
    }
    state.overlays.push({
        signal: new Float32Array(state.signalData),
        time_axis: new Float32Array(state.time_axis),
        fft: new Float32Array(state.fftMagnitudes),
        freq: new Float32Array(state.fftFreqAxis)
    });
    alert('Overlay added!');
    plotAll();
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