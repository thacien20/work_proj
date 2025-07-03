// ui.js
import { state, FS } from './state.js';
import { generateSignal, simulateRCCircuit } from './signal.js';
import { plotAll } from './plotting.js';

// === Plotly layout constants for consistent sizing ===
// These are no longer needed as Plotly will autosize.
// const PLOT_HEIGHT = 600;
// const PLOT_WIDTH = 900;
// const FILTER_PLOT_HEIGHT = 400;
// const FILTER_PLOT_WIDTH = 600;
const PLOT_MARGIN = { l: 220, r: 60, t: 160, b: 150 }; // Updated margins for better label positioning
const FILTER_PLOT_MARGIN = { l: 220, r: 60, t: 160, b: 150 }; // Updated margins for better label positioning

window.addEventListener('DOMContentLoaded', () => {
    console.log('ui.js loaded');
    // No canvas or initZoom needed for Plotly

    // Optionally, resize Plotly plot on window resize
    window.addEventListener('resize', () => {
        if (document.getElementById('plot')) {
            Plotly.Plots.resize('plot');
        }
    });

    generateSignal();
    setupAnalyzeDropdown();
    setupOperationsDropdown();
    
    // Initialize button visibility
    updateApplyFilterButtonVisibility();
    updateDeconvolutionButtonVisibility();

    // In-plot Generate Signal button
    const generateBtnInplot = document.getElementById('generateBtn_inplot');
    if (generateBtnInplot) {
        generateBtnInplot.addEventListener('click', generateSignal);
    }

    // In-plot Add Overlay and Deconvolution buttons
    const addOverlayBtnInplot = document.getElementById('addOverlayBtn_inplot');
    if (addOverlayBtnInplot) {
        addOverlayBtnInplot.addEventListener('click', function() {
            // Implement overlay logic here or call the correct function
            if (typeof addOverlay === 'function') addOverlay();
            else console.warn('addOverlay function not defined');
        });
    }
    const deconvBtnInplot = document.getElementById('deconvBtn_inplot');
    if (deconvBtnInplot) {
        deconvBtnInplot.addEventListener('click', applyDeconvolution);
    }
    
    // Apply Filter button - applies the currently displayed filter response to the original signal
    const applyFilterBtnInplot = document.getElementById('applyFilterBtn_inplot');
    if (applyFilterBtnInplot) {
        applyFilterBtnInplot.addEventListener('click', applyDisplayedFilter);
    }

    // Files dropdown setup
    const filesBtn = document.getElementById('filesBtn');
    const fileDropdown = document.querySelector('.file-dropdown');
    const fileDropdownContent = document.querySelector('.file-dropdown-content');
    if (filesBtn && fileDropdownContent) {
        filesBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            fileDropdown.classList.toggle('show');
        });
        document.addEventListener('click', function(e) {
            if (!fileDropdownContent.contains(e.target) && e.target !== filesBtn) {
                fileDropdown.classList.remove('show');
            }
        });
    }

    // Filter dropdown logic
    const filterBtn = document.getElementById('filterBtn');
    const filterDropdown = document.getElementById('filterDropdownContent');
    if (filterBtn && filterDropdown) {
        filterBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            filterDropdown.classList.toggle('show');
        });
        document.addEventListener('click', function(e) {
            if (!filterDropdown.contains(e.target) && e.target !== filterBtn) {
                filterDropdown.classList.remove('show');
            }
        });
        // Add filter button listeners
        document.getElementById('filterBtn_highPass').onclick = () => applyFilter('highpass');
        document.getElementById('filterBtn_lowPass').onclick = () => applyFilter('lowpass');
        document.getElementById('filterBtn_bandPass').onclick = () => applyFilter('bandpass');
    }

    // --- In-plot signal type logic for multi ---
    const signalTypeInplot = document.getElementById('signalType_inplot');
    const freqInput = document.getElementById('frequency_inplot');
    if (signalTypeInplot && freqInput) {
        signalTypeInplot.addEventListener('change', function() {
            if (this.value === 'multi') {
                freqInput.value = '120, 200, 300';
                freqInput.placeholder = 'e.g., 120, 200, 300';
            } else {
                freqInput.value = '50.12';
                freqInput.placeholder = 'Frequency (Hz)';
            }
        });
    }

    // --- Phase input event listener ---
    const phaseInputInplot = document.getElementById('phase_inplot');
    if (phaseInputInplot) {
        phaseInputInplot.addEventListener('input', function() {
            // Regenerate signal when phase changes
            generateSignal();
        });
    }

    // RC Circuit Simulation button event listener
    const rcSimBtn = document.getElementById('rcSimBtn');
    if (rcSimBtn) {
        rcSimBtn.addEventListener('click', async () => {
            const R = parseFloat(document.getElementById('rcR').value);
            const C = parseFloat(document.getElementById('rcC').value);
            const V_in = parseFloat(document.getElementById('rcVin').value);
            const duration = parseFloat(document.getElementById('rcDuration').value);
            const points = parseInt(document.getElementById('rcPoints').value);
            if (isNaN(R) || isNaN(C) || isNaN(V_in) || isNaN(duration) || isNaN(points)) {
                alert('Please enter valid RC circuit parameters.');
                return;
            }
            try {
                const result = await simulateRCCircuit(R, C, V_in, duration, points);
                // Plot RC circuit response using Plotly
                Plotly.newPlot('plot', [{
                    x: result.t,
                    y: result.V_out,
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
                alert('RC Circuit Error: ' + err.message);
            }
        });
    }
});

const signalTypeSelect = document.getElementById('signalType_inplot');

let lastSignalSnapshot = null;
let waitingForOverlay = false;

function addOverlay() {
    if (!state.signalData.length || !state.fftMagnitudes.length || !state.fftFreqAxis.length) {
        alert('Generate a main signal first before adding an overlay.');
        return;
    }
    // Save the current signal as the overlay (replace any previous overlay)
    state.overlays = [{
        signal: new Float32Array(state.signalData),
        time_axis: new Float32Array(state.time_axis),
        fft: new Float32Array(state.fftMagnitudes),
        freq: new Float32Array(state.fftFreqAxis)
    }];
    state.plotHistory.push({type: 'overlay'}); // Track overlay for undo
    // Do NOT clear or replace the main signal here!
    plotAll();
    alert('Signal saved as overlay. Now generate a new signal to compare.');
}

// Patch generateSignal to show multi warning
// This is handled later, so this block is removed.

function setupAnalyzeDropdown() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const analyzeDropdown = document.getElementById('analyzeDropdown');
    if (analyzeBtn && analyzeDropdown) {
        analyzeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            analyzeDropdown.classList.toggle('show');
        });
        document.addEventListener('click', function(e) {
            if (!analyzeDropdown.contains(e.target) && e.target !== analyzeBtn) {
                analyzeDropdown.classList.remove('show');
            }
        });
        
        // Add Real FFT button event listener
        const realFFTBtn = document.getElementById('realFFTBtn');
        if (realFFTBtn) {
            realFFTBtn.addEventListener('click', async () => {
                await showRealFFT();
            });
        }
        
        // Add iFFT button event listener
        const ifftBtn = document.getElementById('ifftBtn');
        if (ifftBtn) {
            ifftBtn.addEventListener('click', async () => {
                await performIFFT();
            });
        }
        
        // Add Results button event listener
        const resultsBtn = document.getElementById('resultsBtn');
        if (resultsBtn) {
            resultsBtn.addEventListener('click', async () => {
                await showResults();
            });
        }
    }
}

