/**
 * Basic Signals Feature - Frontend JavaScript
 * 
 * This module handles the frontend logic for the Basic Signals educational tool.
 * It provides interactive signal generation, visualization, and comparison functionality.
 * 
 * Features:
 * - Signal generation with real-time parameter updates
 * - Interactive plotting with Plotly
 * - Signal comparison tools
 * - Educational content display
 * - Memory-efficient operations with proper cleanup
 * 
 * Author: Signal Processing Lab
 * Version: 1.0
 */

// =============================================================================
// GLOBAL VARIABLES AND CONFIGURATION
// =============================================================================

// Application state
const AppState = {
    currentSignal: null,
    currentPlot: null,
    isLoading: false,
    plotCount: 0,
    lastRequestTime: 0,
    requestThrottleMs: 100
};

// Signal type configurations
const SignalConfig = {
    sine: { color: '#007bff', name: 'Sine Wave' },
    cosine: { color: '#6f42c1', name: 'Cosine Wave' },
    square: { color: '#28a745', name: 'Square Wave' },
    triangle: { color: '#ffc107', name: 'Triangle Wave' },
    sawtooth: { color: '#dc3545', name: 'Sawtooth Wave' }
};

// Default plot layout configuration
const DefaultPlotLayout = {
    title: {
        text: 'Signal Visualization',
        font: { size: 18, family: 'Arial' }
    },
    xaxis: {
        title: 'Time (s)',
        gridcolor: '#e0e0e0',
        showgrid: true
    },
    yaxis: {
        title: 'Amplitude (V)',
        gridcolor: '#e0e0e0',
        showgrid: true
    },
    plot_bgcolor: '#fafafa',
    paper_bgcolor: '#ffffff',
    margin: { l: 60, r: 30, t: 50, b: 50 },
    hovermode: 'x unified',
    showlegend: true,
    legend: {
        x: 0.02,
        y: 0.98,
        bgcolor: 'rgba(255,255,255,0.8)',
        bordercolor: '#333',
        borderwidth: 1
    }
};

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the Basic Signals application
 * Sets up event listeners and initial state
 */
function initializeApp() {
    console.log('🔧 Initializing Basic Signals Application...');
    // Set up event listeners
    setupEventListeners();
    // Setup cleanup handlers
    setupCleanupHandlers();
    // --- Set up initial wrapper and plot size (wrapper larger than plot) ---
    const wrapper = document.getElementById('signalPlotWrapper');
    const plotDiv = document.getElementById('signalPlot');
    if (wrapper && plotDiv) {
        // Set wrapper size slightly larger than plot
        wrapper.style.width = '660px'; // e.g. 600px plot + 60px
        wrapper.style.height = '420px'; // e.g. 360px plot + 60px
        wrapper.style.minWidth = '360px';
        wrapper.style.minHeight = '240px';
        wrapper.style.maxWidth = '100vw';
        wrapper.style.maxHeight = '90vh';
        wrapper.style.position = 'relative';
        wrapper.style.overflow = 'hidden'; // Prevent plot overflow
        plotDiv.style.width = '600px';
        plotDiv.style.height = '360px';
        plotDiv.style.margin = '30px'; // center plot inside wrapper
        plotDiv.style.boxSizing = 'border-box';
        plotDiv.style.display = 'block';
    }
    // --- Hide Analyze dropdown and options on load ---
    const analyzeDropdown = document.getElementById('analyzeDropdown');
    if (analyzeDropdown) {
        analyzeDropdown.style.display = 'none';
    }
    // Optionally hide dropdown options if they have a class
    const analyzeOptions = document.querySelectorAll('.analyze-option');
    analyzeOptions.forEach(opt => opt.style.display = 'none');
    // --- Ensure signal controls have valid defaults before plotting ---
    const signalType = document.getElementById('signalType');
    const frequency = document.getElementById('frequency');
    const amplitude = document.getElementById('amplitude');
    const phase = document.getElementById('phase');
    const duration = document.getElementById('duration');
    if (signalType) signalType.value = 'sine';
    if (frequency) frequency.value = '1.0';
    if (amplitude) amplitude.value = '1.0';
    if (phase) phase.value = '0';
    if (duration) duration.value = '2.0';
    // --- End initial wrapper/plot sizing ---
    // Draw initial signal
    handleGenerateSignal();
    console.log('✅ Basic Signals Application initialized successfully');
}

/**
 * Set up all event listeners for the application
 */
function setupEventListeners() {
    // Only add event listeners if the elements exist
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) generateBtn.addEventListener('click', handleGenerateSignal);

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', handleReset);

    const infoBtn = document.getElementById('infoBtn');
    if (infoBtn) infoBtn.addEventListener('click', handleShowInfo);

    document.addEventListener('keydown', handleKeyboardShortcuts);
    // --- Analyze dropdown show/hide logic ---
    const analyzeBtn = document.getElementById('analyzeBtn');
    const analyzeDropdown = document.getElementById('analyzeDropdown');
    if (analyzeBtn && analyzeDropdown) {
        analyzeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (analyzeDropdown.style.display === 'block') {
                analyzeDropdown.style.display = 'none';
            } else {
                analyzeDropdown.style.display = 'block';
            }
        });
        // Hide dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!analyzeDropdown.contains(e.target) && e.target !== analyzeBtn) {
                analyzeDropdown.style.display = 'none';
            }
        });
    }
}

/**
 * Setup cleanup handlers for memory management
 */
function setupCleanupHandlers() {
    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanup);
    
    // Cleanup on visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cleanup();
        }
    });
}

// =============================================================================
// SIGNAL GENERATION
// =============================================================================

/**
 * Generate initial signal on page load
 */
/**
 * Handle signal generation button click
 */
function handleGenerateSignal() {
    if (AppState.isLoading) return;
    
    const params = getSignalParameters();
    generateSignal(params);
}

