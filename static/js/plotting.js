// plotting.js
import { state } from './state.js';

// Main function to plot all data (signal and FFT, overlays, axes, labels) using Plotly.js
export function plotAll() {
    const plotDiv = document.getElementById('plot');
    if (!plotDiv) {
        console.error('Plot div not found');
        return;
    }

    const traces = [];

    // Overlay (if any)
    if (state.overlays && state.overlays.length > 0) {
        const ov = state.overlays[0];
        if (ov.signal && (ov.time_axis || state.time_axis)) {
            traces.push({
                x: ov.time_axis || state.time_axis,
                y: ov.signal,
                type: 'scatter',
                mode: 'lines',
                name: 'Overlay Signal',
                line: { color: '#ff8800' },
                yaxis: 'y1',
                xaxis: 'x1'
            });
        }
        if (ov.fft && ov.freq) {
            traces.push({
                x: ov.freq,
                y: ov.fft,
                type: 'scatter',
                mode: 'lines',
                name: 'Overlay FFT',
                line: { color: '#ff8800' },
                yaxis: 'y2',
                xaxis: 'x2'
            });
        }
    }

    // Main signal
    if (
        state.signalData && state.signalData.length > 0 &&
        state.time_axis && state.time_axis.length === state.signalData.length
    ) {
        traces.push({
            x: state.time_axis,
            y: state.signalData,
            type: 'scatter',
            mode: 'lines',
            name: 'Signal',
            line: { color: '#007bff' },
            yaxis: 'y1',
            xaxis: 'x1'
        });
    }

    // Main FFT
    if (
        state.fftMagnitudes && state.fftMagnitudes.length > 0 &&
        state.fftFreqAxis && state.fftFreqAxis.length === state.fftMagnitudes.length
    ) {
        traces.push({
            x: state.fftFreqAxis,
            y: state.fftMagnitudes,
            type: 'scatter',
            mode: 'lines',
            name: 'FFT',
            line: { color: '#007bff' },
            yaxis: 'y2',
            xaxis: 'x2'
        });
    }

    // Layout with two subplots
    const layout = {
        grid: { rows: 2, columns: 1, pattern: 'independent' },
        height: 600,
        width: 900,
        showlegend: true,
        xaxis: { title: 'Time (s)' },
        yaxis: { title: 'Intensity' },
        xaxis2: { title: 'Frequency (Hz)' },
        yaxis2: { title: 'Magnitude' }
    };

    Plotly.newPlot('plot', traces, layout, {responsive: true});
}