// ui.js
import { state } from './state.js';
import { generateSignal } from './signal.js';
import { plotAll } from './plotting.js';

window.addEventListener('DOMContentLoaded', () => {
    console.log('ui.js loaded'); // Debug log
    generateSignal();
    setupCanvasEvents();
    setupConstOpDropdown();
    setupAnalyzeDropdown();
    setupOperationsDropdown();
    document.getElementById('generateBtn').onclick = generateSignal;
    document.getElementById('addOverlayBtn').onclick = addOverlay;
});

function setupCanvasEvents() {
    const canvas = document.getElementById('combinedCanvas');
    let isDragging = false;
    let lastX = 0;
    let dragRegion = null;

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const y = e.offsetY;
        if (y < canvas.height / 2) {
            state.timeZoom += e.deltaY > 0 ? 0.1 : -0.1;
            state.timeZoom = Math.max(0.5, Math.min(state.timeZoom, 10));
        } else {
            state.fftZoom += e.deltaY > 0 ? 0.1 : -0.1;
            state.fftZoom = Math.max(0.5, Math.min(state.fftZoom, 10));
        }
        plotAll();
    });

    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastX = e.clientX;
        dragRegion = e.offsetY < canvas.height / 2 ? 'time' : 'fft';
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const dx = (e.clientX - lastX) / 100;
            if (dragRegion === 'time') {
                state.timePan += dx * state.timeZoom;
            } else {
                state.fftPan += dx * state.fftZoom * 2;
            }
            lastX = e.clientX;
            plotAll();
        }
    });

    canvas.addEventListener('mouseup', () => { isDragging = false; });
    canvas.addEventListener('mouseleave', () => { isDragging = false; });
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
    console.log('Setting up constOpDropdown', { constOpBtn, constOpContent }); // Debug log
    if (constOpBtn && constOpContent) {
        constOpBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            console.log('Toggling constOpContent'); // Debug log
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
            console.log(`Setting up ${id}`, { button }); // Debug log
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
    const operationsBtn = document.querySelector('.dropbtn:not(#constOpBtn):not(#analyzeBtn)');
    const operationsContent = document.querySelector('.dropdown-content:not(#analyzeDropdown):not(.const-op-content)');
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
                if (!state.signalData.length || !state.fs) {
                    alert('Please generate a signal first');
                    return;
                }
                const data = {
                    signal: Array.from(state.signalData),
                    operation: op,
                    constant: 1,
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