// plotting.js
import { state } from './state.js';

// Add zoom state variables
let isDrawing = false;
let startX, startY, endX, endY;
const maxZoom = 100; // Maximum zoom level (adjust as needed)
let zoomRectColor = 'rgba(0, 128, 255, 0.3)';

export function plotAll() {
    const canvas = document.getElementById('combinedCanvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const width = canvas.width;
    const height = canvas.height;
    const halfHeight = height / 2;
    const leftMargin = 80;
    const rightMargin = 40;
    const topMargin = 40;
    const bottomMargin = 40;

    // Draw overlays
    state.overlays.forEach(ov => {
        drawSignal(ctx, ov.signal, width, halfHeight, 0, state.timeZoom, state.timePan, '#ff8800', ov.time_axis || state.time_axis, leftMargin, rightMargin, topMargin, bottomMargin);
        drawFFT(ctx, ov.fft, ov.freq, width, halfHeight, halfHeight, state.fftZoom, state.fftPan, '#ff8800', leftMargin, rightMargin, topMargin, bottomMargin);
    });

    // Draw main signal and FFT
    drawSignal(ctx, state.signalData, width, halfHeight, 0, state.timeZoom, state.timePan, '#007bff', state.time_axis, leftMargin, rightMargin, topMargin, bottomMargin);
    drawFFT(ctx, state.fftMagnitudes, state.fftFreqAxis, width, halfHeight, halfHeight, state.fftZoom, state.fftPan, '#007bff', leftMargin, rightMargin, topMargin, bottomMargin);

    // Draw zoom rectangle if active
    if (isDrawing) {
        ctx.fillStyle = zoomRectColor;
        const rectX = Math.min(startX, endX);
        const rectY = Math.min(startY, endY);
        const rectWidth = Math.abs(endX - startX);
        const rectHeight = Math.abs(endY - startY);
        ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
    }

    // Add axis labels
    ctx.save();
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#000";
    ctx.fillText("Time (s)", width / 2, height / 2 - 10);
    ctx.translate(20, height / 4);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "#fff";
    ctx.fillRect(-40, -18, 80, 28);
    ctx.fillStyle = "#000";
    ctx.fillText("Intensity", 0, 0);
    ctx.restore();

    ctx.save();
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#000";
    ctx.fillText("Frequency (Hz)", width / 2, height - 10);
    ctx.translate(20, height * 3 / 4);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "#fff";
    ctx.fillRect(-40, -18, 80, 28);
    ctx.fillStyle = "#000";
    ctx.fillText("Magnitude", 0, 0);
    ctx.restore();
}

// Initialize zoom functionality
export function initZoom(canvas) {
    if (!canvas) return;

    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
        isDrawing = true;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const rect = canvas.getBoundingClientRect();
        endX = e.clientX - rect.left;
        endY = e.clientY - rect.top;
        plotAll(); // Redraw to update zoom rectangle
    });

    canvas.addEventListener('mouseup', (e) => {
        if (!isDrawing) return;
        isDrawing = false;
        const rect = canvas.getBoundingClientRect();
        endX = e.clientX - rect.left;
        endY = e.clientY - rect.top;

        // Process zoom
        handleZoom(canvas, startX, startY, endX, endY);
        plotAll();
    });

    // Add reset zoom on double-click
    canvas.addEventListener('dblclick', () => {
        state.timeZoom = 1;
        state.timePan = null;
        state.fftZoom = 1;
        state.fftPan = null;
        plotAll();
    });
}

