let signalData = null;
let fftMagnitudes = null;
let fftFreqAxis = null;
let signalState = { zoomX: 1, zoomY: 1, offsetX: 0, offsetY: 0, isDragging: false, lastX: 0, lastY: 0, zoomRegion: null };
let fftState = { zoomX: 1, zoomY: 1, offsetX: 0, offsetY: 0, isDragging: false, lastX: 0, lastY: 0, zoomRegion: null };
let eventsSetup = false;

// Box zoom state
let isBoxZooming = false;
let boxZoomStart = null;
let boxZoomEnd = null;
let boxZoomTarget = null; // "signal" or "fft"

let timeZoom = 1;
let timePan = 0;
let fftZoom = 1;
let fftPan = 0;

function generateSignal() {
    const frequency = parseFloat(document.getElementById('frequency').value);
    const points = parseInt(document.getElementById('points').value);
    const noise = parseFloat(document.getElementById('noise').value);
    const signalType = document.getElementById('signalType').value;

    fetch('/api/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency, points, noise, signalType })
    })
    .then(response => response.json())
    .then(data => {
        signalData = new Float32Array(data.signal);
        fftMagnitudes = new Float32Array(data.fft);
        fftFreqAxis = new Float32Array(data.freq_axis);
        plotAll();
        if (!eventsSetup) {
            setupCanvasEvents();
            eventsSetup = true;
        }
    })
    .catch(err => alert('Error: ' + err));
}

function plotAll() {
    const combinedCanvas = document.getElementById('combinedCanvas');
    const ctx = combinedCanvas.getContext('2d');
    ctx.clearRect(0, 0, combinedCanvas.width, combinedCanvas.height);

    // Define subplot regions
    const totalHeight = combinedCanvas.height;
    const width = combinedCanvas.width;
    const subplotHeight = totalHeight / 2;

    // Time domain plot (top half)
    plotSignalCombined(ctx, width, subplotHeight, signalData, 'Time (s)', 'Amplitude', timeZoom, timePan, 0);
    // FFT plot (bottom half)
    const frequency = parseFloat(document.getElementById('frequency').value);
    const fMin = Math.max(0, frequency - 10 * fftZoom + fftPan);
    const fMax = frequency + 10 * fftZoom + fftPan;
    plotFFTCombined(ctx, width, subplotHeight, fftMagnitudes, fftFreqAxis, fMin, fMax, subplotHeight);
}

function plotSignalCombined(ctx, width, height, data, xLabel, yLabel, zoom, pan, yOffset) {
    const margin = 50;
    const yLabelOffset = 45; // Further increased offset for y-axis label
    const tickLabelOffset = 20; // Further increased offset for tick values
    const plotWidth = width - 2 * margin;
    const plotHeight = height - 2 * margin;
    let minVal = Math.min(...data, -1);
    let maxVal = Math.max(...data, 1);
    let range = maxVal - minVal || 1;

    // Axes
    ctx.save();
    ctx.translate(0, yOffset);
    ctx.beginPath();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, height - margin);
    ctx.lineTo(width - margin, height - margin);
    ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(margin - yLabelOffset, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
    ctx.fillText(xLabel, width / 2, height - 10);

    // X ticks (time)
    for (let i = 0; i <= 5; i++) {
        const t = (i / 5 - 0.5) * zoom + 0.5 + pan;
        const x = margin + i * plotWidth / 5;
        ctx.beginPath();
        ctx.moveTo(x, height - margin);
        ctx.lineTo(x, height - margin + 5);
        ctx.stroke();
        ctx.fillText(t.toFixed(2), x, height - margin + 20);
    }
    // Y ticks (amplitude)
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const yVal = minVal + (i * (range) / 5);
        const y = height - margin - ((yVal - minVal) / range * plotHeight);
        ctx.beginPath();
        ctx.moveTo(margin - 5, y);
        ctx.lineTo(margin, y);
        ctx.stroke();
        ctx.fillText(yVal.toFixed(2), margin - tickLabelOffset, y + 4);
    }

    // Plot data
    ctx.beginPath();
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 2;
    const N = data.length;
    for (let i = 0; i < N; i++) {
        const t = i / N;
        const tView = (t - 0.5 - pan) / zoom + 0.5;
        if (tView < 0 || tView > 1) continue;
        const x = margin + tView * plotWidth;
        const y = height - margin - ((data[i] - minVal) / range * plotHeight);
        if (i === 0 || tView < 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
}

function plotFFTCombined(ctx, width, height, magnitudes, freqAxis, fMin, fMax, yOffset) {
    const margin = 50;
    const yLabelOffset = 45; // Further increased offset for y-axis label
    const tickLabelOffset = 20; // Further increased offset for tick values
    const plotWidth = width - 2 * margin;
    const plotHeight = height - 2 * margin;
    // Axes
    ctx.save();
    ctx.translate(0, yOffset);
    ctx.beginPath();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, height - margin);
    ctx.lineTo(width - margin, height - margin);
    ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(margin - yLabelOffset, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Magnitude', 0, 0);
    ctx.restore();
    ctx.fillText('Frequency (Hz)', width / 2, height - 10);

    // X ticks (frequency)
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
        const freq = fMin + (i * (fMax - fMin) / 5);
        const x = margin + i * plotWidth / 5;
        ctx.beginPath();
        ctx.moveTo(x, height - margin);
        ctx.lineTo(x, height - margin + 5);
        ctx.stroke();
        ctx.fillText(freq.toFixed(1) + ' Hz', x, height - margin + 20);
    }
    // Y ticks (magnitude)
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const yVal = i / 5;
        const y = height - margin - yVal * plotHeight;
        ctx.beginPath();
        ctx.moveTo(margin - 5, y);
        ctx.lineTo(margin, y);
        ctx.stroke();
        ctx.fillText(yVal.toFixed(2), margin - tickLabelOffset, y + 4);
    }

    // Plot FFT data
    ctx.beginPath();
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 2;
    let startIdx = 0, endIdx = freqAxis.length;
    for (let i = 0; i < freqAxis.length; i++) {
        if (freqAxis[i] >= fMin) { startIdx = i; break; }
    }
    for (let i = freqAxis.length - 1; i >= 0; i--) {
        if (freqAxis[i] <= fMax) { endIdx = i + 1; break; }
    }
    for (let i = startIdx; i < endIdx; i++) {
        const freq = freqAxis[i];
        const x = margin + ((freq - fMin) / (fMax - fMin)) * plotWidth;
        const y = height - margin - (magnitudes[i] * plotHeight);
        if (i === startIdx) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
}

