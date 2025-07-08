// circuit_ui.js - Circuit Lab UI Controller
// Handles all UI logic for Circuits Lab (DOM, events, info, export)

// Global variables
let plotHistory = [];
let currentPlotData = null;

// Wait for DOM content to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Circuit Lab UI initializing...');
    setupCircuitLabUI();
});

function setupCircuitLabUI() {
    // Get DOM elements
    const analysisType = document.getElementById('analysisType');
    const circuitType = document.getElementById('circuitType');
    const circuitAnalysisSection = document.getElementById('circuit-analysis-section');
    const communicationsSection = document.getElementById('communications-section');
    const simButton = document.getElementById('circuitSimBtn');
    const equationText = document.getElementById('equation-text');
    
    // Circuit field containers
    const rcFields = document.getElementById('rc-fields');
    const rlFields = document.getElementById('rl-fields');
    const rlcFields = document.getElementById('rlc-fields');
    const modulationFields = document.getElementById('modulation-fields');
    
    // Setup event listeners
    if (analysisType) {
        analysisType.addEventListener('change', handleAnalysisTypeChange);
    }
    
    if (circuitType) {
        circuitType.addEventListener('change', handleCircuitTypeChange);
    }
    
    if (simButton) {
        simButton.addEventListener('click', handleSimulateClick);
        console.log('Simulate button event listener added');
    }
    
    // Initialize with default values
    handleAnalysisTypeChange();
    handleCircuitTypeChange();
    
    function handleAnalysisTypeChange() {
        const analysisValue = analysisType.value;
        
        if (analysisValue === 'circuit') {
            circuitAnalysisSection.style.display = 'block';
            communicationsSection.style.display = 'none';
        } else if (analysisValue === 'communications') {
            circuitAnalysisSection.style.display = 'none';
            communicationsSection.style.display = 'block';
        }
    }
    
    function handleCircuitTypeChange() {
        const typeValue = circuitType.value;
        
        // Hide all circuit fields first
        rcFields.style.display = 'none';
        rlFields.style.display = 'none';
        rlcFields.style.display = 'none';
        
        // Show appropriate fields and update equation
        switch(typeValue) {
            case 'rc':
                rcFields.style.display = 'block';
                equationText.innerHTML = 'V<sub>out</sub>(t) = V<sub>in</sub>(1 - e<sup>-t/RC</sup>)';
                break;
            case 'rl':
                rlFields.style.display = 'block';
                equationText.innerHTML = 'I(t) = (V<sub>in</sub>/R)(1 - e<sup>-Rt/L</sup>)';
                break;
            case 'rlc':
                rlcFields.style.display = 'block';
                equationText.innerHTML = 'V<sub>out</sub>(t) = V<sub>in</sub>(1 - e<sup>-ζω<sub>n</sub>t</sup>cos(ω<sub>d</sub>t + φ))';
                break;
            case 'differentiator':
                rcFields.style.display = 'block';
                equationText.innerHTML = 'V<sub>out</sub>(t) = RC(dV<sub>in</sub>/dt)';
                break;
            case 'integrator':
                rcFields.style.display = 'block';
                equationText.innerHTML = 'V<sub>out</sub>(t) = (1/RC)∫V<sub>in</sub>(t)dt';
                break;
        }
    }
    
    async function handleSimulateClick() {
        console.log('Simulate button clicked!');
        
        try {
            const analysisValue = analysisType.value;
            
            if (analysisValue === 'circuit') {
                await simulateCircuit();
            } else if (analysisValue === 'communications') {
                await simulateModulation();
            }
        } catch (error) {
            console.error('Simulation error:', error);
            alert('Simulation failed: ' + error.message);
        }
    }
    
    async function simulateCircuit() {
        const typeValue = circuitType.value;
        const Vin = parseFloat(document.getElementById('circuitVin').value);
        const duration = parseFloat(document.getElementById('circuitDuration').value);
        const points = parseInt(document.getElementById('circuitPoints').value);
        
        console.log('Simulating circuit:', typeValue, 'Vin:', Vin, 'Duration:', duration, 'Points:', points);
        
        switch(typeValue) {
            case 'rc':
                const R = parseFloat(document.getElementById('rcR').value);
                const C = parseFloat(document.getElementById('rcC').value) * 1e-6; // Convert μF to F
                await simulateRC(R, C, Vin, duration, points);
                break;
            case 'rl':
                const R_RL = parseFloat(document.getElementById('rlR').value);
                const L = parseFloat(document.getElementById('rlL').value);
                await simulateRL(R_RL, L, Vin, duration, points);
                break;
            case 'rlc':
                const R_RLC = parseFloat(document.getElementById('rlcR').value);
                const L_RLC = parseFloat(document.getElementById('rlcL').value);
                const C_RLC = parseFloat(document.getElementById('rlcC').value) * 1e-6; // Convert μF to F
                await simulateRLC(R_RLC, L_RLC, C_RLC, Vin, duration, points);
                break;
            default:
                throw new Error('Circuit type not implemented yet');
        }
    }
    
    async function simulateRC(R, C, Vin, duration, points) {
        console.log('RC simulation with R=', R, 'C=', C);
        
        const response = await fetch('/api/rc_circuit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ R, C, V_in: Vin, duration, points })
        });
        
        if (!response.ok) {
            throw new Error('RC simulation failed');
        }
        
        const data = await response.json();
        plotCircuitResponse(data.t, data.V_out, 'RC Circuit Step Response', 'Time (s)', 'Voltage (V)');
    }
    
    async function simulateRL(R, L, Vin, duration, points) {
        console.log('RL simulation with R=', R, 'L=', L);
        
        const response = await fetch('/api/rl_circuit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ R, L, V_in: Vin, duration, points })
        });
        
        if (!response.ok) {
            throw new Error('RL simulation failed');
        }
        
        const data = await response.json();
        plotCircuitResponse(data.t, data.I_out, 'RL Circuit Step Response', 'Time (s)', 'Current (A)');
    }
    
    async function simulateRLC(R, L, C, Vin, duration, points) {
        console.log('RLC simulation with R=', R, 'L=', L, 'C=', C);
        
        const response = await fetch('/api/rlc_circuit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ R, L, C, V_in: Vin, duration, points })
        });
        
        if (!response.ok) {
            throw new Error('RLC simulation failed');
        }
        
        const data = await response.json();
        plotCircuitResponse(data.t, data.V_out, 'RLC Circuit Step Response', 'Time (s)', 'Voltage (V)');
    }
    
    async function simulateModulation() {
        // Get modulation parameters
        const modulationType = document.getElementById('modulationType').value;
        const carrierFreq = parseFloat(document.getElementById('carrierFreq').value);
        const modulatingFreq = parseFloat(document.getElementById('modulatingFreq').value);
        const modulationIndex = parseFloat(document.getElementById('modulationIndex').value);
        const duration = parseFloat(document.getElementById('circuitDuration').value);
        const points = parseInt(document.getElementById('circuitPoints').value);
        
        console.log('Simulating modulation:', modulationType);
        
        const response = await fetch('/api/modulation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                modulation_type: modulationType,
                carrier_frequency: carrierFreq,
                modulating_frequency: modulatingFreq,
                modulation_index: modulationIndex,
                duration: duration,
                points: points
            })
        });
        
        if (!response.ok) {
            throw new Error('Modulation simulation failed');
        }
        
        const data = await response.json();
        plotModulationResponse(data);
    }
    
    function plotCircuitResponse(t, y, title, xlabel, ylabel) {
        const trace = {
            x: t,
            y: y,
            type: 'scatter',
            mode: 'lines',
            name: title,
            line: { color: '#0074D9', width: 2 }
        };
        
        const layout = {
            title: title,
            xaxis: { title: xlabel },
            yaxis: { title: ylabel },
            plot_bgcolor: 'rgba(255,255,255,0.1)',
            paper_bgcolor: 'rgba(255,255,255,0.1)',
            font: { color: '#333' }
        };
        
        Plotly.newPlot('circuit-plot', [trace], layout);
        console.log('Plot created successfully');
    }
    
    function plotModulationResponse(data) {
        const traces = [{
            x: data.t,
            y: data.carrier,
            type: 'scatter',
            mode: 'lines',
            name: 'Carrier',
            line: { color: '#FF851B', width: 1 }
        }, {
            x: data.t,
            y: data.modulating,
            type: 'scatter',
            mode: 'lines',
            name: 'Modulating',
            line: { color: '#2ECC40', width: 2 }
        }, {
            x: data.t,
            y: data.modulated,
            type: 'scatter',
            mode: 'lines',
            name: 'Modulated',
            line: { color: '#0074D9', width: 2 }
        }];
        
        const layout = {
            title: `${data.modulation_type} Modulation`,
            xaxis: { title: 'Time (s)' },
            yaxis: { title: 'Amplitude (V)' },
            plot_bgcolor: 'rgba(255,255,255,0.1)',
            paper_bgcolor: 'rgba(255,255,255,0.1)',
            font: { color: '#333' }
        };
        
        Plotly.newPlot('circuit-plot', traces, layout);
    }
    
    // Setup diagram functionality
    setupCircuitDiagram();
    
    function setupCircuitDiagram() {
        const showDiagramBtn = document.getElementById('showDiagramBtn');
        const circuitDiagramImg = document.getElementById('circuit-diagram-img');
        
        if (showDiagramBtn && circuitDiagramImg) {
            showDiagramBtn.addEventListener('click', () => {
                const circuitType = document.getElementById('circuitType').value;
                const imagePath = `/static/diagrams/${circuitType}_circuit.png`;
                circuitDiagramImg.src = imagePath;
                circuitDiagramImg.style.display = 'block';
            });
        }
    }
}

// Helper functions for floating controls
function clearPlot() {
    Plotly.purge('circuit-plot');
    console.log('Plot cleared');
}

function undoLastPlot() {
    if (plotHistory.length > 1) {
        plotHistory.pop();
        const lastPlot = plotHistory[plotHistory.length - 1];
        Plotly.newPlot('circuit-plot', lastPlot.data, lastPlot.layout);
    }
}

function exportPlot() {
    Plotly.downloadImage('circuit-plot', {
        format: 'png',
        width: 800,
        height: 600,
        filename: 'circuit-plot'
    });
}

function savePlot() {
    // Save current plot data
    if (currentPlotData) {
        const dataStr = JSON.stringify(currentPlotData);
        const blob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'circuit-data.json';
        a.click();
        URL.revokeObjectURL(url);
    }
}
