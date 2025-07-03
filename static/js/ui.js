// ui.js - Main User Interface Controller
// This file handles all DOM interactions, event listeners, and UI state management
// It coordinates between the signal processing backend and the plotting frontend

// Import required modules
import { state, FS, clearState } from './state.js';          // Application state management
import { generateSignal, simulateRCCircuit } from './signal.js'; // Signal generation and processing
import { plotAll, cleanupPlotly } from './plotting.js';      // Plotting functions using Plotly.js

// === PLOTLY LAYOUT CONSTANTS ===
// Define consistent margins for all plots to ensure proper label positioning
// These margins provide space for axis labels, titles, and legends
const PLOT_MARGIN = { l: 220, r: 60, t: 160, b: 150 }; // Left, Right, Top, Bottom margins in pixels
const FILTER_PLOT_MARGIN = { l: 220, r: 60, t: 160, b: 150 }; // Same margins for filter plots

// === MAIN APPLICATION INITIALIZATION ===
// This event listener runs when the DOM is fully loaded and ready for manipulation
window.addEventListener('DOMContentLoaded', () => {
    console.log('ui.js loaded');
    
    // === WINDOW RESIZE HANDLER ===
    // Automatically resize Plotly plots when the browser window is resized
    // This ensures plots remain properly sized and readable
    window.addEventListener('resize', () => {
        if (document.getElementById('plot')) {
            Plotly.Plots.resize('plot');
        }
    });

    // === INITIAL APPLICATION SETUP ===
    // Generate a default signal when the page first loads
    generateSignal();
    
    // Set up dropdown menus for analysis and operations
    setupAnalyzeDropdown();    // Real FFT, iFFT, Results analysis
    setupOperationsDropdown(); // Add, subtract, multiply, divide operations
    
    // Initialize UI button visibility based on current state
    updateApplyFilterButtonVisibility();    // Show/hide Apply Filter button
    updateDeconvolutionButtonVisibility();  // Show/hide Deconvolution button

    // === SIGNAL GENERATION CONTROLS ===
    // Set up the main signal generation button with throttling to prevent spam clicks
    const generateBtnInplot = document.getElementById('generateBtn_inplot');
    if (generateBtnInplot) {
        // Use throttled version to prevent excessive API calls
        generateBtnInplot.addEventListener('click', throttledGenerateSignal);
    }

    // === OVERLAY AND ANALYSIS CONTROLS ===
    // Add Overlay button - allows user to add a second signal for comparison
    const addOverlayBtnInplot = document.getElementById('addOverlayBtn_inplot');
    if (addOverlayBtnInplot) {
        addOverlayBtnInplot.addEventListener('click', function() {
            // Check if the addOverlay function exists before calling it
            if (typeof addOverlay === 'function') addOverlay();
            else console.warn('addOverlay function not defined');
        });
    }
    
    // Deconvolution button - reverses the effect of applied filters
    const deconvBtnInplot = document.getElementById('deconvBtn_inplot');
    if (deconvBtnInplot) {
        deconvBtnInplot.addEventListener('click', applyDeconvolution);
    }
    
    // Apply Filter button - applies the currently displayed filter response to the signal
    const applyFilterBtnInplot = document.getElementById('applyFilterBtn_inplot');
    if (applyFilterBtnInplot) {
        applyFilterBtnInplot.addEventListener('click', applyDisplayedFilter);
    }

    // === MEMORY CLEANUP CONTROL ===
    // Manual cleanup button for clearing memory and resetting the application
    const cleanupBtn = document.getElementById('cleanupBtn');
    if (cleanupBtn) {
        cleanupBtn.addEventListener('click', function() {
            // Ask user to confirm before clearing all data
            if (confirm('This will clear all data and reset the application. Continue?')) {
                performMemoryCleanup();
                alert('Memory cleanup completed!');
            }
        });
    }

    // === FILE MANAGEMENT DROPDOWN ===
    // Setup dropdown menu for file operations (save, load, export, etc.)
    const filesBtn = document.getElementById('filesBtn');
    const fileDropdown = document.querySelector('.file-dropdown');
    const fileDropdownContent = document.querySelector('.file-dropdown-content');
    if (filesBtn && fileDropdownContent) {
        // Toggle dropdown visibility when Files button is clicked
        filesBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent event bubbling
            fileDropdown.classList.toggle('show');
        });
        
        // Hide dropdown when clicking outside of it
        document.addEventListener('click', function(e) {
            if (!fileDropdownContent.contains(e.target) && e.target !== filesBtn) {
                fileDropdown.classList.remove('show');
            }
        });
    }

    // === FILTER OPERATIONS DROPDOWN ===
    // Setup dropdown menu for filter operations (highpass, lowpass, bandpass)
    const filterBtn = document.getElementById('filterBtn');
    const filterDropdown = document.getElementById('filterDropdownContent');
    if (filterBtn && filterDropdown) {
        // Toggle dropdown visibility when Filter button is clicked
        filterBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent event bubbling
            filterDropdown.classList.toggle('show');
        });
        
        // Hide dropdown when clicking outside of it
        document.addEventListener('click', function(e) {
            if (!filterDropdown.contains(e.target) && e.target !== filterBtn) {
                filterDropdown.classList.remove('show');
            }
        });
        
        // === FILTER TYPE BUTTON HANDLERS ===
        // Each filter type applies a different frequency filter to the signal
        document.getElementById('filterBtn_highPass').onclick = () => applyFilter('highpass');
        document.getElementById('filterBtn_lowPass').onclick = () => applyFilter('lowpass');
        document.getElementById('filterBtn_bandPass').onclick = () => applyFilter('bandpass');
    }

    // === SIGNAL TYPE CONFIGURATION ===
    // Handle multi-frequency signal configuration
    const signalTypeInplot = document.getElementById('signalType_inplot');
    const freqInput = document.getElementById('frequency_inplot');
    if (signalTypeInplot && freqInput) {
        signalTypeInplot.addEventListener('change', function() {
            if (this.value === 'multi') {
                // For multi-frequency signals, provide example frequencies
                freqInput.value = '120, 200, 300';
                freqInput.placeholder = 'e.g., 120, 200, 300';
            } else {
                // For single frequency signals, use default frequency
                freqInput.value = '50.12';
                freqInput.placeholder = 'Frequency (Hz)';
            }
        });
    }

    // === PHASE CONTROL ===
    // Real-time phase adjustment - regenerates signal when phase changes
    const phaseInputInplot = document.getElementById('phase_inplot');
    if (phaseInputInplot) {
        phaseInputInplot.addEventListener('input', function() {
            // Automatically regenerate signal when phase slider changes
            // This provides real-time feedback for phase adjustments
            generateSignal();
        });
    }

    // === RC CIRCUIT SIMULATION ===
    // Handle RC circuit simulation with step response analysis
    const rcSimBtn = document.getElementById('rcSimBtn');
    if (rcSimBtn) {
        rcSimBtn.addEventListener('click', async () => {
            // Extract RC circuit parameters from form inputs
            const R = parseFloat(document.getElementById('rcR').value);     // Resistance in Ohms
            const C = parseFloat(document.getElementById('rcC').value);     // Capacitance in Farads
            const V_in = parseFloat(document.getElementById('rcVin').value); // Input voltage in Volts
            const duration = parseFloat(document.getElementById('rcDuration').value); // Simulation duration in seconds
            const points = parseInt(document.getElementById('rcPoints').value); // Number of sample points
            
            // Validate all input parameters
            if (isNaN(R) || isNaN(C) || isNaN(V_in) || isNaN(duration) || isNaN(points)) {
                alert('Please enter valid RC circuit parameters.');
                return;
            }
            
            try {
                // Call backend to simulate RC circuit step response
                const result = await simulateRCCircuit(R, C, V_in, duration, points);
                
                // Plot the RC circuit response using Plotly
                // This replaces the main signal plot with the circuit response
                Plotly.newPlot('plot', [{
                    x: result.t,        // Time array
                    y: result.V_out,    // Output voltage array
                    type: 'scatter',
                    mode: 'lines',
                    name: 'RC Step Response',
                    line: { color: '#0074D9' }
                }], {
                    title: 'RC Circuit Step Response',
                    xaxis: { title: 'Time (s)' },
                    yaxis: { title: 'V_out (V)' },
                    margin: PLOT_MARGIN
                });
            } catch (err) {
                // Handle simulation errors
                alert('RC Circuit Error: ' + err.message);
            }
        });
    }
});

