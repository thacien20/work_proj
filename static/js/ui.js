// ui.js
import { state } from './state.js';
import { generateSignal } from './signal.js';
import { plotAll } from './plotting.js';

window.addEventListener('DOMContentLoaded', () => {
    generateSignal();
    setupCanvasEvents();
    document.getElementById('generateBtn').onclick = generateSignal;
    document.getElementById('addOverlayBtn').onclick = addOverlay;
    // Uncomment if a reset zoom button exists in HTML
    // document.getElementById('resetZoomBtn').onclick = resetZoom;
    setupConstOpDropdown();
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
    if (!state.signalData || !state.fftMagnitudes || !state.fftFreqAxis) {
        alert('Generate a main signal first before adding an overlay.');
        return;
    }
    state.overlays.push({
        signal: new Float32Array(state.signalData),
        fft: new Float32Array(state.fftMagnitudes),
        freq: new Float32Array(state.fftFreqAxis)
    });
    alert('Overlay added!');
    plotAll();
}

function resetZoom() {
    state.timeZoom = 1;
    state.timePan = 0;
    state.fftZoom = 1;
    state.fftPan = 0;
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

// Call this in your DOMContentLoaded handler:
window.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    setupAnalyzeDropdown();
});