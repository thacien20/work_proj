// plotting.js
import { state, FS } from './state.js';

// Cleanup function for Plotly plots
function cleanupPlotly() {
    const plotDiv = document.getElementById('plot');
    if (plotDiv && plotDiv.data) {
        Plotly.purge(plotDiv);
    }
}

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

    const hasFilterResponse = state.filterResponse && state.filterResponse.freq && state.filterResponse.freq.length > 0;

    // --- Define Plotly layout with multiple subplots ---
    const layout = {
        grid: { rows: hasFilterResponse ? 5 : 2, columns: 1, pattern: 'independent' }, // 2 or 5 rows, 1 column
        showlegend: true, // Enable Plotly legend for all traces
        autosize: true, // Let Plotly handle sizing automatically
        margin: { l: 250, r: 60, t: 160, b: 60 }, // Increased bottom margin for x-axis labels
        xaxis: { 
            title: { 
                text: 'Time (s)',
                standoff: 20,
                side: 'bottom'
            },
            titlefont: { size: 12 }
        }, // Top subplot x-axis (signal)
        yaxis: { 
            title: { 
                text: 'Intensity',
                standoff: 30
            },
            titlefont: { size: 12 }
        }, // Top subplot y-axis (signal)
        xaxis2: { 
            title: { 
                text: hasFilterResponse ? '' : 'Frequency (Hz)', // Only show if no filter response (bottom-most)
                standoff: 20,
                side: 'bottom'
            },
            titlefont: { size: 12 },
            range: fftRange || undefined
        }, // Second subplot x-axis (FFT), auto-zoomed
        yaxis2: { 
            title: { 
                text: 'Magnitude',
                standoff: 30
            },
            titlefont: { size: 12 }
        } // Second subplot y-axis (FFT)
    };

    // --- Add filter response traces if present ---
    if (hasFilterResponse) {
        // Impulse Response
        traces.push({
            x: state.filterResponse.impulse_x,
            y: state.filterResponse.impulse,
            type: 'scatter',
            mode: 'lines',
            name: 'Impulse Response',
            line: { color: '#ff7f0e' }, // Orange color
            xaxis: 'x3',
            yaxis: 'y3',
            showlegend: true
        });

        // Magnitude Response
        traces.push({
            x: state.filterResponse.freq,
            y: state.filterResponse.mag,
            type: 'scatter',
            mode: 'lines',
            name: 'Magnitude Response',
            line: { color: '#2ca02c' }, // Green color
            xaxis: 'x4',
            yaxis: 'y4',
            showlegend: true
        });

        // Phase Response
        traces.push({
            x: state.filterResponse.freq,
            y: state.filterResponse.phase,
            type: 'scatter',
            mode: 'lines',
            name: 'Phase Response',
            line: { color: '#9467bd' }, // Purple color
            xaxis: 'x5',
            yaxis: 'y5',
            showlegend: true
        });

        // Define axes for the three filter response subplots
        layout.xaxis3 = { 
            title: { 
                text: 'Sample Index',
                standoff: 10,
                side: 'bottom'
            },
            titlefont: { size: 12 }
        }; // Impulse response x-axis
        layout.yaxis3 = { 
            title: { 
                text: 'Amplitude',
                standoff: 30
            },
            titlefont: { size: 12 }
        }; // Impulse response y-axis
        layout.xaxis4 = { 
            title: { 
                text: '', // Remove frequency label - not the bottom-most
                standoff: 20,
                side: 'bottom'
            },
            titlefont: { size: 12 }
        }; // Magnitude response x-axis
        layout.yaxis4 = { 
            title: { 
                text: 'Magnitude',
                standoff: 30
            },
            titlefont: { size: 12 }
        }; // Magnitude response y-axis
        layout.xaxis5 = { 
            title: { 
                text: 'Frequency (Hz)',
                standoff: 20,
                side: 'right' // Align to right side for clarity
            },
            titlefont: { size: 12 }
        }; // Phase response x-axis
        layout.yaxis5 = { 
            title: { 
                text: 'Phase (rad.)',
                standoff: 30
            },
            titlefont: { size: 12 }
        }; // Phase response y-axis
    }

    // --- Render the plot using Plotly ---
    // Clear any existing plot data to ensure fresh rendering
    if (plotDiv && plotDiv.data) {
        Plotly.purge('plot'); // Clear everything
    }
    // Use Plotly.newPlot for a fresh start with responsive config
    Plotly.newPlot('plot', traces, layout, {
        responsive: true,
        displayModeBar: true,
        displaylogo: false
    });

    // --- Update custom legend ---
    // (No longer needed, Plotly legend is now enabled)
}

// In all plotting logic, use FS for any time axis calculations if needed.

function createPlot(divId, traces, layout_options = {}) {
    const layout = {
        autosize: true, // Make the plot responsive
        margin: { l: 140, r: 60, b: 120, t: 160, pad: 4 }, // Match the main plot margin settings
        plot_bgcolor: "rgba(240, 240, 240, 0.95)",
        paper_bgcolor: "rgba(0,0,0,0)",
        xaxis: {
            title: 'Frequency (Hz)',
            showgrid: true,
            zeroline: false
        },
        showlegend: true,
        legend: {
            x: 1,
            xanchor: 'right',
            y: 1
        },
        // Remove fixed width and height to allow autosizing
        // width: 700,
        // height: 580,
        ...layout_options
    };

    Plotly.react(divId, traces, layout, {responsive: true});
}

// Helper function to force a complete plot refresh
export function forceRefreshPlot() {
    const plotDiv = document.getElementById('plot');
    if (plotDiv) {
        // Clear the plot completely first
        Plotly.purge('plot');
        // Then re-plot everything
        plotAll();
    }
}

// Helper function to update plot layout only (useful for margin changes)
export function updatePlotLayout(newMargins) {
    const plotDiv = document.getElementById('plot');
    if (plotDiv && plotDiv.layout) {
        const newLayout = {
            ...plotDiv.layout,
            margin: newMargins
        };
        Plotly.relayout('plot', newLayout);
    }
}

// Export cleanup function
export { cleanupPlotly };

// Add cleanup on page unload
window.addEventListener('beforeunload', cleanupPlotly);
window.addEventListener('pagehide', cleanupPlotly);