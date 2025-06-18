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

function generateSignal() {
    const frequency = parseFloat(document.getElementById('frequency').value);
    const points = parseInt(document.getElementById('points').value);
    const noise = parseFloat(document.getElementById('noise').value);

    fetch('/api/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency, points, noise })
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
    const signalCanvas = document.getElementById('signalCanvas');
    const fftCanvas = document.getElementById('fftCanvas');
    const signalCtx = signalCanvas.getContext('2d');
    const fftCtx = fftCanvas.getContext('2d');

    // Time domain zoom region
    let tMin = 0, tMax = 1;
    if (signalState.zoomRegion) {
        tMin = signalState.zoomRegion.min;
        tMax = signalState.zoomRegion.max;
    }

    plotSignal(signalCtx, signalCanvas, signalData, signalState, 'Time (s)', 'Amplitude', tMin, tMax);

    // FFT zoom region
    const frequency = parseFloat(document.getElementById('frequency').value);
    let freqWindow = 10;
    let freqCenter = frequency;
    let fMin = Math.max(0, freqCenter - freqWindow), fMax = freqCenter + freqWindow;
    if (fftState.zoomRegion) {
        fMin = fftState.zoomRegion.min;
        fMax = fftState.zoomRegion.max;
    }
    plotFFT(fftCtx, fftCanvas, fftMagnitudes, fftFreqAxis, fftState, fMin, fMax);

    // Draw box zoom rectangle if active
    if (isBoxZooming && boxZoomStart && boxZoomEnd) {
        if (boxZoomTarget === "signal") drawZoomRect(signalCanvas, boxZoomStart, boxZoomEnd);
        if (boxZoomTarget === "fft") drawZoomRect(fftCanvas, boxZoomStart, boxZoomEnd);
    }
}

function plotSignal(ctx, canvas, data, state, xLabel, yLabel, tMin, tMax) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let minVal = Math.min(...data, -1);
    let maxVal = Math.max(...data, 1);
    let range = maxVal - minVal || 1;

    ctx.beginPath();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    const margin = 50;
    const plotWidth = canvas.width - 2 * margin;
    const plotHeight = canvas.height - 2 * margin;
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, canvas.height - margin);
    ctx.lineTo(canvas.width - margin, canvas.height - margin);
    ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, canvas.width / 2, canvas.height - 10);
    ctx.save();
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, -canvas.height / 2, 20);
    ctx.restore();

    // X ticks (time)
    for (let i = 0; i <= 5; i++) {
        const x = margin + i * plotWidth / 5;
        const t = tMin + (i * (tMax - tMin) / 5);
        ctx.beginPath();
        ctx.moveTo(x, canvas.height - margin);
        ctx.lineTo(x, canvas.height - margin + 5);
        ctx.stroke();
        ctx.fillText(t.toFixed(2), x, canvas.height - margin + 20);
    }
    // Y ticks
    for (let i = 0; i <= 5; i++) {
        const yVal = minVal + (i * range / 5);
        const y = canvas.height - margin - (yVal - minVal) / range * plotHeight;
        ctx.beginPath();
        ctx.moveTo(margin - 5, y);
        ctx.lineTo(margin, y);
        ctx.stroke();
        ctx.fillText(yVal.toFixed(1), margin - 20, y + 4);
    }

    // Plot data in zoomed region
    ctx.beginPath();
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 2;
    const N = data.length;
    for (let i = 0; i < N; i++) {
        const t = i / N;
        if (t < tMin || t > tMax) continue;
        const x = margin + ((t - tMin) / (tMax - tMin)) * plotWidth;
        const y = canvas.height - margin - ((data[i] - minVal) / range * plotHeight);
        if (i === 0 || t < tMin) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
}