// === GLOBAL VARIABLES ===
// Global reference to signal type selector for multi-frequency warning system
const signalTypeSelect = document.getElementById('signalType_inplot');

// Snapshot storage for signal backup operations
let lastSignalSnapshot = null;

// === OVERLAY MANAGEMENT SYSTEM ===
/**
 * Adds an overlay signal to the current main signal for comparison
 * The overlay allows users to compare two different signals on the same plot
 */
function addOverlay() {
    // Validate that we have a main signal to overlay onto
    if (!state.signalData.length || !state.fftMagnitudes.length || !state.fftFreqAxis.length) {
        alert('Generate a main signal first before adding an overlay.');
        return;
    }
    
    // Set application state to wait for the next signal generation to become an overlay
    state.waitingForOverlay = true;
    window.waitingForOverlay = true;
    
    // Backup the current signal as the original/main signal
    // This preserves the original signal when adding overlays
    if (!state.originalSignal) {
        state.originalSignal = {
            signal: new Float32Array(state.signalData),           // Copy time-domain data
            time_axis: new Float32Array(state.time_axis),         // Copy time axis
            fft: new Float32Array(state.fftMagnitudes),           // Copy FFT magnitudes
            freq: new Float32Array(state.fftFreqAxis),            // Copy frequency axis
            fftReal: state.fftReal ? new Float32Array(state.fftReal) : null,           // Copy real FFT data
            fftImaginary: state.fftImaginary ? new Float32Array(state.fftImaginary) : null  // Copy imaginary FFT data
        };
    }
    
    // Track this action for undo functionality
    state.plotHistory.push({type: 'overlay'});
    
    // Update UI to show waiting state
    const addOverlayBtn = document.getElementById('addOverlayBtn_inplot');
    if (addOverlayBtn) {
        addOverlayBtn.textContent = 'Waiting for Overlay...';
        addOverlayBtn.style.backgroundColor = '#ff9500';  // Orange color to indicate waiting
    }
    
    alert('Current signal will remain as main signal. Now generate a new signal to add as overlay.');
}

// === DROPDOWN MENU SETUP FUNCTIONS ===

/**
 * Sets up the Analysis dropdown menu with Real FFT, iFFT, and Results options
 * These functions provide advanced signal analysis capabilities
 */
function setupAnalyzeDropdown() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const analyzeDropdown = document.getElementById('analyzeDropdown');
    if (analyzeBtn && analyzeDropdown) {
        // Toggle dropdown visibility when Analyze button is clicked
        analyzeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            analyzeDropdown.classList.toggle('show');
        });
        
        // Hide dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!analyzeDropdown.contains(e.target) && e.target !== analyzeBtn) {
                analyzeDropdown.classList.remove('show');
            }
        });
        
        // === ANALYSIS FUNCTION BUTTONS ===
        
        // Real FFT button - shows real and imaginary components of the FFT
        const realFFTBtn = document.getElementById('realFFTBtn');
        if (realFFTBtn) {
            realFFTBtn.addEventListener('click', async () => {
                await showRealFFT();
            });
        }
        
        // Inverse FFT button - converts frequency domain back to time domain
        const iFFTBtn = document.getElementById('iFFTBtn');
        if (iFFTBtn) {
            iFFTBtn.addEventListener('click', async () => {
                await showIFFT();
            });
        }
        
        // Results button - shows comprehensive analysis of signal operations
        const resultsBtn = document.getElementById('resultsBtn');
        if (resultsBtn) {
            resultsBtn.addEventListener('click', async () => {
                await showResults();
            });
        }
    }
}

/**
 * Sets up the Operations dropdown menu for signal-to-signal mathematical operations
 * Allows users to add, subtract, multiply, or divide two signals
 */
