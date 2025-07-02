// plotting.js
import { state, FS } from './state.js';

// Main function to plot all data (signal and FFT, overlays, axes, labels) using Plotly.js
export function plotAll() {
    // --- Get the plot div and check existence ---
    const plotDiv = document.getElementById('plot');
    if (!plotDiv) {
        console.error('Plot div not found');
        return;
    }

    // --- Prepare traces array for Plotly ---
    const traces = [];

    // --- Add main time-domain signal trace ---
    if (
        state.signalData && state.signalData.length > 0 &&
        state.time_axis && state.time_axis.length === state.signalData.length
    ) {
        traces.push({
            x: state.time_axis,
            y: state.signalData,
            type: 'scatter',
            mode: 'lines',
            name: 'Main Signal', // Always label main signal
            line: { color: '#000000' },
            yaxis: 'y1',
            xaxis: 'x1',
            showlegend: true
        });
    }

    // --- Add main FFT trace ---
    if (
        state.fftMagnitudes && state.fftMagnitudes.length > 0 &&
        state.fftFreqAxis && state.fftFreqAxis.length === state.fftMagnitudes.length
    ) {
        traces.push({
            x: state.fftFreqAxis,
            y: state.fftMagnitudes,
            type: 'scatter',
            mode: 'lines',
            // name: 'Signal FFT', // Main FFT (legend removed)
            line: { color: '#000000' },
            yaxis: 'y2',
            xaxis: 'x2',
            showlegend: false // Hide from legend
        });
    }

    // --- Add overlay signal and FFT if present ---
    let overlayPresent = state.overlays && state.overlays.length > 0;
    if (overlayPresent) {
        const ov = state.overlays[0];
        // Overlay time-domain signal
        if (ov.signal && (ov.time_axis || state.time_axis)) {
            traces.push({
                x: ov.time_axis || state.time_axis,
                y: ov.signal,
                type: 'scatter',
                mode: 'lines',
                name: 'Overlay', // Overlay signal
                line: { color: '#d62728' },
                yaxis: 'y1',
                xaxis: 'x1',
                showlegend: true
            });
        }
        // Overlay FFT
        if (ov.fft && ov.freq) {
            traces.push({
                x: ov.freq,
                y: ov.fft,
                type: 'scatter',
                mode: 'lines',
                // name: 'Overlay FFT', // Overlay FFT (legend removed)
                line: { color: '#d62728' },
                yaxis: 'y2',
                xaxis: 'x2',
                showlegend: false // Hide from legend
            });
        }
    }

    // --- Add filtered signal trace if present ---
    if (state.filteredActive && state.filteredSignal && state.filteredSignal.length === state.time_axis.length) {
        traces.push({
            x: state.time_axis,
            y: state.filteredSignal,
            type: 'scatter',
            mode: 'lines',
            name: 'Filtered',
            line: { color: '#1f77b4' }, // Set filtered signal color
            yaxis: 'y1',
            xaxis: 'x1',
            showlegend: true
        });
    }
    // --- Add filtered FFT trace if present ---
    if (state.filteredActive && state.filteredFft && state.filteredFftFreq && state.filteredFft.length === state.filteredFftFreq.length) {
        traces.push({
            x: state.filteredFftFreq,
            y: state.filteredFft,
            type: 'scatter',
            mode: 'lines',
            // name: 'Filtered FFT', // Filtered FFT (legend removed)
            line: { color: '#1f77b4' }, // Set filtered FFT color to match signal
            yaxis: 'y2',
            xaxis: 'x2',
            showlegend: false // Hide from legend
        });
    }

    // --- Auto-zoom FFT x-axis to significant frequencies ---
    // This section finds the frequency range where the FFT magnitude is 
    // significant (above 5% of max),
    // and sets the x-axis range for the FFT plot to focus on that region.
    let fftRange = null;
    if (state.fftMagnitudes && state.fftMagnitudes.length > 0) {
        const maxMag = Math.max(...state.fftMagnitudes); // Find max magnitude
        const threshold = 0.2 * maxMag; // 5% threshold
        // Find indices where magnitude exceeds threshold
        const indices = state.fftMagnitudes
            .map((mag, i) => mag > threshold ? i : -1)
            .filter(i => i !== -1);
        if (indices.length > 0) {
            const minIdx = Math.min(...indices);
            const maxIdx = Math.max(...indices);
            // Add 10% margin on both sides, clamp to >= 0
            const minF = Math.max(0, 
            state.fftFreqAxis[minIdx] - 0.4 * (state.fftFreqAxis[maxIdx] - state.fftFreqAxis[minIdx]));
            const maxF = state.fftFreqAxis[maxIdx] + 0.4 * (state.fftFreqAxis[maxIdx] - state.fftFreqAxis[minIdx]);
            fftRange = [minF, maxF];
        }
    }

    // --- Define Plotly layout with two subplots (signal and FFT) ---
    const layout = {
        grid: { rows: 2, columns: 1, pattern: 'independent' }, // 2 rows, 1 column
        height: 600,
        width: 900,
        showlegend: true, // Enable Plotly legend for all traces
        margin: { l: 210, r: 40, t: 60, b: 80 }, // Increased left margin for more space
        xaxis: { title: 'Time (s)' }, // Top subplot x-axis
        yaxis: { title: 'Intensity' }, // Top subplot y-axis
        xaxis2: { title: 'Frequency (Hz)', range: fftRange || undefined }, // Bottom subplot x-axis, auto-zoomed
        yaxis2: { title: 'Magnitude' } // Bottom subplot y-axis
    };

    // --- Render the plot using Plotly ---
    Plotly.newPlot('plot', traces, layout, {responsive: true});

    // --- Update custom legend ---
    // (No longer needed, Plotly legend is now enabled)
}

// In all plotting logic, use FS for any time axis calculations if needed.