/**
 * Generate a signal with specified parameters
 * @param {Object} params - Signal parameters
 */
async function generateSignal(params) {
    try {
        // Throttle requests to prevent spam
        const now = Date.now();
        if (now - AppState.lastRequestTime < AppState.requestThrottleMs) {
            return;
        }
        AppState.lastRequestTime = now;
        
        showLoading(true);
        
        // Validate parameters
        if (!validateParameters(params)) {
            throw new Error('Invalid signal parameters');
        }
        
        // Make API request
        const response = await fetch('/basic_signals/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                signal_type: params.signalType,
                frequency: params.frequency,
                amplitude: params.amplitude,
                phase: params.phase * Math.PI / 180, // Convert to radians
                duration: params.duration,
                sample_rate: 200 // Fixed sample rate for educational purposes
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            AppState.currentSignal = data.signal;
            plotSignal(data.signal);
            displaySignalProperties(data.signal.properties);
        } else {
            throw new Error(data.error || 'Signal generation failed');
        }
        
    } catch (error) {
        console.error('❌ Error generating signal:', error);
        showError('Signal generation failed: ' + error.message);
    } finally {
        showLoading(false);
    }
}

/**
 * Get current signal parameters from the UI
 * @returns {Object} Signal parameters
 */
function getSignalParameters() {
    return {
        signalType: document.getElementById('signalType').value,
        frequency: parseFloat(document.getElementById('frequency').value),
        amplitude: parseFloat(document.getElementById('amplitude').value),
        phase: parseFloat(document.getElementById('phase').value),
        duration: parseFloat(document.getElementById('duration').value)
    };
}

/**
 * Validate signal parameters
 * @param {Object} params - Signal parameters to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateParameters(params) {
    if (params.frequency <= 0 || params.frequency > 50) {
        showError('Frequency must be between 0.1 and 50 Hz');
        return false;
    }
    
    if (params.amplitude <= 0 || params.amplitude > 10) {
        showError('Amplitude must be between 0.1 and 10 V');
        return false;
    }
    
    if (params.duration <= 0 || params.duration > 20) {
        showError('Duration must be between 0.5 and 20 seconds');
        return false;
    }
    
    return true;
}

// =============================================================================
// PLOTTING AND VISUALIZATION
// =============================================================================

/**
 * Plot a signal using Plotly
 * @param {Object} signal - Signal data to plot
 */
function plotSignal(signal) {
    try {
        // Clean up previous plot
        if (AppState.currentPlot) {
            Plotly.purge('signalPlot');
        }
        const signalConfig = SignalConfig[signal.type];
        const trace = {
            x: signal.time,
            y: signal.amplitude,
            type: 'scatter',
            mode: 'lines',
            name: signalConfig.name,
            line: {
                color: signalConfig.color,
                width: 2
            },
            hovertemplate: '<b>%{fullData.name}</b><br>' +
                          'Time: %{x:.3f} s<br>' +
                          'Amplitude: %{y:.3f} V<br>' +
                          '<extra></extra>'
        };
        // --- Responsive layout for plot container ---
        const layout = {
            ...DefaultPlotLayout,
            title: {
                text: `${signalConfig.name} - ${signal.properties.frequency.toFixed(2)} Hz`,
                font: { size: 18, family: 'Arial' }
            }
        };
        // Ensure plot fills wrapper on initial render
        const wrapper = document.getElementById('signalPlotWrapper');
        const plotDiv = document.getElementById('signalPlot');
        if (wrapper && plotDiv) {
            layout.width = plotDiv.clientWidth;
            layout.height = plotDiv.clientHeight;
        }
        // --- Enable zooming/panning in both axes ---
        layout.dragmode = 'pan';
        layout.xaxis.fixedrange = false;
        layout.yaxis.fixedrange = false;
        layout.xaxis.autorange = true;
        layout.yaxis.autorange = true;
        // --- End zoom/pan fix ---
        const config = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
            displaylogo: false,
            scrollZoom: true // allow mouse wheel zoom
        };
        Plotly.newPlot('signalPlot', [trace], layout, config);
        AppState.currentPlot = true;
        AppState.plotCount++;
        // Add fade-in animation
        plotDiv.classList.add('fade-in');
        // --- Responsive resizing: update plot on container resize ---
        if (wrapper && plotDiv && window.Plotly) {
            if (window._signalPlotResizeObserver) {
                window._signalPlotResizeObserver.disconnect();
            }
            window._signalPlotResizeObserver = new ResizeObserver(() => {
                Plotly.relayout(plotDiv, {
                    width: plotDiv.clientWidth,
                    height: plotDiv.clientHeight
                });
                Plotly.Plots.resize(plotDiv);
            });
            window._signalPlotResizeObserver.observe(plotDiv);
        }
        // --- End responsive resize ---
        // --- Make the wrapper resizable in both directions (like circuits) ---
        makePlotWrapperResizable();
        // --- End resizable wrapper ---
        console.log(`📊 Signal plotted successfully (Plot #${AppState.plotCount})`);
    } catch (error) {
        console.error('❌ Error plotting signal:', error);
        showError('Plotting failed: ' + error.message);
    }
}

/**
 * Make the plot wrapper resizable in both directions with a visible handle (like circuits)
 */
