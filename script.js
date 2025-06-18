// State for zoom and pan
let signalState = { zoomX: 1, zoomY: 1, offsetX: 0, offsetY: 0, isDragging: false, lastX: 0, lastY: 0 };
let fftState = { zoomX: 1, zoomY: 1, offsetX: 0, offsetY: 0, isDragging: false, lastX: 0, lastY: 0 };

function isPowerOfTwo(n) {
    return n > 0 && (n & (n - 1)) === 0;
}

function generateSignal() {
    const frequency = parseFloat(document.getElementById('frequency').value);
    const points = parseInt(document.getElementById('points').value);
    const noise = parseFloat(document.getElementById('noise').value);

    // Input validation
    if (!frequency || !points || !noise) {
        alert('Please fill in all fields.');
        return;
    }
    if (frequency < 0.1 || frequency > 100) {
        alert('Frequency must be between 0.1 and 100 Hz.');
        return;
    }
    if (!isPowerOfTwo(points) || points < 64 || points > 8192) {
        alert('Number of points must be a power of 2 between 64 and 8192.');
        return;
    }
    if (noise < 0 || noise > 1) {
        alert('Noise level must be between 0 and 1.');
        return;
    }

    // Canvas setup
    const signalCanvas = document.getElementById('signalCanvas');
    const fftCanvas = document.getElementById('fftCanvas');
    const signalCtx = signalCanvas.getContext('2d');
    const fftCtx = fftCanvas.getContext('2d');

    // Responsive canvas size
    const canvasWidth = Math.min(400, window.innerWidth * 0.45);
    const canvasHeight = canvasWidth * 0.75;
    signalCanvas.width = canvasWidth;
    signalCanvas.height = canvasHeight;
    fftCanvas.width = canvasWidth;
    fftCanvas.height = canvasHeight;

    // Generate signal
    const data = new Float32Array(points);
    for (let i = 0; i < points; i++) {
        const time = i / points;
        data[i] = Math.sin(2 * Math.PI * frequency * time) + (Math.random() - 0.5) * noise;
    }

    // Plot time domain
    plotSignal(signalCtx, signalCanvas, data, signalState, 'Time (s)', 'Amplitude', 1);

    // Compute FFT using kissfft
    const fft = new KissFFT.FFT(points);
    const fftData = fft.forward(data);
    const magnitudes = new Float32Array(points / 2);
    let maxMagnitude = 0;
    for (let i = 0; i < points / 2; i++) {
        const real = fftData[2 * i];
        const imag = fftData[2 * i + 1];
        magnitudes[i] = Math.sqrt(real * real + imag * imag);
        maxMagnitude = Math.max(maxMagnitude, magnitudes[i]);
    }
    // Normalize magnitudes
    for (let i = 0; i < points / 2; i++) {
        magnitudes[i] /= maxMagnitude || 1; // Avoid division by zero
    }
    fft.dispose();

    // Plot frequency domain
    const maxFreq = points / 2; // Nyquist frequency
    plotSignal(fftCtx, fftCanvas, magnitudes, fftState, 'Frequency (Hz)', 'Magnitude', maxFreq);

    // Add event listeners
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

function plotSignal(ctx, canvas, data, state, xLabel, yLabel, maxX) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Find min/max for scaling
    const maxVal = Math.max(...data, 1);
    const minVal = Math.min(...data, -1);
    const range = maxVal - minVal || 1;

    // Draw axes
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

    // Draw labels
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, canvas.width / 2, canvas.height - 10);
    ctx.save();
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, -canvas.height / 2, 20);
    ctx.restore();

    // Draw ticks and labels
    for (let i = 0; i <= 5; i++) {
        const x = margin + i * plotWidth / 5;
        ctx.beginPath();
        ctx.moveTo(x, canvas.height - margin);
        ctx.lineTo(x, canvas.height - margin + 5);
        ctx.stroke();
        ctx.fillText((i * maxX / 5).toFixed(1), x, canvas.height - margin + 20);
    }
    for (let i = -1; i <= 1; i += 0.5) {
        const y = canvas.height - margin - (i - minVal) / range * plotHeight;
        ctx.beginPath();
        ctx.moveTo(margin - 5, y);
        ctx.lineTo(margin, y);
        ctx.stroke();
        ctx.fillText(i.toFixed(1), margin - 20, y + 4);
    }

    // Plot data
    ctx.beginPath();
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 2;
    const step = plotWidth / (data.length * state.zoomX);
    for (let i = 0; i < data.length; i++) {
        const x = margin + (i + state.offsetX) * step;
        const y = canvas.height - margin - ((data[i] - minVal) / range * plotHeight) / state.zoomY + state.offsetY;
        if (x < margin || x > canvas.width - margin) continue; // Skip points outside plot area
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
}

function handleZoom(event, canvas, state) {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left - 50) / (canvas.width - 100); // Normalized x in plot area
    const mouseY = (event.clientY - rect.top - 50) / (canvas.height - 100); // Normalized y in plot area
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;

    // Adjust zoom
    const oldZoomX = state.zoomX;
    const oldZoomY = state.zoomY;
    state.zoomX = Math.max(1, Math.min(state.zoomX * zoomFactor, 20));
    state.zoomY = Math.max(1, Math.min(state.zoomY * zoomFactor, 20));

    // Adjust offsets to keep mouse position centered
    state.offsetX += mouseX * (oldZoomX - state.zoomX) * canvas.width / state.zoomX;
    state.offsetY += mouseY * (oldZoomY - state.zoomY) * (canvas.height - 100) / state.zoomY;
    state.offsetX = Math.max(-1000, Math.min(state.offsetX, 1000));
    state.offsetY = Math.max(-500, Math.min(state.offsetY, 500));

    generateSignal(); // Redraw
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
    state.offsetX = Math.max(-1000, Math.min(state.offsetX, 1000));
    state.offsetY = Math.max(-500, Math.min(state.offsetY, 500));
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    generateSignal();
}

function stopDrag(state) {
    state.isDragging = false;
}

function resetZoom() {
    signalState = { zoomX: 1, zoomY: 1, offsetX: 0, offsetY: 0, isDragging: false, lastX: 0, lastY: 0 };
    fftState = { zoomX: 1, zoomY: 1, offsetX: 0, offsetY: 0, isDragging: false, lastX: 0, lastY: 0 };
    generateSignal();
}