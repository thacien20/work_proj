// circuit_ui.js - Circuit Lab UI Controller
// Handles all UI logic for Circuits Lab (DOM, events, info, export)

document.addEventListener('DOMContentLoaded', () => {
    const dom = {
        // Main buttons
        circuitAnalysisBtn: document.getElementById('circuit-analysis-btn'),
        electronicSignalsBtn: document.getElementById('electronic-signals-btn'),
        
        // Control sections
        circuitAnalysisControls: document.getElementById('circuit-analysis-controls'),
        electronicSignalsControls: document.getElementById('electronic-signals-controls'),
        
        // Circuit controls
        circuitType: document.getElementById('circuit-type'),
        circuitFields: document.getElementById('circuit-fields'),
        
        // Electronic signals controls
        signalType: document.getElementById('signal-type'),
        modulationFields: document.getElementById('modulation-fields'),
        quadratureFields: document.getElementById('quadrature-fields'),
        pllFields: document.getElementById('pll-fields'),

        
        // Simulation buttons
        circuitSimulateBtn: document.getElementById('circuit-simulate-btn'),
        signalSimulateBtn: document.getElementById('signal-simulate-btn'),
        equationText: document.getElementById('equation-text'),
        showDiagramBtn: document.getElementById('show-diagram-btn'),
        circuitDiagramImg: document.getElementById('circuit-diagram-img'),
        plotContainer: document.getElementById('circuit-plot'),
        showCurrentBtn: document.getElementById('show-current-btn'),
        
        // Floating controls
        clearPlotBtn: document.getElementById('clear-plot-btn'),
        savePlotBtn: document.getElementById('save-plot-btn'),
        modulationInfoBtn: document.getElementById('modulation-info-btn'),

        // Quadrature demodulation buttons (newly added)
        quadratureHoverButtons: document.getElementById('quadrature-hover-buttons'),
    };

    const DEFAULT_SIGNAL_PARAMS = {
        // AM/FM parameters
        carrierFreq: 100,
        modulatingFreq: 10,
        modulationIndex: 0.5,
        // Quadrature parameters
        quadCarrierFreq: 100,  // Carrier needs to be higher than I/Q frequencies
        quadIFreq: 10,         // In-Phase frequency
        quadQFreq: 20,         // Out-of-Phase frequency
        quadPhase: 90,         // Phase shift in degrees
        // Common parameters
        duration: 1.0,
        sampleRate: 1000
    };

    const plotHistory = [];
    let currentMode = null; // 'circuit' or 'electronic-signals'

    // Circuit parameters for dynamic field generation
    const circuitParams = {
        rc: { R: '1000', C: '0.000001' },
        rl: { R: '1000', L: '0.1' },
        rlc: { R: '1000', L: '0.1', C: '0.000001' },
        differentiator: { R: '1000', C: '0.000001' },
        integrator: { R: '1000', C: '0.000001' }
    };

    // Equations for different modes
    const equations = {
        // Circuit equations
        rc: 'V<sub>out</sub>(t) = V<sub>in</sub>(1 - e<sup>-t/RC</sup>)',
        rl: 'I(t) = (V<sub>in</sub>/R)(1 - e<sup>-Rt/L</sup>)',
        rlc: 'V<sub>out</sub>(t) = V<sub>in</sub>(1 - e<sup>-ζω<sub>n</sub>t</sup>cos(ω<sub>d</sub>t + φ))',
        differentiator: 'V<sub>out</sub>(t) = RC(dV<sub>in</sub>/dt)',
        integrator: 'V<sub>out</sub>(t) = (1/RC)∫V<sub>in</sub>(t)dt',
        
        // Electronic signals equations
        modulation: 'AM: s(t) = A<sub>c</sub>[1 + m·cos(ω<sub>m</sub>t)]cos(ω<sub>c</sub>t)',
        quadrature: 'I(t) = A·cos(ωt), Q(t) = A·sin(ωt + φ)',
        pll: 'φ<sub>e</sub>(t) = φ<sub>i</sub>(t) - φ<sub>o</sub>(t)',
        demodulation: 'Envelope Detection: |s(t)| = A<sub>m</sub>(t)'
    };

    // Main button event listeners
    dom.circuitAnalysisBtn.addEventListener('click', () => {
        activateCircuitAnalysis();
    });

    dom.electronicSignalsBtn.addEventListener('click', () => {
        activateElectronicSignals();
    });

    function activateCircuitAnalysis() {
        currentMode = 'circuit';
        
        // Hide all sections first
        hideAllSections();
        
        // Show circuit analysis controls
        dom.circuitAnalysisControls.style.display = 'block';
        // Show circuit info panel
        document.getElementById('circuit-info-panel').style.display = 'block';
        
        // Show voltage input and show current button as they're needed for Circuit Analysis
        if (document.getElementById('vin-container')) {
            document.getElementById('vin-container').style.display = 'block';
        }
        if (document.getElementById('show-current-container')) {
            document.getElementById('show-current-container').style.display = 'block';
        }
        
        // Update UI state
        updateCircuitFields();
        dom.equationText.innerHTML = equations[dom.circuitType.value];
        
        console.log('Circuit Analysis mode activated');
    }

    function activateElectronicSignals() {
        currentMode = 'electronic-signals';
        
        // Hide all sections first
        hideAllSections();
        
        // Show electronic signals controls
        dom.electronicSignalsControls.style.display = 'block';
        
        // Clear any existing circuit diagrams or equations
        dom.equationText.innerHTML = '';
        
        // Initialize all controls with default values
        initializeSignalControls();
        
        // Update button states
        updateButtonStates();
        
        console.log('Electronic Signals mode activated');
    }

    function hideAllSections() {
        // Hide control panels
        dom.circuitAnalysisControls.style.display = 'none';
        dom.electronicSignalsControls.style.display = 'none';
        
        // Hide circuit-specific elements
        const circuitInfoPanel = document.getElementById('circuit-info-panel');
        const showCurrentContainer = document.getElementById('show-current-container');
        const vinContainer = document.getElementById('vin-container');
        const circuitDiagram = document.getElementById('circuit-diagram-img');
        
        if (circuitInfoPanel) circuitInfoPanel.style.display = 'none';
        if (showCurrentContainer) showCurrentContainer.style.display = 'none';
        if (vinContainer) vinContainer.style.display = 'none';
        if (circuitDiagram) circuitDiagram.style.display = 'none';
    }

    function updateCircuitFields() {
        const selectedCircuit = dom.circuitType.value;
        const fields = circuitParams[selectedCircuit];
        dom.circuitFields.innerHTML = '';

        for (const param in fields) {
            let label = '';
            let value = fields[param];

            switch(param) {
                case 'R':
                    label = 'Resistance';
                    break;
                case 'L':
                    label = 'Inductance';
                    break;
                case 'C':
                    label = 'Capacitance';
                    break;
            }

            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            formGroup.innerHTML = `
                <label for="param-${param}">${label} (${param === 'R' ? 'Ω' : param === 'L' ? 'H' : 'F'}):</label>
                <input type="number" id="param-${param}" class="control-input" value="${value}" step="any">
            `;
            dom.circuitFields.appendChild(formGroup);
        }
        dom.equationText.innerHTML = equations[selectedCircuit];
    }

    function updateSignalFields() {
        const selectedSignal = dom.signalType.value;

        // Show/hide quadrature info button
        const quadInfoBtn = document.getElementById('quadrature-info-btn');
        if (quadInfoBtn) {
            quadInfoBtn.style.display = (selectedSignal === 'quadrature') ? 'inline-block' : 'none';
        }

        // Hide all signal fields first
        if (dom.modulationFields) dom.modulationFields.style.display = 'none';
        if (dom.quadratureFields) dom.quadratureFields.style.display = 'none';
        if (dom.pllFields) dom.pllFields.style.display = 'none';
        if (dom.demodulationFields) dom.demodulationFields.style.display = 'none';

        // Hide type dropdown for quadrature
        const modulationTypeGroup = document.querySelector('.modulation-type-group');
        if (modulationTypeGroup) {
            modulationTypeGroup.style.display = selectedSignal === 'quadrature' ? 'none' : 'block';
        }

        // Show appropriate fields
        switch(selectedSignal) {
            case 'modulation':
                if (dom.modulationFields) {
                    dom.modulationFields.style.display = 'grid';
                    // Reset modulation type to AM by default
                    const modulationType = document.getElementById('modulation-type');
                    if (modulationType) modulationType.value = 'AM';
                }
                break;
            case 'quadrature':
                if (dom.quadratureFields) {
                    dom.quadratureFields.style.display = 'grid';
                }
                break;
            case 'pll':
                if (dom.pllFields) {
                    dom.pllFields.style.display = 'grid';
                }
                break;
            case 'demodulation':
                if (dom.demodulationFields) {
                    dom.demodulationFields.style.display = 'grid';
                }
                break;
        }

        // Show/hide the common carrier frequency field based on signal type
        const carrierField = document.querySelector('.form-group:has(#carrier-freq)');
        if (carrierField) {
            carrierField.style.display = selectedSignal === 'quadrature' ? 'none' : 'block';
        }

        // Update equations
        updateEquationDisplay();
    }

    // Event listeners for dropdowns
    dom.circuitType.addEventListener('change', updateCircuitFields);
    dom.signalType.addEventListener('change', updateSignalFields);

    // Toggle button for show current
    dom.showCurrentBtn.addEventListener('click', () => {
        const isActive = dom.showCurrentBtn.getAttribute('data-active') === 'true';
        const newState = !isActive;
        dom.showCurrentBtn.setAttribute('data-active', newState.toString());
        dom.showCurrentBtn.textContent = newState ? '📊 Hide Current Plot' : '📊 Show Current Plot';
        console.log('Show current toggled:', newState);
    });

    // Simulation buttons
    dom.circuitSimulateBtn.addEventListener('click', () => {
        currentMode = 'circuit';
        handleSimulation();
    });
    
    dom.signalSimulateBtn.addEventListener('click', () => {
        currentMode = 'electronic-signals';
        handleSimulation();
    });

    async function handleSimulation() {
        console.log('Simulation started, current mode:', currentMode);
        
        try {
            if (currentMode === 'circuit') {
                await simulateCircuit();
            } else if (currentMode === 'electronic-signals') {
                // Create a submit event for the simulation
                const event = new Event('submit');
                event.preventDefault = () => {}; // Add preventDefault to match real event
                
                // Call simulateSignal directly
                await simulateSignal(event);
            } else {
                throw new Error('Please select Circuit Analysis or Electronic Signals first');
            }
        } catch (error) {
            console.error('Simulation failed:', error);
            alert(`Simulation failed: ${error.message}`);
        }
    }

    async function simulateCircuit() {
        const params = getCircuitParameters();
        let endpoint = '';
        let body = {};

        const circuitType = params.circuitType;
        if (circuitType === 'differentiator' || circuitType === 'integrator') {
            endpoint = `/circuits/${circuitType}`;
        } else {
            endpoint = `/api/${circuitType}_circuit`;
        }
        
        body = {
            R: params.R,
            L: params.L,
            C: params.C,
            V_in: params.vin,
            duration: params.duration,
            points: params.points,
        };

        console.log('Circuit simulation request:', { endpoint, body });

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Circuit simulation response:', data);

        // Transform data if needed
        const transformedData = {
            t: data.time || data.t,
            V_out: data.voltage || data.V_out,
            I_out: data.current || data.I_out
        };

        plotCircuitResponse(params, transformedData);
    }

    async function simulateElectronicSignals() {
        const params = getSignalParameters();
        let endpoint = '';
        let body = {};

        // For now, we'll use the modulation endpoint for all signal types
        // but send the appropriate parameters based on signal type
        switch(params.signalType) {
            case 'modulation':
                endpoint = '/circuits/modulation';
                body = {
                    modulation_type: params.modulationType,
                    carrier_frequency: params.carrierFreq,
                    modulating_frequency: params.modulatingFreq,
                    modulation_index: params.modulationIndex,
                    duration: params.duration,
                    sample_rate: Math.floor(params.points / params.duration),
                };
                break;
            case 'quadrature':
                endpoint = '/circuits/modulation';
                body = {
                    modulation_type: 'QM',
                    carrier_frequency: params.quadCarrierFreq,
                    i_frequency: params.quadIFreq,
                    q_frequency: params.quadQFreq,
                    phase_shift: params.quadPhase,
                    duration: params.duration,
                    sample_rate: Math.floor(params.points / params.duration),
                    signal_type: 'quadrature'
                };
                break;
            case 'pll':
                endpoint = '/circuits/modulation';
                body = {
                    modulation_type: 'FM', // Use FM to show frequency tracking
                    carrier_frequency: params.pllVcoFreq,
                    modulating_frequency: params.pllInputFreq,
                    modulation_index: params.pllLoopGain,
                    duration: params.duration,
                    sample_rate: Math.floor(params.points / params.duration),
                    signal_type: 'pll' // Special flag
                };
                break;
            case 'demodulation':
                // Show "Coming Soon" message for demodulation
                alert('Signal demodulation feature is being rebuilt from scratch and will be available soon!');
                return; // Early return to prevent API call
                break;
        }

        console.log('Electronic signals simulation request:', { endpoint, body });

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Electronic signals simulation response:', result);

        // Transform data if needed
        const transformedData = {
            t: result.time || result.t,
            carrier: result.carrier_signal || result.carrier,
            modulating: result.modulating_signal || result.modulating,
            modulated: result.modulated_signal || result.modulated,
            I: result.I, // for quadrature
            Q: result.Q  // for quadrature
        };

        // Update for QM case
        if (params.signalType === 'quadrature-demod' && result.success) {
            // Store the quadrature signal data for demodulation
            window.currentQuadratureSignal = {
                signal: result.modulated_signal,
                time: result.time,
                carrier_freq: result.parameters.carrier_frequency
            };
        }

        plotSignalResponse(params, transformedData);
    }

    function getCircuitParameters() {
        const params = {
            circuitType: dom.circuitType.value,
            vin: parseFloat(document.getElementById('vin')?.value) || 1.0,
            duration: parseFloat(document.getElementById('circuit-duration')?.value) || 0.01,
            points: parseInt(document.getElementById('circuit-points')?.value) || 1000,
            showCurrent: dom.showCurrentBtn?.getAttribute('data-active') === 'true' || false,
        };

        console.log('Circuit parameters:', params);

        // Get circuit component values
        const R = parseFloat(document.getElementById('param-R')?.value);
        const L = parseFloat(document.getElementById('param-L')?.value);
        const C = parseFloat(document.getElementById('param-C')?.value);

        switch(params.circuitType) {
            case 'rc':
            case 'differentiator':
            case 'integrator':
                if (isNaN(R) || isNaN(C)) throw new Error('Invalid RC parameters');
                params.R = R;
                params.C = C;
                break;
            case 'rl':
                if (isNaN(R) || isNaN(L)) throw new Error('Invalid RL parameters');
                params.R = R;
                params.L = L;
                break;
            case 'rlc':
                if (isNaN(R) || isNaN(L) || isNaN(C)) throw new Error('Invalid RLC parameters');
                params.R = R;
                params.L = L;
                params.C = C;
                break;
        }

        return params;
    }

    // Get parameters for electronic signals simulation
    function getSignalParameters() {
        // Get signal type from dropdown, default to 'modulation' if not set
        const signalType = dom.signalType?.value || 'modulation';
        
        // Start with default parameters
        let params = { ...DEFAULT_SIGNAL_PARAMS };
        
        // Add basic parameters
        params = {
            ...params,
            signalType
        };

        // Helper function to safely get numeric values from form
        const getNumericValue = (id, defaultValue) => {
            const element = document.getElementById(id);
            if (!element || element.value === '') return defaultValue;
            const value = parseFloat(element.value);
            return isNaN(value) ? defaultValue : value;
        };

        // Get common parameters
        params.duration = getNumericValue('signal-duration', DEFAULT_SIGNAL_PARAMS.duration);
        params.points = Math.floor(getNumericValue('signal-points', DEFAULT_SIGNAL_PARAMS.sampleRate));

        // Get values based on signal type
        if (signalType === 'quadrature') {
            params.modulationType = 'QM';
            params.carrierFreq = getNumericValue('quad-carrier-freq', 100);  // Use quadrature carrier
            params.iFreq = getNumericValue('quad-i', 10);  // I signal frequency
            params.qFreq = getNumericValue('quad-q', 20);  // Q signal frequency
            params.phaseShift = getNumericValue('quad-phase', 90);  // Phase shift in degrees

            // Validate carrier frequency is higher than both I and Q
            if (params.carrierFreq <= Math.max(params.iFreq, params.qFreq)) {
                throw new Error('Carrier frequency must be high enough for both I and Q frequencies for Quadrature Modulation.');
            }
        } else {
            // Handle AM/FM parameters
            params.modulationType = document.getElementById('modulation-type')?.value || 'AM';
            params.carrierFreq = getNumericValue('carrier-freq', DEFAULT_SIGNAL_PARAMS.carrierFreq);
            params.modulatingFreq = getNumericValue('modulating-freq', DEFAULT_SIGNAL_PARAMS.modulatingFreq);
            params.modulationIndex = getNumericValue('modulation-index', DEFAULT_SIGNAL_PARAMS.modulationIndex);
        }

        return params;
    }

    function plotCircuitResponse(params, data) {
        console.log('Plotting circuit response:', { params, data });
        console.log('Show current flag:', params.showCurrent);
        
        // Clear the existing plot first
        Plotly.purge(dom.plotContainer);
        
        switch (params.circuitType) {
            case 'rc':
            case 'differentiator':
            case 'integrator':
                console.log('Calling plotRC_VI with showCurrent:', params.showCurrent);
                plotRC_VI(data.t, data.V_out, data.I_out || null, params.showCurrent);
                break;
            case 'rl':
                console.log('Calling plotRL_VI with showCurrent:', params.showCurrent);
                plotRL_VI(data.t, data.I_out, data.V_out || null, params.showCurrent);
                break;
            case 'rlc':
                console.log('Calling plotRLC_VI with showCurrent:', params.showCurrent);
                plotRLC_VI(data.t, data.V_out, data.I_out || null, params.showCurrent);
                break;
        }
    }

    // Dedicated function for plotting quadrature signals
    function plotQuadratureSignals(data) {
        // Clear both plots first
        Plotly.purge(dom.plotContainer);
        const iqPanel = document.getElementById('quadrature-iq-panel');
        const iqPlot = document.getElementById('quadrature-iq-plot');
        if (iqPlot) Plotly.purge(iqPlot);

        // Plot 1: I and Q signals
        const basebandTraces = [
            {
                x: data.t,
                y: data.i_signal,
                type: 'scatter',
                mode: 'lines',
                name: 'I-Signal',  // Exact legend name as requested
                line: { color: '#2ecc71', width: 2 }  // Green
            },
            {
                x: data.t,
                y: data.q_signal,
                type: 'scatter',
                mode: 'lines',
                name: 'Q-Signal',  // Exact legend name as requested
                line: { color: '#e74c3c', width: 2 }  // Red
            }
        ];

        const basebandLayout = {
            title: {
                text: 'I and Q Signals',
                font: { size: 20 }
            },
            xaxis: { 
                title: 'Time (s)',
                titlefont: { size: 14 }
            },
            yaxis: { 
                title: 'Amplitude',
                titlefont: { size: 14 }
            },
            plot_bgcolor: '#ffffff',
            paper_bgcolor: '#ffffff',
            showlegend: true,
            legend: {
                x: 0.02,
                y: 0.98,
                xanchor: 'left',
                yanchor: 'top',
                bgcolor: 'rgba(255, 255, 255, 0.9)',
                bordercolor: 'rgba(0, 0, 0, 0.1)',
                borderwidth: 1,
                font: { size: 12 }
            },
            margin: { l: 60, r: 30, t: 50, b: 50 }
        };

        Plotly.newPlot(dom.plotContainer, basebandTraces, basebandLayout);

        // Plot 2: Quadrature Modulated Signal
        if (iqPanel && iqPlot) {
            iqPanel.style.display = 'block';
            
            const modulatedTrace = [{
                x: data.t,
                y: data.qm_signal,
                type: 'scatter',
                mode: 'lines',
                name: 'Quad-Modulated',  // Exact legend name as requested
                line: { color: '#3498db', width: 2 }  // Blue
            }];

            const modulatedLayout = {
                title: {
                    text: 'Quadrature Modulated Signal',
                    font: { size: 20 }
                },
                xaxis: { 
                    title: 'Time (s)',
                    titlefont: { size: 14 }
                },
                yaxis: { 
                    title: 'Amplitude',
                    titlefont: { size: 14 }
                },
                plot_bgcolor: '#ffffff',
                paper_bgcolor: '#ffffff',
                showlegend: true,
                legend: {
                    x: 0.02,
                    y: 0.98,
                    xanchor: 'left',
                    yanchor: 'top',
                    bgcolor: 'rgba(255, 255, 255, 0.9)',
                    bordercolor: 'rgba(0, 0, 0, 0.1)',
                    borderwidth: 1,
                    font: { size: 12 }
                },
                margin: { l: 60, r: 30, t: 50, b: 50 }
            };

            Plotly.newPlot(iqPlot, modulatedTrace, modulatedLayout);
        }
    }

    function plotSignalResponse(params, data) {
        console.log('Plotting signal response:', { params, data });

        if (params.signalType === 'quadrature') {
            // Use dedicated quadrature plotting function
            plotQuadratureSignals(data);
        } else {
            // Hide quadrature panel for AM/FM signals
            const iqPanel = document.getElementById('quadrature-iq-panel');
            if (iqPanel) iqPanel.style.display = 'none';
            
            // Use existing AM/FM plotting function
            plotModulation(data.t, data.modulated, data.carrier, data.modulating, params.modulationType);
        }
    }

    // Diagram functionality
    dom.showDiagramBtn.addEventListener('click', () => {
        if (currentMode === 'circuit') {
            const type = dom.circuitType.value;
            dom.circuitDiagramImg.src = `/static/diagrams/${type}_circuit.png`;
            dom.circuitDiagramImg.style.display = 'block';
        } else {
            alert('Signal diagrams coming soon!');
        }
    });

    // Floating controls
    dom.clearPlotBtn.addEventListener('click', () => {
        Plotly.purge(dom.plotContainer);
        plotHistory.length = 0;
    });
    
    dom.savePlotBtn.addEventListener('click', () => {
        try {
            if (!dom.plotContainer) {
                console.error('Plot container not found');
                return;
            }
            
            Plotly.downloadImage(dom.plotContainer, { 
                format: 'png', 
                filename: 'circuit_plot',
                width: 1200,
                height: 800
            });
        } catch (error) {
            console.error('Error saving plot:', error);
        }
    });

    // Make circuit plot resizable with interact.js
    const plotWrapper = document.getElementById('circuit-plot-wrapper');
    const plotDiv = document.getElementById('circuit-plot');
    if (window.interact && plotWrapper && plotDiv && window.Plotly) {
        interact(plotWrapper).resizable({
            edges: { left: false, right: true, bottom: true, top: false },
            listeners: {
                move (event) {
                    event.target.style.width = event.rect.width + 'px';
                    event.target.style.height = event.rect.height + 'px';
                    // Set Plotly plot width and height to match wrapper
                    Plotly.relayout(plotDiv, { width: event.rect.width, height: event.rect.height });
                    Plotly.Plots.resize(plotDiv);
                }
            },
            modifiers: [
                interact.modifiers.restrictSize({
                    min: { width: 350, height: 250 },
                    max: { width: 2000, height: 1200 }
                })
            ],
            inertia: true
        });
        // Also resize on native resize (for browser handle)
        const resizeObserver = new ResizeObserver(() => {
            if (plotWrapper && plotDiv) {
                Plotly.relayout(plotDiv, { width: plotWrapper.offsetWidth, height: plotWrapper.offsetHeight });
                Plotly.Plots.resize(plotDiv);
            }
        });
        resizeObserver.observe(plotWrapper);
    }

    // Initialize with clean state
    hideAllSections();
    dom.equationText.innerHTML = 'Select Circuit Analysis or Electronic Signals to begin.';
    // Verify all DOM elements are properly loaded
    for (const key in dom) {
        if (!dom[key] && key !== 'exportPlotBtn') {
            console.warn(`Missing DOM element: ${key}`);
        }
    }
    // Modulation info button handler
    if (dom.modulationInfoBtn) {
        dom.modulationInfoBtn.addEventListener('click', () => {
            const modulationType = document.getElementById('modulation-type').value;
            if (typeof showModulationInfo === 'function' && ModulationInfo[modulationType]) {
                showModulationInfo(modulationType);
            } else {
                console.error('Modulation info function or data not available');
            }
        });
    }
    // Initialize circuit-specific controls (hidden by default)
    if (document.getElementById('vin-container') && document.getElementById('show-current-container')) {
        document.getElementById('vin-container').style.display = 'none';
        document.getElementById('show-current-container').style.display = 'none';
    }
    // Activate Circuit Analysis mode by default on page load (move to very end)
    activateCircuitAnalysis();
    console.log('Circuit Lab UI initialized');

    const quadInfoBtn = document.getElementById('quadrature-info-btn');
    if (quadInfoBtn) {
        quadInfoBtn.addEventListener('click', () => {
            alert(
`Quadrature Modulation and Demodulation

Quadrature modulation transmits two independent signals using a single carrier frequency, doubling data capacity. It uses two orthogonal carriers: cosine for the in-phase signal (I(t)) and sine for the quadrature signal (Q(t)).

Example:
• Signals: I(t) = 50 Hz (e.g., sin(2 * pi * 50 * t)), Q(t) = 20 Hz (e.g., sin(2 * pi * 20 * t)).
• Carrier: 1500 Hz.
• Modulated signal: y(t) = I(t) * cos(2 * pi * 1500 * t) + Q(t) * sin(2 * pi * 1500 * t).
• Spectrum: Contains high frequencies at 1450 Hz (1500 - 50), 1550 Hz (1500 + 50), 1480 Hz (1500 - 20), and 1520 Hz (1500 + 20).

Demodulation:
• Multiply y(t) by cos(2 * pi * 1500 * t) to recover I(t) (50 Hz).
• Multiply y(t) by sin(2 * pi * 1500 * t) to recover Q(t) (20 Hz).
• Apply a low-pass filter (cutoff ~100 Hz) to remove high frequencies (e.g., ~3000 Hz).
• This down-converts the signals to their original low frequencies, which are easier for digital circuits to process.

Why Quadrature?
• Efficiently transmits two signals over one carrier.
• Avoids complex frequency mixing (e.g., multiplying all signals creates hard-to-separate sums/differences).
• Sampling rate: >= 2 * (1500 + 50) = 3100 Hz (e.g., 10 kHz recommended).
`
            );
            // Show a separate link after the alert
            setTimeout(() => {
                if (window.confirm("For further information, click OK to visit the Wikipedia page.")) {
                    window.open('https://en.wikipedia.org/wiki/Quadrature_amplitude_modulation', '_blank');
                }
            }, 100);
        });
    }
        
        // Add Quadrature Demodulation buttons control
        const signalTypeSelect = document.getElementById('signal-type');
        const quadratureDemodButtons = document.getElementById('quadrature-demod-buttons');
        
        if (signalTypeSelect && quadratureDemodButtons) {
            signalTypeSelect.addEventListener('change', function() {
                if (this.value === 'quadrature-demod') {
                    quadratureDemodButtons.style.display = 'flex';
                } else {
                    quadratureDemodButtons.style.display = 'none';
                }
            });
            
            // Initial state
            if (signalTypeSelect.value === 'quadrature-demod') {
                quadratureDemodButtons.style.display = 'flex';
            }
        }
        
        // Add click handlers for the buttons
        document.getElementById('real-signal-btn')?.addEventListener('click', handleQuadratureDemodulation.bind(null, 'I'));
        document.getElementById('imaginary-signal-btn')?.addEventListener('click', handleQuadratureDemodulation.bind(null, 'Q'));


    // Initialize currentQuadratureSignal
    window.currentQuadratureSignal = {
        signal: null,
        time: null,
        carrier_freq: null
    };

    async function handleQuadratureDemodulation(component) {
        try {
            if (!window.currentQuadratureSignal?.signal) {
                alert('Please generate a quadrature modulated signal first.');
                return;
            }

            const response = await fetch('/circuits/demodulate_quadrature', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    signal: window.currentQuadratureSignal.signal,
                    time: window.currentQuadratureSignal.time,
                    carrier_freq: window.currentQuadratureSignal.carrier_freq,
                    component: component
                })
            });

            const result = await response.json();
            if (result.success) {
                // Create the plot data
                const plotData = [{
                    x: result.time,
                    y: result.demodulated_signal,
                    name: `Demodulated ${component} Component`,
                    type: 'scatter',
                    mode: 'lines'
                }];

                if (result[`${component}_filtered`]) {
                    plotData.push({
                        x: result.time,
                        y: result[`${component}_filtered`],
                        name: `Filtered ${component} Component`,
                        type: 'scatter',
                        mode: 'lines'
                    });
                }

                // Plot FFT
                plotData.push({
                    x: result.fft.frequencies,
                    y: result.fft.magnitudes,
                    name: `FFT of ${component} Component`,
                    yaxis: 'y2',
                    type: 'scatter',
                    mode: 'lines'
                });

                // Set up the layout with two y-axes
                const layout = {
                    title: `Quadrature Demodulation - ${component} Component`,
                    xaxis: { title: 'Time (s)' },
                    yaxis: { title: 'Amplitude' },
                    yaxis2: {
                        title: 'FFT Magnitude',
                        overlaying: 'y',
                        side: 'right'
                    },
                    showlegend: true,
                    legend: { x: 1.1, y: 1 }
                };

                // Plot using Plotly
                Plotly.newPlot(dom.plotContainer, plotData, layout);
            } else {
                console.error('Demodulation failed:', result.error);
                alert('Failed to demodulate signal: ' + result.error);
            }
        } catch (error) {
            console.error('Error during demodulation:', error);
            alert('Error during demodulation. See console for details.');
        }
    }

    // Hide quadrature buttons by default
    if (dom.quadratureHoverButtons) {
        dom.quadratureHoverButtons.style.display = 'none';
    }

    async function simulateSignal(event) {
        event.preventDefault();
        
        try {
            const params = getSignalParameters();
            
            // Determine if this is a quadrature demodulation request
            const isQuadratureDemod = params.signalType.startsWith('quadrature-demod-');
            if (isQuadratureDemod && !window.currentQuadratureSignal?.signal) {
                alert('Please generate a quadrature modulated signal first using Quadrature Modulation (QM).');
                return;
            }

            let endpoint = '/circuits/modulation';
            let requestData = {};

            if (isQuadratureDemod) {
                // Handle demodulation request
                const component = params.signalType === 'quadrature-demod-i' ? 'I' : 'Q';
                endpoint = '/circuits/demodulate_quadrature';
                requestData = {
                    signal: window.currentQuadratureSignal.signal,
                    time: window.currentQuadratureSignal.time,
                    carrier_freq: window.currentQuadratureSignal.carrier_freq,
                    component: component
                };
            } else {            // Handle regular modulation request
            requestData = {
                modulation_type: params.modulationType || 'AM',
                carrier_frequency: parseFloat(params.carrierFreq) || 100,
                modulating_frequency: parseFloat(params.modulatingFreq) || 10,
                modulation_index: parseFloat(params.modulationIndex) || 0.5,
                duration: parseFloat(params.duration) || 1.0,
                sample_rate: Math.floor(parseFloat(params.sampleRate)) || 1000,
                points: Math.floor(parseFloat(params.sampleRate) * parseFloat(params.duration)) // Calculate total points
            };

                // Add extra parameters for QM
                if (params.modulationType === 'QM') {
                    requestData = {
                        ...requestData,
                        i_frequency: params.iFreq,
                        q_frequency: params.qFreq,
                        phase_shift: params.phaseShift
                    };
                }
            }

            console.log('Sending request:', { endpoint, requestData });

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Unknown error occurred');
            }

            // Store QM signal for later demodulation
            if (params.modulationType === 'QM') {
                window.currentQuadratureSignal = {
                    signal: result.modulated_signal,
                    time: result.time,
                    carrier_freq: result.parameters.carrier_frequency
                };
            }

            // Plot the results
            if (isQuadratureDemod) {
                // Plot demodulated signal and FFT
                const plotData = [{
                    x: result.time,
                    y: result.demodulated_signal,
                    name: `Demodulated ${requestData.component} Component`,
                    type: 'scatter',
                    mode: 'lines'
                }];

                if (result[`${requestData.component}_filtered`]) {
                    plotData.push({
                        x: result.time,
                        y: result[`${requestData.component}_filtered`],
                        name: `Filtered ${requestData.component} Component`,
                        type: 'scatter',
                        mode: 'lines'
                    });
                }

                // Add FFT plot
                plotData.push({
                    x: result.fft.frequencies,
                    y: result.fft.magnitudes,
                    name: `FFT of ${requestData.component} Component`,
                    yaxis: 'y2',
                    type: 'scatter',
                    mode: 'lines'
                });

                const layout = {
                    title: `Quadrature Demodulation - ${requestData.component} Component`,
                    xaxis: { title: 'Time (s)' },
                    yaxis: { title: 'Amplitude' },
                    yaxis2: {
                        title: 'FFT Magnitude',
                        overlaying: 'y',
                        side: 'right'
                    },
                    showlegend: true,
                    legend: { x: 1.1, y: 1 }
                };

                Plotly.newPlot(dom.plotContainer, plotData, layout);
            } else {
                // Plot modulated signal
                const plotData = [
                    {
                        x: result.time,
                        y: result.carrier_signal,
                        name: 'Carrier',
                        type: 'scatter',
                        mode: 'lines'
                    },
                    {
                        x: result.time,
                        y: result.modulating_signal,
                        name: 'Modulating',
                        type: 'scatter',
                        mode: 'lines'
                    },
                    {
                        x: result.time,
                        y: result.modulated_signal,
                        name: 'Modulated',
                        type: 'scatter',
                        mode: 'lines'
                    }
                ];

                Plotly.newPlot(dom.plotContainer, plotData);
            }
        } catch (error) {
            console.error('Error during simulation:', error);
            alert('Error during simulation: ' + error.message);
        }
    }

    function initializeSignalControls() {
        // Set default values for all signal control fields
        const fields = {
            // AM/FM fields
            'carrier-freq': DEFAULT_SIGNAL_PARAMS.carrierFreq,
            'modulating-freq': DEFAULT_SIGNAL_PARAMS.modulatingFreq,
            'modulation-index': DEFAULT_SIGNAL_PARAMS.modulationIndex,
            // Quadrature fields
            'quad-carrier-freq': DEFAULT_SIGNAL_PARAMS.quadCarrierFreq,
            'quad-i': DEFAULT_SIGNAL_PARAMS.quadIFreq,
            'quad-q': DEFAULT_SIGNAL_PARAMS.quadQFreq,
            'quad-phase': DEFAULT_SIGNAL_PARAMS.quadPhase,
            // Common fields
            'signal-duration': DEFAULT_SIGNAL_PARAMS.duration,
            'signal-points': DEFAULT_SIGNAL_PARAMS.sampleRate
        };

        // Set values for all fields that exist
        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        });

        // Set default modulation type to AM
        const modulationType = document.getElementById('modulation-type');
        if (modulationType) {
            modulationType.value = 'AM';
        }

        // Set default signal type to modulation (AM)
        if (dom.signalType) {
            dom.signalType.value = 'modulation';
        }

        // Update fields visibility based on current selection
        updateSignalFields();
    }
});
