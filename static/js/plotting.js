// plotting.js
import { state } from './state.js'; // Update to named import

export function plotAll() {
    const canvas = document.getElementById('combinedCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const width = canvas.width;
    const height = canvas.height;
    const halfHeight = height / 2;

    state.overlays.forEach(ov => {
        drawSignal(ctx, ov.signal, width, halfHeight, 0, state.timeZoom, state.timePan, '#ff8800');
        drawFFT(ctx, ov.fft, ov.freq, width, halfHeight, halfHeight, state.fftZoom, state.fftPan, '#ff8800');
    });

    drawSignal(ctx, state.signalData, width, halfHeight, 0, state.timeZoom, state.timePan, '#007bff');
    drawFFT(ctx, state.fftMagnitudes, state.fftFreqAxis, width, halfHeight, halfHeight, state.fftZoom, state.fftPan, '#007bff');

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

export function drawSignal(ctx, data, width, height, yOffset, zoom, pan, color) {
    if (!data || data.length === 0) return;
    const margin = 40;
    const plotWidth = width - 2 * margin;
    const plotHeight = height - 2 * margin;

    let minVal = data[0], maxVal = data[0];
    for (let i = 1; i < data.length; i++) {
        if (data[i] < minVal) minVal = data[i];
        if (data[i] > maxVal) maxVal = data[i];
    }
    let range = maxVal - minVal || 1;
    if (range === 1) { minVal -= 0.5; maxVal += 0.5; }

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
        i === 0 || x <= margin ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
}

export function drawFFT(ctx, data, freqAxis, width, height, yOffset, zoom, pan, color) {
    if (!data || !freqAxis || data.length === 0) return;
    const margin = 50;
    const plotWidth = width - 2 * margin;
    const plotHeight = height - 2 * margin;

    let fCenter = parseFloat(document.getElementById('frequency').value) || 0;
    let fMin = Math.max(0, fCenter - 10 * zoom + pan);
    let fMax = fCenter + 10 * zoom + pan;
    let freqRange = fMax - fMin || (fCenter ? 2 : 1);
    if (freqRange === 2 || freqRange === 1) {
        fMin = fCenter - (fCenter ? 1 : 1);
        fMax = fCenter + 1;
    }

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
        (i === 0 || freqAxis[i-1] < fMin || x < margin) ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
}