function setupOperationsDropdown() {
    const operationsBtn = document.getElementById('operationsBtn');
    const operationsContent = document.getElementById('operationsDropdown');
    if (operationsBtn && operationsContent) {
        operationsBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            operationsContent.classList.toggle('show');
        });
        document.addEventListener('click', function(e) {
            if (!operationsContent.contains(e.target) && e.target !== operationsBtn) {
                operationsContent.classList.remove('show');
            }
        });
        const operationButtons = [
            { id: 'opsBtn_add', op: 'add' },
            { id: 'opsBtn_subtract', op: 'subtract' },
            { id: 'opsBtn_multiply', op: 'multiply' },
            { id: 'opsBtn_divide', op: 'divide' }
        ];
        operationButtons.forEach(({ id, op }) => {
            const button = document.getElementById(id);
            button.addEventListener('click', async () => {
                if (state.overlays.length > 0) {
                    const overlay = state.overlays[state.overlays.length - 1];
                    try {
                        const result = await window.signalToSignalOperation(
                            state.signalData,
                            overlay.signal,
                            op,
                            state.fs
                        );
                        
                        // Store the result for Results view instead of replacing main signal
                        state.resultSignal = new Float32Array(result.signal);
                        state.resultFFT = new Float32Array(result.fft);
                        state.resultFreqAxis = new Float32Array(result.freq_axis);
                        
                        // Still update main signal for backward compatibility
                        state.signalData = new Float32Array(result.signal);
                        state.fftMagnitudes = new Float32Array(result.fft);
                        state.fftFreqAxis = new Float32Array(result.freq_axis);
                        const points = state.signalData.length;
                        state.time_axis = new Float32Array(points);
                        for (let i = 0; i < points; i++) {
                            state.time_axis[i] = i / FS;
                        }
                        plotAll();
                        
                        // Notify user that Results view is available
                        alert(`${op.charAt(0).toUpperCase() + op.slice(1)} operation completed! Use "Analyze → Results" to see detailed comparison.`);
                    } catch (error) {
                        alert(error.message);
                    }
                } else {
                    alert('You must add an overlay before using Operations.');
                }
            });
        });
    }
}