function setupOperationsDropdown() {
    const operationsBtn = document.getElementById('operationsBtn');
    const operationsContent = document.getElementById('operationsDropdown');
    if (operationsBtn && operationsContent) {
        // Toggle dropdown visibility when Operations button is clicked
        operationsBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            operationsContent.classList.toggle('show');
        });
        
        // Hide dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!operationsContent.contains(e.target) && e.target !== operationsBtn) {
                operationsContent.classList.remove('show');
            }
        });
        
        // === MATHEMATICAL OPERATION BUTTONS ===
        // Define all available operations with their corresponding button IDs
        const operationButtons = [
            { id: 'opsBtn_add', op: 'add' },           // Addition: signal1 + signal2
            { id: 'opsBtn_subtract', op: 'subtract' }, // Subtraction: signal1 - signal2
            { id: 'opsBtn_multiply', op: 'multiply' }, // Multiplication: signal1 * signal2
            { id: 'opsBtn_divide', op: 'divide' }      // Division: signal1 / signal2
        ];
        
        // Set up event listeners for each operation button
        operationButtons.forEach(({ id, op }) => {
            const button = document.getElementById(id);
            button.addEventListener('click', async () => {
                // Validate that we have both original signal and overlay for operations
                if (state.originalSignal && state.overlays.length > 0) {
                    const overlay = state.overlays[state.overlays.length - 1]; // Get the latest overlay
                    try {
                        // Perform the mathematical operation on the two signals
                        const result = await window.signalToSignalOperation(
                            state.originalSignal.signal,  // First signal (original)
                            overlay.signal,                // Second signal (overlay)
                            op,                           // Operation type
                            FS                            // Sampling frequency
                        );
                        
                        // Update the main signal with the operation result
                        state.signalData = new Float32Array(result.signal);
                        state.fftMagnitudes = new Float32Array(result.fft);
                        state.fftFreqAxis = new Float32Array(result.freq_axis);
                        state.fftReal = new Float32Array(result.fft_real);
                        state.fftImaginary = new Float32Array(result.fft_imaginary);
                        
                        // Regenerate time axis for the result signal
                        const points = state.signalData.length;
                        state.time_axis = new Float32Array(points);
                        for (let i = 0; i < points; i++) {
                            state.time_axis[i] = i / FS;
                        }
                        
                        // Update the plot with the new result
                        plotAll();
                    } catch (error) {
                        alert(error.message);
                    }
                } else {
                    alert('You must have an original signal and add an overlay before using Operations.');
                }
            });
        });
    }
}

// === CLEAR BUTTON FUNCTIONALITY ===
/**
 * Clears all signal data and resets the application to initial state
 * This is a comprehensive reset that clears all stored signals, overlays, and filters
 */
document.getElementById('clearBtn').onclick = function() {
    // Clear all main signal data
    state.signalData = new Float32Array();
    state.time_axis = new Float32Array();
    state.fftMagnitudes = new Float32Array();
    state.fftFreqAxis = new Float32Array();
    state.fftReal = new Float32Array();
    state.fftImaginary = new Float32Array();
    
    // Clear overlay and backup data
    state.originalSignal = null;  // Clear original signal backup
    state.overlays = [];          // Clear all overlay signals
    
    // Clear filter-related data
    state.filteredSignal = undefined;
    state.filteredActive = false;
    state.filteredFft = undefined;
    state.filteredFftFreq = undefined;
    state.filterResponse = null;   // Clear filter response data
    state.filterImpulse = null;    // Clear stored filter impulse
    
    // Clear analysis data
    state.realFFT = null;          // Clear Real FFT data
    
    // Reset overlay waiting state
    state.waitingForOverlay = false;
    window.waitingForOverlay = false;
    
    // Reset UI elements to default state
    const addOverlayBtn = document.getElementById('addOverlayBtn_inplot');
    if (addOverlayBtn) {
        addOverlayBtn.textContent = 'Add Overlay';
        addOverlayBtn.style.backgroundColor = '';
    }
    
    // Update button visibility based on cleared state
    updateApplyFilterButtonVisibility();    // Hide Apply Filter button
    updateDeconvolutionButtonVisibility();  // Hide Deconvolution button
    
    // Refresh the plot to show empty state
    plotAll();
}

// === FILTER APPLICATION SYSTEM ===

/**
 * Applies a specific type of filter to the current signal
 * @param {string} type - Filter type: 'lowpass', 'highpass', or 'bandpass'
 */
async function applyFilter(type) {
    // Validate that we have signal data to filter
    if (!state.signalData || state.signalData.length === 0) {
        alert('Please generate a signal before applying a filter.');
        return;
    }
    
    // Set up basic filter parameters
    let params = { filterType: type, fs: FS, order: 4 };
    
    // Get filter-specific parameters from user input
    if (type === 'lowpass') {
        params.cutoff = prompt('Lowpass cutoff frequency (Hz, 10-1000):', 200) || 200;
    } else if (type === 'highpass') {
        params.cutoff = prompt('Highpass cutoff frequency (Hz, 1-990):', 100) || 100;
    } else if (type === 'bandpass') {
        params.lowcut = prompt('Bandpass LOW cutoff (Hz, 1-990):', 100) || 100;
        params.highcut = prompt('Bandpass HIGH cutoff (Hz, 10-1000):', 300) || 300;
    }
    
    // Send current signal to backend for filtering
    const signal = Array.from(state.signalData);
    const response = await fetch('/api/filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, signal })
    });
    
    const data = await response.json();
    
    if (data.filtered) {
        // Store the filtered signal results
        state.filteredSignal = new Float32Array(data.filtered);
        state.filteredActive = true;
        
        // Store FFT of filtered signal if available
        if (data.filtered_fft && data.filtered_freq_axis) {
            state.filteredFft = new Float32Array(data.filtered_fft);
            state.filteredFftFreq = new Float32Array(data.filtered_freq_axis);
        } else {
            state.filteredFft = null;
            state.filteredFftFreq = null;
        }
        
        // Track filter application for undo functionality
        state.plotHistory.push({type: 'filter'});
        
        // Update the plot with filtered signal
        plotAll();
    } else {
        // Handle filter errors
        let msg = data.error || 'Unknown error';
        if (msg.includes('length of the input vector') || msg.includes('padlen')) {
            msg = 'Please generate data first before applying a filter.';
        }
        alert('Filter error: ' + msg);
    }
}

// === FILTER VISUALIZATION SYSTEM ===

// Global variables for filter visualization
let filterViewActive = false;     // Track if filter view is currently active
let lastFilterFreqResponse = null; // Store last filter frequency response
let lastFilterParams = null;       // Store parameters of the currently displayed filter

/**
 * Filter View button handler - displays filter response without applying it
 * This allows users to visualize the filter before applying it to their signal
 */
