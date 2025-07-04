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
    comparisonPlot: null,
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
    
    console.log('✅ Basic Signals Application initialized successfully');
}

/**
 * Set up all event listeners for the application
 */
function setupEventListeners() {
    // Signal generation controls
    document.getElementById('generateBtn').addEventListener('click', handleGenerateSignal);
    document.getElementById('resetBtn').addEventListener('click', handleReset);
    document.getElementById('infoBtn').addEventListener('click', handleShowInfo);
    
    // Quick Action buttons
    document.getElementById('trigonometry-btn').addEventListener('click', () => handleQuickAction('trigonometry'));
    
    // Properties dialog controls
    document.getElementById('showPropertiesBtn').addEventListener('click', showPropertiesDialog);
    document.getElementById('closePropertiesBtn').addEventListener('click', hidePropertiesDialog);
    
    // Close dialog when clicking on overlay
    document.getElementById('propertiesDialog').addEventListener('click', (e) => {
        if (e.target.id === 'propertiesDialog') {
            hidePropertiesDialog();
        }
    });
    
    // Comparison controls
    document.getElementById('compareBtn').addEventListener('click', handleShowComparison);
    document.getElementById('generateComparisonBtn').addEventListener('click', handleGenerateComparison);
    document.getElementById('closeComparisonBtn').addEventListener('click', handleCloseComparison);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
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
        
        const layout = {
            ...DefaultPlotLayout,
            title: {
                text: `${signalConfig.name} - ${signal.properties.frequency.toFixed(2)} Hz`,
                font: { size: 18, family: 'Arial' }
            }
        };
        
        const config = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
            displaylogo: false
        };
        
        Plotly.newPlot('signalPlot', [trace], layout, config);
        AppState.currentPlot = true;
        AppState.plotCount++;
        
        // Add fade-in animation
        const plotDiv = document.getElementById('signalPlot');
        plotDiv.classList.add('fade-in');
        
        console.log(`📊 Signal plotted successfully (Plot #${AppState.plotCount})`);
        
    } catch (error) {
        console.error('❌ Error plotting signal:', error);
        showError('Plotting failed: ' + error.message);
    }
}

/**
 * Display signal properties in the popup dialog
 * @param {Object} properties - Signal properties to display
 */
function displaySignalProperties(properties) {
    // Show the properties button
    const propertiesBtn = document.getElementById('showPropertiesBtn');
    propertiesBtn.style.display = 'block';
    
    // Store properties for dialog
    AppState.currentProperties = properties;
    
    // Update dialog content
    updatePropertiesDialog(properties);
}

/**
 * Update the properties dialog with current signal data
 * @param {Object} properties - Signal properties to display
 */
function updatePropertiesDialog(properties) {
    // Update each property value in the dialog
    document.getElementById('prop-frequency').textContent = properties.frequency.toFixed(2);
    document.getElementById('prop-period').textContent = properties.period.toFixed(3);
    document.getElementById('prop-amplitude').textContent = properties.peak_amplitude.toFixed(3);
    document.getElementById('prop-rms').textContent = properties.rms_value.toFixed(3);
    document.getElementById('prop-mean').textContent = properties.mean_value.toFixed(3);
    document.getElementById('prop-rate').textContent = properties.sample_rate.toString();
    document.getElementById('prop-duration').textContent = properties.duration.toFixed(1);
    document.getElementById('prop-samples').textContent = properties.num_samples.toString();
}

/**
 * Show the properties dialog
 */
function showPropertiesDialog() {
    const dialog = document.getElementById('propertiesDialog');
    dialog.style.display = 'flex';
    
    // Add fade-in animation
    setTimeout(() => {
        dialog.querySelector('.dialog-box').classList.add('fade-in');
    }, 10);
}

/**
 * Hide the properties dialog
 */
function hidePropertiesDialog() {
    const dialog = document.getElementById('propertiesDialog');
    if (dialog) {
        dialog.style.display = 'none';
        const dialogBox = dialog.querySelector('.dialog-box');
        if (dialogBox) {
            dialogBox.classList.remove('fade-in');
        }
    }
}

// =============================================================================
// SIGNAL COMPARISON
// =============================================================================

/**
 * Show the comparison section
 */
