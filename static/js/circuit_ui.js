// circuit_ui.js
// Handles all UI logic for Circuits Lab (DOM, events, info, export)
import { simulateRCCircuit, simulateRLCircuit, simulateRLCCircuit, plotRC, plotRL, plotRLC, plotRC_VI, plotRL_VI, plotRLC_VI, simulateDifferentiatorCircuit, plotDifferentiator, plotIntegrator, simulateModulation, plotModulation } from './circuit_frontEnd.js';

function setupCircuitLabUI() {
    const analysisType = document.getElementById('analysisType');
    const circuitAnalysisSection = document.getElementById('circuit-analysis-section');
    const communicationsSection = document.getElementById('communications-section');
    const circuitType = document.getElementById('circuitType');
    const commType = document.getElementById('commType');
    const rcFields = document.getElementById('rc-fields');
    const rlFields = document.getElementById('rl-fields');
    const rlcFields = document.getElementById('rlc-fields');
    const modulationFields = document.getElementById('modulation-fields');
    const equationText = document.getElementById('equation-text');
    const showCurrentCheckbox = document.getElementById('showCurrentCheckbox');
    
    // Handle analysis type change (Circuit vs Communications)
    analysisType.addEventListener('change', function() {
        const showCurrentContainer = document.getElementById('show-current-container');
        const circuitInfoSection = document.getElementById('circuit-info'); // The "About This Circuit" section
        
        if (this.value === 'circuit') {
            circuitAnalysisSection.style.display = '';
            communicationsSection.style.display = 'none';
            // Show circuit-specific elements
            if (showCurrentContainer) showCurrentContainer.style.display = 'flex';
            if (circuitInfoSection) circuitInfoSection.style.display = 'block';
            // Reset to default circuit type
            circuitType.value = 'rc';
            handleCircuitTypeChange();
        } else if (this.value === 'communications') {
            circuitAnalysisSection.style.display = 'none';
            communicationsSection.style.display = '';
            // Hide circuit-specific elements
            if (showCurrentContainer) showCurrentContainer.style.display = 'none';
            if (circuitInfoSection) circuitInfoSection.style.display = 'none';
            // Reset to default communications type
            commType.value = 'modulation';
            handleCommTypeChange();
        }
    });
    
    // Handle circuit type changes
    circuitType.addEventListener('change', handleCircuitTypeChange);
    
    // Handle communications type changes
    commType.addEventListener('change', handleCommTypeChange);
    
    function handleCircuitTypeChange() {
        const type = circuitType.value;
        // Hide all field groups first
        rcFields.style.display = 'none';
        rlFields.style.display = 'none';
        rlcFields.style.display = 'none';
        modulationFields.style.display = 'none';
        
        if (type === 'rc') {
            rcFields.style.display = '';
            equationText.innerHTML = 'V<sub>out</sub>(t) = V<sub>in</sub>(1 - e<sup>-t/RC</sup>)';
        } else if (type === 'rl') {
            rlFields.style.display = '';
            equationText.innerHTML = 'I<sub>out</sub>(t) = (V<sub>in</sub>/R)(1 - e<sup>-Rt/L</sup>)';
        } else if (type === 'rlc') {
            rlcFields.style.display = '';
            equationText.innerHTML = 'V<sub>out</sub>(t) = V<sub>in</sub>(1 - (1/\sqrt{1-\zeta^2})e^{-\zeta\omega_n t} \sin(\omega_d t + \phi))';
        } else if (type === 'differentiator') {
            rcFields.style.display = '';
            equationText.innerHTML = 'V<sub>out</sub>(t) = RC \, (dV_{in}/dt)';
        } else if (type === 'integrator') {
            rcFields.style.display = '';
            equationText.innerHTML = 'V<sub>out</sub>(t) = (1/RC) \int V_{in}(t) dt';
        }
    }
    
    function handleCommTypeChange() {
        const type = commType.value;
        // Hide all field groups first
        rcFields.style.display = 'none';
        rlFields.style.display = 'none';
        rlcFields.style.display = 'none';
        modulationFields.style.display = 'none';
        
        if (type === 'modulation') {
            modulationFields.style.display = '';
            // Update equation text for communications (this will be hidden anyway)
            equationText.innerHTML = 'AM: y(t) = (1 + m·cos(2πf<sub>m</sub>t)) · cos(2πf<sub>c</sub>t)<br>FM: y(t) = cos(2πf<sub>c</sub>t + β·sin(2πf<sub>m</sub>t))<br>PM: y(t) = cos(2πf<sub>c</sub>t + β·cos(2πf<sub>m</sub>t))';
        }
    }
    // Default info
    equationText.innerHTML = 'V<sub>out</sub>(t) = V<sub>in</sub>(1 - e<sup>-t/RC</sup>)';

    // Setup modulation info button
    setupModulationInfoButton();

    // Default plot on load (RC)
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            const def = { R: 1000, C: 1e-6, V_in: 1.0, duration: 0.05, points: 500 };
            const result = await simulateRCCircuit(def.R, def.C, def.V_in, def.duration, def.points);
            if (showCurrentCheckbox && showCurrentCheckbox.checked) {
                plotRC_VI(result.t, result.V_out, result.I_out, true);
            } else {
                plotRC(result.t, result.V_out);
            }
        } catch (err) {
            document.getElementById('circuit-plot').innerText = 'Error loading default RC plot.';
        }
    });

    // Helper to get checkbox state
    function isShowCurrent() {
        return showCurrentCheckbox && showCurrentCheckbox.checked;
    }

    // Button event
    document.getElementById('circuitSimBtn').addEventListener('click', async () => {
        const analysisType = document.getElementById('analysisType').value;
        const V_in = parseFloat(document.getElementById('circuitVin').value);
        const duration = parseFloat(document.getElementById('circuitDuration').value);
        const points = parseInt(document.getElementById('circuitPoints').value);
        const showCurrent = isShowCurrent();
        
        if (analysisType === 'circuit') {
            const type = document.getElementById('circuitType').value;
            await handleCircuitSimulation(type, V_in, duration, points, showCurrent);
        } else if (analysisType === 'communications') {
            const type = document.getElementById('commType').value;
            await handleCommunicationsSimulation(type, duration, points);
        }
    });
    
    async function handleCircuitSimulation(type, V_in, duration, points, showCurrent) {
        if (type === 'rc') {
            const R = parseFloat(document.getElementById('rcR').value);
            const C = parseFloat(document.getElementById('rcC').value);
            if (isNaN(R) || isNaN(C) || isNaN(V_in) || isNaN(duration) || isNaN(points)) {
                alert('Please enter valid RC circuit parameters.');
                return;
            }
            try {
                const result = await simulateRCCircuit(R, C, V_in, duration, points);
                if (showCurrent) {
                    plotRC_VI(result.t, result.V_out, result.I_out, true);
                } else {
                    plotRC(result.t, result.V_out);
                }
            } catch (err) {
                alert('RC Circuit Error: ' + err.message);
            }
        } else if (type === 'rl') {
            const R = parseFloat(document.getElementById('rlR').value);
            const L = parseFloat(document.getElementById('rlL').value);
            if (isNaN(R) || isNaN(L) || isNaN(V_in) || isNaN(duration) || isNaN(points)) {
                alert('Please enter valid RL circuit parameters.');
                return;
            }
            try {
                const result = await simulateRLCircuit(R, L, V_in, duration, points);
                if (showCurrent) {
                    plotRL_VI(result.t, result.I_out, result.V_out, true);
                } else {
                    plotRL(result.t, result.I_out);
                }
            } catch (err) {
                alert('RL Circuit Error: ' + err.message);
            }
        } else if (type === 'rlc') {
            const R = parseFloat(document.getElementById('rlcR').value);
            const L = parseFloat(document.getElementById('rlcL').value);
            const C = parseFloat(document.getElementById('rlcC').value);
            if (isNaN(R) || isNaN(L) || isNaN(C) || isNaN(V_in) || isNaN(duration) || isNaN(points)) {
                alert('Please enter valid RLC circuit parameters.');
                return;
            }
            try {
                const result = await simulateRLCCircuit(R, L, C, V_in, duration, points);
                if (showCurrent) {
                    plotRLC_VI(result.t, result.V_out, result.I_out, true);
                } else {
                    plotRLC(result.t, result.V_out);
                }
            } catch (err) {
                alert('RLC Circuit Error: ' + err.message);
            }
        } else if (type === 'differentiator') {
            const R = parseFloat(document.getElementById('rcR').value);
            const C = parseFloat(document.getElementById('rcC').value);
            if (isNaN(R) || isNaN(C) || isNaN(V_in) || isNaN(duration) || isNaN(points)) {
                alert('Please enter valid differentiator parameters.');
                return;
            }
            try {
                const result = await simulateDifferentiatorCircuit(R, C, V_in, duration, points);
                plotDifferentiator(result.t, result.V_out);
            } catch (err) {
                alert('Differentiator Error: ' + err.message);
            }
        } else if (type === 'integrator') {
            const R = parseFloat(document.getElementById('rcR').value);
            const C = parseFloat(document.getElementById('rcC').value);
            if (isNaN(R) || isNaN(C) || isNaN(V_in) || isNaN(duration) || isNaN(points)) {
                alert('Please enter valid integrator parameters.');
                return;
            }
            try {
                const result = await simulateIntegratorCircuit(R, C, V_in, duration, points);
                plotIntegrator(result.t, result.V_out);
            } catch (err) {
                alert('Integrator Error: ' + err.message);
            }
        }
    }
    
    async function handleCommunicationsSimulation(type, duration, points) {
        if (type === 'modulation') {
            const modulationType = document.getElementById('modulationType').value;
            const carrierFreq = parseFloat(document.getElementById('carrierFreq').value);
            const modulatingFreq = parseFloat(document.getElementById('modulatingFreq').value);
            const modulationIndex = parseFloat(document.getElementById('modulationIndex').value);
            if (isNaN(carrierFreq) || isNaN(modulatingFreq) || isNaN(modulationIndex) || isNaN(duration) || isNaN(points)) {
                alert('Please enter valid modulation parameters.');
                return;
            }
            try {
                const result = await simulateModulation(modulationType, carrierFreq, modulatingFreq, modulationIndex, duration, points);
                plotModulation(result.time, result.modulated_signal, result.carrier_signal, result.modulating_signal, result.modulation_type);
            } catch (err) {
                alert('Modulation Error: ' + err.message);
            }
        }
    }

    // Listen for checkbox changes to update plot
    if (showCurrentCheckbox) {
        showCurrentCheckbox.addEventListener('change', async () => {
            // Simulate button click to refresh plot with new checkbox state
            document.getElementById('circuitSimBtn').click();
        });
    }

    // Show Diagram button logic
    const showDiagramBtn = document.getElementById('showDiagramBtn');
    const circuitDiagramImg = document.getElementById('circuit-diagram-img');
    if (showDiagramBtn && circuitDiagramImg && circuitType) {
        showDiagramBtn.addEventListener('click', function() {
            // Only show diagrams for circuit analysis, not communications
            const analysisTypeValue = document.getElementById('analysisType').value;
            if (analysisTypeValue !== 'circuit') {
                return; // Do nothing if not in circuit mode
            }
            
            const type = circuitType.value;
            let url = '';
            if (type === 'rc') url = '/api/diagram/rc';
            else if (type === 'rl') url = '/api/diagram/rl';
            else if (type === 'rlc') url = '/api/diagram/rlc';
            if (url) {
                circuitDiagramImg.src = url + '?t=' + Date.now(); // cache bust
                circuitDiagramImg.style.display = 'block';
            }
        });
    }
}