document.getElementById('clearBtn').onclick = function() {
    state.signalData = new Float32Array();
    state.time_axis = new Float32Array();
    state.fftMagnitudes = new Float32Array();
    state.fftFreqAxis = new Float32Array();
    state.fftComplex = null; // Clear complex FFT data
    state.overlays = [];
    state.resultSignal = null; // Clear operation results
    state.resultFFT = null; // Clear result FFT
    state.resultFreqAxis = null; // Clear result frequency axis
    state.filteredSignal = undefined;
    state.filteredActive = false;
    state.filteredFft = undefined;
    state.filteredFftFreq = undefined;
    state.filterResponse = null; // Clear filter response
    state.filterImpulse = null; // Clear stored filter impulse
    state.realFFT = null; // Clear Real FFT data
    updateApplyFilterButtonVisibility(); // Update button visibility
    updateDeconvolutionButtonVisibility(); // Update deconvolution button visibility
    plotAll();
}

async function applyFilter(type) {
    // Error handling: block if no signal is present
    if (!state.signalData || state.signalData.length === 0) {
        alert('Please generate a signal before applying a filter.');
        return;
    }
    let params = { filterType: type, fs: FS, order: 4 };
    if (type === 'lowpass') {
        params.cutoff = prompt('Lowpass cutoff frequency (Hz, 10-1000):', 200) || 200;
    } else if (type === 'highpass') {
        params.cutoff = prompt('Highpass cutoff frequency (Hz, 1-990):', 100) || 100;
    } else if (type === 'bandpass') {
        params.lowcut = prompt('Bandpass LOW cutoff (Hz, 1-990):', 100) || 100;
        params.highcut = prompt('Bandpass HIGH cutoff (Hz, 10-1000):', 300) || 300;
    }
    // Send current signal to backend
    const signal = Array.from(state.signalData);
    const response = await fetch('/api/filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, signal })
    });
    const data = await response.json();
    if (data.filtered) {
        state.filteredSignal = new Float32Array(data.filtered);
        state.filteredActive = true;
        // FFT of filtered signal
        if (data.filtered_fft && data.filtered_freq_axis) {
            state.filteredFft = new Float32Array(data.filtered_fft);
            state.filteredFftFreq = new Float32Array(data.filtered_freq_axis);
        } else {
            state.filteredFft = null;
            state.filteredFftFreq = null;
        }
        state.plotHistory.push({type: 'filter'}); // Track filter for undo
        plotAll();
    } else {
        let msg = data.error || 'Unknown error';
        if (msg.includes('length of the input vector') || msg.includes('padlen')) {
            msg = 'Please generate data first before applying a filter.';
        }
        alert('Filter error: ' + msg);
    }
}