function makePlotWrapperResizable() {
    const wrapper = document.getElementById('signalPlotWrapper');
    const plotDiv = document.getElementById('signalPlot');
    if (!wrapper || !plotDiv) return;
    wrapper.style.overflow = 'hidden';
    // Only add handle if not already present
    if (!wrapper.querySelector('.resize-handle')) {
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        handle.style.position = 'absolute';
        handle.style.right = '0';
        handle.style.bottom = '0';
        handle.style.width = '18px';
        handle.style.height = '18px';
        handle.style.cursor = 'nwse-resize';
        handle.style.background = 'linear-gradient(135deg, #b0b0b0 60%, #fff 100%)'; // match circuit lab
        handle.style.borderRadius = '0 0 6px 0';
        handle.style.zIndex = '10';
        handle.style.border = '1px solid #aaa';
        handle.style.boxShadow = '0 1px 4px rgba(0,0,0,0.10)';
        wrapper.appendChild(handle);
        if (getComputedStyle(wrapper).position === 'static') {
            wrapper.style.position = 'relative';
        }
        wrapper.style.minWidth = '360px';
        wrapper.style.minHeight = '240px';
        wrapper.style.maxWidth = '100vw';
        wrapper.style.maxHeight = '90vh';
        let isResizing = false;
        let startX, startY, startW, startH;
        handle.addEventListener('mousedown', function(e) {
            e.preventDefault();
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startW = wrapper.offsetWidth;
            startH = wrapper.offsetHeight;
            document.body.style.userSelect = 'none';
        });
        document.addEventListener('mousemove', function(e) {
            if (!isResizing) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            // Resize wrapper
            const newW = Math.max(360, Math.min(startW + dx, window.innerWidth));
            const newH = Math.max(240, Math.min(startH + dy, window.innerHeight * 0.9));
            wrapper.style.width = newW + 'px';
            wrapper.style.height = newH + 'px';
            // Resize plot to fill wrapper (with margin)
            const margin = 30;
            plotDiv.style.width = (newW - margin * 2) + 'px';
            plotDiv.style.height = (newH - margin * 2) + 'px';
            plotDiv.style.margin = margin + 'px';
            plotDiv.style.boxSizing = 'border-box';
            // Relayout Plotly plot
            if (window.Plotly) {
                Plotly.relayout(plotDiv, {
                    width: plotDiv.clientWidth,
                    height: plotDiv.clientHeight
                });
                Plotly.Plots.resize(plotDiv);
            }
        });
        document.addEventListener('mouseup', function() {
            if (isResizing) {
                isResizing = false;
                document.body.style.userSelect = '';
            }
        });
    }
    // --- Attach ResizeObserver to wrapper for live Plotly relayout (circuit lab style) ---
    if (window._signalPlotWrapperResizeObserver) {
        window._signalPlotWrapperResizeObserver.disconnect();
    }
    window._signalPlotWrapperResizeObserver = new ResizeObserver(() => {
        const margin = 30;
        const w = wrapper.clientWidth;
        const h = wrapper.clientHeight;
        plotDiv.style.width = (w - margin * 2) + 'px';
        plotDiv.style.height = (h - margin * 2) + 'px';
        plotDiv.style.margin = margin + 'px';
        plotDiv.style.boxSizing = 'border-box';
        if (window.Plotly) {
            Plotly.relayout(plotDiv, {
                width: plotDiv.clientWidth,
                height: plotDiv.clientHeight
            });
            Plotly.Plots.resize(plotDiv);
        }
    });
    window._signalPlotWrapperResizeObserver.observe(wrapper);
}

/**
 * Display signal properties in the popup dialog
 * @param {Object} properties - Signal properties to display
 */
function displaySignalProperties(properties) {
    // This function is now a no-op since the Show Properties button and dialog are removed.
    // If you want to display properties elsewhere, implement here.
    // Otherwise, leave empty to avoid errors.
}

// =============================================================================
// SIGNAL COMPARISON
// =============================================================================

/**
 * Show the comparison section (no-op, always visible in new UI)
 */
