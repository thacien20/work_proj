// circuit_ui.js
// Handles all UI logic for Circuits Lab (DOM, events, info, export)
import { simulateRCCircuit, simulateRLCircuit, simulateRLCCircuit, plotRC, plotRL, plotRLC } from './circuit_frontEnd.js';

function setupCircuitLabUI() {
    const circuitType = document.getElementById('circuitType');
    const rcFields = document.getElementById('rc-fields');
    const rlFields = document.getElementById('rl-fields');
    const rlcFields = document.getElementById('rlc-fields');
    const equationText = document.getElementById('equation-text');
    circuitType.addEventListener('change', function() {
        if (this.value === 'rc') {
            rcFields.style.display = '';
            rlFields.style.display = 'none';
            rlcFields.style.display = 'none';
            equationText.innerHTML = 'V<sub>out</sub>(t) = V<sub>in</sub>(1 - e<sup>-t/RC</sup>)';
        } else if (this.value === 'rl') {
            rcFields.style.display = 'none';
            rlFields.style.display = '';
            rlcFields.style.display = 'none';
            equationText.innerHTML = 'I<sub>out</sub>(t) = (V<sub>in</sub>/R)(1 - e<sup>-Rt/L</sup>)';
        } else if (this.value === 'rlc') {
            rcFields.style.display = 'none';
            rlFields.style.display = 'none';
            rlcFields.style.display = '';
            equationText.innerHTML = 'V<sub>out</sub>(t) = V<sub>in</sub>(1 - (1/\sqrt{1-\zeta^2})e^{-\zeta\omega_n t} \sin(\omega_d t + \phi))';
        }
    });
    // Default info
    equationText.innerHTML = 'V<sub>out</sub>(t) = V<sub>in</sub>(1 - e<sup>-t/RC</sup>)';

    // Default plot on load (RC)
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            const def = { R: 1000, C: 1e-6, V_in: 1.0, duration: 0.05, points: 500 };
            const result = await simulateRCCircuit(def.R, def.C, def.V_in, def.duration, def.points);
            plotRC(result.t, result.V_out);
        } catch (err) {
            document.getElementById('circuit-plot').innerText = 'Error loading default RC plot.';
        }
    });

    // Button event
    document.getElementById('circuitSimBtn').addEventListener('click', async () => {
        const type = circuitType.value;
        const V_in = parseFloat(document.getElementById('circuitVin').value);
        const duration = parseFloat(document.getElementById('circuitDuration').value);
        const points = parseInt(document.getElementById('circuitPoints').value);
        if (type === 'rc') {
            const R = parseFloat(document.getElementById('rcR').value);
            const C = parseFloat(document.getElementById('rcC').value);
            if (isNaN(R) || isNaN(C) || isNaN(V_in) || isNaN(duration) || isNaN(points)) {
                alert('Please enter valid RC circuit parameters.');
                return;
            }
            try {
                const result = await simulateRCCircuit(R, C, V_in, duration, points);
                plotRC(result.t, result.V_out);
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
                plotRL(result.t, result.I_out);
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
                plotRLC(result.t, result.V_out);
            } catch (err) {
                alert('RLC Circuit Error: ' + err.message);
            }
        }
    });

    // Show Diagram button logic
    const showDiagramBtn = document.getElementById('showDiagramBtn');
    const circuitDiagramImg = document.getElementById('circuit-diagram-img');
    if (showDiagramBtn && circuitDiagramImg && circuitType) {
        showDiagramBtn.addEventListener('click', function() {
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

// Initialize UI logic after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupCircuitLabUI);
} else {
    setupCircuitLabUI();
}

export { setupCircuitLabUI };
