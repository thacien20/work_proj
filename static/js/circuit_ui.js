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

        // QM-specific tools
        qmTools: document.getElementById('qm-tools'),
        quadratureDemodBtn: document.getElementById('quadrature-demod-btn'),
        demodRealBtn: document.getElementById('demod-real-btn'),
        demodImagBtn: document.getElementById('demod-imag-btn'),
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
        
        // Update panel title for circuit mode
        document.getElementById('info-panel-title').textContent = '📖 Circuit Information';
        
        // Show diagram container for circuit mode only
        const diagramContainer = document.getElementById('diagram-container');
        if (diagramContainer) {
            diagramContainer.style.display = 'flex';
        }
        
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
        
        // Also show the circuit info panel but with modified title
        document.getElementById('circuit-info-panel').style.display = 'block';
        document.getElementById('info-panel-title').textContent = '📖 Signal Information';
        
        // Hide diagram container for electronic signals mode
        const diagramContainer = document.getElementById('diagram-container');
        if (diagramContainer) {
            diagramContainer.style.display = 'none';
        }
        
        // Clear any existing circuit diagrams
        const circuitDiagram = document.getElementById('circuit-diagram-img');
        if (circuitDiagram) circuitDiagram.style.display = 'none';
        
        console.log('Electronic Signals mode activated');
        
        // Force update the signal fields immediately
        updateSignalFields();
        
        // Update equation display 
        updateEquationDisplay();
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
        
        // Hide QM tools
        const qmTools = document.getElementById('qm-tools');
        if (qmTools) {
            qmTools.style.display = 'none';
        }
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

    // Fix for the updateSignalFields function
    function updateSignalFields() {
        const selectedSignal = dom.signalType?.value;
        console.log('Signal type selected:', selectedSignal);
        
        if (!selectedSignal) {
            console.error('Signal type not found or initialized');
            return;
        }

        // Show/hide info buttons
        const quadInfoBtn = document.getElementById('quadrature-info-btn');
        if (quadInfoBtn) {
            quadInfoBtn.style.display = (selectedSignal === 'QM') ? 'inline-block' : 'none';
        }

        // Hide all signal fields first
        if (dom.modulationFields) dom.modulationFields.style.display = 'none';
        if (dom.quadratureFields) dom.quadratureFields.style.display = 'none';
        if (dom.pllFields) dom.pllFields.style.display = 'none';
        if (dom.demodulationFields) dom.demodulationFields.style.display = 'none';

        // Show appropriate fields based on signal type
        switch(selectedSignal) {
            case 'AM':
            case 'FM':
                if (dom.modulationFields) {
                    dom.modulationFields.style.display = 'grid';
                    console.log('Showing modulation fields for', selectedSignal);
                    
                    // Update fields to match the selected modulation type
                    const carrierField = document.getElementById('carrier-freq');
                    const signalField = document.getElementById('modulating-freq');
                    const indexField = document.getElementById('modulation-index');
                    
                    if (carrierField && signalField && indexField) {
                        // Set appropriate default values based on modulation type
                        if (selectedSignal === 'AM') {
                            carrierField.value = '100';
                            signalField.value = '10';
                            indexField.value = '0.8';
                            indexField.max = '1.0';  // AM modulation index should be ≤ 1.0
                        } else { // FM
                            carrierField.value = '100';
                            signalField.value = '10';
                            indexField.value = '5';
                            indexField.max = '10.0';  // FM modulation index can be > 1.0
                        }
                    } else {
                        console.error('Could not find one or more modulation field inputs');
                    }
                } else {
                    console.error('Modulation fields container not found');
                }
                break;
            case 'QM':
                if (dom.quadratureFields) {
                    dom.quadratureFields.style.display = 'grid';
                    
                    // Add event listeners to QM input fields to update recommendations
                    const qmInputIds = ['quad-carrier-freq', 'quad-i', 'quad-q', 'signal-duration', 'signal-points'];
                    qmInputIds.forEach(id => {
                        const input = document.getElementById(id);
                        if (input) {
                            // Remove existing listeners to prevent duplicates
                            const newInput = input.cloneNode(true);
                            if (input.parentNode) {
                                input.parentNode.replaceChild(newInput, input);
                            }
                            
                            // Add input and change event listeners
                            newInput.addEventListener('input', updateRecommendedPoints);
                            newInput.addEventListener('change', updateRecommendedPoints);
                        }
                    });
                    
                    // Update recommended points immediately
                    setTimeout(updateRecommendedPoints, 100);
                }
                break;
            default:
                console.log('Unknown signal type:', selectedSignal);
                if (dom.modulationFields) dom.modulationFields.style.display = 'grid';
                break;
        }

        // Update equation display
        updateEquationDisplay();

        // Show/hide QM-specific tools based on signal type
        const qmTools = document.getElementById('qm-tools');
        if (qmTools) {
            qmTools.style.display = selectedSignal === 'QM' ? 'flex' : 'none';
            console.log('QM tools visibility:', qmTools.style.display);
        }
    }

    // Update this function to use signal-type directly
    function updateEquationDisplay() {
        const selectedSignal = dom.signalType.value;
        
        // Set equation based on signal type
        if (selectedSignal === 'AM') {
            dom.equationText.innerHTML = 'AM: s(t) = A<sub>c</sub>[1 + m·cos(ω<sub>m</sub>t)]cos(ω<sub>c</sub>t)';
        } else if (selectedSignal === 'FM') {
            dom.equationText.innerHTML = 'FM: s(t) = A<sub>c</sub>cos[ω<sub>c</sub>t + β·sin(ω<sub>m</sub>t)]';
        } else if (selectedSignal === 'QM') {
            dom.equationText.innerHTML = 'QM: s(t) = I(t)·cos(ω<sub>c</sub>t) + Q(t)·sin(ω<sub>c</sub>t)';
        } else if (selectedSignal === 'PLL') {
            dom.equationText.innerHTML = 'PLL: φ<sub>e</sub>(t) = φ<sub>i</sub>(t) - φ<sub>o</sub>(t)';
        }
        
        // Update recommended points if we switched to QM mode
        if (selectedSignal === 'QM') {
            // Show recommendation div if it exists
            const recommendationDiv = document.getElementById('recommended-points');
            if (recommendationDiv) {
                recommendationDiv.style.display = 'block';
            }
            setTimeout(updateRecommendedPoints, 100); // Short delay to ensure DOM is updated
        }
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

    // Move the plotSignalResponse function to be defined before simulateElectronicSignals
    function plotSignalResponse(params, data) {
        console.log('Plotting signal response:', { params, data });

        // Robust mapping for QM: always set qm_signal from all possible keys
        if (params.signalType === 'QM') {
            // Try all possible keys for the modulated signal
            data.qm_signal = data.qm_signal || data.modulated || data.quadrature_modulated_signal || data.modulated_signal;
            if (!data.qm_signal || !Array.isArray(data.qm_signal) || data.qm_signal.length === 0) {
                alert('Error: No quadrature modulated signal data received from backend.');
                console.error('plotSignalResponse: Missing quadrature modulated signal in data:', data);
            }
            plotQuadratureSignals(data);
        } else {
            // Hide quadrature panel for AM/FM signals
            const iqPanel = document.getElementById('quadrature-iq-panel');
            if (iqPanel) iqPanel.style.display = 'none';
            plotModulation(data.t, data.modulated, data.carrier, data.modulating, params.signalType);
        }
    }

    // Fix for the simulateElectronicSignals function to match the HTML changes
    async function simulateElectronicSignals() {
        const params = getSignalParameters();
        
        // Validate sampling rate before proceeding
        if (!validateSamplingRate(params)) {
            console.log("Simulation aborted due to inadequate sampling rate");
            return; // Exit if validation fails
        }
        
        let endpoint = '';
        let body = {};

        // Updated switch to match the signal type values from HTML
        switch(params.signalType) {
            case 'AM':
            case 'FM':
                endpoint = '/circuits/modulation';
                body = {
                    modulation_type: params.signalType,
                    carrier_frequency: params.carrierFreq,
                    modulating_frequency: params.modulatingFreq,
                    modulation_index: params.modulationIndex,
                    duration: params.duration,
                    sample_rate: Math.floor(params.points / params.duration),
                };
                break;
            case 'QM':
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
            default:
                throw new Error(`Unsupported signal type: ${params.signalType}`);
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

        // Better handling of different response formats
        const transformedData = {
            t: result.time || result.t,
            carrier: result.carrier_signal,
            modulating: result.modulating_signal,
            modulated: result.modulated_signal || result.quadrature_modulated_signal,
            I: result.I, 
            Q: result.Q  
        };

        // Print debug information
        console.log("Transformed data:", transformedData);

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
        const signalType = dom.signalType?.value || 'AM';
        
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
        if (signalType === 'QM') {
            params.quadCarrierFreq = getNumericValue('quad-carrier-freq', 100);
            params.quadIFreq = getNumericValue('quad-i', 10);
            params.quadQFreq = getNumericValue('quad-q', 20);
            params.quadPhase = getNumericValue('quad-phase', 90);

            // Validate carrier frequency is higher than both I and Q
            if (params.quadCarrierFreq <= Math.max(params.quadIFreq, params.quadQFreq)) {
                throw new Error('Carrier frequency must be higher than both I and Q frequencies.');
            }
        } else {
            // Handle AM/FM parameters
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

    async function plotRC_VI(t, V_out, I_out = null, showCurrent = false) {
        try {
            if (!t || !V_out) {
                throw new Error('Missing time or voltage data for RC plot.');
            }

            const traces = [{
                x: t,
                y: V_out,
                name: 'Voltage',
                type: 'scatter',
                mode: 'lines',
                line: { color: 'blue', width: 2 },
                yaxis: 'y'  // Use primary y-axis
            }];

            // Layout configuration
            const layout = {
                title: 'RC Circuit Response',
                xaxis: { 
                    title: 'Time (s)',
                    domain: [0, 0.85]  // Make room for second y-axis
                },
                yaxis: {
                    title: 'Voltage (V)',
                    titlefont: { color: 'blue' },
                    tickfont: { color: 'blue' },
                    side: 'left'
                },
                showlegend: true,
                legend: { x: 0, y: 1.2, orientation: 'h' }
            };

            // Add current trace and axis if needed
            if (showCurrent && I_out) {
                traces.push({
                    x: t,
                    y: I_out,
                    name: 'Current',
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: 'red', width: 2 },
                    yaxis: 'y2'  // Use secondary y-axis
                });

                // Add secondary y-axis configuration
                layout.yaxis2 = {
                    title: 'Current (A)',
                    titlefont: { color: 'red' },
                    tickfont: { color: 'red' },
                    overlaying: 'y',
                    side: 'right',
                    showgrid: false
                };
            }

            await Plotly.newPlot('circuit-plot', traces, layout);
        } catch (err) {
            console.error('plotRC_VI failed:', err);
            alert('Plotting RC circuit failed: ' + err.message);
        }
    }

    async function plotRL_VI(t, I_out, V_out = null, showCurrent = false) {
        try {
            if (!t || !I_out) {
                throw new Error('Missing time or current data for RL plot.');
            }

            const traces = [{
                x: t,
                y: V_out,
                name: 'Voltage',
                type: 'scatter',
                mode: 'lines',
                line: { color: 'blue', width: 2 },
                yaxis: 'y'
            }];

            const layout = {
                title: 'RL Circuit Response',
                xaxis: { 
                    title: 'Time (s)',
                    domain: [0, 0.85]
                },
                yaxis: {
                    title: 'Voltage (V)',
                    titlefont: { color: 'blue' },
                    tickfont: { color: 'blue' },
                    side: 'left'
                },
                showlegend: true,
                legend: { x: 0, y: 1.2, orientation: 'h' }
            };

            if (showCurrent) {
                traces.push({
                    x: t,
                    y: I_out,
                    name: 'Current',
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: 'red', width: 2 },
                    yaxis: 'y2'
                });

                layout.yaxis2 = {
                    title: 'Current (A)',
                    titlefont: { color: 'red' },
                    tickfont: { color: 'red' },
                    overlaying: 'y',
                    side: 'right',
                    showgrid: false
                };
            }

            await Plotly.newPlot('circuit-plot', traces, layout);
        } catch (err) {
            console.error('plotRL_VI failed:', err);
            alert('Plotting RL circuit failed: ' + err.message);
        }
    }

    async function plotRLC_VI(t, V_out, I_out = null, showCurrent = false) {
        try {
            if (!t || !V_out) {
                throw new Error('Missing time or voltage data for RLC plot.');
            }

            const traces = [{
                x: t,
                y: V_out,
                name: 'Voltage',
                type: 'scatter',
                mode: 'lines',
                line: { color: 'blue', width: 2 }
            }];

            const layout = {
                title: 'RLC Circuit Response',
                xaxis: { 
                    title: 'Time (s)',
                    domain: [0, 0.95]
                },
                yaxis: {
                    title: 'Voltage (V)',
                    titlefont: { color: 'blue' },
                    tickfont: { color: 'blue' }
                },
                showlegend: true,
                legend: { x: 0, y: 1.2, orientation: 'h' }
            };

            await Plotly.newPlot('circuit-plot', traces, layout);
        } catch (err) {
            console.error('plotRLC_VI failed:', err);
            alert('Plotting RLC circuit failed: ' + err.message);
        }
    }

    // Dedicated function for plotting quadrature signals with FFT
    function plotQuadratureSignals(data) {
        console.log("plotQuadratureSignals called with data:", data);
        
        // Always clear and plot in the main plot container
        Plotly.purge(dom.plotContainer);
        
        // Map the quadrature modulated signal from various possible keys
        console.log("Looking for quadrature signal in data keys:", Object.keys(data));
        data.qm_signal = data.qm_signal || data.modulated || data.quadrature_modulated_signal || data.modulated_signal;
        console.log("qm_signal mapped to:", data.qm_signal ? `Array of length ${data.qm_signal.length}` : "undefined");
        
        if (!Array.isArray(data.t) || data.t.length === 0) {
            console.error('plotQuadratureSignals: Missing or invalid time array (data.t)');
            alert('Error: No time data for quadrature plot.');
            return;
        }
        
        // Validate data integrity before proceeding
        if (!data.qm_signal || !Array.isArray(data.qm_signal) || data.qm_signal.length === 0) {
            console.error('plotQuadratureSignals: Missing or invalid quadrature modulated signal');
            alert('Error: No quadrature modulated signal data for plotting.');
            return;
        }
        
        // Store data for other operations
        window.currentQuadratureData = {
            t: data.t,
            I: data.I,
            Q: data.Q,
            qm_signal: data.qm_signal
        };
        
        console.log("[plotQuadratureSignals] Stored data for FFT:", window.currentQuadratureData);
        console.log("[plotQuadratureSignals] qm_signal length:", 
                   window.currentQuadratureData.qm_signal ? window.currentQuadratureData.qm_signal.length : 0);
        
        // Instead of creating a separate time-domain only plot, we directly calculate 
        // and display both time domain and FFT in a single subplot layout
        calculateAndPlotFFT(data);
    }
    
    // Function to calculate FFT and create a complete subplot with time and frequency domain
    async function calculateAndPlotFFT(data) {
        try {
            // Clear any existing plot first
            Plotly.purge(dom.plotContainer);
            
            // Validate data
            if (!data.qm_signal || !Array.isArray(data.qm_signal) || data.qm_signal.length === 0) {
                console.error("Missing or invalid QM signal for FFT calculation");
                throw new Error("Missing or invalid quadrature modulated signal data");
            }
            
            // Calculate sample rate from UI inputs
            const duration = parseFloat(document.getElementById('signal-duration')?.value) || 1.0;
            const points = parseInt(document.getElementById('signal-points')?.value) || 1000;
            const sampleRate = Math.floor(points / duration);
            
            console.log(`Calculating FFT using ${points} points over ${duration}s = ${sampleRate}Hz sample rate`);
            
            // Show loading state
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'fft-loading';
            loadingDiv.style.position = 'absolute';
            loadingDiv.style.top = '50%';
            loadingDiv.style.left = '50%';
            loadingDiv.style.transform = 'translate(-50%, -50%)';
            loadingDiv.style.padding = '10px';
            loadingDiv.style.background = 'rgba(255,255,255,0.8)';
            loadingDiv.style.borderRadius = '5px';
            loadingDiv.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
            loadingDiv.style.zIndex = '1000';
            loadingDiv.innerHTML = 'Calculating FFT...';
            
            dom.plotContainer.style.position = 'relative';
            dom.plotContainer.appendChild(loadingDiv);
            
            // Prepare request payload
            const payload = {
                quadrature_modulated_signal: data.qm_signal,
                sample_rate: sampleRate
            };
            
            // Make FFT request
            console.log("Sending FFT calculation request with payload:", {
                signal_length: data.qm_signal.length,
                sample_rate: sampleRate
            });
            
            const response = await fetch('/circuits/fft_qm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            console.log("FFT response status:", response.status);
            
            // Remove loading indicator
            const loadingElement = document.getElementById('fft-loading');
            if (loadingElement) loadingElement.remove();
            
            if (!response.ok) {
                throw new Error(`FFT calculation failed: ${response.status}`);
            }
            
            const result = await response.json();
            
            // Validate FFT result
            if (!result.frequencies || !Array.isArray(result.frequencies) || 
                !result.magnitude || !Array.isArray(result.magnitude)) {
                throw new Error("Invalid FFT data returned from server");
            }
            
            console.log("FFT calculation successful, creating subplot");
            
            // Create combined subplot with time domain and frequency domain
            const timeDomainTraces = [];
            
            // Time domain traces
            if (data.I && Array.isArray(data.I) && data.I.length > 0) {
                timeDomainTraces.push({
                    x: data.t,
                    y: data.I,
                    name: 'I (In-Phase)',
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: '#2ecc71', width: 2 }
                });
            }
            
            if (data.Q && Array.isArray(data.Q) && data.Q.length > 0) {
                timeDomainTraces.push({
                    x: data.t,
                    y: data.Q,
                    name: 'Q (Quadrature)',
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: '#e74c3c', width: 2 }
                });
            }
            
            if (data.qm_signal && Array.isArray(data.qm_signal)) {
                timeDomainTraces.push({
                    x: data.t,
                    y: data.qm_signal,
                    name: 'Quadrature Modulated',
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: '#8e44ad', width: 2 }
                });
            }
            
            // Log FFT data to help diagnose the issue
            console.log("FFT data received:", {
                frequencies_length: result.frequencies.length,
                frequencies_sample: result.frequencies.slice(0, 5),
                magnitude_length: result.magnitude.length,
                magnitude_sample: result.magnitude.slice(0, 5),
                max_frequency: Math.max(...result.frequencies),
                max_magnitude: Math.max(...result.magnitude)
            });
            
            // Examine the arrays to determine if they're swapped
            // Frequencies should typically start near 0 and increase
            // Magnitudes are typically highest at specific frequencies
            let freqArr = result.frequencies;
            let magArr = result.magnitude;
            
            // Auto-detect if the arrays might be swapped based on characteristic patterns
            const isFreqArrValid = freqArr[0] <= 1 && // First frequency is typically close to 0
                                  freqArr[freqArr.length-1] > freqArr[0] && // Frequencies increase
                                  freqArr.every((val, i) => i === 0 || val >= freqArr[i-1]); // Strictly non-decreasing
            
            // If frequency array doesn't look like frequencies, they might be swapped
            if (!isFreqArrValid) {
                console.warn("FFT arrays appear to be swapped, correcting...");
                // Swap the arrays
                let temp = freqArr;
                freqArr = magArr;
                magArr = temp;
            }
            
            // Create the FFT trace with the correct axes
            const fftTrace = {
                x: freqArr,       // Frequency values on x-axis
                y: magArr,        // Magnitude values on y-axis
                name: 'FFT Magnitude',
                type: 'scatter',
                mode: 'lines',
                line: { color: '#3498db', width: 2 },
                xaxis: 'x2',
                yaxis: 'y2'
            };
            
            // Combine all traces
            const allTraces = [...timeDomainTraces, fftTrace];
            
            // Create subplot layout with explicit configuration for FFT plot
            const layout = {
                grid: {
                    rows: 2,
                    columns: 1,
                    pattern: 'independent',
                    roworder: 'top to bottom',
                    rowheight: [0.6, 0.4]  // Time domain gets 60% height, FFT gets 40%
                },
                title: {
                    text: 'Quadrature Modulation Analysis',
                    font: { size: 20, color: '#333' }
                },
                showlegend: true,
                legend: {
                    x: 0.02, 
                    y: 0.98,
                    xanchor: 'left', 
                    yanchor: 'top',
                    bgcolor: 'rgba(255,255,255,0.8)',
                    bordercolor: 'rgba(0,0,0,0.1)',
                    borderwidth: 1
                },
                height: 700,  // Increase overall height for two plots
                xaxis: {
                    title: {
                        text: 'Time (s)',
                        font: { size: 14 }
                    },
                    domain: [0, 0.98],
                    showgrid: true,
                    gridcolor: '#e6e6e6',
                    zeroline: true,
                    zerolinecolor: '#cccccc'
                },
                yaxis: {
                    title: {
                        text: 'Amplitude',
                        font: { size: 14 }
                    },
                    showgrid: true,
                    gridcolor: '#e6e6e6',
                    zeroline: true,
                    zerolinecolor: '#cccccc'
                },
                xaxis2: {
                    title: {
                        text: 'Frequency (Hz)',  // This is correct based on our fix above
                        font: { size: 14 }
                    },
                    domain: [0, 0.98],
                    showgrid: true,
                    gridcolor: '#e6e6e6',
                    zeroline: true,
                    zerolinecolor: '#cccccc',
                    autorange: true
                },
                yaxis2: {
                    title: {
                        text: 'Magnitude',  // This is correct based on our fix above
                        font: { size: 14 }
                    },
                    showgrid: true,
                    gridcolor: '#e6e6e6',
                    zeroline: true,
                    zerolinecolor: '#cccccc',
                    autorange: true,
                    fixedrange: false  // Allow y-axis scaling
                },
                plot_bgcolor: '#ffffff',
                paper_bgcolor: '#f8f9fa',
                margin: { l: 60, r: 30, t: 80, b: 60 }
            };
            
            // Create the plot
            console.log("Creating combined time/frequency domain plot");
            await Plotly.newPlot(dom.plotContainer, allTraces, layout);
            console.log("Quadrature subplot with FFT created successfully");
            
            // Add a "QM Analysis Complete" status for 2 seconds
            const statusDiv = document.createElement('div');
            statusDiv.id = 'plot-status';
            statusDiv.style.position = 'absolute';
            statusDiv.style.bottom = '10px';
            statusDiv.style.right = '10px';
            statusDiv.style.padding = '5px 10px';
            statusDiv.style.background = 'rgba(46, 204, 113, 0.8)';
            statusDiv.style.color = 'white';
            statusDiv.style.borderRadius = '3px';
            statusDiv.style.zIndex = '1000';
            statusDiv.innerHTML = 'Time and Frequency Analysis Complete';
            
            dom.plotContainer.appendChild(statusDiv);
            
            // Remove status message after 2 seconds
            setTimeout(() => {
                const statusElement = document.getElementById('plot-status');
                if (statusElement) {
                    statusElement.style.opacity = '0';
                    statusElement.style.transition = 'opacity 0.5s';
                    setTimeout(() => statusElement.remove(), 500);
                }
            }, 2000);
            
        } catch (error) {
            console.error("Error calculating or plotting FFT:", error);
            
            // Remove any loading indicator
            const loadingElement = document.getElementById('fft-loading');
            if (loadingElement) loadingElement.remove();
            
            // Create a simple time domain plot as fallback
            console.log("Creating fallback time domain plot due to FFT calculation error");
            const traces = [];
            
            if (data.I && Array.isArray(data.I)) {
                traces.push({
                    x: data.t,
                    y: data.I,
                    name: 'I (In-Phase)',
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: '#2ecc71', width: 2 }
                });
            }
            
            if (data.Q && Array.isArray(data.Q)) {
                traces.push({
                    x: data.t,
                    y: data.Q,
                    name: 'Q (Quadrature)',
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: '#e74c3c', width: 2 }
                });
            }
            
            if (data.qm_signal && Array.isArray(data.qm_signal)) {
                traces.push({
                    x: data.t,
                    y: data.qm_signal,
                    name: 'Quadrature Modulated',
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: '#8e44ad', width: 2 }
                });
            }
            
            const layout = {
                title: 'Quadrature Modulation Signals (FFT calculation failed)',
                subtitle: 'Error: ' + error.message,
                xaxis: { title: 'Time (s)' },
                yaxis: { title: 'Amplitude' },
                legend: { x: 0.02, y: 0.98, xanchor: 'left', yanchor: 'top', bgcolor: 'rgba(255,255,255,0.8)', bordercolor: 'rgba(0,0,0,0.1)', borderwidth: 1 },
                showlegend: true,
                plot_bgcolor: '#ffffff',
                paper_bgcolor: '#f8f9fa',
                annotations: [{
                    text: 'FFT calculation failed: ' + error.message,
                    xref: 'paper',
                    yref: 'paper',
                    x: 0.5,
                    y: 0.5,
                    showarrow: false,
                    font: {
                        size: 16,
                        color: '#e74c3c'
                    }
                }]
            };
            
            Plotly.newPlot(dom.plotContainer, traces, layout);
            
            // Show a small warning toast instead of a blocking alert
            const warningDiv = document.createElement('div');
            warningDiv.id = 'fft-warning';
            warningDiv.style.position = 'absolute';
            warningDiv.style.bottom = '10px';
            warningDiv.style.right = '10px';
            warningDiv.style.padding = '10px';
            warningDiv.style.background = 'rgba(231, 76, 60, 0.9)';
            warningDiv.style.color = 'white';
            warningDiv.style.borderRadius = '5px';
            warningDiv.style.zIndex = '1000';
            warningDiv.innerHTML = 'FFT calculation failed: ' + error.message;
            
            dom.plotContainer.appendChild(warningDiv);
            
            // Remove warning after 5 seconds
            setTimeout(() => {
                const warningElement = document.getElementById('fft-warning');
                if (warningElement) {
                    warningElement.style.opacity = '0';
                    warningElement.style.transition = 'opacity 0.5s';
                    setTimeout(() => warningElement.remove(), 500);
                }
            }, 5000);
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
    // Modulation info button handler - fixing the reference to the signal type element
    if (dom.modulationInfoBtn) {
        dom.modulationInfoBtn.addEventListener('click', () => {
            // Changed from 'modulation-type' to 'signal-type' to match the actual element ID
            const modulationType = document.getElementById('signal-type').value;
            if (typeof showModulationInfo === 'function' && ModulationInfo[modulationType]) {
                showModulationInfo(modulationType);
            } else {
                // Show a simple alert if the formal info isn't available
                alert(`${modulationType} Modulation Information:\n\n` + 
                      `${modulationType === 'AM' ? 'Amplitude Modulation varies the amplitude of a carrier wave.' : 
                        modulationType === 'FM' ? 'Frequency Modulation varies the frequency of a carrier wave.' : 
                        'This modulation type encodes data by varying carrier properties.'}`);
            }
        });
    }
    // Add a function to show quadrature modulation info when the info button is clicked
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

    // Initialize circuit-specific controls (hidden by default)
    if (document.getElementById('vin-container') && document.getElementById('show-current-container')) {
        document.getElementById('vin-container').style.display = 'none';
        document.getElementById('show-current-container').style.display = 'none';
    }

    // Add this function to initialize signal controls (it was referenced but not defined)
    function initializeSignalControls() {
        // Make sure the signal type is set (default to AM)
        const signalType = dom.signalType;
        if (signalType) {
            signalType.value = 'AM';
        }
        
        // Ensure proper initialization of modulation fields
        const carrierFreq = document.getElementById('carrier-freq');
        const modulatingFreq = document.getElementById('modulating-freq');
        const modIndex = document.getElementById('modulation-index');
        
        if (carrierFreq) carrierFreq.value = '100';
        if (modulatingFreq) modulatingFreq.value = '10';
        if (modIndex) {
            modIndex.value = '0.8';
            modIndex.max = '1.0';
        }
        
        // Update equation and field visibility
        updateSignalFields();
    }

    // Add this function to update button states (it was referenced but not defined)
    function updateButtonStates() {
        const quadInfoBtn = document.getElementById('quadrature-info-btn');
        const signalType = dom.signalType?.value || 'AM';
        
        // Show quadrature info button only for QM
        if (quadInfoBtn) {
            quadInfoBtn.style.display = (signalType === 'QM') ? 'inline-block' : 'none';
        }
        
        // Make sure modulation info button is visible for AM/FM
        const modulationInfoBtn = dom.modulationInfoBtn;
        if (modulationInfoBtn) {
            modulationInfoBtn.style.display = (signalType === 'AM' || signalType === 'FM') ? 'inline-block' : 'none';
        }
    }

    // Add a function to plot modulation which was missing
    function plotModulation(t, modulated, carrier, modulating, modulationType) {
        if (!t || !modulated) {
            console.error('Missing time or modulated signal data for plot');
            return;
        }

        // Clear the plot
        Plotly.purge(dom.plotContainer);
        
        const traces = [];
        
        // Add modulating signal if available
        if (modulating && modulating.length > 0) {
            traces.push({
                x: t,
                y: modulating,
                name: 'Message Signal',
                type: 'scatter',
                mode: 'lines',
                line: { color: 'green', width: 2 }
            });
        }
        
        // Add carrier signal if available
        if (carrier && carrier.length > 0) {
            traces.push({
                x: t,
                y: carrier,
                name: 'Carrier',
                type: 'scatter',
                mode: 'lines',
                line: { color: 'blue', width: 1.5 },
                opacity: 0.7
            });
        }
        
        // Always add modulated signal
        traces.push({
            x: t,
            y: modulated,
            name: `${modulationType} Signal`,
            type: 'scatter',
            mode: 'lines',
            line: { color: 'red', width: 2.5 }
        });

        const layout = {
            title: `${modulationType} Modulation`,
            xaxis: { title: 'Time (s)' },
            yaxis: { title: 'Amplitude' },
            legend: {
                x: 0.02,
                y: 0.98,
                xanchor: 'left',
                yanchor: 'top',
                bgcolor: 'rgba(255,255,255,0.8)',
                bordercolor: 'rgba(0,0,0,0.1)',
                borderwidth: 1
            },
            showlegend: true,
            margin: { l: 60, r: 30, t: 50, b: 50 }
        };

        Plotly.newPlot(dom.plotContainer, traces, layout);
    }

    // Add a proper simulateSignal function which was missing
    async function simulateSignal(event) {
        if (event && event.preventDefault) {
            event.preventDefault();
        }
        
        try {
            await simulateElectronicSignals();
        } catch (error) {
            console.error('Signal simulation failed:', error);
            alert(`Signal simulation failed: ${error.message}`);
        }
    }

    // Add event listener to ensure modulation fields show when clicking Electronic Signals
    dom.electronicSignalsBtn.addEventListener('click', () => {
        setTimeout(() => {
            // Force an update after a short delay to ensure DOM is ready
            updateSignalFields();
        }, 50);
    });

    // Add event listeners for the new demodulation buttons
    if (dom.demodRealBtn) {
        dom.demodRealBtn.addEventListener('click', async () => {
            await demodulateQuadrature('real');
        });
    }
    
    if (dom.demodImagBtn) {
        dom.demodImagBtn.addEventListener('click', async () => {
            await demodulateQuadrature('imaginary');
        });
    }

    // Replace the demodulateQuadrature function with backend integration
    async function demodulateQuadrature(component) {
        try {
            if (!window.currentQuadratureData) {
                alert('Please run a Quadrature Modulation simulation first.');
                return;
            }
            const data = window.currentQuadratureData; // <--- THIS IS THE data OBJECT

            // Get parameters from UI
            const carrierFreq = parseFloat(document.getElementById('quad-carrier-freq')?.value) || 100;
            const duration = parseFloat(document.getElementById('signal-duration')?.value) || 1.0;
            const points = parseInt(document.getElementById('signal-points')?.value) || 1000;

            // Prepare payload for backend
            const payload = {
                quadrature_modulated_signal: data.qm_signal,
                carrier_frequency: carrierFreq,
                duration: duration,
                points: points,
                component: component === 'real' ? 'I' : 'Q'
            };

            // Send request to backend
            const response = await fetch('/circuits/demodulate_qm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            const t = data.t;
            // Only use the demodulated signal from backend, not the original I/Q
            const y = component === 'real' ? result.I : result.Q;
            const title = component === 'real' ? 'I (In-Phase) Component' : 'Q (Quadrature) Component';
            const traceColor = component === 'real' ? '#2ecc71' : '#e74c3c';

            // Plot in the quadrature-iq-plot panel
            const iqPanel = document.getElementById('quadrature-iq-panel');
            if (iqPanel) iqPanel.style.display = 'block';
            const iqPlot = document.getElementById('quadrature-iq-plot');
            if (iqPlot) {
                Plotly.newPlot(iqPlot, [{
                    x: t,
                    y: y,
                    type: 'scatter',
                    mode: 'lines',
                    name: title,
                    line: { color: traceColor, width: 2 }
                }], {
                    title: `Demodulated ${title}`,
                    xaxis: { title: 'Time (s)' },
                    yaxis: { title: 'Amplitude' },
                    plot_bgcolor: '#ffffff',
                    paper_bgcolor: '#ffffff'
                });
            }

            alert(`Demodulation complete: ${title} extracted.`);
        } catch (err) {
            console.error('Demodulation failed:', err);
            alert('Demodulation failed: ' + err.message);
        }
    }
    
    // Function to validate sampling rate and warn about potential aliasing
    function validateSamplingRate(params) {
        // For quadrature modulation, calculate highest frequency component
        if (params.signalType === 'QM') {
            // Highest frequency component is carrier freq plus max of I/Q freqs
            const carrierFreq = params.quadCarrierFreq;
            const maxModFreq = Math.max(params.quadIFreq, params.quadQFreq);
            const highestFreq = carrierFreq + maxModFreq;
            
            // Calculate current sample rate
            const sampleRate = params.points / params.duration;
            
            // Nyquist rate is 2x highest frequency
            const nyquistRate = 2 * highestFreq;
            
            // For good FFT resolution, use at least 5x Nyquist
            const recommendedRate = 5 * nyquistRate;
            const recommendedPoints = Math.ceil(recommendedRate * params.duration);
            
            console.log(`Signal parameters - Carrier: ${carrierFreq}Hz, Max modulating: ${maxModFreq}Hz`);
            console.log(`Highest frequency component: ${highestFreq}Hz`);
            console.log(`Current sample rate: ${sampleRate}Hz, Nyquist minimum: ${nyquistRate}Hz`);
            console.log(`Recommended sample rate: ${recommendedRate}Hz (${recommendedPoints} points)`);
            
            if (sampleRate < nyquistRate) {
                // Critical error: Below Nyquist rate will cause severe aliasing
                alert(`WARNING: Severe undersampling detected!\n\n` +
                      `Your current sampling rate (${Math.round(sampleRate)}Hz) is below the Nyquist rate (${Math.round(nyquistRate)}Hz) ` +
                      `required for your signal with highest frequency component of ${Math.round(highestFreq)}Hz.\n\n` +
                      `This will cause aliasing and incorrect FFT results.\n\n` +
                      `Please increase the number of points to at least ${Math.ceil(nyquistRate * params.duration)}.`);
                return false;
            } 
            else if (sampleRate < recommendedRate) {
                // Warning: Below recommended rate may cause poor resolution
                if (confirm(`Low sampling rate warning:\n\n` +
                          `Your sampling rate (${Math.round(sampleRate)}Hz) is above the minimum Nyquist rate but below ` +
                          `the recommended rate (${Math.round(recommendedRate)}Hz) for good FFT resolution.\n\n` +
                          `For best results with carrier frequency ${carrierFreq}Hz and modulating frequencies up to ${maxModFreq}Hz, ` +
                          `use at least ${recommendedPoints} points.\n\n` +
                          `Continue anyway?`)) {
                    return true;
                } else {
                    return false;
                }
            }
        }
        
        // For AM/FM or if all checks pass
        return true;
    }

    // Function to calculate and display recommended number of points
    function updateRecommendedPoints() {
        // Remove the recommendation div if not in QM mode
        if (dom.signalType.value !== 'QM') {
            const recommendationDiv = document.getElementById('recommended-points');
            if (recommendationDiv && recommendationDiv.parentNode) {
                recommendationDiv.parentNode.removeChild(recommendationDiv);
            }
            return;
        }
        // Only apply for QM mode
        const carrierFreqInput = document.getElementById('quad-carrier-freq');
        const iFreqInput = document.getElementById('quad-i');
        const qFreqInput = document.getElementById('quad-q');
        const durationInput = document.getElementById('signal-duration');
        const pointsInput = document.getElementById('signal-points');
        if (!carrierFreqInput || !iFreqInput || !qFreqInput || !durationInput || !pointsInput) {
            console.error("Could not find one or more required input fields");
            return;
        }
        // Get current values
        const carrierFreq = parseFloat(carrierFreqInput.value) || 100;
        const iFreq = parseFloat(iFreqInput.value) || 10;
        const qFreq = parseFloat(qFreqInput.value) || 20;
        const duration = parseFloat(durationInput.value) || 1.0;
        // Calculate highest frequency component
        const maxModFreq = Math.max(iFreq, qFreq);
        const highestFreq = carrierFreq + maxModFreq;
        // Calculate recommended points (5x Nyquist)
        const nyquistRate = 2 * highestFreq;
        const recommendedRate = 5 * nyquistRate;
        const recommendedPoints = Math.ceil(recommendedRate * duration);
        // Get or create the recommendation div
        let recommendationDiv = document.getElementById('recommended-points');
        if (!recommendationDiv) {
            recommendationDiv = document.createElement('div');
            recommendationDiv.id = 'recommended-points';
            recommendationDiv.style.fontSize = '0.85em';
            recommendationDiv.style.marginTop = '5px';
            recommendationDiv.style.color = '#3498db';
            // Insert after points input
            const pointsFormGroup = pointsInput.closest('.form-group');
            if (pointsFormGroup && pointsFormGroup.parentNode) {
                pointsFormGroup.parentNode.insertBefore(recommendationDiv, pointsFormGroup.nextSibling);
            }
        } else {
            recommendationDiv.style.display = 'block';
        }
        // Update recommendation display
        const currentPoints = parseInt(pointsInput.value) || 1000;
        const currentRate = currentPoints / duration;
        if (currentRate < nyquistRate) {
            recommendationDiv.style.color = '#e74c3c'; // Red for severe warning
            recommendationDiv.innerHTML = `<strong>Warning:</strong> Current sampling rate (${Math.round(currentRate)}Hz) is below Nyquist rate (${Math.round(nyquistRate)}Hz).<br>` +
                                    `<strong>Recommended:</strong> At least ${recommendedPoints} points for clean FFT.`;
        } else if (currentRate < recommendedRate) {
            recommendationDiv.style.color = '#f39c12'; // Orange for mild warning
            recommendationDiv.innerHTML = `<strong>Recommended:</strong> At least ${recommendedPoints} points for best FFT resolution.<br>` +
                                    `Current rate (${Math.round(currentRate)}Hz) meets Nyquist minimum but FFT may have poor resolution.`;
        } else {
            recommendationDiv.style.color = '#2ecc71'; // Green for good
            recommendationDiv.innerHTML = `<strong>Good:</strong> Current sampling rate (${Math.round(currentRate)}Hz) is sufficient for accurate FFT.`;
        }
    }

    // Update recommended points when QM parameters change
    const quadCarrierFreqInput = document.getElementById('quad-carrier-freq');
    const iFreqInput = document.getElementById('quad-i');
    const qFreqInput = document.getElementById('quad-q');
    const durationInput = document.getElementById('signal-duration');
    const pointsInput = document.getElementById('signal-points');

    // Add change event listeners to update recommendation on parameter change
    quadCarrierFreqInput.addEventListener('change', updateRecommendedPoints);
    iFreqInput.addEventListener('change', updateRecommendedPoints);
    qFreqInput.addEventListener('change', updateRecommendedPoints);
    durationInput.addEventListener('change', updateRecommendedPoints);
    pointsInput.addEventListener('change', updateRecommendedPoints);
    
    // Initial call to set up recommendation display
    updateRecommendedPoints();
});