/**
 * Setup modulation information button functionality
 */
function setupModulationInfoButton() {
    const modulationInfoBtn = document.getElementById('modulationInfoBtn');
    const modulationInfoModal = document.getElementById('modulationInfoModal');
    const closeModulationInfo = document.getElementById('closeModulationInfo');
    const modulationInfoDisplay = document.getElementById('modulationInfoDisplay');

    // Show modulation info when button is clicked
    if (modulationInfoBtn) {
        modulationInfoBtn.addEventListener('click', () => {
            const modulationType = document.getElementById('modulationType').value;
            showModulationInfo(modulationType);
        });
    }

    // Close modal when X is clicked
    if (closeModulationInfo) {
        closeModulationInfo.addEventListener('click', () => {
            hideModulationInfo();
        });
    }

    // Close modal when clicking outside
    if (modulationInfoModal) {
        modulationInfoModal.addEventListener('click', (e) => {
            if (e.target === modulationInfoModal) {
                hideModulationInfo();
            }
        });
    }

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modulationInfoModal && modulationInfoModal.classList.contains('show')) {
            hideModulationInfo();
        }
    });
}

/**
 * Show modulation information modal
 * @param {string} modulationType - The type of modulation (AM, FM, PM)
 */
function showModulationInfo(modulationType) {
    const modulationInfoModal = document.getElementById('modulationInfoModal');
    const modulationInfoDisplay = document.getElementById('modulationInfoDisplay');
    
    if (!modulationInfoModal || !modulationInfoDisplay) {
        console.error('Modulation info modal elements not found');
        return;
    }

    // Get modulation info from the imported module
    if (typeof formatModulationInfo === 'function') {
        const infoHtml = formatModulationInfo(modulationType);
        modulationInfoDisplay.innerHTML = infoHtml;
    } else {
        console.error('formatModulationInfo function not available');
        modulationInfoDisplay.innerHTML = '<p>Error loading modulation information</p>';
    }

    // Show modal
    modulationInfoModal.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

/**
 * Hide modulation information modal
 */
function hideModulationInfo() {
    const modulationInfoModal = document.getElementById('modulationInfoModal');
    
    if (modulationInfoModal) {
        modulationInfoModal.classList.remove('show');
        document.body.style.overflow = ''; // Restore scrolling
    }
}

// Make functions available globally if needed
window.showModulationInfo = showModulationInfo;
window.hideModulationInfo = hideModulationInfo;

// Initialize UI logic after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupCircuitLabUI);
} else {
    setupCircuitLabUI();
}

export { setupCircuitLabUI };