function handleShowComparison() {
    // Instead of old logic, trigger the same logic as the test plot button
    if (window.Plotly) {
        const plotDiv = document.getElementById('dualSignalPlot');
        if (plotDiv) plotDiv.innerHTML = '';
        // Get current signal parameters from UI
        const params1 = {
            signal_type: document.getElementById('signalType').value,
            frequency: parseFloat(document.getElementById('frequency').value),
            amplitude: parseFloat(document.getElementById('amplitude').value),
            phase: parseFloat(document.getElementById('phase').value) * Math.PI / 180,
            duration: parseFloat(document.getElementById('duration').value),
            sample_rate: 200
        };
        // Generate a new signal with different parameters (e.g., +1 Hz frequency)
        const params2 = {
            ...params1,
            frequency: params1.frequency + 1
        };
        (async function() {
            try {
                const [resp1, resp2] = await Promise.all([
                    fetch('/basic_signals/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params1) }),
                    fetch('/basic_signals/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params2) })
                ]);
                const data1 = await resp1.json();
                const data2 = await resp2.json();
                if (data1.success && data2.success) {
                    const t = data1.signal.time;
                    Plotly.newPlot('dualSignalPlot', [
                        { x: t, y: data1.signal.amplitude, type: 'scatter', mode: 'lines', name: `${params1.signal_type.charAt(0).toUpperCase() + params1.signal_type.slice(1)} (${params1.frequency} Hz)`, line: { color: '#007bff' } },
                        { x: t, y: data2.signal.amplitude, type: 'scatter', mode: 'lines', name: `${params2.signal_type.charAt(0).toUpperCase() + params2.signal_type.slice(1)} (${params2.frequency} Hz)`, line: { color: '#7b2ff2' } }
                    ], {
                        title: 'Compare: Current and New Signal',
                        xaxis: { title: 'Time (s)' },
                        yaxis: { title: 'Amplitude' },
                        plot_bgcolor: '#fafafa',
                        paper_bgcolor: '#fff',
                        margin: { l: 60, r: 30, t: 50, b: 50 },
                        height: document.getElementById('dualSignalPlotWrapper').offsetHeight || 320,
                        width: document.getElementById('dualSignalPlotWrapper').offsetWidth || 600
                    }, { responsive: true });
                } else {
                    Plotly.purge('dualSignalPlot');
                    plotDiv.innerHTML = '<div style="color:red;padding:16px;">Failed to generate comparison signals.</div>';
                }
            } catch (err) {
                Plotly.purge('dualSignalPlot');
                plotDiv.innerHTML = '<div style="color:red;padding:16px;">Error: ' + err.message + '</div>';
            }
        })();
    }
}

/**
 * Close the comparison section (no-op in new UI)
 */
function handleCloseComparison() {
    // No longer needed: comparison section is always visible in new UI
    // Optionally, clear the dual signal plot
    if (window.Plotly && document.getElementById('dualSignalPlot')) {
        Plotly.purge('dualSignalPlot');
    }
    window.lastComparedSignals = null;
}

/**
 * Get parameters for Signal 2 from the main signal controls (always use main controls)
 */
function getComparisonSignal2Parameters() {
    // Always use the main signal controls for Signal 2
    return {
        signalType: document.getElementById('signalType').value,
        frequency: parseFloat(document.getElementById('frequency').value),
        amplitude: parseFloat(document.getElementById('amplitude').value),
        phase: parseFloat(document.getElementById('phase').value),
        duration: parseFloat(document.getElementById('duration').value)
    };
}

/**
 * Generate signal comparison: Signal 1 is the current signal, Signal 2 is generated from main controls
 */
async function handleGenerateComparison() {
    try {
        showLoading(true);
        // Signal 1: use the current signal in AppState, or generate from current UI if missing
        let signal1 = AppState.currentSignal;
        if (!signal1) {
            const params = getSignalParameters();
            const response1 = await fetch('/basic_signals/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    signal_type: params.signalType,
                    frequency: params.frequency,
                    amplitude: params.amplitude,
                    phase: params.phase * Math.PI / 180,
                    duration: params.duration,
                    sample_rate: 200
                })
            });
            if (!response1.ok) throw new Error('Failed to generate Signal 1');
            const data1 = await response1.json();
            if (!data1.success) throw new Error(data1.error || 'Signal 1 generation failed');
            signal1 = data1.signal;
            AppState.currentSignal = signal1;
        }
        // Always (re)generate Signal 2 from main controls
        const signal2Params = getComparisonSignal2Parameters();
        const response2 = await fetch('/basic_signals/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                signal_type: signal2Params.signalType,
                frequency: signal2Params.frequency,
                amplitude: signal2Params.amplitude,
                phase: signal2Params.phase * Math.PI / 180,
                duration: signal2Params.duration,
                sample_rate: 200
            })
        });
        if (!response2.ok) throw new Error('Failed to generate Signal 2');
        const data2 = await response2.json();
        if (!data2.success) throw new Error(data2.error || 'Signal 2 generation failed');
        // Ensure the new plot area is visible and clear any old plot
        const dualPlot = document.getElementById('dualSignalPlot');
        if (dualPlot && window.Plotly) {
            Plotly.purge('dualSignalPlot');
        }
        document.getElementById('dualSignalPlotWrapper').style.display = 'block';
        // Plot both signals and their sum in the new area
        plotDualSignal(signal1, data2.signal, data2.signal.time);
    } catch (error) {
        console.error('❌ Error generating comparison:', error);
        showError('Comparison generation failed: ' + error.message);
    } finally {
        showLoading(false);
    }
}

/**
 * Plot both signals and their sum in the dual signal plot area
 * @param {Object} signal1 - First signal
 * @param {Object} signal2 - Second signal
 * @param {Array} time - Time array
 */
function plotDualSignal(signal1, signal2, time) {
    try {
        const plotDiv = document.getElementById('dualSignalPlot');
        if (!plotDiv) {
            showError('Plot container for dual signal does not exist.');
            console.error('❌ dualSignalPlot element missing.');
            return;
        }
        if (!signal1 || !signal2 || !time) {
            showError('Both signals and time array are required for comparison.');
            console.error('❌ Missing signal1, signal2, or time:', { signal1, signal2, time });
            return;
        }
        if (!Array.isArray(signal1.amplitude) || !Array.isArray(signal2.amplitude) || !Array.isArray(time)) {
            showError('Signal data arrays are invalid.');
            console.error('❌ Invalid data arrays:', { signal1, signal2, time });
            return;
        }
        if (signal1.amplitude.length !== signal2.amplitude.length || signal1.amplitude.length !== time.length) {
            showError('Signal arrays are not the same length.');
            console.error('❌ Array length mismatch:', {
                signal1: signal1.amplitude.length,
                signal2: signal2.amplitude.length,
                time: time.length
            });
            return;
        }
        const signalConfig1 = SignalConfig[signal1.type];
        const signalConfig2 = SignalConfig[signal2.type];
        const sumY = signal1.amplitude.map((v, i) => v + signal2.amplitude[i]);
        const trace1 = {
            x: time,
            y: signal1.amplitude,
            type: 'scatter',
            mode: 'lines',
            name: `${signalConfig1.name} (${signal1.properties.frequency} Hz)` ,
            line: { color: signalConfig1.color, width: 2 },
            hovertemplate: '<b>%{fullData.name}</b><br>Time: %{x:.3f} s<br>Amplitude: %{y:.3f} V<br><extra></extra>',
            xaxis: 'x1', yaxis: 'y1'
        };
        const trace2 = {
            x: time,
            y: signal2.amplitude,
            type: 'scatter',
            mode: 'lines',
            name: `${signalConfig2.name} (${signal2.properties.frequency} Hz)` ,
            line: { color: signalConfig2.color, width: 2 },
            hovertemplate: '<b>%{fullData.name}</b><br>Time: %{x:.3f} s<br>Amplitude: %{y:.3f} V<br><extra></extra>',
            xaxis: 'x1', yaxis: 'y1'
        };
        const sumTrace = {
            x: time,
            y: sumY,
            type: 'scatter',
            mode: 'lines',
            name: 'Sum (Signal 1 + Signal 2)',
            line: { color: '#111', width: 2, dash: 'dot' },
            hovertemplate: '<b>Sum</b><br>Time: %{x:.3f} s<br>Amplitude: %{y:.3f} V<br><extra></extra>',
            xaxis: 'x2', yaxis: 'y2'
        };
        const layout = {
            grid: { rows: 2, columns: 1, pattern: 'independent', roworder: 'top to bottom' },
            yaxis: { title: 'Amplitude (V)', gridcolor: '#e0e0e0', showgrid: true },
            xaxis: { title: 'Time (s)', gridcolor: '#e0e0e0', showgrid: true },
            xaxis2: { title: 'Time (s)', gridcolor: '#e0e0e0', showgrid: true },
            yaxis2: { title: 'Sum Amplitude (V)', gridcolor: '#e0e0e0', showgrid: true },
            plot_bgcolor: '#fafafa',
            paper_bgcolor: '#ffffff',
            margin: { l: 60, r: 30, t: 50, b: 50 },
            hovermode: 'x unified',
            showlegend: true,
            legend: {
                x: 0.02,
                y: 0.98,
                bgcolor: 'rgba(255,255,255,0.8)',
                bordercolor: '#333',
                borderwidth: 1
            },
            title: {
                text: 'Signal Comparison (top) and Sum (bottom)',
                font: { size: 18, family: 'Arial' }
            },
            height: document.getElementById('dualSignalPlotWrapper')?.clientHeight || 700,
            width: document.getElementById('dualSignalPlotWrapper')?.clientWidth || 900
        };
        const config = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
            displaylogo: false
        };
        Plotly.newPlot('dualSignalPlot', [trace1, trace2, sumTrace], layout, config);
        // Responsive resizing
        const wrapper = document.getElementById('dualSignalPlotWrapper');
        if (wrapper && plotDiv && window.Plotly) {
            const resizeObserver = new ResizeObserver(() => {
                Plotly.relayout(plotDiv, {
                    width: wrapper.offsetWidth,
                    height: wrapper.offsetHeight
                });
                Plotly.Plots.resize(plotDiv);
            });
            resizeObserver.observe(wrapper);
        }
    } catch (error) {
        showError('Dual signal plotting failed: ' + error.message);
        console.error('❌ Plotly error:', error);
    }
}