const filterViewBtn = document.getElementById('filterBtn_view');
if (filterViewBtn) {
    filterViewBtn.onclick = async function() {
        // Validate that we have signal data before showing filter
        if (!state.signalData || state.signalData.length === 0) {
            alert('Please generate a signal before viewing a filter response.');
            return;
        }

        // Get filter type from user
        const filterType = prompt('Enter filter type (lowpass, highpass, bandpass):', 'lowpass');
        if (!filterType) return;

        // Set up filter parameters based on type
        let params = { filterType, fs: FS, order: 4 };
        if (filterType === 'lowpass') {
            params.cutoff = prompt('Lowpass cutoff frequency (Hz, 10-1000):', 200) || 200;
        } else if (filterType === 'highpass') {
            params.cutoff = prompt('Highpass cutoff frequency (Hz, 1-990):', 100) || 100;
        } else if (filterType === 'bandpass') {
            params.lowcut = prompt('Bandpass LOW cutoff (Hz, 1-990):', 100) || 100;
            params.highcut = prompt('Bandpass HIGH cutoff (Hz, 10-1000):', 300) || 300;
        } else {
            alert('Invalid filter type.');
            return;
        }
        
        // Save parameters for later use when applying the filter
        lastFilterParams = params;

        // Fetch filter visualization data from backend
        const response = await fetch('/api/filter_view', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        
        const data = await response.json();
        if (data.error) {
            alert('Error: ' + data.error);
            return;
        }

        // Store filter response in state for subplot display
        state.filterResponse = {
            freq: data.freq,           // Frequency axis
            mag: data.magnitude,       // Magnitude response
            phase: data.phase,         // Phase response
            impulse: data.impulse,     // Impulse response
            impulse_x: data.impulse_x  // Time axis for impulse response
        };

        // Update Apply Filter button visibility (show it since we have a filter response)
        updateApplyFilterButtonVisibility();

        // Re-plot everything including the new filter subplot
        plotAll();
    };
}

// === UNDO FUNCTIONALITY ===
/**
 * Handles undo operations for overlays, filters, and deconvolution
 * Allows users to revert their last action and return to previous state
 */
const undoBtn = document.getElementById('undo-btn');
if (undoBtn) {
    undoBtn.onclick = function() {
        // Get the last action from history
        const lastAction = state.plotHistory.pop();
        if (!lastAction) return; // Nothing to undo
        
        // Handle different types of undo operations
        if (lastAction.type === 'overlay') {
            // Undo overlay addition
            state.overlays = [];
            state.originalSignal = null; // Clear the original signal backup
            
            // Reset overlay waiting state and button appearance
            state.waitingForOverlay = false;
            window.waitingForOverlay = false;
            const addOverlayBtn = document.getElementById('addOverlayBtn_inplot');
            if (addOverlayBtn) {
                addOverlayBtn.textContent = 'Add Overlay';
                addOverlayBtn.style.backgroundColor = '';
            }
        } else if (lastAction.type === 'filter') {
            // Undo filter application
            state.filteredActive = false;
            state.filteredSignal = null;
            state.filteredFft = null;
            state.filteredFftFreq = null;
        } else if (lastAction.type === 'deconvolution') {
            // Undo deconvolution - restore original signals
            if (lastAction.originalSignal) {
                state.signalData = lastAction.originalSignal;
                state.fftMagnitudes = lastAction.originalFFT;
                state.fftFreqAxis = lastAction.originalFFTFreq;
            }
            if (lastAction.filteredSignal) {
                state.filteredSignal = lastAction.filteredSignal;
                state.filteredFft = lastAction.filteredFFT;
                state.filteredFftFreq = lastAction.filteredFFTFreq;
                state.filteredActive = true;
            }
            state.overlays = [];
        }
        
        // Update button visibility after undo
        updateApplyFilterButtonVisibility();
        updateDeconvolutionButtonVisibility();
        
        // Refresh the plot to show the reverted state
        plotAll();
    };
}

// === APPLICATION STATE MONITORING ===
/**
 * Shows detailed information about the current application state
 * Useful for debugging and understanding what signals are currently loaded
 */
const showStateBtn = document.getElementById('showStateBtn');
if (showStateBtn) {
    showStateBtn.onclick = function() {
        let msg = '';
        
        // Get lengths of various signal components
        const mainLen = state.signalData && state.signalData.length ? state.signalData.length : 0;
        const originalLen = (state.originalSignal && state.originalSignal.signal.length) ? state.originalSignal.signal.length : 0;
        const overlayLen = (state.overlays && state.overlays.length && state.overlays[state.overlays.length-1].signal.length) ? state.overlays[state.overlays.length-1].signal.length : 0;
        
        // Build status message
        msg += 'Current main signal: ' + (mainLen ? `${mainLen} points` : 'none') + '\n';
        msg += 'Original signal: ' + (originalLen ? `${originalLen} points` : 'none') + '\n';
        msg += 'Overlay signals: ' + (overlayLen ? `${overlayLen} points` : 'none') + '\n';
        msg += 'Filtered signal: ' + (state.filteredSignal && state.filteredSignal.length ? `${state.filteredSignal.length} points` : 'none') + '\n';
        msg += 'Filtered active: ' + (state.filteredActive ? 'yes' : 'no') + '\n';
        msg += 'Waiting for overlay: ' + (window.waitingForOverlay ? 'yes' : 'no') + '\n';
        
        // Add contextual information about what operations are possible
        if (state.filteredActive && state.filteredSignal && state.filteredSignal.length) {
            msg += '\nIf you apply a filter now, it will act on the main signal (not the overlay or filtered signal).';
        } else if (mainLen) {
            msg += '\nIf you apply a filter now, it will act on the main signal.';
        } else {
            msg += '\nNo main signal present: filtering is not possible.';
        }
        
        if (state.originalSignal && state.overlays && state.overlays.length) {
            msg += '\nIf you perform an operation (add, subtract, etc), it will use the original signal and the overlay.';
        } else if (window.waitingForOverlay) {
            msg += '\nWaiting for overlay: Generate a new signal to create an overlay.';
        }
        
        // Warning for different sample sizes
        if (originalLen && overlayLen && originalLen !== overlayLen) {
            msg += '\n\n%RED%Different sample size detected between original and overlay! Operations might not work!%ENDRED%';
        }
        
        // Display the message (with HTML formatting if needed)
        if (msg.includes('%RED%')) {
            // Show as HTML popup with red text formatting
            const htmlMsg = msg.replace(/%RED%(.+?)%ENDRED%/g, '<span style="color:red;">$1</span>').replace(/\n/g, '<br>');
            const win = window.open('', '', 'width=500,height=400');
            win.document.write('<html><body style="font-family:sans-serif;font-size:1.1em;padding:2em;">' + htmlMsg + '<br><br><button onclick="window.close()" style="font-size:1em;">Close</button></body></html>');
            win.document.close();
        } else {
            alert(msg);
        }
    };
}

// === MULTI-FREQUENCY SIGNAL WARNING SYSTEM ===
/**
 * Shows persistent warning when multi-frequency signals are used
 * Multi-frequency signals may have different sample sizes than regular signals
 */
function showMultiWarningBox(show) {
    const box = document.getElementById('multi-warning');
    if (!box) return;
    
    if (show) {
        box.style.display = '';
        box.textContent = '⚠️ Multi signal type may have a different size than other signals. If you want to compare another signal to a multi signal, generate the multi signal first, then add overlays. Do not overlay a multi signal onto a non-multi signal.';
    } else {
        box.style.display = 'none';
        box.textContent = '';
    }
}

// Set up warning system for multi-frequency signals
if (signalTypeSelect) {
    // Show warning when user changes to multi-frequency signal type
    signalTypeSelect.addEventListener('change', function() {
        showMultiWarningBox(this.value === 'multi');
    });
    
    // Show warning on page load if multi is already selected
    showMultiWarningBox(signalTypeSelect.value === 'multi');
}

// === SIGNAL GENERATION PATCHING ===
/**
 * Patch the generateSignal function to show multi-frequency warning after generation
 * This ensures the warning appears whenever a multi-frequency signal is generated
 */
if (!window._generateSignalPatched) {
    const originalGenerateSignal = generateSignal;
    window.generateSignal = async function(...args) {
        await originalGenerateSignal.apply(this, args);
        // Show warning after generating multi-frequency signal
        if (signalTypeSelect && signalTypeSelect.value === 'multi') {
            showMultiWarningBox(true);
        }
    };
    window._generateSignalPatched = true; // Prevent double patching
}

// === SECTION TOGGLE FUNCTIONALITY ===
/**
 * Handles switching between Signal Processing and Circuit Simulation sections
 * Allows users to toggle between different application modes
 */
const signalSection = document.getElementById('signal-section');
const circuitSection = document.getElementById('rc-circuit-section');
const showSignalBtn = document.getElementById('showSignalBtn');
const showCircuitBtn = document.getElementById('showCircuitBtn');

if (showSignalBtn && showCircuitBtn && signalSection && circuitSection) {
    // Show Signal Processing section and hide Circuit section
    showSignalBtn.addEventListener('click', () => {
        signalSection.style.display = '';
        circuitSection.style.display = 'none';
    });
    
    // Show Circuit Simulation section and hide Signal section
    showCircuitBtn.addEventListener('click', () => {
        signalSection.style.display = 'none';
        circuitSection.style.display = '';
    });
}

// === MODAL BUTTON SETUP ===
/**
 * Setup for modal-based filter application buttons
 * These buttons provide alternative access to filter functions through modal dialogs
 */
const applyFilterBtn = document.getElementById('applyFilterBtn');
const deconvBtnModal = document.getElementById('deconvBtn_modal');

// Setup Apply Filter button in modal
if (applyFilterBtn) {
    let lastApplyFunction = null;
    const origFilterViewBtn = document.getElementById('filterBtn_view');
    if (origFilterViewBtn) {
        // Wrap the original filter view button to capture the apply function
        const origOnClick = origFilterViewBtn.onclick;
        origFilterViewBtn.onclick = async function(...args) {
            if (typeof origOnClick === 'function') await origOnClick.apply(this, args);
            
            // Capture the apply function for use in modal
            if (typeof window.applyFunction === 'function') {
                lastApplyFunction = window.applyFunction;
            } else if (typeof applyFunction === 'function') {
                lastApplyFunction = applyFunction;
            }
            
            // Attach the apply function to the modal button
            if (lastApplyFunction) {
                applyFilterBtn.onclick = lastApplyFunction;
            }
        };
    }
}

// Setup Deconvolution button in modal
if (deconvBtnModal) {
    // Copy functionality from the main deconvolution button
    const deconvBtn = document.getElementById('deconvBtn');
    if (deconvBtn && typeof deconvBtn.onclick === 'function') {
        deconvBtnModal.onclick = deconvBtn.onclick;
    }
}

// === FILTER APPLICATION FUNCTIONS ===

/**
 * Applies the currently displayed filter response to the original signal
 * This function takes a filter that was visualized using "Filter View" and applies it to the actual signal
 */
async function applyDisplayedFilter() {
    // Validate that we have a filter response currently displayed
    if (!state.filterResponse || !lastFilterParams) {
        alert('No filter response is currently displayed. Use "Filter View" first to display a filter response.');
        return;
    }
    
    // Validate that we have signal data to apply the filter to
    if (!state.signalData || state.signalData.length === 0) {
        alert('No signal data available to filter. Generate a signal first.');
        return;
    }
    
    try {
        // Apply the filter using the stored parameters from the filter view
        const response = await fetch('/api/filter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                signal: Array.from(state.signalData),  // Convert to regular array for JSON
                ...lastFilterParams                     // Include all filter parameters
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert('Filter error: ' + data.error);
            return;
        }
        
        // Store the filtered signal results in application state
        state.filteredSignal = new Float32Array(data.filtered);
        state.filteredFft = new Float32Array(data.filtered_fft);
        state.filteredFftFreq = new Float32Array(data.filtered_freq_axis);
        state.filteredActive = true;
        
        // Preserve filter impulse response for potential deconvolution
        if (state.filterResponse && state.filterResponse.impulse) {
            state.filterImpulse = new Float32Array(state.filterResponse.impulse);
        }
        
        // Clear the filter response visualization (removes filter subplots)
        state.filterResponse = null;
        
        // Update UI button visibility
        updateApplyFilterButtonVisibility();    // Hide Apply Filter button
        updateDeconvolutionButtonVisibility();  // Show Deconvolution button
        
        // Track this action for undo functionality
        state.plotHistory.push({ type: 'filter' });
        
        // Update the plot to show the filtered signal
        plotAll();
        
        console.log('Filter applied successfully');
    } catch (error) {
        console.error('Error applying filter:', error);
        alert('Error applying filter: ' + error.message);
    }
}

// === PERFORMANCE OPTIMIZATION UTILITIES ===

/**
 * Throttling utility function to prevent excessive function calls
 * Limits function execution to once every 'delay' milliseconds
 * @param {Function} func - The function to throttle
 * @param {number} delay - Minimum delay between function calls in milliseconds
 * @returns {Function} - Throttled version of the function
 */
function throttle(func, delay) {
    let timeoutId;
    let lastExecTime = 0;
    
    return function (...args) {
        const currentTime = Date.now();
        
        // Execute immediately if enough time has passed
        if (currentTime - lastExecTime > delay) {
            func.apply(this, args);
            lastExecTime = currentTime;
        } else {
            // Schedule execution for later
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
                lastExecTime = Date.now();
            }, delay - (currentTime - lastExecTime));
        }
    };
}

