// circuit_frontEnd.js
// Handles all frontend logic for Circuits Lab (RC, RL, RLC)

// Use global Plotly (already loaded in HTML)

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
    if (showCurrent) {
        traces.push({
            x: t,
            y: I_out,
            type: 'scatter',
            mode: 'lines',
            name: 'Current (A)',
            line: { color: '#FF4136', dash: 'dot' },
            yaxis: 'y2'
        });
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
    if (showCurrent) {
        traces.push({
            x: t,
            y: V_out,
            type: 'scatter',
            mode: 'lines',
            name: 'Voltage (V)',
            line: { color: '#0074D9', dash: 'dot' },
            yaxis: 'y2'
        });
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
    if (showCurrent) {
        traces.push({
            x: t,
            y: I_out,
            type: 'scatter',
            mode: 'lines',
            name: 'Current (A)',
            line: { color: '#FF4136', dash: 'dot' },
            yaxis: 'y2'
        });
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

export { simulateRCCircuit, simulateRLCircuit, simulateRLCCircuit, plotRC, plotRL, plotRLC, plotRC_VI, plotRL_VI, plotRLC_VI };