function drawZoomRect(canvas, start, end) {
    if (!start || !end) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.strokeStyle = 'rgba(0,123,255,0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6]);
    ctx.strokeRect(
        Math.min(start.x, end.x),
        Math.min(start.y, end.y),
        Math.abs(end.x - start.x),
        Math.abs(end.y - start.y)
    );
    ctx.restore();
}

function applyBoxZoomSignal(start, end) {
    const signalCanvas = document.getElementById('signalCanvas');
    const margin = 50;
    const plotWidth = signalCanvas.width - 2 * margin;
    const tMin0 = 0, tMax0 = 1;

    const minX = Math.max(margin, Math.min(start.x, end.x));
    const maxX = Math.min(signalCanvas.width - margin, Math.max(start.x, end.x));
    const t1 = tMin0 + ((minX - margin) / plotWidth) * (tMax0 - tMin0);
    const t2 = tMin0 + ((maxX - margin) / plotWidth) * (tMax0 - tMin0);

    signalState.zoomRegion = {
        min: Math.max(0, Math.min(t1, t2)),
        max: Math.max(0, Math.max(t1, t2))
    };
    plotAll();
}

function applyBoxZoomFFT(start, end) {
    const fftCanvas = document.getElementById('fftCanvas');
    const margin = 50;
    const plotWidth = fftCanvas.width - 2 * margin;
    const frequency = parseFloat(document.getElementById('frequency').value);
    const freqWindow = 10;
    const minFreq0 = Math.max(0, frequency - freqWindow);
    const maxFreq0 = frequency + freqWindow;

    const minX = Math.max(margin, Math.min(start.x, end.x));
    const maxX = Math.min(fftCanvas.width - margin, Math.max(start.x, end.x));
    const f1 = minFreq0 + ((minX - margin) / plotWidth) * (maxFreq0 - minFreq0);
    const f2 = minFreq0 + ((maxX - margin) / plotWidth) * (maxFreq0 - minFreq0);

    fftState.zoomRegion = {
        min: Math.max(0, Math.min(f1, f2)),
        max: Math.max(0, Math.max(f1, f2))
    };
    plotAll();
}

function handleZoom(event, canvas, signalState, fftState) {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left - 50) / (canvas.width - 100);
    const mouseY = (event.clientY - rect.top - 50) / (canvas.height - 100);
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;

    // Adjust zoom
    const oldZoomX = signalState.zoomX;
    const oldZoomY = signalState.zoomY;
    signalState.zoomX = Math.max(1, Math.min(signalState.zoomX * zoomFactor, 20));
    signalState.zoomY = Math.max(1, Math.min(signalState.zoomY * zoomFactor, 20));

    // Adjust offsets to keep mouse position centered
    signalState.offsetX += mouseX * (oldZoomX - signalState.zoomX) * canvas.width / signalState.zoomX;
    signalState.offsetY += mouseY * (oldZoomY - signalState.zoomY) * (canvas.height - 100) / signalState.zoomY;

    // Clamp offsets so plot stays in view
    signalState.offsetX = Math.max(0, Math.min(signalState.offsetX, (signalState.zoomX - 1) * (canvas.width - 100)));
    signalState.offsetY = Math.max(0, Math.min(signalState.offsetY, (signalState.zoomY - 1) * (canvas.height - 100)));

    plotAll();
}