// Create throttled version of signal generation to prevent spam clicking
const throttledGenerateSignal = throttle(generateSignal, 500); // 500ms throttle

// === UI BUTTON VISIBILITY MANAGEMENT ===

/**
 * Updates the visibility of the Apply Filter button based on current state
 * Button is shown only when a filter response is currently displayed
 */
function updateApplyFilterButtonVisibility() {
    const applyFilterBtn = document.getElementById('applyFilterBtn_inplot');
    if (applyFilterBtn) {
        // Show button only when filter response is present
        applyFilterBtn.style.display = state.filterResponse ? 'block' : 'none';
    }
}

/**
 * Updates the visibility of the Deconvolution button based on current state
 * Button is shown only when a filter has been applied (filtered signal exists)
 */
function updateDeconvolutionButtonVisibility() {
    const deconvBtn = document.getElementById('deconvBtn_inplot');
    if (deconvBtn) {
        // Show button only when a filter has been applied
        deconvBtn.style.display = state.filteredActive ? 'block' : 'none';
    }
}

// === DECONVOLUTION PROCESSING ===

/**
 * Applies deconvolution to the filtered signal to attempt recovery of the original signal
 * Deconvolution reverses the effect of filtering by using the filter's impulse response
 * This is an advanced signal processing technique that may be numerically unstable
 */
