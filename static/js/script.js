// Updated signal plotting and UI logic for single combined canvas

let signalData = null;
let fftMagnitudes = null;
let fftFreqAxis = null;
let overlays = [];

let timeZoom = 1;
let timePan = 0;
let fftZoom = 1;
let fftPan = 0;

window.addEventListener('DOMContentLoaded', () => {
    generateSignal();
    setupCanvasEvents();
});

function generateSignal() {
    const frequency = parseFloat(document.getElementById('frequency').value);
    const points = parseInt(document.getElementById('points').value);
    const noise = parseFloat(document.getElementById('noise').value);
    const signalType = document.getElementById('signalType').value;
    const customFormula = document.getElementById('customFormula').value;

    fetch('/api/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency, points, noise, signalType, customFormula })
    })
    .then(response => response.json())
    .then(data => {
        signalData = new Float32Array(data.signal);
        fftMagnitudes = new Float32Array(data.fft);
        fftFreqAxis = new Float32Array(data.freq_axis);
        console.log("Signal/FFT loaded", signalData.length);
        plotAll();
    })
    .catch(err => alert('Error: ' + err));
}

function plotAll() {
    const canvas = document.getElementById('combinedCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;
    const halfHeight = height / 2;

    // Plot overlays if any
    overlays.forEach(ov => {
        drawSignal(ctx, ov.signal, width, halfHeight, 0, timeZoom, timePan, '#ff8800');
        drawFFT(ctx, ov.fft, ov.freq, width, halfHeight, halfHeight, fftZoom, fftPan, '#ff8800');
    });

    drawSignal(ctx, signalData, width, halfHeight, 0, timeZoom, timePan, '#007bff');
    drawFFT(ctx, fftMagnitudes, fftFreqAxis, width, halfHeight, halfHeight, fftZoom, fftPan, '#007bff');
}

function drawSignal(ctx, data, width, height, yOffset, zoom, pan, color) {
    if (!data) return;
    const margin = 50;
    const plotWidth = width - 2 * margin;
    const plotHeight = height - 2 * margin;
    let minVal = Math.min(...data);
    let maxVal = Math.max(...data);
    let range = maxVal - minVal || 1;

    ctx.save();
    ctx.translate(0, yOffset);

    ctx.beginPath();
    ctx.strokeStyle = '#000';
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, height - margin);
    ctx.lineTo(width - margin, height - margin);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    const N = data.length;
    for (let i = 0; i < N; i++) {
        const t = (i / N - 0.5 - pan) / zoom + 0.5;
        if (t < 0 || t > 1) continue;
        const x = margin + t * plotWidth;
        const y = height - margin - ((data[i] - minVal) / range * plotHeight);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
}

function drawFFT(ctx, data, freqAxis, width, height, yOffset, zoom, pan, color) {
    if (!data || !freqAxis) return;
    const margin = 50;
    const plotWidth = width - 2 * margin;
    const plotHeight = height - 2 * margin;
    let fCenter = parseFloat(document.getElementById('frequency').value) || 0;
    let fMin = Math.max(0, fCenter - 10 * zoom + pan);
    let fMax = fCenter + 10 * zoom + pan;

    ctx.save();
    ctx.translate(0, yOffset);

    ctx.beginPath();
    ctx.strokeStyle = '#000';
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, height - margin);
    ctx.lineTo(width - margin, height - margin);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let i = 0; i < freqAxis.length; i++) {
        const f = freqAxis[i];
        if (f < fMin || f > fMax) continue;
        const x = margin + ((f - fMin) / (fMax - fMin)) * plotWidth;
        const y = height - margin - (data[i] * plotHeight);
        if (i === 0 || x < margin) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
}

function setupCanvasEvents() {
    const canvas = document.getElementById('combinedCanvas');

    canvas.addEventListener('wheel', function(e) {
        e.preventDefault();
        const y = e.offsetY;
        if (y < canvas.height / 2) {
            timeZoom += e.deltaY > 0 ? 0.1 : -0.1;
            timeZoom = Math.max(0.5, Math.min(timeZoom, 10));
        } else {
            fftZoom += e.deltaY > 0 ? 0.1 : -0.1;
            fftZoom = Math.max(0.5, Math.min(fftZoom, 10));
        }
        plotAll();
    });

    canvas.addEventListener('mousedown', function(e) {
        this.isDragging = true;
        this.lastX = e.clientX;
        this.dragRegion = e.offsetY < canvas.height / 2 ? 'time' : 'fft';
    });

    canvas.addEventListener('mousemove', function(e) {
        if (this.isDragging) {
            const dx = (e.clientX - this.lastX) / 100;
            if (this.dragRegion === 'time') {
                timePan += dx * timeZoom;
            } else {
                fftPan += dx * fftZoom * 2;
            }
            this.lastX = e.clientX;
            plotAll();
        }
    });

    canvas.addEventListener('mouseup', () => { canvas.isDragging = false; });
    canvas.addEventListener('mouseleave', () => { canvas.isDragging = false; });
}

function addOverlay() {
    if (!signalData || !fftMagnitudes || !fftFreqAxis) return;
    overlays.push({
        signal: new Float32Array(signalData),
        fft: new Float32Array(fftMagnitudes),
        freq: new Float32Array(fftFreqAxis)
    });
    alert('Overlay added!');
}

function resetZoom() {
    timeZoom = 1;
    timePan = 0;
    fftZoom = 1;
    fftPan = 0;
    plotAll();
}