// =============================================================================
// EDUCATIONAL CONTENT
// =============================================================================

/**
 * Show information about the selected signal type
 */
async function handleShowInfo() {
    try {
        const signalType = document.getElementById('signalType').value;

        // Always use static info for the popup
        const info = getStaticSignalInfo(signalType);

        // Ensure the info dialog exists or create it
        let infoDialog = document.getElementById('signalInfoDialog');
        if (!infoDialog) {
            infoDialog = document.createElement('div');
            infoDialog.id = 'signalInfoDialog';
            infoDialog.className = 'dialog-overlay';
            infoDialog.style.position = 'fixed';
            infoDialog.style.top = '0';
            infoDialog.style.left = '0';
            infoDialog.style.width = '100vw';
            infoDialog.style.height = '100vh';
            infoDialog.style.background = 'rgba(0,0,0,0.25)';
            infoDialog.style.display = 'flex';
            infoDialog.style.alignItems = 'center';
            infoDialog.style.justifyContent = 'center';
            infoDialog.innerHTML = `
                <div class="dialog-box" style="background: #fff; color: #222; min-width: 320px; max-width: 480px; border-radius: 8px; box-shadow: 0 2px 16px rgba(0,0,0,0.15); padding: 20px;">
                    <div class="dialog-header" style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0;">ℹ️ Signal Information</h3>
                        <button id="closeSignalInfoBtn" class="close-btn" style="font-size: 1.5em; background: none; border: none; cursor: pointer;">&times;</button>
                    </div>
                    <div class="dialog-content" id="signalInfoContent" style="margin-top: 12px;">
                        <p>Loading...</p>
                    </div>
                </div>
            `;
            document.body.appendChild(infoDialog);

            // Close button logic
            document.getElementById('closeSignalInfoBtn').onclick = function () {
                infoDialog.style.display = 'none';
            };
            // Close on overlay click
            infoDialog.onclick = function (e) {
                if (e.target === infoDialog) infoDialog.style.display = 'none';
            };
        } else {
            infoDialog.style.display = 'flex';
        }

        // Print static info in the dialog
        displaySignalInfo(info);

    } catch (error) {
        console.error('❌ Error showing signal info:', error);
        showError('Failed to load signal information: ' + error.message);
    }
}

/**
 * Display signal information in the info dialog
 * @param {Object} info - Signal information
 */
function displaySignalInfo(info) {
    const infoContent = document.getElementById('signalInfoContent');
    if (!infoContent) return;
    infoContent.innerHTML = `
        <h4>${info.name}</h4>
        <p><strong>Description:</strong> ${info.description}</p>
        <div class="signal-formula">
            <strong>Formula:</strong> ${info.formula}
        </div>
        <div class="mt-3">
            <strong>Properties:</strong>
            <ul class="signal-properties-list">
                ${info.properties.map(prop => `<li>${prop}</li>`).join('')}
            </ul>
        </div>
        <div class="mt-3">
            <strong>Applications:</strong>
            <ul class="signal-properties-list">
                ${info.applications.map(app => `<li>${app}</li>`).join('')}
            </ul>
        </div>
    `;
}