function startDrag(event, state) {
    state.isDragging = true;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
}

function drag(event, canvas, state) {
    if (!state.isDragging) return;
    const dx = (event.clientX - state.lastX) / state.zoomX;
    const dy = (event.clientY - state.lastY) / state.zoomY;
    state.offsetX -= dx / (canvas.width - 100) * canvas.width;
    state.offsetY += dy / (canvas.height - 100) * (canvas.height - 100);

    // Clamp offsets so plot stays in view
    state.offsetX = Math.max(0, Math.min(state.offsetX, (state.zoomX - 1) * (canvas.width - 100)));
    state.offsetY = Math.max(0, Math.min(state.offsetY, (state.zoomY - 1) * (canvas.height - 100)));

    state.lastX = event.clientX;
    state.lastY = event.clientY;
    plotAll();
}

function stopDrag(state) {
    state.isDragging = false;
}

function resetZoom() {
    signalState = { zoomX: 1, zoomY: 1, offsetX: 0, offsetY: 0, isDragging: false, lastX: 0, lastY: 0, zoomRegion: null };
    fftState = { zoomX: 1, zoomY: 1, offsetX: 0, offsetY: 0, isDragging: false, lastX: 0, lastY: 0, zoomRegion: null };
    plotAll();
}

function setupCanvasEvents() {
    const combinedCanvas = document.getElementById('combinedCanvas');
    if (!combinedCanvas) return;

    combinedCanvas.onwheel = (e) => handleZoom(e, combinedCanvas, signalState, fftState);
    combinedCanvas.onmousedown = function(e) { handleMouseDown(e, combinedCanvas); };
    combinedCanvas.onmousemove = function(e) { handleMouseMove(e, combinedCanvas); };
    combinedCanvas.onmouseup = function(e) { handleMouseUp(e, combinedCanvas); };
    combinedCanvas.onmouseleave = function() { handleMouseLeave(combinedCanvas); };
}

// Update or stub out the event handler functions as needed
function handleZoom(e, canvas, signalState, fftState) {
    // Implement zoom logic for both subplots if needed
}
function handleMouseDown(e, canvas) {
    // Implement mouse down logic for both subplots if needed
}
function handleMouseMove(e, canvas) {
    // Implement mouse move logic for both subplots if needed
}
function handleMouseUp(e, canvas) {
    // Implement mouse up logic for both subplots if needed
}
function handleMouseLeave(canvas) {
    // Implement mouse leave logic for both subplots if needed
}

// Generate a default signal on page load
window.addEventListener('DOMContentLoaded', () => {
    generateSignal();
});

// --- ZOOM & PAN ---
document.getElementById('combinedCanvas').addEventListener('wheel', function(e) {
    e.preventDefault();
    const rect = this.getBoundingClientRect();
    const y = e.clientY - rect.top;
    if (y < this.height / 2) {
        // Time domain zoom
        timeZoom += e.deltaY > 0 ? 0.1 : -0.1;
        timeZoom = Math.max(0.5, Math.min(timeZoom, 5));
    } else {
        // FFT zoom
        fftZoom += e.deltaY > 0 ? 0.1 : -0.1;
        fftZoom = Math.max(0.5, Math.min(fftZoom, 5));
    }
    plotAll();
});
document.getElementById('combinedCanvas').addEventListener('mousedown', function(e) {
    this.isDragging = true;
    this.lastX = e.clientX;
    const rect = this.getBoundingClientRect();
    this.dragSubplot = (e.clientY - rect.top) < this.height / 2 ? 'time' : 'fft';
});
document.getElementById('combinedCanvas').addEventListener('mousemove', function(e) {
    if (this.isDragging) {
        const dx = (e.clientX - this.lastX) / 100;
        if (this.dragSubplot === 'time') {
            timePan += dx * timeZoom;
        } else {
            fftPan += dx * fftZoom * 2; // more sensitive for FFT
        }
        this.lastX = e.clientX;
        plotAll();
    }
});
document.getElementById('combinedCanvas').addEventListener('mouseup', function(e) {
    this.isDragging = false;
});
document.getElementById('combinedCanvas').addEventListener('mouseleave', function(e) {
    this.isDragging = false;
});