// plotting.js
import { state } from './state.js';

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

    // Draw overlays
    state.overlays.forEach(ov => {
        drawSignal(ctx, ov.signal, width, halfHeight, 0, state.timeZoom, state.timePan, '#ff8800', ov.time_axis || state.time_axis);
        drawFFT(ctx, ov.fft, ov.freq, width, halfHeight, halfHeight, state.fftZoom, state.fftPan, '#ff8800');
    });

    // Draw main signal and FFT
    drawSignal(ctx, state.signalData, width, halfHeight, 0, state.timeZoom, state.timePan, '#007bff', state.time_axis);
    drawFFT(ctx, state.fftMagnitudes, state.fftFreqAxis, width, halfHeight, halfHeight, state.fftZoom, state.fftPan, '#007bff');

    // Add axis labels
    ctx.save();
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#000";
    ctx.fillText("Time (s)", width / 2, height / 2 - 10);
    ctx.restore();

    ctx.save();
    ctx.translate(15, height / 4);
    ctx.rotate(-Math.PI / 2);
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Intensity", 0, 0);
    ctx.restore();

    ctx.save();
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#000";
    ctx.fillText("Frequency (Hz)", width / 2, height - 10);
    ctx.restore();

    ctx.save();
    ctx.translate(15, height * 3 / 4);
    ctx.rotate(-Math.PI / 2);
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Magnitude", 0, 0);
    ctx.restore();
}

export function drawSignal(ctx, data, width, height, yOffset, zoom, pan, color, time_axis) {
    if (!data || data.length === 0 || !time_axis || time_axis.length !== data.length) {
        console.warn('Invalid data or time_axis in drawSignal');
        return;
    }
    const margin = 40;
    const plotWidth = width - 2 * margin;
    const plotHeight = height - 2 * margin;

    let minVal = Math.min(...data);
    let maxVal = Math.max(...data);
    let range = maxVal - minVal || 1;
    if (range === 0) { minVal -= 0.5; maxVal += 0.5; range = 1; }

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
    const minTime = time_axis[0];
    const maxTime = time_axis[N - 1];
    if (maxTime <= minTime) {
        console.warn('Invalid time range in drawSignal');
        return;
    }
    const timeRange = maxTime - minTime;
    for (let i = 0; i < N; i++) {
        const t = time_axis[i];
        const normalizedT = (t - minTime) / timeRange;
        const adjustedT = (normalizedT - pan) / zoom;
        if (adjustedT < 0 || adjustedT > 1) continue;
        const x = margin + adjustedT * plotWidth;
        const y = height - margin - ((data[i] - minVal) / range * plotHeight);
        if (i === 0 || x <= margin) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Add x-axis tick marks (Time)
    ctx.font = "12px Arial";
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    const numTicks = 5;
    for (let k = 0; k <= numTicks; k++) {
        const t = minTime + (k / numTicks) * timeRange;
        const x = margin + (t - minTime) / timeRange * plotWidth;
        if (x >= margin && x <= width - margin) {
            ctx.beginPath();
            ctx.moveTo(x, height - margin);
            ctx.lineTo(x, height - margin + 5);
            ctx.stroke();
            ctx.fillText(t.toFixed(2), x, height - margin + 15);
        }
    }

    // Add y-axis tick marks (Intensity)
    ctx.textAlign = "right";
    for (let j = 0; j <= numTicks; j++) {
        const y = height - margin - (j / numTicks) * plotHeight;
        const intensity = minVal + (j / numTicks) * range;
        if (y >= margin && y <= height - margin) {
            ctx.beginPath();
            ctx.moveTo(margin - 5, y);
            ctx.lineTo(margin, y);
            ctx.stroke();
            ctx.fillText(intensity.toFixed(2), margin - 10, y + 4);
        }
    }

    ctx.restore();
}

export function drawFFT(ctx, data, freqAxis, width, height, yOffset, zoom, pan, color) {
    if (!data || !freqAxis || data.length === 0) {
        console.warn('Invalid data or freqAxis in drawFFT');
        return;
    }
    const margin = 50;
    const plotWidth = width - 2 * margin;
    const plotHeight = height - 2 * margin;

    // Use input frequency, fallback to stored frequency or state.fs / 4
    let fCenter = parseFloat(document.getElementById('frequency')?.value) || state.frequency || (state.fs ? state.fs / 4 : 0);
    if (isNaN(fCenter) && state.fs) fCenter = state.fs / 4; // Fallback only if no valid input
    let fMin = Math.max(0, fCenter - 10 * zoom + pan);
    let fMax = fCenter + 10 * zoom + pan;
    let freqRange = fMax - fMin || 1;
    if (freqRange <= 0) freqRange = 1;
    if (freqRange === 1) {
        fMin = fCenter - 0.5;
        fMax = fCenter + 0.5;
    }

    console.log('FFT range:', fMin.toFixed(2), 'to', fMax.toFixed(2), 'Center:', fCenter.toFixed(2));
    // Calculate maximum magnitude in visible range
    const visibleIndices = freqAxis.map((f, i) => f >= fMin && f <= fMax ? i : -1).filter(i => i !== -1);
    const maxMag = visibleIndices.length ? Math.max(...visibleIndices.map(i => data[i])) : 1;

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
        const x = margin + ((f - fMin) / freqRange) * plotWidth;
        const y = height - margin - ((data[i] / maxMag) * plotHeight);
        if (i === 0 || x <= margin || freqAxis[i-1] < fMin) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Add x-axis tick marks (Frequency)
    ctx.font = "12px Arial";
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    const numFreqTicks = 5;
    for (let k = 0; k <= numFreqTicks; k++) {
        const f = fMin + (k / numFreqTicks) * freqRange;
        const x = margin + (k / numFreqTicks) * plotWidth;
        if (x >= margin && x <= width - margin) {
            ctx.beginPath();
            ctx.moveTo(x, height - margin);
            ctx.lineTo(x, height - margin + 5);
            ctx.stroke();
            ctx.fillText(f.toFixed(2), x, height - margin + 15);
        }
    }

    // Add y-axis tick marks (Magnitude)
    ctx.textAlign = "right";
    for (let j = 0; j <= numFreqTicks; j++) {
        const y = height - margin - (j / numFreqTicks) * plotHeight;
        const mag = (j / numFreqTicks) * maxMag;
        if (y >= margin && y <= height - margin) {
            ctx.beginPath();
            ctx.moveTo(margin - 5, y);
            ctx.lineTo(margin, y);
            ctx.stroke();
            ctx.fillText(mag.toFixed(2), margin - 10, y + 4);
        }
    }

    ctx.restore();
}