// --- Add a static fallback for signal info ---
function getStaticSignalInfo(type) {
    const infoMap = {
        sine: {
            name: "Sine Wave",
            description: "A smooth, periodic oscillation that is fundamental in signal processing and physics.",
            formula: "A·sin(2πft + φ)",
            properties: [
                "Continuous and periodic",
                "Single frequency component",
                "Peak amplitude: A",
                "Frequency: f (Hz)",
                "Phase: φ (radians or degrees)"
            ],
            applications: [
                "AC power",
                "Audio signals",
                "Radio waves",
                "Mathematical modeling"
            ]
        },
        cosine: {
            name: "Cosine Wave",
            description: "A sine wave shifted by 90°, commonly used in trigonometry and signal analysis.",
            formula: "A·cos(2πft + φ)",
            properties: [
                "Continuous and periodic",
                "Single frequency component",
                "Peak amplitude: A",
                "Frequency: f (Hz)",
                "Phase: φ (radians or degrees)"
            ],
            applications: [
                "Signal modulation",
                "Fourier analysis",
                "Physics and engineering"
            ]
        },
        square: {
            name: "Square Wave",
            description: "A non-sinusoidal periodic waveform that alternates between two levels with a 50% duty cycle.",
            formula: "A·sgn(sin(2πft + φ))",
            properties: [
                "Discontinuous, sharp transitions",
                "Contains odd harmonics",
                "Peak amplitude: A",
                "Frequency: f (Hz)"
            ],
            applications: [
                "Digital clocks",
                "Timing circuits",
                "Switching signals"
            ]
        },
        triangle: {
            name: "Triangle Wave",
            description: "A non-sinusoidal waveform with linear rise and fall, resembling a triangle.",
            formula: "A·(2/π)·arcsin(sin(2πft + φ))",
            properties: [
                "Continuous, linear slopes",
                "Contains odd harmonics (faster decay than square)",
                "Peak amplitude: A",
                "Frequency: f (Hz)"
            ],
            applications: [
                "Audio synthesis",
                "Signal testing",
                "Function generators"
            ]
        },
        sawtooth: {
            name: "Sawtooth Wave",
            description: "A non-sinusoidal waveform with a linear rise and a sharp drop (or vice versa).",
            formula: "A·(2(t/T - floor(0.5 + t/T)))",
            properties: [
                "Contains both even and odd harmonics",
                "Sharp transitions",
                "Peak amplitude: A",
                "Frequency: f (Hz)"
            ],
            applications: [
                "Music synthesis",
                "Oscilloscopes",
                "Television scanning"
            ]
        }
    };
    return infoMap[type] || {
        name: "Unknown Signal",
        description: "No information available.",
        formula: "-",
        properties: [],
        applications: []
    };
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Handle parameter change events
 */
/**
 * Handle reset button click
 */
function handleReset() {
    // Reset form values
    document.getElementById('signalType').value = 'sine';
    document.getElementById('frequency').value = '1.0';
    document.getElementById('amplitude').value = '1.0';
    document.getElementById('phase').value = '0';
    document.getElementById('duration').value = '2.0';
    
    // Clear plots
    if (AppState.currentPlot) {
        Plotly.purge('signalPlot');
        AppState.currentPlot = null;
    }
    
    // Hide properties button
    const propertiesBtn = document.getElementById('showPropertiesBtn');
    if (propertiesBtn) {
        propertiesBtn.style.display = 'none';
    }
    
    // Hide properties dialog
    hidePropertiesDialog();
    
    // Clear info content
    const infoContent = document.getElementById('signalInfoContent');
    if (infoContent) {
        infoContent.innerHTML = '<p>Select a signal type and click the info button to learn more</p>';
    }
    
    // Close comparison
    handleCloseComparison();
    
    // Clear current signal state
    AppState.currentSignal = null;
    AppState.currentProperties = null;
    
    console.log('🔄 Application reset');
}

/**
 * Handle keyboard shortcuts
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleKeyboardShortcuts(event) {
    if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
            case 'g':
                event.preventDefault();
                handleGenerateSignal();
                break;
            case 'r':
                event.preventDefault();
                handleReset();
                break;
            case 'i':
                event.preventDefault();
                handleShowInfo();
                break;
        }
    }
}

// =============================================================================
// QUICK ACTION HANDLERS
// =============================================================================

/**
 * Handle quick action button clicks
 * @param {string} action - The type of quick action
 */
function handleQuickAction(action) {
    switch (action) {
        case 'trigonometry':
            showTrigonometryDialog();
            break;
            
        default:
            console.warn(`Unknown quick action: ${action}`);
    }
}

/**
 * Show alert dialog for features coming soon
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 */
function showAlert(title, message) {
    alert(`${title}\n\n${message}`);
}

// =============================================================================
// MODULATION FEATURE
// =============================================================================
// TRIGONOMETRY FEATURE
// =============================================================================

/**
 * Show trigonometry dialog for unit circle and trig identities
 */
function showTrigonometryDialog() {
    const dialog = document.createElement('div');
    dialog.id = 'trigonometryDialog';
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
        <div class="modal-content trigonometry-modal">
            <div class="modal-header">
                <h2>📐 Trigonometry Explorer</h2>
                <button class="close-btn" onclick="closeTrigonometryDialog()">×</button>
            </div>
            <div class="modal-body">
                <div class="trig-controls">
                    <div class="control-group">
                        <label for="trigMode">Mode:</label>
                        <select id="trigMode" class="control-input">
                            <option value="unit_circle">Unit Circle</option>
                            <option value="identities">Trigonometric Identities</option>
                            <option value="phase_shift">Phase Relationships</option>
                        </select>
                    </div>
                    
                    <div class="param-grid">
                        <div class="param-group">
                            <label for="angleInput">Phase Angle (degrees):</label>
                            <input type="range" id="angleInput" class="range-input" min="0" max="360" step="15" value="0">
                            <span id="angleValue">0°</span>
                            <small class="param-hint">Only affects Phase Relationships mode</small>
                        </div>
                        
                        <div class="param-group">
                            <label for="frequencyTrig">Frequency (Hz):</label>
                            <input type="number" id="frequencyTrig" class="control-input" value="1.0" min="0.1" max="5" step="0.1">
                        </div>
                    </div>
                </div>
                
                <!-- Plot Container for Trigonometry -->
                <div id="trigonometryPlot" class="plot-container" style="height: 400px; margin: 20px 0;"></div>
                
                <div class="modal-buttons">
                    <button onclick="generateTrigonometry()" class="primary-btn">Generate Visualization</button>
                    <button onclick="closeTrigonometryDialog()" class="secondary-btn">Cancel</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Set up angle slider with real-time updates
    const angleInput = document.getElementById('angleInput');
    const angleValue = document.getElementById('angleValue');
    const modeSelect = document.getElementById('trigMode');
    const frequencyInput = document.getElementById('frequencyTrig');
    
    let updateTimeout;
    
    // Initially hide angle slider for non-phase modes
    const angleGroup = angleInput.closest('.param-group');
    if (modeSelect.value !== 'phase_shift') {
        angleGroup.style.display = 'none';
    }
    
    // Update angle display and trigger real-time visualization
    angleInput.addEventListener('input', (e) => {
        const angle = e.target.value;
        angleValue.textContent = angle + '°';
        
        // Only update visualization in real-time for phase_shift mode
        if (modeSelect.value === 'phase_shift') {
            // Debounce the updates to avoid too many API calls
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(() => {
                generateTrigonometryRealTime();
            }, 150);
        }
    });
    
    // Update visualization when frequency changes
    frequencyInput.addEventListener('input', (e) => {
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
            generateTrigonometryRealTime();
        }, 200);
    });
    
    // Update visualization when mode changes
    modeSelect.addEventListener('change', (e) => {
        const mode = e.target.value;
        // Show/hide angle slider based on mode
        const angleGroup = angleInput.closest('.param-group');
        if (mode === 'phase_shift') {
            angleGroup.style.display = 'block';
            // Generate immediately for phase_shift mode
            generateTrigonometryRealTime();
        } else {
            angleGroup.style.display = 'none';
            // Generate for other modes
            generateTrigonometryRealTime();
        }
    });
    
    // Generate initial visualization
    setTimeout(() => {
        generateTrigonometryRealTime();
    }, 100);
    
    // Close on overlay click
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            closeTrigonometryDialog();
        }
    });
}