function handleShowComparison() {
    const comparisonSection = document.getElementById('comparisonSection');
    comparisonSection.style.display = 'block';
    comparisonSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Close the comparison section
 */
function handleCloseComparison() {
    const comparisonSection = document.getElementById('comparisonSection');
    if (comparisonSection) {
        comparisonSection.style.display = 'none';
    }
    
    // Clean up comparison plot
    if (AppState.comparisonPlot) {
        Plotly.purge('comparisonPlot');
        AppState.comparisonPlot = null;
    }
}

/**
 * Generate signal comparison
 */
async function handleGenerateComparison() {
    try {
        showLoading(true);
        
        const signalConfigs = getComparisonSignalConfigs();
        const duration = parseFloat(document.getElementById('duration').value);
        
        const response = await fetch('/basic_signals/api/compare', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                signals: signalConfigs,
                duration: duration,
                sample_rate: 200
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            plotComparison(data);
        } else {
            throw new Error(data.error || 'Comparison generation failed');
        }
        
    } catch (error) {
        console.error('❌ Error generating comparison:', error);
        showError('Comparison generation failed: ' + error.message);
    } finally {
        showLoading(false);
    }
}

/**
 * Get comparison signal configurations from UI
 * @returns {Array} Array of signal configurations
 */
function getComparisonSignalConfigs() {
    const signalConfigs = [];
    const configElements = document.querySelectorAll('.signal-config');
    
    configElements.forEach((element, index) => {
        const type = element.querySelector('.comp-signal-type').value;
        const frequency = parseFloat(element.querySelector('.comp-frequency').value);
        
        signalConfigs.push({
            type: type,
            frequency: frequency,
            amplitude: 1.0,
            phase: 0.0
        });
    });
    
    return signalConfigs;
}

/**
 * Plot signal comparison
 * @param {Object} data - Comparison data
 */
function plotComparison(data) {
    try {
        // Clean up previous comparison plot
        if (AppState.comparisonPlot) {
            Plotly.purge('comparisonPlot');
        }
        
        const traces = data.signals.map((signal, index) => {
            const signalConfig = SignalConfig[signal.type];
            
            return {
                x: data.time,
                y: signal.amplitude,
                type: 'scatter',
                mode: 'lines',
                name: `${signalConfig.name} (${signal.config.frequency} Hz)`,
                line: {
                    color: signalConfig.color,
                    width: 2
                },
                hovertemplate: '<b>%{fullData.name}</b><br>' +
                              'Time: %{x:.3f} s<br>' +
                              'Amplitude: %{y:.3f} V<br>' +
                              '<extra></extra>'
            };
        });
        
        const layout = {
            ...DefaultPlotLayout,
            title: {
                text: 'Signal Comparison',
                font: { size: 18, family: 'Arial' }
            }
        };
        
        const config = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
            displaylogo: false
        };
        
        Plotly.newPlot('comparisonPlot', traces, layout, config);
        AppState.comparisonPlot = true;
        
        console.log('📊 Comparison plot generated successfully');
        
    } catch (error) {
        console.error('❌ Error plotting comparison:', error);
        showError('Comparison plotting failed: ' + error.message);
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
        
        const response = await fetch(`/basic_signals/api/signal_info/${signalType}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            displaySignalInfo(data.info);
        } else {
            throw new Error(data.error || 'Failed to get signal information');
        }
        
    } catch (error) {
        console.error('❌ Error fetching signal info:', error);
        showError('Failed to load signal information: ' + error.message);
    }
}

/**
 * Display signal information in the info panel
 * @param {Object} info - Signal information
 */
function displaySignalInfo(info) {
    const infoContent = document.getElementById('signalInfoContent');
    
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
    
    // Add fade-in animation
    infoContent.classList.add('fade-in');
    
    // Scroll to info panel
    document.getElementById('signalInfo').scrollIntoView({ behavior: 'smooth' });
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
    
    if (AppState.comparisonPlot) {
        try {
            Plotly.purge('comparisonPlot');
        } catch (e) {
            console.warn('Warning: Could not purge comparison plot:', e);
        }
        AppState.comparisonPlot = null;
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
document.addEventListener('DOMContentLoaded', initializeApp);

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