let filterViewActive = false;
let lastFilterFreqResponse = null;
let lastFilterParams = null; // Store the parameters of the displayed filter

// --- Filter View Main Plot Logic ---
const filterViewBtn = document.getElementById('filterBtn_view');
if (filterViewBtn) {
    filterViewBtn.onclick = async function() {
        // Error handling: block if no signal is present
        if (!state.signalData || state.signalData.length === 0) {
            alert('Please generate a signal before viewing a filter response.');
            return;
        }

        // Prompt user for filter type and parameters
        const filterType = prompt('Enter filter type (lowpass, highpass, bandpass):', 'lowpass');
        if (!filterType) return;

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
        lastFilterParams = params; // Save the parameters

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
            freq: data.freq,
            mag: data.magnitude,
            phase: data.phase,
            impulse: data.impulse,
            impulse_x: data.impulse_x
        };

        // Update Apply Filter button visibility
        updateApplyFilterButtonVisibility();

        // Re-plot everything including the new filter subplot
        plotAll();
    };
}

// REMOVED OLD MODAL-BASED FILTER LOGIC AND SIDE VIEW APPLY BUTTON

// Custom legend logic is no longer used and has been removed.

// Add Undo button logic for overlays and filters
const undoBtn = document.getElementById('undo-btn');
if (undoBtn) {
    undoBtn.onclick = function() {
        const lastAction = state.plotHistory.pop();
        if (!lastAction) return;
        if (lastAction.type === 'overlay') {
            state.overlays = [];
        } else if (lastAction.type === 'filter') {
            state.filteredActive = false;
            state.filteredSignal = null;
            state.filteredFft = null;
            state.filteredFftFreq = null;
        } else if (lastAction.type === 'deconvolution') {
            // Restore original signal and filtered signal
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
        plotAll();
    };
}

// Add a button to show memory state - button now exists in HTML, just add functionality
const showStateBtn = document.getElementById('showStateBtn');
if (showStateBtn) {
    showStateBtn.onclick = function() {
        let msg = '';
        const mainLen = state.signalData && state.signalData.length ? state.signalData.length : 0;
        const overlayLen = (state.overlays && state.overlays.length && state.overlays[state.overlays.length-1].signal.length) ? state.overlays[state.overlays.length-1].signal.length : 0;
        msg += 'Main signal: ' + (mainLen ? `${mainLen} points` : 'none') + '\n';
        msg += 'Overlay: ' + (overlayLen ? `${overlayLen} points` : 'none') + '\n';
        msg += 'Filtered signal: ' + (state.filteredSignal && state.filteredSignal.length ? `${state.filteredSignal.length} points` : 'none') + '\n';
        msg += 'Filtered active: ' + (state.filteredActive ? 'yes' : 'no') + '\n';
        if (state.filteredActive && state.filteredSignal && state.filteredSignal.length) {
            msg += '\nIf you apply a filter now, it will act on the main signal (not the overlay or filtered signal).';
        } else if (mainLen) {
            msg += '\nIf you apply a filter now, it will act on the main signal.';
        } else {
            msg += '\nNo main signal present: filtering is not possible.';
        }
        if (state.overlays && state.overlays.length) {
            msg += '\nIf you perform an operation (add, subtract, etc), it will use both the main signal and the overlay.';
        }
        // Compare lengths and show warning if different
        if (mainLen && overlayLen && mainLen !== overlayLen) {
            msg += '\n\n%RED%Different sample size detected ! Operations might not work !%ENDRED%';
        }
        // Show as plain alert, but replace %RED%...%ENDRED% with red text if possible
        if (msg.includes('%RED%')) {
            // Try to show as HTML if possible
            const htmlMsg = msg.replace(/%RED%(.+?)%ENDRED%/g, '<span style="color:red;">$1</span>').replace(/\n/g, '<br>');
            const win = window.open('', '', 'width=500,height=400');
            win.document.write('<html><body style="font-family:sans-serif;font-size:1.1em;padding:2em;">' + htmlMsg + '<br><br><button onclick="window.close()" style="font-size:1em;">Close</button></body></html>');
            win.document.close();
        } else {
            alert(msg);
        }
    };
}

// Show persistent warning if 'multi' signal type is selected or generated
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
if (signalTypeSelect) {
    signalTypeSelect.addEventListener('change', function() {
        showMultiWarningBox(this.value === 'multi');
    });
    // On page load
    showMultiWarningBox(signalTypeSelect.value === 'multi');
}
// Also show after generating a multi signal
if (!window._generateSignalPatched) {
    const originalGenerateSignal = generateSignal;
    window.generateSignal = async function(...args) {
        await originalGenerateSignal.apply(this, args);
        if (signalTypeSelect && signalTypeSelect.value === 'multi') {
            showMultiWarningBox(true);
        }
    };
    window._generateSignalPatched = true;
}

// Section toggle logic
const signalSection = document.getElementById('signal-section');
const circuitSection = document.getElementById('rc-circuit-section');
const showSignalBtn = document.getElementById('showSignalBtn');
const showCircuitBtn = document.getElementById('showCircuitBtn');
if (showSignalBtn && showCircuitBtn && signalSection && circuitSection) {
    showSignalBtn.addEventListener('click', () => {
        signalSection.style.display = '';
        circuitSection.style.display = 'none';
    });
    showCircuitBtn.addEventListener('click', () => {
        signalSection.style.display = 'none';
        circuitSection.style.display = '';
    });
}

// Modal Apply and Deconvolution buttons
const applyFilterBtn = document.getElementById('applyFilterBtn');
const deconvBtnModal = document.getElementById('deconvBtn_modal');

// Attach event handler for Apply in modal (reuse applyFunction if available)
if (applyFilterBtn) {
    // Wait for filterViewBtn to define applyFunction
    let lastApplyFunction = null;
    const origFilterViewBtn = document.getElementById('filterBtn_view');
    if (origFilterViewBtn) {
        const origOnClick = origFilterViewBtn.onclick;
        origFilterViewBtn.onclick = async function(...args) {
            if (typeof origOnClick === 'function') await origOnClick.apply(this, args);
            // Find the applyFunction defined in filterViewBtn.onclick
            if (typeof window.applyFunction === 'function') {
                lastApplyFunction = window.applyFunction;
            } else if (typeof applyFunction === 'function') {
                lastApplyFunction = applyFunction;
            }
            if (lastApplyFunction) {
                applyFilterBtn.onclick = lastApplyFunction;
              }
        };
    }
}
// Attach event handler for Deconvolution in modal
if (deconvBtnModal) {
    // Try to find the main deconvBtn and copy its onclick
    const deconvBtn = document.getElementById('deconvBtn');
    if (deconvBtn && typeof deconvBtn.onclick === 'function') {
        deconvBtnModal.onclick = deconvBtn.onclick;
    }
}

// Defensive: wrap all addEventListener in null checks for inline/HTML script
// (If you have any other direct addEventListener calls in index.html, wrap them in null checks)

// Apply the currently displayed filter to the original signal
async function applyDisplayedFilter() {
    // Check if we have a filter response displayed
    if (!state.filterResponse || !lastFilterParams) {
        alert('No filter response is currently displayed. Use "Filter View" first to display a filter response.');
        return;
    }
    
    // Check if we have signal data to filter
    if (!state.signalData || state.signalData.length === 0) {
        alert('No signal data available to filter. Generate a signal first.');
        return;
    }
    
    // Apply the filter using the stored parameters
    try {
        const response = await fetch('/api/filter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                signal: Array.from(state.signalData),
                ...lastFilterParams
            })
        });
        const data = await response.json();
        
        if (data.error) {
            alert('Filter error: ' + data.error);
            return;
        }
        
        // Store the filtered signal in state
        state.filteredSignal = new Float32Array(data.filtered);
        state.filteredFft = new Float32Array(data.filtered_fft);
        state.filteredFftFreq = new Float32Array(data.filtered_freq_axis);
        state.filteredActive = true;
        
        // Store filter impulse response for deconvolution before clearing filter response
        if (state.filterResponse && state.filterResponse.impulse) {
            state.filterImpulse = new Float32Array(state.filterResponse.impulse);
        }
        
        // Clear filter response to remove the filter subplots
        state.filterResponse = null;
        
        // Update button visibility
        updateApplyFilterButtonVisibility(); // Will hide Apply Filter button
        updateDeconvolutionButtonVisibility(); // Will show Deconvolution button
        
        // Add to plot history for undo functionality
        state.plotHistory.push({ type: 'filter' });
        
        // Re-plot with the filtered signal (now without filter response subplots)
        plotAll();
        
        console.log('Filter applied successfully');
    } catch (error) {
        console.error('Error applying filter:', error);
        alert('Error applying filter: ' + error.message);
    }
}