function plotFFT(ctx, canvas, magnitudes, freqAxis, state, fMin, fMax) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Find indices within the desired frequency window
    let startIdx = 0, endIdx = freqAxis.length;
    for (let i = 0; i < freqAxis.length; i++) {
        if (freqAxis[i] >= fMin) { startIdx = i; break; }
    }
    for (let i = freqAxis.length - 1; i >= 0; i--) {
        if (freqAxis[i] <= fMax) { endIdx = i + 1; break; }
    }

    // Axes
    ctx.beginPath();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    const margin = 50;
    const plotWidth = canvas.width - 2 * margin;
    const plotHeight = canvas.height - 2 * margin;
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, canvas.height - margin);
    ctx.lineTo(canvas.width - margin, canvas.height - margin);
    ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Frequency (Hz)', canvas.width / 2, canvas.height - 10);
    ctx.save();
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Magnitude', -canvas.height / 2, 20);
    ctx.restore();

    // X ticks (frequency)
    for (let i = 0; i <= 5; i++) {
        const x = margin + i * plotWidth / 5;
        const freq = fMin + (i * (fMax - fMin) / 5);
        ctx.beginPath();
        ctx.moveTo(x, canvas.height - margin);
        ctx.lineTo(x, canvas.height - margin + 5);
        ctx.stroke();
        ctx.fillText(freq.toFixed(1), x, canvas.height - margin + 20);
    }
    // Y ticks
    for (let i = 0; i <= 5; i++) {
        const yVal = i / 5;
        const y = canvas.height - margin - yVal * plotHeight;
        ctx.beginPath();
        ctx.moveTo(margin - 5, y);
        ctx.lineTo(margin, y);
        ctx.stroke();
        ctx.fillText(yVal.toFixed(1), margin - 20, y + 4);
    }

    // Plot FFT data in the window
    ctx.beginPath();
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 2;
    for (let i = startIdx; i < endIdx; i++) {
        const freq = freqAxis[i];
        const x = margin + ((freq - fMin) / (fMax - fMin)) * plotWidth;
        const y = canvas.height - margin - (magnitudes[i] * plotHeight);
        if (i === startIdx) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
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

function handleZoom(event, canvas, state) {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left - 50) / (canvas.width - 100);
    const mouseY = (event.clientY - rect.top - 50) / (canvas.height - 100);
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;

    // Adjust zoom
    const oldZoomX = state.zoomX;
    const oldZoomY = state.zoomY;
    state.zoomX = Math.max(1, Math.min(state.zoomX * zoomFactor, 20));
    state.zoomY = Math.max(1, Math.min(state.zoomY * zoomFactor, 20));

    // Adjust offsets to keep mouse position centered
    state.offsetX += mouseX * (oldZoomX - state.zoomX) * canvas.width / state.zoomX;
    state.offsetY += mouseY * (oldZoomY - state.zoomY) * (canvas.height - 100) / state.zoomY;

    // Clamp offsets so plot stays in view
    state.offsetX = Math.max(0, Math.min(state.offsetX, (state.zoomX - 1) * (canvas.width - 100)));
    state.offsetY = Math.max(0, Math.min(state.offsetY, (state.zoomY - 1) * (canvas.height - 100)));

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
    const signalCanvas = document.getElementById('signalCanvas');
    const fftCanvas = document.getElementById('fftCanvas');
    signalCanvas.onwheel = (e) => handleZoom(e, signalCanvas, signalState);
    fftCanvas.onwheel = (e) => handleZoom(e, fftCanvas, fftState);

    // Time domain box zoom
    signalCanvas.onmousedown = function(e) {
        if (e.ctrlKey) {
            isBoxZooming = true;
            boxZoomTarget = "signal";
            const rect = signalCanvas.getBoundingClientRect();
            boxZoomStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            boxZoomEnd = null;
        } else {
            startDrag(e, signalState);
        }
    };
    signalCanvas.onmousemove = function(e) {
        if (isBoxZooming && boxZoomTarget === "signal") {
            const rect = signalCanvas.getBoundingClientRect();
            boxZoomEnd = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            plotAll();
        } else {
            drag(e, signalCanvas, signalState);
        }
    };
    signalCanvas.onmouseup = function(e) {
        if (isBoxZooming && boxZoomTarget === "signal" && boxZoomStart && boxZoomEnd) {
            isBoxZooming = false;
            applyBoxZoomSignal(boxZoomStart, boxZoomEnd);
            boxZoomStart = null;
            boxZoomEnd = null;
            boxZoomTarget = null;
        } else {
            stopDrag(signalState);
        }
    };
    signalCanvas.onmouseleave = function() {
        if (isBoxZooming && boxZoomTarget === "signal") {
            isBoxZooming = false;
            boxZoomStart = null;
            boxZoomEnd = null;
            boxZoomTarget = null;
            plotAll();
        }
        stopDrag(signalState);
    };

    // FFT box zoom
    fftCanvas.onmousedown = function(e) {
        if (e.ctrlKey) {
            isBoxZooming = true;
            boxZoomTarget = "fft";
            const rect = fftCanvas.getBoundingClientRect();
            boxZoomStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            boxZoomEnd = null;
        } else {
            startDrag(e, fftState);
        }
    };
    fftCanvas.onmousemove = function(e) {
        if (isBoxZooming && boxZoomTarget === "fft") {
            const rect = fftCanvas.getBoundingClientRect();
            boxZoomEnd = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            plotAll();
        } else {
            drag(e, fftCanvas, fftState);
        }
    };
    fftCanvas.onmouseup = function(e) {
        if (isBoxZooming && boxZoomTarget === "fft" && boxZoomStart && boxZoomEnd) {
            isBoxZooming = false;
            applyBoxZoomFFT(boxZoomStart, boxZoomEnd);
            boxZoomStart = null;
            boxZoomEnd = null;
            boxZoomTarget = null;
        } else {
            stopDrag(fftState);
        }
    };
    fftCanvas.onmouseleave = function() {
        if (isBoxZooming && boxZoomTarget === "fft") {
            isBoxZooming = false;
            boxZoomStart = null;
            boxZoomEnd = null;
            boxZoomTarget = null;
            plotAll();
        }
        stopDrag(fftState);
    };
}

// Generate a default signal on page load
window.addEventListener('DOMContentLoaded', () => {
    generateSignal();
});