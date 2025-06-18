let signalData = null;
let fftMagnitudes = null;
let fftMaxFreq = null;
let signalState = { zoomX: 1, zoomY: 1, offsetX: 0, offsetY: 0, isDragging: false, lastX: 0, lastY: 0 };
let fftState = { zoomX: 1, zoomY: 1, offsetX: 0, offsetY: 0, isDragging: false, lastX: 0, lastY: 0 };
let eventsSetup = false;

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
        fftMaxFreq = points / 2;
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
    plotSignal(signalCtx, signalCanvas, signalData, signalState, 'Time (s)', 'Amplitude', 1);
    plotSignal(fftCtx, fftCanvas, fftMagnitudes, fftState, 'Frequency (Hz)', 'Magnitude', fftMaxFreq);
}

function plotSignal(ctx, canvas, data, state, xLabel, yLabel, maxX) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let minVal, maxVal, range;
    if (yLabel === 'Magnitude') {
        minVal = 0;
        maxVal = 1;
        range = 1;
    } else {
        maxVal = Math.max(...data, 1);
        minVal = Math.min(...data, -1);
        range = maxVal - minVal || 1;
    }

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

    for (let i = 0; i <= 5; i++) {
        const x = margin + i * plotWidth / 5;
        ctx.beginPath();
        ctx.moveTo(x, canvas.height - margin);
        ctx.lineTo(x, canvas.height - margin + 5);
        ctx.stroke();
        ctx.fillText((i * maxX / 5).toFixed(1), x, canvas.height - margin + 20);
    }
    for (let i = 0; i <= 5; i++) {
        const yVal = minVal + (i * range / 5);
        const y = canvas.height - margin - (yVal - minVal) / range * plotHeight;
        ctx.beginPath();
        ctx.moveTo(margin - 5, y);
        ctx.lineTo(margin, y);
        ctx.stroke();
        ctx.fillText(yVal.toFixed(1), margin - 20, y + 4);
    }

    ctx.beginPath();
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 2;
    const step = plotWidth / (data.length * state.zoomX);
    for (let i = 0; i < data.length; i++) {
        const x = margin + (i + state.offsetX) * step;
        const y = canvas.height - margin - ((data[i] - minVal) / range * plotHeight) / state.zoomY + state.offsetY;
        if (x < margin || x > canvas.width - margin) continue;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
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
    signalState = { zoomX: 1, zoomY: 1, offsetX: 0, offsetY: 0, isDragging: false, lastX: 0, lastY: 0 };
    fftState = { zoomX: 1, zoomY: 1, offsetX: 0, offsetY: 0, isDragging: false, lastX: 0, lastY: 0 };
    plotAll();
}

function setupCanvasEvents() {
    const signalCanvas = document.getElementById('signalCanvas');
    const fftCanvas = document.getElementById('fftCanvas');
    signalCanvas.onwheel = (e) => handleZoom(e, signalCanvas, signalState);
    fftCanvas.onwheel = (e) => handleZoom(e, fftCanvas, fftState);
    signalCanvas.onmousedown = (e) => startDrag(e, signalState);
    signalCanvas.onmousemove = (e) => drag(e, signalCanvas, signalState);
    signalCanvas.onmouseup = () => stopDrag(signalState);
    signalCanvas.onmouseleave = () => stopDrag(signalState);
    fftCanvas.onmousedown = (e) => startDrag(e, fftState);
    fftCanvas.onmousemove = (e) => drag(e, fftCanvas, fftState);
    fftCanvas.onmouseup = () => stopDrag(fftState);
    fftCanvas.onmouseleave = () => stopDrag(fftState);
}

// Optionally, generate a default signal on page load
window.addEventListener('DOMContentLoaded', () => {
    generateSignal();
});