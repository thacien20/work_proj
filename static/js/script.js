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
    generateSignal(); // Initial signal generation on page load
    setupCanvasEvents();

    // Attach Generate Signal button
    document.getElementById('generateBtn').onclick = generateSignal;

    // Attach Add Overlay button
    document.getElementById('addOverlayBtn').onclick = addOverlay;

    // Attach Reset Zoom button if you have one (add this button to your HTML if needed)
    // document.getElementById('resetZoomBtn').onclick = resetZoom;
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
    .then(async response => {
        if (!response.ok) {
            let errMsg = 'Unknown error';
            try {
                // Attempt to parse JSON error message from backend
                const errData = await response.json();
                errMsg = errData.error || JSON.stringify(errData);
            } catch (e) {
                // Fallback to status text if response is not JSON or parsing fails
                errMsg = response.statusText;
            }
            alert('Backend error: ' + errMsg);
            // Crucially, stop further processing if there's a backend error
            return;
        }
        return response.json();
    })
    .then(data => {
        // If data is null (e.g., due to an error handled above), do not proceed
        if (!data) return;

        signalData = new Float32Array(data.signal);
        fftMagnitudes = new Float32Array(data.fft);
        fftFreqAxis = new Float32Array(data.freq_axis);

        console.log("Signal/FFT loaded", signalData.length); // Confirm data loaded

        // --- IMPORTANT: Reset zoom and pan when new signal is generated ---
        timeZoom = 1;
        timePan = 0;
        fftZoom = 1;
        fftPan = 0;
        // -----------------------------------------------------------------

        // Re-plot all signals (main and overlays) with the new data
        plotAll();
    })
    .catch(err => {
        // Catch network errors (e.g., server unreachable) or unexpected JS errors
        alert('Network or JS error: ' + err);
        console.error('Fetch error:', err); // Log the error for detailed debugging
    });
}

function plotAll() {
    const canvas = document.getElementById('combinedCanvas');
    const ctx = canvas.getContext('2d');
    
    // Clear the entire canvas before redrawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;
    const halfHeight = height / 2; // For splitting signal and FFT plots

    // Plot overlays if any (using current zoom/pan, or default if reset)
    overlays.forEach(ov => {
        drawSignal(ctx, ov.signal, width, halfHeight, 0, timeZoom, timePan, '#ff8800'); // Orange for overlays
        drawFFT(ctx, ov.fft, ov.freq, width, halfHeight, halfHeight, fftZoom, fftPan, '#ff8800');
    });

    // Plot the main signal (using current zoom/pan, or default if reset)
    drawSignal(ctx, signalData, width, halfHeight, 0, timeZoom, timePan, '#007bff'); // Blue for main signal
    drawFFT(ctx, fftMagnitudes, fftFreqAxis, width, halfHeight, halfHeight, fftZoom, fftPan, '#007bff');

    // X axis label (Frequency)




// Time domain: X-axis label (Time)
ctx.save();
ctx.font = "16px Arial";
ctx.textAlign = "center";
ctx.fillStyle = "#000";
ctx.fillText("Time (s)", width / 2, height / 2 - 10); // Below time domain (top half)
ctx.restore();



// Time domain: Y-axis label (Intensity)
ctx.save();
ctx.translate(15, height / 4); // Left side, centered in top half
ctx.rotate(-Math.PI / 2);
ctx.font = "16px Arial";
ctx.textAlign = "center";
ctx.fillStyle = "#000";
ctx.fillText("Intensity", 0, 0);
ctx.restore();

    

// FFT: X-axis label (Frequency)
ctx.save();
ctx.font = "16px Arial";
ctx.textAlign = "center";
ctx.fillStyle = "#000";
ctx.fillText("Frequency (Hz)", width / 2, height - 10); // Bottom of canvas (FFT)
ctx.restore();


// FFT: Y-axis label (Magnitude)
ctx.save();
ctx.translate(15, height * 3 / 4); // Left side, centered in bottom half
ctx.rotate(-Math.PI / 2);
ctx.font = "16px Arial";
ctx.textAlign = "center";
ctx.fillStyle = "#000";
ctx.fillText("Magnitude", 0, 0);
ctx.restore();



}