// Function to update Apply Filter button visibility
function updateApplyFilterButtonVisibility() {
    const applyFilterBtn = document.getElementById('applyFilterBtn_inplot');
    if (applyFilterBtn) {
        // Show button only when filter response is present
        applyFilterBtn.style.display = state.filterResponse ? 'block' : 'none';
    }
}

// Function to update Deconvolution button visibility
function updateDeconvolutionButtonVisibility() {
    const deconvBtn = document.getElementById('deconvBtn_inplot');
    if (deconvBtn) {
        // Show button only when a filter has been applied (filtered signal exists)
        deconvBtn.style.display = state.filteredActive ? 'block' : 'none';
    }
}

// Apply deconvolution to the filtered signal to try to recover the original
async function applyDeconvolution() {
    // Check if we have a filtered signal to deconvolve
    if (!state.filteredActive || !state.filteredSignal || state.filteredSignal.length === 0) {
        alert('No filtered signal available for deconvolution. Apply a filter first.');
        return;
    }
    
    // Check if we have the filter impulse response
    if (!state.filterImpulse || state.filterImpulse.length === 0) {
        alert('No filter impulse response available for deconvolution. The filter must be viewed before applying.');
        return;
    }
    
    try {
        // Apply deconvolution using the filtered signal and filter impulse response
        const response = await fetch('/api/deconvolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filtered: Array.from(state.filteredSignal),
                filter_impulse: Array.from(state.filterImpulse),
                eps: 1e-6 // Regularization parameter
            })
        });
        const data = await response.json();
        
        if (data.error) {
            alert('Deconvolution error: ' + data.error);
            return;
        }
        
        // Replace main signal with deconvolved signal for cleaner view
        // Store original signals in case user wants to undo
        const originalSignal = state.signalData;
        const originalFFT = state.fftMagnitudes;
        const originalFFTFreq = state.fftFreqAxis;
        
        // Replace main signal with deconvolved signal
        state.signalData = new Float32Array(data.deconvolved);
        state.fftMagnitudes = new Float32Array(data.deconv_fft);
        state.fftFreqAxis = new Float32Array(data.deconv_freq_axis);
        
        // Clear filtered signal and overlays to show only deconvolved
        state.filteredActive = false;
        state.filteredSignal = null;
        state.filteredFft = null;
        state.filteredFftFreq = null;
        state.overlays = [];
        
        // Store original data in plot history for undo
        state.plotHistory.push({ 
            type: 'deconvolution',
            originalSignal: originalSignal,
            originalFFT: originalFFT,
            originalFFTFreq: originalFFTFreq,
            filteredSignal: state.filteredSignal,
            filteredFFT: state.filteredFft,
            filteredFFTFreq: state.filteredFftFreq
        });
        
        // Update button visibility (hide deconvolution button since we're now showing deconvolved)
        updateDeconvolutionButtonVisibility();
        
        // Re-plot with the deconvolved signal
        plotAll();
        
        console.log('Deconvolution applied successfully');
        if (data.unstable) {
            alert('Warning: Deconvolution may be unstable. Results should be interpreted carefully.');
        }
    } catch (error) {
        console.error('Error applying deconvolution:', error);
        alert('Error applying deconvolution: ' + error.message);
    }
}

