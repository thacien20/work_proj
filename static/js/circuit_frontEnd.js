// circuit_frontEnd.js
// Handles all frontend logic for Circuits Lab (RC, RL, RLC, Differentiator)
function plotRC(t, V_out) {
    const data = [{
        x: t,
        y: V_out,
        type: 'scatter',
        mode: 'lines',
        name: 'RC Step Response',
        line: { color: '#0074D9' }
    }];
    const layout = {
        title: 'RC Circuit Step Response',
        xaxis: { title: 'Time (s)' },
        yaxis: { title: 'Voltage (V)' }
    };
    createPlotWithHistory('circuit-plot', data, layout);
}

// Use global Plotly (already loaded in HTML)

// Plot history management
let plotHistory = [];
let currentPlotData = null;

function savePlotToHistory(data, layout) {
    plotHistory.push({ data, layout });
    currentPlotData = { data, layout };
    // Keep only last 10 plots to avoid memory issues
    if (plotHistory.length > 10) {
        plotHistory.shift();
    }
}

function createPlotWithHistory(elementId, data, layout) {
    Plotly.newPlot(elementId, data, layout);
    savePlotToHistory(data, layout);
}

async function simulateRCCircuit(R, C, V_in, duration, points) {
    const payload = { R, C, V_in, duration, points };
    const response = await fetch('/api/rc_circuit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'RC circuit simulation failed');
    return result;
}
async function simulateRLCircuit(R, L, V_in, duration, points) {
    const payload = { R, L, V_in, duration, points };
    const response = await fetch('/api/rl_circuit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'RL circuit simulation failed');
    return result;
}
async function simulateRLCCircuit(R, L, C, V_in, duration, points) {
    const payload = { R, L, C, V_in, duration, points };
    const response = await fetch('/api/rlc_circuit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'RLC circuit simulation failed');
    return result;
}
async function simulateDifferentiatorCircuit(R, C, V_in, duration, points) {
    const payload = { R, C, V_in, duration, points };
    const response = await fetch('/circuits/differentiator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Differentiator simulation failed');
    return result;
}

async function simulateIntegratorCircuit(R, C, V_in, duration, points) {
    const payload = { R, C, V_in, duration, points };
    const response = await fetch('/circuits/integrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Integrator simulation failed');
    return result;
}

async function simulateModulation(modulationType, carrierFreq, modulatingFreq, modulationIndex, duration, points) {
    const payload = { 
        modulation_type: modulationType, 
        carrier_frequency: carrierFreq, 
        modulating_frequency: modulatingFreq, 
        modulation_index: modulationIndex, 
        duration: duration, 
        sample_rate: points 
    };
    const response = await fetch('/circuits/modulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Modulation simulation failed');
    return result;
}

function plotRC(t, V_out) {
    Plotly.newPlot('circuit-plot', [{
        x: t,
        y: V_out,
        type: 'scatter',
        mode: 'lines',
        name: 'RC Step Response',
        line: { color: '#0074D9' }
    }], {
        title: 'RC Circuit Step Response',
        xaxis: { title: 'Time (s)' },
        yaxis: { title: 'V_{out} (V)' }
    });
}
function plotRL(t, I_out) {
    Plotly.newPlot('circuit-plot', [{
        x: t,
        y: I_out,
        type: 'scatter',
        mode: 'lines',
        name: 'RL Step Response',
        line: { color: '#FF851B' }
    }], {
        title: 'RL Circuit Step Response',
        xaxis: { title: 'Time (s)' },
        yaxis: { title: 'I_{out} (A)' }
    });
}
function plotRLC(t, V_out) {
    Plotly.newPlot('circuit-plot', [{
        x: t,
        y: V_out,
        type: 'scatter',
        mode: 'lines',
        name: 'RLC Step Response',
        line: { color: '#2ECC40' }
    }], {
        title: 'RLC Circuit Step Response',
        xaxis: { title: 'Time (s)' },
        yaxis: { title: 'V_{out} (V)' }
    });
}
function plotRC_VI(t, V_out, I_out, showCurrent) {
    console.log('plotRC_VI called with showCurrent:', showCurrent);
    console.log('I_out data:', I_out);
    
    const traces = [
        {
            x: t,
            y: V_out,
            type: 'scatter',
            mode: 'lines',
            name: 'Voltage (V)',
            line: { color: '#0074D9' },
            yaxis: 'y1'
        }
    ];
    if (showCurrent && I_out) {
        console.log('Adding current trace to plot');
        traces.push({
            x: t,
            y: I_out,
            type: 'scatter',
            mode: 'lines',
            name: 'Current (A)',
            line: { color: '#FF4136', dash: 'dot' },
            yaxis: 'y2'
        });
    } else {
        console.log('Not adding current trace - showCurrent:', showCurrent, 'I_out:', !!I_out);
    }
    const layout = {
        title: 'RC Circuit Step Response',
        xaxis: { title: 'Time (s)' },
        yaxis: { title: 'V_{out} (V)', side: 'left' },
        yaxis2: {
            title: 'I_{out} (A)',
            overlaying: 'y',
            side: 'right',
            showgrid: false,
            showline: true,
            zeroline: false,
            visible: showCurrent
        },
        legend: { x: 0, y: 1.1, orientation: 'h' }
    };
    Plotly.newPlot('circuit-plot', traces, layout);
}

function plotRL_VI(t, I_out, V_out, showCurrent) {
    console.log('plotRL_VI called with showCurrent:', showCurrent);
    console.log('V_out data:', V_out);
    
    const traces = [
        {
            x: t,
            y: I_out,
            type: 'scatter',
            mode: 'lines',
            name: 'Current (A)',
            line: { color: '#FF851B' },
            yaxis: 'y1'
        }
    ];
    if (showCurrent && V_out) {
        console.log('Adding voltage trace to RL plot');
        traces.push({
            x: t,
            y: V_out,
            type: 'scatter',
            mode: 'lines',
            name: 'Voltage (V)',
            line: { color: '#0074D9', dash: 'dot' },
            yaxis: 'y2'
        });
    } else {
        console.log('Not adding voltage trace - showCurrent:', showCurrent, 'V_out:', !!V_out);
    }
    const layout = {
        title: 'RL Circuit Step Response',
        xaxis: { title: 'Time (s)' },
        yaxis: { title: 'I_{out} (A)', side: 'left' },
        yaxis2: {
            title: 'V_{out} (V)',
            overlaying: 'y',
            side: 'right',
            showgrid: false,
            showline: true,
            zeroline: false,
            visible: showCurrent
        },
        legend: { x: 0, y: 1.1, orientation: 'h' }
    };
    Plotly.newPlot('circuit-plot', traces, layout);
}

function plotRLC_VI(t, V_out, I_out, showCurrent) {
    console.log('plotRLC_VI called with showCurrent:', showCurrent);
    console.log('I_out data:', I_out);
    
    const traces = [
        {
            x: t,
            y: V_out,
            type: 'scatter',
            mode: 'lines',
            name: 'Voltage (V)',
            line: { color: '#2ECC40' },
            yaxis: 'y1'
        }
    ];
    if (showCurrent && I_out) {
        console.log('Adding current trace to RLC plot');
        traces.push({
            x: t,
            y: I_out,
            type: 'scatter',
            mode: 'lines',
            name: 'Current (A)',
            line: { color: '#FF4136', dash: 'dot' },
            yaxis: 'y2'
        });
    } else {
        console.log('Not adding current trace - showCurrent:', showCurrent, 'I_out:', !!I_out);
    }
    const layout = {
        title: 'RLC Circuit Step Response',
        xaxis: { title: 'Time (s)' },
        yaxis: { title: 'V_{out} (V)', side: 'left' },
        yaxis2: {
            title: 'I_{out} (A)',
            overlaying: 'y',
            side: 'right',
            showgrid: false,
            showline: true,
            zeroline: false,
            visible: showCurrent
        },
        legend: { x: 0, y: 1.1, orientation: 'h' }
    };
    Plotly.newPlot('circuit-plot', traces, layout);
}

function plotDifferentiator(t, V_out) {
    Plotly.newPlot('circuit-plot', [{
        x: t,
        y: V_out,
        type: 'scatter',
        mode: 'lines',
        name: 'Differentiator Output',
        line: { color: '#8e44ad' }
    }], {
        title: 'Op-Amp Differentiator Step Response',
        xaxis: { title: 'Time (s)' },
        yaxis: { title: 'V_{out} (V)' }
    });
}

function plotIntegrator(t, V_out) {
    Plotly.newPlot('circuit-plot', [{
        x: t,
        y: V_out,
        type: 'scatter',
        mode: 'lines',
        name: 'Integrator Output',
        line: { color: '#16a085' }
    }], {
        title: 'Op-Amp Integrator Step Response',
        xaxis: { title: 'Time (s)' },
        yaxis: { title: 'V_{out} (V)' }
    });
}

function plotModulation(time, modulatedSignal, carrierSignal, modulatingSignal, modulationType) {
    const traces = [
        {
            x: time,
            y: modulatedSignal,
            type: 'scatter',
            mode: 'lines',
            name: `${modulationType} Modulated Signal`,
            line: { color: '#007bff', width: 2 }
        },
        {
            x: time,
            y: carrierSignal,
            type: 'scatter',
            mode: 'lines',
            name: 'Carrier Signal',
            line: { color: '#6c757d', width: 2 },
            opacity: 0.6
        },
        {
            x: time,
            y: modulatingSignal,
            type: 'scatter',
            mode: 'lines',
            name: 'Info. Signal',
            line: { color: '#28a745', width: 3, dash: 'dot' },
            opacity: 0.7
        }
    ];

    const layout = {
        title: `${modulationType} Modulation Analysis`,
        xaxis: { title: 'Time (s)' },
        yaxis: { title: 'Amplitude (V)' },
        showlegend: true,
        legend: {
            x: 0.02,
            y: 0.98,
            bgcolor: 'rgba(255,255,255,0.8)',
            bordercolor: '#333',
            borderwidth: 1
        }
    };

    // Clear existing plot first, then create new one
    Plotly.purge('circuit-plot');
    Plotly.newPlot('circuit-plot', traces, layout);
}