function drawSignal(ctx, data, width, height, yOffset, zoom, pan, color) {
    if (!data || data.length === 0) return; // Ensure data exists and is not empty

    const margin = 40;
    const plotWidth = width - 2 * margin;
    const plotHeight = height - 2 * margin;

    // Calculate min/max for scaling
    let minVal = data[0];
    let maxVal = data[0];
    for (let i = 1; i < data.length; i++) {
        if (data[i] < minVal) minVal = data[i];
        if (data[i] > maxVal) maxVal = data[i];
    }
    // Handle cases where minVal equals maxVal (e.g., flat signal)
    let range = maxVal - minVal;
    if (range === 0) {
        // If flat, give it a small artificial range to draw a line in the middle
        minVal -= 0.5;
        maxVal += 0.5;
        range = 1;
    }

    // console.log("drawSignal - minVal:", minVal, "maxVal:", maxVal, "range:", range); // Debugging log

    ctx.save(); // Save current canvas state (transforms)
    ctx.translate(0, yOffset); // Translate for signal plot (top half)

    // Draw X and Y axes
    ctx.beginPath();
    ctx.strokeStyle = '#000'; // Black color for axes
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, height - margin); // Y-axis
    ctx.lineTo(width - margin, height - margin); // X-axis
    ctx.stroke();

    // Draw the signal
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    const N = data.length;

    for (let i = 0; i < N; i++) {
        // Calculate x-position based on time index, pan, and zoom
        // t goes from 0 to 1 for the visible range
        const t = (i / N - 0.5 - pan) / zoom + 0.5;
        if (t < 0 || t > 1) continue; // Only draw points within the visible time window

        const x = margin + t * plotWidth;
        // Calculate y-position, scaling data to plotHeight
        const y = height - margin - ((data[i] - minVal) / range * plotHeight);

        // console.log(`  Signal point ${i}: data=${data[i].toFixed(2)}, x=${x.toFixed(2)}, y=${y.toFixed(2)}`); // Debugging log

        if (i === 0 || x <= margin) { // Move to first point, or if previous point was outside left margin
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke(); // Render the path
    ctx.restore(); // Restore canvas state
}

function drawFFT(ctx, data, freqAxis, width, height, yOffset, zoom, pan, color) {
    if (!data || !freqAxis || data.length === 0) return; // Ensure data exists and is not empty

    const margin = 50;
    const plotWidth = width - 2 * margin;
    const plotHeight = height - 2 * margin;

    // Get the current frequency from the input for centering the FFT view
    let fCenter = parseFloat(document.getElementById('frequency').value) || 0;
    
    // Calculate visible frequency range based on fCenter, zoom, and pan
    // Adjust 10 * zoom to control the initial visible range around fCenter
    let fMin = Math.max(0, fCenter - 10 * zoom + pan);
    let fMax = fCenter + 10 * zoom + pan;

    // Handle case where fMin equals fMax
    let freqRange = fMax - fMin;
    if (freqRange === 0) { // Prevent division by zero
        if (fCenter === 0) { // If frequency is 0, give a small range around 0
            fMin = -1;
            fMax = 1;
        } else { // Otherwise, make a small window around the center frequency
            fMin = fCenter - 1;
            fMax = fCenter + 1;
        }
        freqRange = fMax - fMin; // Recalculate range
    }

    // console.log("drawFFT - fCenter:", fCenter, "fMin:", fMin, "fMax:", fMax, "freqRange:", freqRange); // Debugging log

    ctx.save(); // Save current canvas state
    ctx.translate(0, yOffset); // Translate for FFT plot (bottom half)

    // Draw X and Y axes
    ctx.beginPath();
    ctx.strokeStyle = '#000';
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, height - margin); // Y-axis
    ctx.lineTo(width - margin, height - margin); // X-axis
    ctx.stroke();

    // Draw the FFT magnitudes
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    for (let i = 0; i < freqAxis.length; i++) {
        const f = freqAxis[i];
        if (f < fMin || f > fMax) continue; // Only draw points within the visible frequency window

        // Scale frequency to x-position
        const x = margin + ((f - fMin) / freqRange) * plotWidth;
        // Scale magnitude to y-position (FFT magnitudes are typically positive)
        const y = height - margin - (data[i] * plotHeight); // Assuming FFT data is normalized 0-1 or scaled to fit

        // console.log(`  FFT point ${i}: f=${f.toFixed(2)}, data=${data[i].toFixed(2)}, x=${x.toFixed(2)}, y=${y.toFixed(2)}`); // Debugging log

        // If it's the first visible point or coming in from off-screen, start a new path segment
        if (i === 0 || freqAxis[i-1] < fMin || x < margin) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    ctx.restore();
}

function setupCanvasEvents() {
    const canvas = document.getElementById('combinedCanvas');

    // Mouse wheel for zooming
    canvas.addEventListener('wheel', function(e) {
        e.preventDefault(); // Prevent page scrolling
        const y = e.offsetY; // Y-coordinate of the mouse cursor

        if (y < canvas.height / 2) { // Zoom in/out time domain (top half)
            timeZoom += e.deltaY > 0 ? 0.1 : -0.1; // Increase/decrease zoom factor
            timeZoom = Math.max(0.5, Math.min(timeZoom, 10)); // Clamp zoom to a reasonable range
        } else { // Zoom in/out FFT domain (bottom half)
            fftZoom += e.deltaY > 0 ? 0.1 : -0.1;
            fftZoom = Math.max(0.5, Math.min(fftZoom, 10));
        }
        plotAll(); // Redraw with new zoom levels
    });

    // Mouse down for starting drag
    canvas.addEventListener('mousedown', function(e) {
        this.isDragging = true;
        this.lastX = e.clientX; // Record starting X position
        this.dragRegion = e.offsetY < canvas.height / 2 ? 'time' : 'fft'; // Determine which plot is being dragged
    });

    // Mouse move for panning
    canvas.addEventListener('mousemove', function(e) {
        if (this.isDragging) {
            const dx = (e.clientX - this.lastX) / 100; // Calculate horizontal drag amount
            if (this.dragRegion === 'time') {
                timePan += dx * timeZoom; // Pan time domain, scaled by current zoom
            } else {
                fftPan += dx * fftZoom * 2; // Pan FFT domain, scaled by current zoom (adjust multiplier as needed)
            }
            this.lastX = e.clientX; // Update last X position for next movement
            plotAll(); // Redraw with new pan levels
        }
    });

    // Mouse up/leave for ending drag
    canvas.addEventListener('mouseup', () => { canvas.isDragging = false; });
    canvas.addEventListener('mouseleave', () => { canvas.isDragging = false; });
}

function addOverlay() {
    // Only add overlay if a main signal has been generated
    if (!signalData || !fftMagnitudes || !fftFreqAxis) {
        alert('Generate a main signal first before adding an overlay.');
        return;
    }
    // Store copies of current signal/FFT data for the overlay
    overlays.push({
        signal: new Float32Array(signalData),
        fft: new Float32Array(fftMagnitudes),
        freq: new Float32Array(fftFreqAxis)
    });
    alert('Overlay added!');
    plotAll(); // Redraw to show the new overlay
}

function resetZoom() {
    timeZoom = 1;
    timePan = 0;
    fftZoom = 1;
    fftPan = 0;
    plotAll(); // Redraw with default zoom/pan
}