/**
 * Close trigonometry dialog
 */
function closeTrigonometryDialog() {
    const dialog = document.getElementById('trigonometryDialog');
    if (dialog) {
        dialog.remove();
    }
}

/**
 * Generate trigonometry visualization
 */
async function generateTrigonometry() {
    try {
        const mode = document.getElementById('trigMode').value;
        const angle = parseFloat(document.getElementById('angleInput').value);
        const frequency = parseFloat(document.getElementById('frequencyTrig').value);
        
        showLoading(true);
        
        const response = await fetch('/basic_signals/api/trigonometry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                mode: mode,
                angle: angle,
                frequency: frequency,
                duration: 2.0,
                sample_rate: 200
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            plotTrigonometry(data);
            // Don't close dialog to allow real-time updates
        } else {
            throw new Error(data.error || 'Trigonometry generation failed');
        }
        
    } catch (error) {
        console.error('❌ Error generating trigonometry:', error);
        showError('Trigonometry generation failed: ' + error.message);
    } finally {
        showLoading(false);
    }
}

/**
 * Generate trigonometry visualization in real-time (for interactive updates)
 */
async function generateTrigonometryRealTime() {
    try {
        // Get current values from the modal
        const modeElement = document.getElementById('trigMode');
        const angleElement = document.getElementById('angleInput');
        const frequencyElement = document.getElementById('frequencyTrig');
        
        // Check if elements exist (modal might be closed)
        if (!modeElement || !angleElement || !frequencyElement) {
            return;
        }
        
        const mode = modeElement.value;
        const angle = parseFloat(angleElement.value);
        const frequency = parseFloat(frequencyElement.value);
        
        const response = await fetch('/basic_signals/api/trigonometry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                mode: mode,
                angle: angle,
                frequency: frequency,
                duration: 2.0,
                sample_rate: 200
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            plotTrigonometry(data);
        } else {
            console.error('Trigonometry generation failed:', data.error);
        }
        
    } catch (error) {
        console.error('❌ Error generating trigonometry in real-time:', error);
        // Don't show error dialog for real-time updates to avoid spam
    }
}

/**
 * Plot trigonometry visualization
 */
function plotTrigonometry(data) {
    try {
        const plotContainer = 'trigonometryPlot';
        
        // Clean up previous plot
        if (document.getElementById(plotContainer)) {
            Plotly.purge(plotContainer);
        }
        
        const traces = [];
        
        if (data.mode === 'unit_circle') {
            traces.push(
                {
                    x: data.sine_wave.time,
                    y: data.sine_wave.amplitude,
                    type: 'scatter',
                    mode: 'lines',
                    name: 'sin(ωt)',
                    line: { color: '#007bff', width: 2 }
                },
                {
                    x: data.cosine_wave.time,
                    y: data.cosine_wave.amplitude,
                    type: 'scatter',
                    mode: 'lines',
                    name: 'cos(ωt)',
                    line: { color: '#dc3545', width: 2 }
                }
            );
        } else if (data.mode === 'identities') {
            traces.push(
                {
                    x: data.time,
                    y: data.identity_left,
                    type: 'scatter',
                    mode: 'lines',
                    name: data.identity_name + ' (Left)',
                    line: { color: '#007bff', width: 2 }
                },
                {
                    x: data.time,
                    y: data.identity_right,
                    type: 'scatter',
                    mode: 'lines',
                    name: data.identity_name + ' (Right)',
                    line: { color: '#dc3545', width: 2, dash: 'dash' }
                }
            );
        } else if (data.mode === 'phase_shift') {
            traces.push(
                {
                    x: data.time,
                    y: data.original_signal,
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Original Signal',
                    line: { color: '#007bff', width: 2 }
                },
                {
                    x: data.time,
                    y: data.phase_shifted_signal,
                    type: 'scatter',
                    mode: 'lines',
                    name: `Phase Shifted (${data.phase_shift}°)`,
                    line: { color: '#28a745', width: 2 }
                }
            );
        }
        
        const layout = {
            ...DefaultPlotLayout,
            title: `Trigonometry: ${data.mode.replace('_', ' ').toUpperCase()}`,
            yaxis: { title: 'Amplitude' },
            height: 380
        };
        
        const config = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d']
        };
        // Ensure plot fills wrapper on initial render
        const wrapper = document.getElementById('signalPlotWrapper');
        const plotDiv = document.getElementById('signalPlot');
        if (wrapper && plotDiv) {
            layout.width = plotDiv.clientWidth;
            layout.height = plotDiv.clientHeight;
        }
        Plotly.newPlot(plotContainer, traces, layout, config);
        
    } catch (error) {
        console.error('❌ Error plotting trigonometry:', error);
        showError('Plotting failed: ' + error.message);
    }
}