async function applyDeconvolution() {
    // Validate that we have a filtered signal to deconvolve
    if (!state.filteredActive || !state.filteredSignal || state.filteredSignal.length === 0) {
        alert('No filtered signal available for deconvolution. Apply a filter first.');
        return;
    }
    
    // Validate that we have the filter impulse response for deconvolution
    if (!state.filterImpulse || state.filterImpulse.length === 0) {
        alert('No filter impulse response available for deconvolution. The filter must be viewed before applying.');
        return;
    }
    
    try {
        // Send deconvolution request to backend
        const response = await fetch('/api/deconvolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filtered: Array.from(state.filteredSignal),         // Filtered signal data
                filter_impulse: Array.from(state.filterImpulse),    // Filter impulse response
                eps: 1e-6 // Regularization parameter to prevent numerical instability
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert('Deconvolution error: ' + data.error);
            return;
        }
        
        // Store original signals for potential undo operation
        const originalSignal = state.signalData;
        const originalFFT = state.fftMagnitudes;
        const originalFFTFreq = state.fftFreqAxis;
        
        // Replace main signal with deconvolved signal for cleaner display
        state.signalData = new Float32Array(data.deconvolved);
        state.fftMagnitudes = new Float32Array(data.deconv_fft);
        state.fftFreqAxis = new Float32Array(data.deconv_freq_axis);
        
        // Clear filtered signal and overlays to show only deconvolved result
        state.filteredActive = false;
        state.filteredSignal = null;
        state.filteredFft = null;
        state.filteredFftFreq = null;
        state.overlays = [];
        
        // Store original data in history for undo functionality
        state.plotHistory.push({ 
            type: 'deconvolution',
            originalSignal: originalSignal,
            originalFFT: originalFFT,
            originalFFTFreq: originalFFTFreq,
            filteredSignal: state.filteredSignal,
            filteredFFT: state.filteredFft,
            filteredFFTFreq: state.filteredFftFreq
        });
        
        // Update UI button visibility
        updateDeconvolutionButtonVisibility();
        
        // Update the plot with deconvolved signal
        plotAll();
        
        console.log('Deconvolution applied successfully');
        
        // Warn user about potential numerical instability
        if (data.unstable) {
            alert('Warning: Deconvolution may be unstable. Results should be interpreted carefully.');
        }
    } catch (error) {
        console.error('Error applying deconvolution:', error);
        alert('Error applying deconvolution: ' + error.message);
    }
}

// === ADVANCED SIGNAL ANALYSIS FUNCTIONS ===

/**
 * Performs Real FFT analysis showing real and imaginary components separately
 * This provides detailed insight into the frequency domain representation of the signal
 * Unlike the standard FFT view, this shows the complex components separately
 */
async function showRealFFT() {
    // Validate that we have signal data to analyze
    if (!state.signalData || state.signalData.length === 0) {
        alert('Please generate a signal before analyzing Real FFT.');
        return;
    }
    
    try {
        // Send signal to backend for Real FFT computation
        const response = await fetch('/api/real_fft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                signal: Array.from(state.signalData),  // Convert Float32Array to regular array
                fs: FS                                 // Include sampling frequency
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert('Real FFT Error: ' + data.error);
            return;
        }
        
        // Store the Real FFT components in application state
        state.realFFT = {
            real: new Float32Array(data.fft_real),        // Real component of FFT
            imaginary: new Float32Array(data.fft_imaginary), // Imaginary component of FFT
            magnitude: new Float32Array(data.fft_magnitude), // Magnitude (sqrt(real² + imag²))
            freq: new Float32Array(data.freq_axis)           // Frequency axis
        };
        
        // Display the Real FFT analysis as subplots
        plotRealFFT();
        
    } catch (error) {
        console.error('Error computing Real FFT:', error);
        alert('Error computing Real FFT: ' + error.message);
    }
}