function handleZoom(canvas, x1, y1, x2, y2) {
    const width = canvas.width;
    const height = canvas.height;
    const halfHeight = height / 2;
    const leftMargin = 80;
    const rightMargin = 40;
    const topMargin = 40;
    const bottomMargin = 40;
    const plotWidth = width - leftMargin - rightMargin;
    const plotHeight = halfHeight - topMargin - bottomMargin;

    // Determine which plot was selected (time or frequency)
    const isTimeDomain = y1 < halfHeight && y2 < halfHeight;
    const isFreqDomain = y1 > halfHeight && y2 > halfHeight;

    if (!isTimeDomain && !isFreqDomain) return; // Ignore if rectangle spans both domains

    // Normalize coordinates
    const minX = Math.max(Math.min(x1, x2), leftMargin);
    const maxX = Math.min(Math.max(x1, x2), width - rightMargin);
    if (maxX <= minX) return; // Ignore invalid rectangle

    const normalizedStartX = (minX - leftMargin) / plotWidth;
    const normalizedEndX = (maxX - leftMargin) / plotWidth;

    if (isTimeDomain) {
        // Time domain zoom
        const timeAxis = state.time_axis;
        const minTime = timeAxis[0];
        const maxTime = timeAxis[timeAxis.length - 1];
        const timeRange = maxTime - minTime;

        // Current visible range
        const currentVisibleRange = timeRange / state.timeZoom;
        const currentCenter = state.timePan || (minTime + maxTime) / 2;
        const currentTStart = currentCenter - currentVisibleRange / 2;
        const currentTEnd = currentCenter + currentVisibleRange / 2;

        // New time range based on rectangle
        const newTStart = currentTStart + normalizedStartX * currentVisibleRange;
        const newTEnd = currentTStart + normalizedEndX * currentVisibleRange;
        const newVisibleRange = newTEnd - newTStart;

        // Calculate new zoom and pan
        const newZoom = Math.min(timeRange / newVisibleRange, maxZoom);
        const newPan = newTStart + newVisibleRange / 2;

        state.timeZoom = newZoom;
        state.timePan = newPan;
    } else {
        // Frequency domain zoom
        const freqAxis = state.fftFreqAxis;
        const minFreq = freqAxis[0];
        const maxFreq = freqAxis[freqAxis.length - 1];
        const freqRange = maxFreq - minFreq;

        // Current visible range
        const currentVisibleRange = freqRange / state.fftZoom;
        const currentCenter = state.fftPan || (minFreq + maxFreq) / 2;
        const currentFStart = currentCenter - currentVisibleRange / 2;
        const currentFEnd = currentCenter + currentVisibleRange / 2;

        // New frequency range based on rectangle
        const newFStart = currentFStart + normalizedStartX * currentVisibleRange;
        const newFEnd = currentFStart + normalizedEndX * currentVisibleRange;
        const newVisibleRange = newFEnd - newFStart;

        // Calculate new zoom and pan
        const newZoom = Math.min(freqRange / newVisibleRange, maxZoom);
        const newPan = newFStart + newVisibleRange / 2;

        state.fftZoom = newZoom;
        state.fftPan = newPan;
    }
}

