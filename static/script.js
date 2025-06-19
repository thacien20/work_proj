let signalData = null;
let fftMagnitudes = null;
let fftFreqAxis = null;
let signalState = { zoom: 1, pan: 0, isDragging: false, lastX: 0 };
let fftState = { zoom: 1, pan: 0, isDragging: false, lastX: 0 };
let eventsSetup = false;
let overlays = [];
let isBoxZooming = false;
let boxZoomStart = null;
let boxZoomEnd = null;
let boxZoomTarget = null; // "time" or "fft"

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
        if (data.error) {
            console.error('Error:', data.error);
            return;
        }
        signalData = new Float32Array(data.signal);
        fftMagnitudes = new Float32Array(data.fft);
        fftFreqAxis = new Float32Array(data.freq_axis);
        plotAll();
        if (!eventsSetup) {
            setupCanvasEvents();
            eventsSetup = true;
        }
    })
    .catch(err => console.error('Error:', err));
}

function plotAll() {
    const combinedCanvas = document.getElementById('combinedCanvas');
    const ctx = combinedCanvas.getContext('2d');
    ctx.clearRect(0, 0, combinedCanvas.width, combinedCanvas.height);

    const totalHeight = combinedCanvas.height;
    const width = combinedCanvas.width;
    const subplotHeight = totalHeight / 2;
    const margin = 50;

    // Time domain (top half)
    const timeMin = signalState.pan - 0.5 / signalState.zoom;
    const timeMax = signalState.pan + 0.5 / signalState.zoom;
    plotSignalCombined(ctx, width, subplotHeight, signalData, 'Time (s)', 'Amplitude', signalState.zoom, signalState.pan, 0, '#007bff', timeMin, timeMax);
    overlays.forEach(ov => plotSignalCombined(ctx, width, subplotHeight, ov.signal, '', '', signalState.zoom, signalState.pan, 0, '#ff8800', timeMin, timeMax));

    // FFT plot (bottom half)
    const frequency = parseFloat(document.getElementById('frequency').value);
    const fMin = Math.max(0, frequency - 10 * fftState.zoom + fftState.pan);
    const fMax = frequency + 10 * fftState.zoom + fftState.pan;
    plotFFTCombined(ctx, width, subplotHeight, fftMagnitudes, fftFreqAxis, fMin, fMax, subplotHeight, '#007bff');
    overlays.forEach(ov => plotFFTCombined(ctx, width, subplotHeight, ov.fft, ov.freq, fMin, fMax, subplotHeight, '#ff8800'));

    // Draw zoom box if active
    if (isBoxZooming && boxZoomStart && boxZoomEnd) {
        drawZoomRect(combinedCanvas, boxZoomStart, boxZoomEnd);
    }
}

