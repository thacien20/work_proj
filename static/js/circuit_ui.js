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
        simulationSettings: document.getElementById('simulation-settings'),
        
        // Circuit controls
        circuitType: document.getElementById('circuit-type'),
        circuitFields: document.getElementById('circuit-fields'),
        
        // Electronic signals controls
        signalType: document.getElementById('signal-type'),
        modulationFields: document.getElementById('modulation-fields'),
        quadratureFields: document.getElementById('quadrature-fields'),
        pllFields: document.getElementById('pll-fields'),
        demodulationFields: document.getElementById('demodulation-fields'),
        
        // Common controls
        simulateBtn: document.getElementById('simulate-btn'),
        equationText: document.getElementById('equation-text'),
        showDiagramBtn: document.getElementById('show-diagram-btn'),
        circuitDiagramImg: document.getElementById('circuit-diagram-img'),
        plotContainer: document.getElementById('circuit-plot'),
        showCurrentBtn: document.getElementById('show-current-btn'),
        
        // Floating controls
        clearPlotBtn: document.getElementById('clear-plot-btn'),
        undoPlotBtn: document.getElementById('undo-plot-btn'),
        exportPlotBtn: document.getElementById('export-plot-btn'),
        savePlotBtn: document.getElementById('save-plot-btn'),
        modulationInfoBtn: document.getElementById('modulation-info-btn'),
        modulationType: document.getElementById('modulation-type'),
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
        dom.simulationSettings.style.display = 'block';
        
        // Show circuit-specific controls
        showCircuitSpecificControls();
        
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
        dom.simulationSettings.style.display = 'block';
        
        // Hide circuit-specific controls that are not needed for electronic signals
        hideCircuitSpecificControls();
        
        // Update UI state
        updateSignalFields();
        dom.equationText.innerHTML = equations[dom.signalType.value];
        
        console.log('Electronic Signals mode activated');
    }

    function hideAllSections() {
        dom.circuitAnalysisControls.style.display = 'none';
        dom.electronicSignalsControls.style.display = 'none';
        dom.simulationSettings.style.display = 'none';
    }

    function hideCircuitSpecificControls() {
        // Hide current plot button (not relevant for signal analysis)
        if (dom.showCurrentBtn) {
            dom.showCurrentBtn.style.display = 'none';
        }
        
        // Hide diagram button (no circuit diagrams for signals)
        if (dom.showDiagramBtn) {
            dom.showDiagramBtn.style.display = 'none';
        }
        
        // Hide signal amplitude field (not relevant for electronic signal processing)
        const vinGroup = document.querySelector('label[for="vin"]')?.parentElement;
        if (vinGroup) {
            vinGroup.style.display = 'none';
        }
    }

    function showCircuitSpecificControls() {
        // Show current plot button for circuit analysis
        if (dom.showCurrentBtn) {
            dom.showCurrentBtn.style.display = 'block';
        }
        
        // Show diagram button for circuits
        if (dom.showDiagramBtn) {
            dom.showDiagramBtn.style.display = 'block';
        }
        
        // Show input voltage field for circuit analysis
        const vinGroup = document.querySelector('label[for="vin"]')?.parentElement;
        if (vinGroup) {
            vinGroup.style.display = 'block';
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

    function updateSignalFields() {
        const selectedSignal = dom.signalType.value;
        
        // Hide all signal fields first
        dom.modulationFields.style.display = 'none';
        dom.quadratureFields.style.display = 'none';
        dom.pllFields.style.display = 'none';
        dom.demodulationFields.style.display = 'none';
        
        // Show appropriate fields
        switch(selectedSignal) {
            case 'modulation':
                dom.modulationFields.style.display = 'block';
                break;
            case 'quadrature':
                dom.quadratureFields.style.display = 'block';
                break;
            case 'pll':
                dom.pllFields.style.display = 'block';
                break;
            case 'demodulation':
                dom.demodulationFields.style.display = 'block';
                break;
        }
        
        dom.equationText.innerHTML = equations[selectedSignal];
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

    // Simulation button
    dom.simulateBtn.addEventListener('click', handleSimulation);

    async function handleSimulation() {
        console.log('Simulation started, current mode:', currentMode);
        
        try {
            if (currentMode === 'circuit') {
                await simulateCircuit();
            } else if (currentMode === 'electronic-signals') {
                console.log('Selected signal type:', dom.signalType.value);
                
                // Debug: Log all input values before simulation
                console.log('Carrier freq input:', document.getElementById('carrier-freq')?.value);
                console.log('Modulating freq input:', document.getElementById('modulating-freq')?.value);
                console.log('Modulation index input:', document.getElementById('modulation-index')?.value);
                console.log('Modulation type input:', document.getElementById('modulation-type')?.value);
                
                await simulateElectronicSignals();
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
                // For quadrature, we'll create a special modulation that shows I/Q signals
                endpoint = '/circuits/modulation';
                body = {
                    modulation_type: 'AM', // Use AM but with special parameters
                    carrier_frequency: params.quadFrequency,
                    modulating_frequency: params.quadFrequency / 10, // Lower frequency for demo
                    modulation_index: params.quadAmplitude,
                    duration: params.duration,
                    sample_rate: Math.floor(params.points / params.duration),
                    signal_type: 'quadrature', // Special flag
                    phase_shift: params.quadPhase
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
                endpoint = '/circuits/modulation';
                body = {
                    modulation_type: params.demodType,
                    carrier_frequency: params.demodCarrierFreq,
                    modulating_frequency: params.demodSignalFreq,
                    modulation_index: 0.8, // Good modulation index for demod demo
                    duration: params.duration,
                    sample_rate: Math.floor(params.points / params.duration),
                    signal_type: 'demodulation' // Special flag
                };
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

        const data = await response.json();
        console.log('Electronic signals simulation response:', data);

        // Transform data if needed
        const transformedData = {
            t: data.time || data.t,
            carrier: data.carrier_signal || data.carrier,
            modulating: data.modulating_signal || data.modulating,
            modulated: data.modulated_signal || data.modulated
        };

        plotSignalResponse(params, transformedData);
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

    function getCircuitParameters() {
        const params = {
            circuitType: dom.circuitType.value,
            vin: parseFloat(document.getElementById('vin').value) || 1.0,
            duration: parseFloat(document.getElementById('duration').value) || 0.01,
            points: parseInt(document.getElementById('points').value) || 1000,
            showCurrent: dom.showCurrentBtn.getAttribute('data-active') === 'true',
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

    function getSignalParameters() {
        const params = {
            signalType: dom.signalType.value,
            duration: parseFloat(document.getElementById('duration').value) || 2.0,
            points: parseInt(document.getElementById('points').value) || 1000,
        };

        console.log('Getting signal parameters for type:', params.signalType);

        // Get parameters based on selected signal type
        switch(params.signalType) {
            case 'modulation':
                const modulationType = document.getElementById('modulation-type')?.value;
                const carrierFreq = document.getElementById('carrier-freq')?.value;
                const modulatingFreq = document.getElementById('modulating-freq')?.value;
                const modulationIndex = document.getElementById('modulation-index')?.value;
                
                console.log('Raw modulation values:', { modulationType, carrierFreq, modulatingFreq, modulationIndex });
                
                params.modulationType = modulationType || 'AM';
                params.carrierFreq = parseFloat(carrierFreq) || 10.0;
                params.modulatingFreq = parseFloat(modulatingFreq) || 1.0;
                params.modulationIndex = parseFloat(modulationIndex) || 0.5;
                
                console.log('Parsed modulation params:', { 
                    modulationType: params.modulationType, 
                    carrierFreq: params.carrierFreq, 
                    modulatingFreq: params.modulatingFreq, 
                    modulationIndex: params.modulationIndex 
                });
                break;
            case 'quadrature':
                params.quadFrequency = parseFloat(document.getElementById('quad-frequency')?.value) || 5.0;
                params.quadAmplitude = parseFloat(document.getElementById('quad-amplitude')?.value) || 1.0;
                params.quadPhase = parseFloat(document.getElementById('quad-phase')?.value) || 90;
                console.log('Quadrature params:', params);
                break;
            case 'pll':
                params.pllInputFreq = parseFloat(document.getElementById('pll-input-freq')?.value) || 10.0;
                params.pllVcoFreq = parseFloat(document.getElementById('pll-vco-freq')?.value) || 9.5;
                params.pllLoopGain = parseFloat(document.getElementById('pll-loop-gain')?.value) || 0.1;
                console.log('PLL params:', params);
                break;
            case 'demodulation':
                params.demodType = document.getElementById('demod-type')?.value || 'AM';
                params.demodCarrierFreq = parseFloat(document.getElementById('demod-carrier-freq')?.value) || 10.0;
                params.demodSignalFreq = parseFloat(document.getElementById('demod-signal-freq')?.value) || 1.0;
                console.log('Demodulation params:', params);
                break;
        }

        console.log('Final signal parameters:', params);
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

    function plotSignalResponse(params, data) {
        console.log('Plotting signal response:', { params, data });
        
        // Clear the existing plot first
        Plotly.purge(dom.plotContainer);
        
        // For now, all electronic signals plot as modulation
        plotModulation(data.t, data.modulated, data.carrier, data.modulating, params.modulationType || params.signalType);
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
    
    dom.undoPlotBtn.addEventListener('click', () => {
        if (plotHistory.length > 0) {
            plotHistory.pop();
        }
    });
    
    dom.exportPlotBtn.addEventListener('click', () => {
        Plotly.downloadImage(dom.plotContainer, { format: 'png', filename: 'circuit_plot' });
    });
    
    dom.savePlotBtn.addEventListener('click', () => {
        const data = dom.plotContainer.data;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        a.download = 'plot-data.json';
        a.click();
    });

    // Modulation info button
    dom.modulationInfoBtn.addEventListener('click', () => {
        const modulationType = dom.modulationType ? dom.modulationType.value : 'AM';
        const info = getModulationInfo(modulationType);
        
        if (info) {
            const formattedInfo = formatModulationInfo(modulationType);
            
            // Create modal dialog
            const modal = document.createElement('div');
            modal.className = 'info-modal';
            modal.innerHTML = `
                <div class="info-modal-content">
                    <div class="info-modal-header">
                        <h2>Modulation Information</h2>
                        <button class="info-modal-close">&times;</button>
                    </div>
                    <div class="info-modal-body">
                        ${formattedInfo}
                    </div>
                </div>
            `;
            
            // Add modal to document
            document.body.appendChild(modal);
            
            // Close modal handlers
            const closeBtn = modal.querySelector('.info-modal-close');
            closeBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            });
        } else {
            alert('Modulation information not available');
        }
    });

    // Initialize with clean state
    hideAllSections();
    dom.equationText.innerHTML = 'Select Circuit Analysis or Electronic Signals to begin.';
    
    console.log('Circuit Lab UI initialized');
});