export function drawSignal(ctx, data, width, height, yOffset, zoom, pan, color, time_axis, leftMargin=80, rightMargin=40, topMargin=40, bottomMargin=40) {
    if (!data || data.length === 0 || !time_axis || time_axis.length !== data.length) {
        console.warn('Invalid data or time_axis in drawSignal');
        return;
    }
    const plotWidth = width - leftMargin - rightMargin;
    const plotHeight = height - topMargin - bottomMargin;

    let minVal = Math.min(...data);
    let maxVal = Math.max(...data);
    let range = maxVal - minVal || 1;
    if (range === 0) { minVal -= 0.5; maxVal += 0.5; range = 1; }

    ctx.save();
    ctx.translate(0, yOffset);
    ctx.beginPath();
    ctx.strokeStyle = '#000';
    ctx.moveTo(leftMargin, topMargin);
    ctx.lineTo(leftMargin, height - bottomMargin);
    ctx.lineTo(width - rightMargin, height - bottomMargin);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    const N = data.length;
    const minTime = time_axis[0];
    const maxTime = time_axis[N - 1];
    if (maxTime <= minTime) {
        console.warn('Invalid time range in drawSignal');
        return;
    }
    const timeRange = maxTime - minTime;
    const visibleRange = timeRange / zoom;
    const center = pan || (minTime + maxTime) / 2;
    const tStart = center - visibleRange / 2;
    const tEnd = center + visibleRange / 2;

    for (let i = 0; i < N; i++) {
        const t = time_axis[i];
        if (t < tStart || t > tEnd) continue;
        const normalizedT = (t - tStart) / visibleRange;
        const x = leftMargin + normalizedT * plotWidth;
        const y = height - bottomMargin - ((data[i] - minVal) / range * plotHeight);
        if (i === 0 || x <= leftMargin) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // X-axis ticks (Time)
    ctx.font = "12px Arial";
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    const numTicks = 5;
    for (let k = 0; k <= numTicks; k++) {
        const t = tStart + (k / numTicks) * visibleRange;
        const x = leftMargin + (k / numTicks) * plotWidth;
        if (x >= leftMargin && x <= width - rightMargin) {
            ctx.beginPath();
            ctx.moveTo(x, height - bottomMargin);
            ctx.lineTo(x, height - bottomMargin + 5);
            ctx.stroke();
            ctx.fillText(t.toFixed(2), x, height - bottomMargin + 15);
        }
    }

    // Y-axis ticks (Intensity)
    ctx.textAlign = "right";
    for (let j = 0; j <= numTicks; j++) {
        const y = height - bottomMargin - (j / numTicks) * plotHeight;
        const intensity = minVal + (j / numTicks) * range;
        if (y >= topMargin && y <= height - bottomMargin) {
            ctx.beginPath();
            ctx.moveTo(leftMargin - 5, y);
            ctx.lineTo(leftMargin, y);
            ctx.stroke();
            ctx.fillText(intensity.toFixed(2), leftMargin - 10, y + 4);
        }
    }

    ctx.restore();
}
export function drawFFT(ctx, data, freqAxis, width, height, yOffset, zoom, pan, color, leftMargin=80, rightMargin=40, topMargin=40, bottomMargin=40) {
    if (!data || !freqAxis || data.length === 0) {
        console.warn('Invalid data or freqAxis in drawFFT');
        return;
    }
    const plotWidth = width - leftMargin - rightMargin;
    const plotHeight = height - topMargin - bottomMargin;
    const fCenter = pan || ((Math.min(...freqAxis) + Math.max(...freqAxis)) / 2);
    const freqRange = Math.max(...freqAxis) - Math.min(...freqAxis) || 1;
    const visibleRange = freqRange / zoom;
    const fStart = fCenter - visibleRange / 2;
    const fEnd = fCenter + visibleRange / 2;

    // Calculate maximum magnitude in visible range, ignoring DC
    const visibleIndices = freqAxis.map((f, i) => f >= fStart && f <= fEnd ? i : -1).filter(i => i !== -1);
    let maxMag = 1;
    if (visibleIndices.length > 1) {
        const nonDCIndices = visibleIndices.filter(i => i > 0);
        maxMag = nonDCIndices.length > 0 ? Math.max(...nonDCIndices.map(i => data[i])) : Math.max(...visibleIndices.map(i => data[i]));
    } else if (visibleIndices.length === 1) {
        maxMag = data[visibleIndices[0]];
    }
    if (maxMag === 0) maxMag = 1;

    ctx.save();
    ctx.translate(0, yOffset);
    ctx.beginPath();
    ctx.strokeStyle = '#000';
    let minY = height - bottomMargin;
    let maxY = topMargin;
    if (visibleIndices.length > 0) {
        let minMag = Math.min(...visibleIndices.map(i => data[i]));
        let maxMagVis = Math.max(...visibleIndices.map(i => data[i]));
        minY = height - bottomMargin - ((minMag / maxMag) * plotHeight);
        maxY = height - bottomMargin - ((maxMagVis / maxMag) * plotHeight);
    }
    ctx.moveTo(leftMargin, maxY);
    ctx.lineTo(leftMargin, minY);
    ctx.lineTo(width - rightMargin, minY);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let i = 0; i < freqAxis.length; i++) {
        const f = freqAxis[i];
        if (f < fStart || f > fEnd) continue;
        const normalizedF = (f - fStart) / visibleRange;
        const x = leftMargin + normalizedF * plotWidth;
        const y = height - bottomMargin - ((data[i] / maxMag) * plotHeight);
        if (i === 0 || x <= leftMargin || freqAxis[i-1] < fStart) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // X-axis ticks (Frequency)
    ctx.font = "12px Arial";
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    const numFreqTicks = 5;
    for (let k = 0; k <= numFreqTicks; k++) {
        const f = fStart + (k / numFreqTicks) * visibleRange;
        const x = leftMargin + (k / numFreqTicks) * plotWidth; // Fixed: Replaced numTicks with numFreqTicks
        if (x >= leftMargin && x <= width - rightMargin) {
            ctx.beginPath();
            ctx.moveTo(x, height - bottomMargin);
            ctx.lineTo(x, height - bottomMargin + 5);
            ctx.stroke();
            ctx.fillText(f.toFixed(2), x, height - bottomMargin + 15);
        }
    }

    // Y-axis ticks (Magnitude)
    ctx.textAlign = "right";
    for (let j = 0; j <= numFreqTicks; j++) {
        const y = height - bottomMargin - (j / numFreqTicks) * plotHeight;
        const mag = (j / numFreqTicks) * maxMag;
        if (y >= topMargin && y <= height - bottomMargin) {
            ctx.beginPath();
            ctx.moveTo(leftMargin - 5, y);
            ctx.lineTo(leftMargin, y);
            ctx.stroke();
            ctx.fillText(mag.toFixed(2), leftMargin - 10, y + 4);
        }
    }

    ctx.restore();
}