// =============================================================================
// TOGGLE FEATURE
// =============================================================================

/**
 * Handle signal toggle between sine and cosine with smooth animation
 */
function handleSignalToggle() {
    const currentType = document.getElementById('signalType').value;
    const newType = currentType === 'sine' ? 'cosine' : 'sine';
    
    // Update the signal type
    document.getElementById('signalType').value = newType;
    
    // Generate the new signal with smooth transition
    generateSignalWithTransition(newType);
}

/**
 * Generate signal with smooth transition animation
 */
async function generateSignalWithTransition(newType) {
    try {
        showLoading(true);
        
        const params = getSignalParameters();
        params.signalType = newType;
        
        const response = await fetch('/basic_signals/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                signal_type: params.signalType,
                frequency: params.frequency,
                amplitude: params.amplitude,
                phase: params.phase * Math.PI / 180,
                duration: params.duration,
                sample_rate: 200
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Store the new signal
            AppState.currentSignal = data.signal;
            
            // Plot with transition effect
            plotSignalWithTransition(data.signal);
            
            // Update properties
            displaySignalProperties(data.signal.properties);
            
            // Show notification
            showNotification(`✨ Toggled to ${newType.charAt(0).toUpperCase() + newType.slice(1)} Wave`);
        } else {
            throw new Error(data.error || 'Signal generation failed');
        }
        
    } catch (error) {
        console.error('❌ Error toggling signal:', error);
        showError('Signal toggle failed: ' + error.message);
    } finally {
        showLoading(false);
    }
}

/**
 * Plot signal with transition animation
 */
function plotSignalWithTransition(signal) {
    try {
        const signalConfig = SignalConfig[signal.type];
        
        const trace = {
            x: signal.time,
            y: signal.amplitude,
            type: 'scatter',
            mode: 'lines',
            name: signalConfig.name,
            line: {
                color: signalConfig.color,
                width: 2
            }
        };
        
        const layout = {
            ...DefaultPlotLayout,
            title: `${signalConfig.name} - Interactive Toggle`,
            transition: {
                duration: 500,
                easing: 'cubic-in-out'
            }
        };
        
        const config = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d']
        };
        
        if (AppState.currentPlot) {
            // Animate transition
            Plotly.animate('signalPlot', {
                data: [trace],
                layout: layout
            }, {
                transition: {
                    duration: 500,
                    easing: 'cubic-in-out'
                },
                frame: {
                    duration: 500,
                    redraw: true
                }
            });
        } else {
            // First plot
            // Ensure plot fills wrapper on initial render
            const wrapper = document.getElementById('signalPlotWrapper');
            const plotDiv = document.getElementById('signalPlot');
            if (wrapper && plotDiv) {
                layout.width = plotDiv.clientWidth;
                layout.height = plotDiv.clientHeight;
            }
            Plotly.newPlot('signalPlot', [trace], layout, config);
            AppState.currentPlot = 'signalPlot';
        }
        
    } catch (error) {
        console.error('❌ Error plotting signal transition:', error);
        showError('Plotting failed: ' + error.message);
    }
}

/**
 * Show notification message
 */
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 1000;
        font-weight: bold;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// =============================================================================
// CLEANUP
// =============================================================================

/**
 * Cleanup function for memory management
 */
function cleanup() {
    console.log('🧹 Cleaning up Basic Signals resources...');

    // Clear plots
    if (AppState.currentPlot) {
        try {
            Plotly.purge('signalPlot');
        } catch (e) {
            console.warn('Warning: Could not purge main plot:', e);
        }
        AppState.currentPlot = null;
    }

    // Clear state
    AppState.currentSignal = null;
    AppState.isLoading = false;

    console.log('✅ Basic Signals cleanup completed');
}

// =============================================================================
// INITIALIZATION
// =============================================================================

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
});

// Export for testing purposes (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AppState,
        SignalConfig,
        generateSignal,
        plotSignal,
        cleanup
    };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Debounce function to limit the rate of function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Show/hide loading indicator
 * @param {boolean} show - Whether to show loading indicator
 */
function showLoading(show) {
    const indicator = document.getElementById('loadingIndicator');
    AppState.isLoading = show;
    
    if (indicator) {
        if (show) {
            indicator.style.display = 'block';
        } else {
            indicator.style.display = 'none';
        }
    }
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    console.error('❌ Error:', message);
    
    // Create error notification
    const errorNotification = document.createElement('div');
    errorNotification.className = 'error-notification';
    errorNotification.textContent = message;
    errorNotification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 12px 20px;
        border-radius: 5px;
        z-index: 1001;
        font-weight: bold;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;
    
    document.body.appendChild(errorNotification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        errorNotification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (errorNotification.parentNode) {
                errorNotification.remove();
            }
        }, 300);
    }, 5000);
}