/**
 * Plots Real FFT components as separate subplots
 * Creates a 3-panel view showing real part, imaginary part, and magnitude
 */
function plotRealFFT() {
    if (!state.realFFT) {
        console.error('No Real FFT data available');
        return;
    }
    
    const plotDiv = document.getElementById('plot');
    if (!plotDiv) {
        console.error('Plot div not found');
        return;
    }
    
    // Create traces for real, imaginary, and magnitude components
    const traces = [
        {
            x: state.realFFT.freq,
            y: state.realFFT.real,
            type: 'scatter',
            mode: 'lines',
            name: 'Real Part',
            line: { color: '#1f77b4' },  // Blue
            xaxis: 'x1',
            yaxis: 'y1'
        },
        {
            x: state.realFFT.freq,
            y: state.realFFT.imaginary,
            type: 'scatter',
            mode: 'lines',
            name: 'Imaginary Part',
            line: { color: '#ff7f0e' },  // Orange
            xaxis: 'x2',
            yaxis: 'y2'
        },
        {
            x: state.realFFT.freq,
            y: state.realFFT.magnitude,
            type: 'scatter',
            mode: 'lines',
            name: 'Magnitude',
            line: { color: '#2ca02c' },  // Green
            xaxis: 'x3',
            yaxis: 'y3'
        }
    ];
    
    // Define layout with 3 vertically stacked subplots
    const layout = {
        grid: { rows: 3, columns: 1, pattern: 'independent' },
        showlegend: true,
        autosize: true,
        margin: { l: 200, r: 60, t: 160, b: 150 },
        title: 'Real FFT Analysis',
        
        // Real part subplot (top)
        xaxis: { 
            title: { text: '', standoff: 20 }, 
            titlefont: { size: 12 }
        },
        yaxis: { 
            title: { text: 'Real Part', standoff: 30 }, 
            titlefont: { size: 12 }
        },
        
        // Imaginary part subplot (middle)
        xaxis2: { 
            title: { text: '', standoff: 20 }, 
            titlefont: { size: 12 }
        },
        yaxis2: { 
            title: { text: 'Imaginary Part', standoff: 30 }, 
            titlefont: { size: 12 }
        },
        
        // Magnitude subplot (bottom)
        xaxis3: { 
            title: { text: 'Frequency (Hz)', standoff: 20 }, 
            titlefont: { size: 12 }
        },
        yaxis3: { 
            title: { text: 'Magnitude', standoff: 30 }, 
            titlefont: { size: 12 }
        }
    };
    
    // Clear and render the plot
    Plotly.purge('plot');
    Plotly.newPlot('plot', traces, layout, {
        responsive: true,
        displayModeBar: true,
        displaylogo: false
    });
    
    console.log('Real FFT analysis plotted successfully');
}

/**
 * Performs Inverse FFT analysis to reconstruct time domain signal from frequency domain
 * This demonstrates the reversibility of the FFT transform by converting complex FFT data
 * back to the time domain and comparing it with the original signal
 */
async function showIFFT() {
    // Validate that we have complex FFT data available for inverse transformation
    if (!state.fftReal || state.fftReal.length === 0 || !state.fftImaginary || state.fftImaginary.length === 0) {
        alert('Please generate a signal first to have complex FFT data for inverse FFT analysis.');
        return;
    }
    
    try {
        // Send complex FFT data to backend for inverse FFT computation
        const response = await fetch('/api/ifft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fft_real: Array.from(state.fftReal),         // Real part of FFT
                fft_imaginary: Array.from(state.fftImaginary), // Imaginary part of FFT
                fs: FS                                        // Sampling frequency
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert('iFFT Error: ' + data.error);
            return;
        }
        
        // Create dual subplot layout: time domain and frequency domain of reconstructed signal
        const plotDiv = document.getElementById('plot');
        if (!plotDiv) {
            console.error('Plot div not found');
            return;
        }
        
        const traces = [
            // Time domain plot (top subplot)
            {
                x: data.time_axis,
                y: data.reconstructed_signal,
                type: 'scatter',
                mode: 'lines',
                name: 'Reconstructed Signal (iFFT)',
                line: { color: '#d62728' },  // Red
                xaxis: 'x',
                yaxis: 'y'
            },
            // Frequency domain plot (bottom subplot)
            {
                x: data.reconstructed_freq_axis,
                y: data.reconstructed_fft,
                type: 'scatter',
                mode: 'lines',
                name: 'FFT of Reconstructed Signal',
                line: { color: '#ff7f0e' },  // Orange
                xaxis: 'x2',
                yaxis: 'y2'
            }
        ];
        
        // Define layout with 2 vertically stacked subplots
        const layout = {
            title: 'Inverse FFT Analysis - Time and Frequency Domain',
            showlegend: true,
            autosize: true,
            margin: PLOT_MARGIN,
            
            // Time domain subplot (top)
            xaxis: {
                title: 'Time (s)',
                titlefont: { size: 12 },
                domain: [0, 1],           // Full width
                anchor: 'y'
            },
            yaxis: {
                title: 'Amplitude',
                titlefont: { size: 12 },
                domain: [0.55, 1],        // Top 45% of plot
                anchor: 'x'
            },
            
            // Frequency domain subplot (bottom)
            xaxis2: {
                title: 'Frequency (Hz)',
                titlefont: { size: 12 },
                domain: [0, 1],           // Full width
                anchor: 'y2'
            },
            yaxis2: {
                title: 'Magnitude',
                titlefont: { size: 12 },
                domain: [0, 0.45],        // Bottom 45% of plot
                anchor: 'x2'
            }
        };
        
        // Clear and render the plot
        Plotly.purge('plot');
        Plotly.newPlot('plot', traces, layout, {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
        });
        
        console.log('iFFT analysis plotted successfully');
        
    } catch (error) {
        console.error('Error computing iFFT:', error);
        alert('Error computing iFFT: ' + error.message);
    }
}

/**
 * Shows comprehensive results view with all current signal data
 * Creates a 3-row analysis layout showing original signals, operation results, and FFT comparison
 * This is the most comprehensive view available in the application
 */