function plotSignalCombined(ctx, width, height, data, xLabel, yLabel, zoom, pan, yOffset, color, timeMin, timeMax) {
    const margin = 50;
    const plotWidth = width - 2 * margin;
    const plotHeight = height - 2 * margin;
    const minVal = Math.min(...data, -1);
    const maxVal = Math.max(...data, 1);
    const range = maxVal - minVal || 1;

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
    if (xLabel) ctx.fillText(xLabel, width / 2, height - 10);
    if (yLabel) {
        ctx.save();
        ctx.translate(margin - 30, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(yLabel, 0, 0);
        ctx.restore();
    }

    // X ticks (adjusted for zoom)
    for (let i = 0; i <= 5; i++) {
        const t = timeMin + (i / 5) * (timeMax - timeMin);
        const x = margin + (i / 5) * plotWidth;
        ctx.beginPath();
        ctx.moveTo(x, height - margin);
        ctx.lineTo(x, height - margin + 5);
        ctx.stroke();
        ctx.fillText(t.toFixed(2), x, height - margin + 15);
    }
    // Y ticks
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const yVal = minVal + (i * range / 5);
        const y = height - margin - ((yVal - minVal) / range * plotHeight);
        ctx.beginPath();
        ctx.moveTo(margin - 5, y);
        ctx.lineTo(margin, y);
        ctx.stroke();
        ctx.fillText(yVal.toFixed(2), margin - 15, y + 4);
    }

    // Plot data
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    const N = data.length;
    for (let i = 0; i < N; i++) {
        const t = i / N;
        if (t < timeMin || t > timeMax) continue;
        const tView = (t - timeMin) / (timeMax - timeMin);
        const x = margin + tView * plotWidth;
        const y = height - margin - ((data[i] - minVal) / range * plotHeight);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
}

function plotFFTCombined(ctx, width, height, magnitudes, freqAxis, fMin, fMax, yOffset, color) {
    const margin = 50;
    const plotWidth = width - 2 * margin;
    const plotHeight = height - 2 * margin;

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
    ctx.fillText('Frequency (Hz)', width / 2, height - 10);
    ctx.save();
    ctx.translate(margin - 30, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Magnitude', 0, 0);
    ctx.restore();

    // X ticks
    for (let i = 0; i <= 5; i++) {
        const freq = fMin + (i * (fMax - fMin) / 5);
        const x = margin + i * plotWidth / 5;
        ctx.beginPath();
        ctx.moveTo(x, height - margin);
        ctx.lineTo(x, height - margin + 5);
        ctx.stroke();
        ctx.fillText(freq.toFixed(1) + ' Hz', x, height - margin + 15);
    }
    // Y ticks
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const yVal = i / 5;
        const y = height - margin - yVal * plotHeight;
        ctx.beginPath();
        ctx.moveTo(margin - 5, y);
        ctx.lineTo(margin, y);
        ctx.stroke();
        ctx.fillText(yVal.toFixed(2), margin - 15, y + 4);
    }

    // Plot FFT
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    let startIdx = 0, endIdx = freqAxis.length;
    for (let i = 0; i < freqAxis.length; i++) if (freqAxis[i] >= fMin) { startIdx = i; break; }
    for (let i = freqAxis.length - 1; i >= 0; i--) if (freqAxis[i] <= fMax) { endIdx = i + 1; break; }
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
    ctx.strokeStyle = 'rgba(0, 123, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6]);
    ctx.strokeRect(
        Math.min(start.x, end.x),
        Math.min(start.y, end.y),
        Math.abs(end.x - end.x),
        Math.abs(end.y - start.y)
    );
    ctx.restore();
}

function applyBoxZoom(start, end, target) {
    const combinedCanvas = document.getElementById('combinedCanvas');
    const rect = combinedCanvas.getBoundingClientRect();
    const margin = 50;
    const plotWidth = combinedCanvas.width - 2 * margin;
    const totalHeight = combinedCanvas.height;
    const subplotHeight = totalHeight / 2;

    if (target === 'time') {
        const yMin = 0;
        const yMax = subplotHeight;
        if (start.y >= yMin && end.y <= yMax) {
            const tMin = signalState.pan - 0.5 / signalState.zoom;
            const tMax = signalState.pan + 0.5 / signalState.zoom;
            const xMin = Math.max(margin, Math.min(start.x, end.x) - rect.left);
            const xMax = Math.min(combinedCanvas.width - margin, Math.max(start.x, end.x) - rect.left);
            const newTMin = tMin + ((xMin - margin) / plotWidth) * (tMax - tMin);
            const newTMax = tMin + ((xMax - margin) / plotWidth) * (tMax - tMin);
            signalState.pan = (newTMin + newTMax) / 2;
            signalState.zoom = (tMax - tMin) / (newTMax - newTMin) || 1;
        }
    } else if (target === 'fft') {
        const yMin = subplotHeight;
        const yMax = totalHeight;
        if (start.y >= yMin && end.y <= yMax) {
            const frequency = parseFloat(document.getElementById('frequency').value);
            const fMin0 = Math.max(0, frequency - 10 * fftState.zoom + fftState.pan);
            const fMax0 = frequency + 10 * fftState.zoom + fftState.pan;
            const xMin = Math.max(margin, Math.min(start.x, end.x) - rect.left);
            const xMax = Math.min(combinedCanvas.width - margin, Math.max(start.x, end.x) - rect.left);
            const newFMin = fMin0 + ((xMin - margin) / plotWidth) * (fMax0 - fMin0);
            const newFMax = fMin0 + ((xMax - margin) / plotWidth) * (fMax0 - fMin0);
            fftState.pan = (newFMin + newFMax) / 2 - frequency;
            fftState.zoom = (fMax0 - fMin0) / (newFMax - newFMin) || 1;
        }
    }
    plotAll();
    isBoxZooming = false;
    boxZoomStart = null;
    boxZoomEnd = null;
}

function setupCanvasEvents() {
    const combinedCanvas = document.getElementById('combinedCanvas');
    if (!combinedCanvas) return;

    combinedCanvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = combinedCanvas.getBoundingClientRect();
        const y = e.clientY - rect.top;
        if (y < combinedCanvas.height / 2) {
            signalState.zoom *= e.deltaY > 0 ? 0.9 : 1.1;
            signalState.zoom = Math.max(1, Math.min(signalState.zoom, 20));
        } else {
            fftState.zoom *= e.deltaY > 0 ? 0.9 : 1.1;
            fftState.zoom = Math.max(1, Math.min(fftState.zoom, 20));
        }
        plotAll();
    });

    combinedCanvas.addEventListener('mousedown', (e) => {
        const rect = combinedCanvas.getBoundingClientRect();
        const y = e.clientY - rect.top;
        if (e.button === 0 && !signalState.isDragging && !fftState.isDragging) { // Left click
            isBoxZooming = true;
            boxZoomStart = { x: e.clientX, y: e.clientY };
            boxZoomTarget = y < combinedCanvas.height / 2 ? 'time' : 'fft';
        } else {
            signalState.isDragging = true;
            signalState.lastX = e.clientX;
            fftState.isDragging = true;
            fftState.lastX = e.clientX;
        }
    });

    combinedCanvas.addEventListener('mousemove', (e) => {
        if (isBoxZooming && boxZoomStart) {
            boxZoomEnd = { x: e.clientX, y: e.clientY };
            plotAll();
        } else if (signalState.isDragging || fftState.isDragging) {
            const dx = (e.clientX - signalState.lastX) / 100;
            signalState.pan += dx * signalState.zoom;
            fftState.pan += dx * fftState.zoom * 2;
            signalState.lastX = e.clientX;
            fftState.lastX = e.clientX;
            plotAll();
        }
    });

    combinedCanvas.addEventListener('mouseup', (e) => {
        if (isBoxZooming && boxZoomStart && boxZoomEnd) {
            applyBoxZoom(boxZoomStart, boxZoomEnd, boxZoomTarget);
        }
        signalState.isDragging = false;
        fftState.isDragging = false;
        isBoxZooming = false;
        boxZoomStart = null;
        boxZoomEnd = null;
    });

    combinedCanvas.addEventListener('mouseleave', () => {
        signalState.isDragging = false;
        fftState.isDragging = false;
        if (isBoxZooming) {
            isBoxZooming = false;
            boxZoomStart = null;
            boxZoomEnd = null;
            plotAll();
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    generateSignal();
});

function exportCSV() {
    if (!signalData || !fftMagnitudes || !fftFreqAxis) return;
    let csv = 'Time,Signal,Frequency,FFT\n';
    const N = signalData.length;
    for (let i = 0; i < N; i++) {
        const t = i / N;
        const freq = fftFreqAxis[i] || '';
        const fft = fftMagnitudes[i] || '';
        csv += `${t},${signalData[i]},${freq},${fft}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'signal_fft.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const lines = e.target.result.split(/\r?\n/);
        let sig = [], fft = [], freq = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            if (cols.length >= 4) {
                sig.push(parseFloat(cols[1]));
                freq.push(parseFloat(cols[2]));
                fft.push(parseFloat(cols[3]));
            }
        }
        signalData = new Float32Array(sig);
        fftMagnitudes = new Float32Array(fft);
        fftFreqAxis = new Float32Array(freq);
        plotAll();
    };
    reader.readAsText(file);
}

function addOverlay() {
    if (!signalData || !fftMagnitudes || !fftFreqAxis) return;
    overlays.push({
        signal: new Float32Array(signalData),
        fft: new Float32Array(fftMagnitudes),
        freq: new Float32Array(fftFreqAxis)
    });
    alert('Overlay added! Generate a new signal to compare.');
}