// Show Real FFT analysis - displays real and imaginary components
async function showRealFFT() {
    // Check if we have signal data
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
                signal: Array.from(state.signalData),
                fs: FS
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert('Real FFT Error: ' + data.error);
            return;
        }
        
        // Store the Real FFT data in state for plotting
        state.realFFT = {
            real: new Float32Array(data.fft_real),
            imaginary: new Float32Array(data.fft_imaginary),
            magnitude: new Float32Array(data.fft_magnitude),
            freq: new Float32Array(data.freq_axis)
        };
        
        // Update the plot to show Real FFT components
        plotRealFFT();
        
    } catch (error) {
        console.error('Error computing Real FFT:', error);
        alert('Error computing Real FFT: ' + error.message);
    }
}

// Plot Real FFT components as subplots
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
            line: { color: '#1f77b4' },
            xaxis: 'x1',
            yaxis: 'y1'
        },
        {
            x: state.realFFT.freq,
            y: state.realFFT.imaginary,
            type: 'scatter',
            mode: 'lines',
            name: 'Imaginary Part',
            line: { color: '#ff7f0e' },
            xaxis: 'x2',
            yaxis: 'y2'
        },
        {
            x: state.realFFT.freq,
            y: state.realFFT.magnitude,
            type: 'scatter',
            mode: 'lines',
            name: 'Magnitude',
            line: { color: '#2ca02c' },
            xaxis: 'x3',
            yaxis: 'y3'
        }
    ];
    
    // Define layout with 3 subplots
    const layout = {
        grid: { rows: 3, columns: 1, pattern: 'independent' },
        showlegend: true,
        autosize: true,
        margin: { l: 200, r: 60, t: 160, b: 150 },
        title: 'Real FFT Analysis',
        xaxis: { 
            title: { text: '', standoff: 20 }, 
            titlefont: { size: 12 }
        },
        yaxis: { 
            title: { text: 'Real Part', standoff: 30 }, 
            titlefont: { size: 12 }
        },
        xaxis2: { 
            title: { text: '', standoff: 20 }, 
            titlefont: { size: 12 }
        },
        yaxis2: { 
            title: { text: 'Imaginary Part', standoff: 30 }, 
            titlefont: { size: 12 }
        },
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

// Perform inverse FFT on the current FFT data
async function performIFFT() {
    // Check if we have complex FFT data to convert back
    if (!state.fftComplex || state.fftComplex.length === 0) {
        alert('No complex FFT data available for inverse FFT. Generate a signal first.');
        return;
    }
    
    try {
        // Extract real and imaginary parts from complex data
        const fftReal = state.fftComplex.map(c => c[0]);
        const fftImag = state.fftComplex.map(c => c[1]);
        
        // Prepare the data for the backend
        const response = await fetch('/api/ifft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fft_complex_real: fftReal,
                fft_complex_imag: fftImag,
                original_length: state.signalData ? state.signalData.length : 1024,
                fs: FS
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert('iFFT error: ' + data.error);
            return;
        }
        
        // Store the reconstructed signal as an overlay for comparison
        if (!state.overlays) {
            state.overlays = [];
        }
        
        // Convert the reconstructed signal to overlay
        const reconstructedSignal = new Float32Array(data.reconstructed_signal);
        const timeAxis = new Float32Array(data.time_axis);
        
        // Compute FFT of the reconstructed signal for display
        const fftResponse = await fetch('/api/real_fft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                signal: Array.from(reconstructedSignal),
                fs: FS
            })
        });
        const fftData = await fftResponse.json();
        
        // Add as overlay
        state.overlays = [{
            signal: reconstructedSignal,
            time_axis: timeAxis,
            fft: new Float32Array(fftData.fft_magnitude),
            freq: new Float32Array(fftData.freq_axis)
        }];
        
        // Track for undo
        state.plotHistory.push({ type: 'overlay' });
        
        // Re-plot with the reconstructed signal as overlay
        plotAll();
        
        alert('Inverse FFT completed! Reconstructed signal shown as overlay (red) for comparison.');
        
    } catch (error) {
        console.error('Error performing inverse FFT:', error);
        alert('Error performing inverse FFT: ' + error.message);
    }
}