async function showResults() {
    // Validate that we have basic signal data
    if (!state.signalData || state.signalData.length === 0) {
        alert('No signal data available. Please generate a signal first.');
        return;
    }
    
    // Validate that we have both original signal and overlay for meaningful results
    if (!state.originalSignal || !state.overlays || state.overlays.length === 0) {
        alert('Please add an overlay and perform an operation to see results.');
        return;
    }
    
    try {
        const plotDiv = document.getElementById('plot');
        if (!plotDiv) {
            console.error('Plot div not found');
            return;
        }
        
        // Get references to the signals for analysis
        const originalSig = state.originalSignal;                          // Original main signal
        const overlay = state.overlays[state.overlays.length - 1];         // Latest overlay signal
        
        // Create comprehensive 5-trace layout for detailed analysis
        const traces = [
            // ROW 1 - LEFT: Original main signal (time domain)
            {
                x: originalSig.time_axis,
                y: originalSig.signal,
                type: 'scatter',
                mode: 'lines',
                name: 'Original Signal',
                line: { color: '#1f77b4' },  // Blue
                xaxis: 'x1',
                yaxis: 'y1'
            },
            // ROW 1 - RIGHT: Second signal/overlay (time domain)
            {
                x: overlay.time_axis,
                y: overlay.signal,
                type: 'scatter',
                mode: 'lines',
                name: 'Overlay Signal',
                line: { color: '#ff7f0e' },  // Orange
                xaxis: 'x2',
                yaxis: 'y2'
            },
            // ROW 2 - FULL WIDTH: Operation result signal (time domain)
            {
                x: state.time_axis,
                y: state.signalData,
                type: 'scatter',
                mode: 'lines',
                name: 'Operation Result',
                line: { color: '#2ca02c', width: 3 },  // Green, thicker line
                xaxis: 'x3',
                yaxis: 'y3'
            },
            // ROW 3 - LEFT: FFT of original signal (frequency domain)
            {
                x: originalSig.freq,
                y: originalSig.fft,
                type: 'scatter',
                mode: 'lines',
                name: 'Original FFT',
                line: { color: '#1f77b4' },  // Blue (matches original signal)
                xaxis: 'x4',
                yaxis: 'y4'
            },
            // ROW 3 - RIGHT: FFT of result signal (frequency domain)
            {
                x: state.fftFreqAxis,
                y: state.fftMagnitudes,
                type: 'scatter',
                mode: 'lines',
                name: 'Result FFT',
                line: { color: '#2ca02c' },  // Green (matches result signal)
                xaxis: 'x5',
                yaxis: 'y5'
            }
        ];
        
        // If filtered data is available, show filtered FFT instead of duplicate result FFT
        if (state.filteredActive && state.filteredFft && state.filteredFftFreq) {
            traces[4] = {
                x: state.filteredFftFreq,
                y: state.filteredFft,
                type: 'scatter',
                mode: 'lines',
                name: 'Filtered FFT',
                line: { color: '#d62728' },  // Red
                xaxis: 'x5',
                yaxis: 'y5'
            };
        }
        
        // Define comprehensive 3-row, 2-column layout
        const layout = {
            title: 'Signal Operation Results',
            showlegend: true,
            autosize: true,
            margin: { l: 200, r: 60, t: 120, b: 80 },
            
            // ROW 1 - Original signals (top row, 2 columns)
            xaxis: {
                domain: [0, 0.48],        // Left column (48% width with gap)
                anchor: 'y1'
            },
            yaxis: {
                title: 'Amplitude',
                titlefont: { size: 12 },
                domain: [0.72, 1.0],      // Top row (28% height)
                anchor: 'x1'
            },
            xaxis2: {
                title: 'Time (s)',
                titlefont: { size: 12 },
                domain: [0.52, 1.0],      // Right column (48% width with gap)
                anchor: 'y2'
            },
            yaxis2: {
                domain: [0.72, 1.0],      // Top row (28% height)
                anchor: 'x2'
            },
            
            // ROW 2 - Results signal (middle row, full width)
            xaxis3: {
                domain: [0, 1.0],         // Full width
                anchor: 'y3'
            },
            yaxis3: {
                title: 'Result Ampl.',
                titlefont: { size: 12 },
                domain: [0.38, 0.66],     // Middle row (28% height)
                anchor: 'x3'
            },
            
            // ROW 3 - FFT comparison (bottom row, 2 columns)
            xaxis4: {
                title: 'Frequency (Hz)',
                titlefont: { size: 12 },
                domain: [0, 0.48],        // Left column
                anchor: 'y4'
            },
            yaxis4: {
                title: 'Magnitude',
                titlefont: { size: 12 },
                domain: [0, 0.32],        // Bottom row (32% height)
                anchor: 'x4'
            },
            xaxis5: {
                domain: [0.52, 1.0],      // Right column
                anchor: 'y5'
            },
            yaxis5: {
                domain: [0, 0.32],        // Bottom row (32% height)
                anchor: 'x5'
            }
        };
        
        // Clear and render the comprehensive results plot
        Plotly.purge('plot');
        Plotly.newPlot('plot', traces, layout, {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
        });
        
        console.log('3-row results analysis plotted successfully');
        
    } catch (error) {
        console.error('Error displaying results:', error);
        alert('Error displaying results: ' + error.message);
    }
}

// Memory monitoring function
function checkMemoryUsage() {
    if (performance.memory) {
        const memory = performance.memory;
        const usedMB = (memory.usedJSHeapSize / 1048576).toFixed(2);
        const totalMB = (memory.totalJSHeapSize / 1048576).toFixed(2);
        const limitMB = (memory.jsHeapSizeLimit / 1048576).toFixed(2);
        
        console.log(`Memory Usage: ${usedMB}MB / ${totalMB}MB (Limit: ${limitMB}MB)`);
        
        // Warn if memory usage is high
        if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
            console.warn('High memory usage detected. Consider clearing state.');
        }
    }
}

// Add memory cleanup function
function performMemoryCleanup() {
    console.log('Performing memory cleanup...');
    clearState();
    cleanupPlotly();
    if (window.gc) {
        window.gc(); // Force garbage collection in Chrome with --js-flags="--expose-gc"
    }
    checkMemoryUsage();
}

// Add periodic memory monitoring (every 30 seconds)
setInterval(checkMemoryUsage, 30000);

// Global cleanup function
function cleanup() {
    performMemoryCleanup();
}

// Add cleanup on page unload
window.addEventListener('beforeunload', cleanup);
window.addEventListener('pagehide', cleanup);