// Show comprehensive results view with original signals, result signal, and all FFTs
async function showResults() {
    // Check if we have the necessary data
    if (!state.resultSignal || state.resultSignal.length === 0) {
        alert('No operation results available. Perform an operation (Add, Subtract, Multiply, Divide) first.');
        return;
    }
    
    if (!state.overlays || state.overlays.length === 0) {
        alert('No overlay signals available for comparison.');
        return;
    }
    
    try {
        // Get the plot div
        const plotDiv = document.getElementById('plot');
        if (!plotDiv) {
            console.error('Plot div not found');
            return;
        }
        
        // Prepare traces for comprehensive results view
        const traces = [];
        
        // Original signal (main)
        if (state.signalData && state.signalData.length > 0) {
            traces.push({
                x: state.time_axis,
                y: state.signalData,
                type: 'scatter',
                mode: 'lines',
                name: 'Signal 1',
                line: { color: '#000000' },
                xaxis: 'x1',
                yaxis: 'y1',
                showlegend: true
            });
        }
        
        // Overlay signal (second signal)
        const overlay = state.overlays[state.overlays.length - 1];
        if (overlay && overlay.signal) {
            traces.push({
                x: overlay.time_axis || state.time_axis,
                y: overlay.signal,
                type: 'scatter',
                mode: 'lines',
                name: 'Signal 2',
                line: { color: '#d62728' },
                xaxis: 'x1',
                yaxis: 'y1',
                showlegend: true
            });
        }
        
        // Result signal (subplot)
        if (state.resultSignal) {
            traces.push({
                x: state.time_axis,
                y: state.resultSignal,
                type: 'scatter',
                mode: 'lines',
                name: 'Operation Result',
                line: { color: '#2ca02c' },
                xaxis: 'x2',
                yaxis: 'y2',
                showlegend: true
            });
        }
        
        // FFTs - Main signal FFT
        if (state.fftMagnitudes && state.fftFreqAxis) {
            traces.push({
                x: state.fftFreqAxis,
                y: state.fftMagnitudes,
                type: 'scatter',
                mode: 'lines',
                name: 'FFT Signal 1',
                line: { color: '#1f77b4' },
                xaxis: 'x3',
                yaxis: 'y3',
                showlegend: true
            });
        }
        
        // FFT - Overlay signal FFT
        if (overlay && overlay.fft && overlay.freq) {
            traces.push({
                x: overlay.freq,
                y: overlay.fft,
                type: 'scatter',
                mode: 'lines',
                name: 'FFT Signal 2',
                line: { color: '#ff7f0e' },
                xaxis: 'x3',
                yaxis: 'y3',
                showlegend: true
            });
        }
        
        // FFT - Result signal FFT
        if (state.resultFFT && state.resultFreqAxis) {
            traces.push({
                x: state.resultFreqAxis,
                y: state.resultFFT,
                type: 'scatter',
                mode: 'lines',
                name: 'FFT Result',
                line: { color: '#9467bd' },
                xaxis: 'x3',
                yaxis: 'y3',
                showlegend: true
            });
        }
        
        // Layout for 3 subplots
        const layout = {
            grid: { rows: 3, columns: 1, pattern: 'independent' },
            showlegend: true,
            autosize: true,
            margin: { l: 200, r: 60, t: 160, b: 150 },
            
            // Time domain signals (top)
            xaxis: { 
                title: { text: 'Time (s)', standoff: 20 },
                titlefont: { size: 12 }
            },
            yaxis: { 
                title: { text: 'Amplitude', standoff: 30 },
                titlefont: { size: 12 }
            },
            
            // Result signal (middle)
            xaxis2: { 
                title: { text: 'Time (s)', standoff: 20 },
                titlefont: { size: 12 }
            },
            yaxis2: { 
                title: { text: 'Result Amplitude', standoff: 30 },
                titlefont: { size: 12 }
            },
            
            // FFT comparison (bottom)
            xaxis3: { 
                title: { text: 'Frequency (Hz)', standoff: 20 },
                titlefont: { size: 12 }
            },
            yaxis3: { 
                title: { text: 'FFT Magnitude', standoff: 30 },
                titlefont: { size: 12 }
            }
        };
        
        // Clear and render the comprehensive results plot
        Plotly.purge('plot');
        Plotly.newPlot('plot', traces, layout, {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
        });
        
        console.log('Results view displayed successfully');
        
    } catch (error) {
        console.error('Error displaying results:', error);
        alert('Error displaying results: ' + error.message);
    }
}