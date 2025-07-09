// Utility: clamp value between min and max
function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

document.addEventListener('DOMContentLoaded', function () {
    const generateBtn = document.getElementById('generateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const infoBtn = document.getElementById('infoBtn');
    const signalType = document.getElementById('signalType');
    const frequency = document.getElementById('frequency');
    const amplitude = document.getElementById('amplitude');
    const phase = document.getElementById('phase');
    const duration = document.getElementById('duration');
    const signalPlotWrapper = document.getElementById('signalPlotWrapper');
    const signalPlot = document.getElementById('signalPlot');
    const compareBtn = document.getElementById('compareBtn');
    const compareControls = document.getElementById('comparisonSection');
    const overlayBtn = document.getElementById('overlayBtn');
    const hideCompareBtn = document.getElementById('hideCompareBtn');

    // Helper to fetch a signal given params
    async function fetchSignal(params) {
        const resp = await fetch('/basic_signals/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        return await resp.json();
    }

    // Helper to overlay the compare signal and plot the sum in a separate plot and on the main plot
    async function overlayCompareSignalAndSum() {
        // All phase values are in radians (frontend and backend)
        const params1 = {
            signal_type: document.getElementById('signalType').value,
            frequency: parseFloat(document.getElementById('frequency').value),
            amplitude: parseFloat(document.getElementById('amplitude').value),
            phase: 0, // FIXED PHASE for main signal (radians)
            duration: parseFloat(document.getElementById('duration').value),
            sample_rate: 200
        };
        const params2 = {
            signal_type: document.getElementById('signalType2').value,
            frequency: parseFloat(document.getElementById('frequency2').value),
            amplitude: parseFloat(document.getElementById('amplitude2').value),
            phase: parseFloat(document.getElementById('phase').value), // radians from control
            duration: parseFloat(document.getElementById('duration2').value),
            sample_rate: 200
        };
        try {
            // Fetch both signals in parallel
            const [data1, data2] = await Promise.all([fetchSignal(params1), fetchSignal(params2)]);
            if (data1.success && data2.success) {
                const t1 = data1.signal.time;
                const y1 = data1.signal.amplitude;
                const t2 = data2.signal.time;
                const y2 = data2.signal.amplitude;
                // Remove previous overlay and sum traces from main plot
                const plotDiv = document.getElementById('signalPlot');
                if (window.Plotly && plotDiv) {
                    let tracesToRemove = [];
                    plotDiv.data.forEach((trace, idx) => {
                        if (
                            (trace.name && trace.name.endsWith('(Compare)')) ||
                            (trace.name && trace.name === 'Sum')
                        ) {
                            tracesToRemove.push(idx);
                        }
                    });
                    if (tracesToRemove.length > 0) {
                        Plotly.deleteTraces(plotDiv, tracesToRemove);
                    }
                    // Overlay trace
                    const trace2 = {
                        x: t2,
                        y: y2,
                        type: 'scatter',
                        mode: 'lines',
                        name: params2.signal_type.charAt(0).toUpperCase() + params2.signal_type.slice(1) + ' (Compare)',
                        line: { color: '#e4572e' }
                    };
                    // Sum trace
                    let ysum = [];
                    for (let i = 0; i < Math.min(y1.length, y2.length); ++i) {
                        ysum.push(y1[i] + y2[i]);
                    }
                    const traceSum = {
                        x: t1,
                        y: ysum,
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Sum',
                        line: { color: '#2ca02c', dash: 'dashdot' }
                    };
                    Plotly.addTraces(plotDiv, [trace2, traceSum]);
                }
                // Plot sum in separate plot
                let ysum = [];
                for (let i = 0; i < Math.min(y1.length, y2.length); ++i) {
                    ysum.push(y1[i] + y2[i]);
                }
                // Now ysum[i] = y1[i] + y2[i] for each sample
                const sumPlotPanel = document.getElementById('sumPlotPanel');
                const sumPlotDiv = document.getElementById('sumPlot');
                if (sumPlotPanel) sumPlotPanel.style.display = 'block';
                if (window.Plotly && sumPlotDiv) {
                    Plotly.newPlot(sumPlotDiv, [{
                        x: t1,
                        y: ysum,
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Sum',
                        line: { color: '#2ca02c', dash: 'dashdot' }
                    }], {
                        xaxis: { title: 'Time (s)' },
                        yaxis: { title: 'Amplitude' },
                        plot_bgcolor: '#fafafa',
                        paper_bgcolor: '#fff',
                        margin: { l: 60, r: 30, t: 30, b: 50 },
                        height: 300,
                        width: sumPlotDiv.offsetWidth || 800,
                        title: ''
                    }, { responsive: true });
                }
            }
        } catch (err) {
            alert('Error overlaying signal or sum: ' + err.message);
        }
    }

    // Make the plot container resizable using interact.js
    interact('#signalPlotWrapper').resizable({
        edges: { left: true, right: true, bottom: true, top: true },
        inertia: true,
        modifiers: [
            interact.modifiers.restrictSize({
                min: { width: 250, height: 200 },
                max: { width: 1200, height: 900 }
            })
        ],
        listeners: {
            move (event) {
                let target = event.target;
                let x = (parseFloat(target.getAttribute('data-x')) || 0);
                let y = (parseFloat(target.getAttribute('data-y')) || 0);

                // update the element's style
                target.style.width  = event.rect.width + 'px';
                target.style.height = event.rect.height + 'px';

                // translate when resizing from top or left edges
                x += event.deltaRect.left;
                y += event.deltaRect.top;

                target.style.transform = 'translate(' + x + 'px,' + y + 'px)';

                target.setAttribute('data-x', x);
                target.setAttribute('data-y', y);

                // Resize the Plotly plot inside
                if (window.Plotly && document.getElementById('signalPlot')) {
                    Plotly.relayout('signalPlot', {
                        width: event.rect.width,
                        height: event.rect.height
                    });
                }
            }
        }
    });

    // Optionally, also use ResizeObserver for other resize triggers
    const wrapper = document.getElementById('signalPlotWrapper');
    const plotDiv = document.getElementById('signalPlot');
    if (wrapper && plotDiv && window.Plotly) {
        if (window.signalPlotResizeObserver) {
            window.signalPlotResizeObserver.disconnect();
        }
        window.signalPlotResizeObserver = new ResizeObserver(() => {
            Plotly.relayout(plotDiv, {
                width: wrapper.offsetWidth,
                height: wrapper.offsetHeight
            });
        });
        window.signalPlotResizeObserver.observe(wrapper);
    }

    // Add any other necessary event listeners for the existing controls

    if (compareBtn && compareControls) {
        compareBtn.addEventListener('click', function (e) {
            e.preventDefault(); // Prevent form submission or dropdown closing
            compareControls.style.display = 'block';
        });
    }
    if (overlayBtn) {
        overlayBtn.addEventListener('click', async function (e) {
            e.preventDefault();
            await overlayCompareSignalAndSum();
            if (compareControls) {
                compareControls.style.display = 'none';
            }
        });
    }
    // Add event listener for close comparison button
    const closeComparisonBtn = document.getElementById('closeComparisonBtn');
    if (closeComparisonBtn && compareControls) {
        closeComparisonBtn.addEventListener('click', function (e) {
            e.preventDefault();
            compareControls.style.display = 'none';
        });
    }

    // Add event listener for generate comparison button
    const generateComparisonBtn = document.getElementById('generateComparisonBtn');
    if (generateComparisonBtn) {
        generateComparisonBtn.addEventListener('click', async function (e) {
            e.preventDefault();
            const signalConfigs = document.querySelectorAll('.signal-config');
            if (signalConfigs.length >= 2) {
                const signal1Type = signalConfigs[0].querySelector('.comp-signal-type').value;
                const signal1Freq = parseFloat(signalConfigs[0].querySelector('.comp-frequency').value);
                const signal2Type = signalConfigs[1].querySelector('.comp-signal-type').value;
                const signal2Freq = parseFloat(signalConfigs[1].querySelector('.comp-frequency').value);
                const durationVal = parseFloat(duration.value) || 2.0;
                const amplitudeVal1 = parseFloat(amplitude.value) || 1.0;
                const amplitudeVal2 = amplitudeVal1; // Same amplitude for second signal
                const phaseVal = parseFloat(phase.value) || 0;

                const params1 = {
                    signal_type: signal1Type,
                    frequency: signal1Freq,
                    amplitude: amplitudeVal1,
                    phase: 0,
                    duration: durationVal,
                    sample_rate: 200
                };
                const params2 = {
                    signal_type: signal2Type,
                    frequency: signal2Freq,
                    amplitude: amplitudeVal2,
                    phase: phaseVal * Math.PI / 180, // Convert degrees to radians
                    duration: durationVal,
                    sample_rate: 200
                };

                try {
                    const [data1, data2] = await Promise.all([fetchSignal(params1), fetchSignal(params2)]);
                    if (data1.success && data2.success) {
                        const trace1 = {
                            x: data1.signal.time,
                            y: data1.signal.amplitude,
                            type: 'scatter',
                            mode: 'lines',
                            name: signal1Type.charAt(0).toUpperCase() + signal1Type.slice(1) + ' (' + signal1Freq + ' Hz)',
                            line: { color: '#1f77b4' }
                        };
                        const trace2 = {
                            x: data2.signal.time,
                            y: data2.signal.amplitude,
                            type: 'scatter',
                            mode: 'lines',
                            name: signal2Type.charAt(0).toUpperCase() + signal2Type.slice(1) + ' (' + signal2Freq + ' Hz)',
                            line: { color: '#ff7f0e' }
                        };
                        // Calculate sum of the two signals
                        const y1 = data1.signal.amplitude;
                        const y2 = data2.signal.amplitude;
                        let ySum = [];
                        for (let i = 0; i < Math.min(y1.length, y2.length); i++) {
                            ySum.push(y1[i] + y2[i]);
                        }
                        const traceSum = {
                            x: data1.signal.time,
                            y: ySum,
                            type: 'scatter',
                            mode: 'lines',
                            name: 'Sum of Signals',
                            line: { color: '#2ca02c', dash: 'dashdot' }
                        };
                        const comparisonPlot = document.getElementById('comparisonPlot');
                        if (window.Plotly && comparisonPlot) {
                            Plotly.newPlot(comparisonPlot, [trace1, trace2, traceSum], {
                                title: 'Signal Comparison',
                                xaxis: { title: 'Time (s)' },
                                yaxis: { title: 'Amplitude' },
                                margin: { l: 60, r: 30, t: 50, b: 50 },
                                plot_bgcolor: '#fff',
                                paper_bgcolor: '#fff'
                            }, { responsive: true });
                        }
                    } else {
                        alert('Failed to generate signals for comparison.');
                    }
                } catch (err) {
                    alert('Error generating comparison: ' + err.message);
                }
            } else {
                alert('Signal configuration elements not found.');
            }
        });
    }

    // When the main phase input changes, update the overlay and sum if overlay is present
    let phaseDebounceTimer = null;
    if (phase) {
        phase.addEventListener('change', function () {
            if (phaseDebounceTimer) clearTimeout(phaseDebounceTimer);
            phaseDebounceTimer = setTimeout(async function () {
                const plotDiv = document.getElementById('signalPlot');
                if (plotDiv && plotDiv.data && plotDiv.data.some(trace => trace.name && trace.name.endsWith('(Compare)'))) {
                    await overlayCompareSignalAndSum();
                }
            }, 150);
        });
    }

    // When the phase spin input in comparison section changes, update the comparison plot
    let phaseSpinDebounceTimer = null;
    const phaseSpin = document.getElementById('phaseSpin');
    if (phaseSpin) {
        phaseSpin.addEventListener('change', function () {
            if (phaseSpinDebounceTimer) clearTimeout(phaseSpinDebounceTimer);
            phaseSpinDebounceTimer = setTimeout(async function () {
                const comparisonPlot = document.getElementById('comparisonPlot');
                if (comparisonPlot && comparisonPlot.data && comparisonPlot.data.length >= 2) {
                    const signalConfigs = document.querySelectorAll('.signal-config');
                    if (signalConfigs.length >= 2) {
                        const signal1Type = signalConfigs[0].querySelector('.comp-signal-type').value;
                        const signal1Freq = parseFloat(signalConfigs[0].querySelector('.comp-frequency').value);
                        const signal2Type = signalConfigs[1].querySelector('.comp-signal-type').value;
                        const signal2Freq = parseFloat(signalConfigs[1].querySelector('.comp-frequency').value);
                        const durationVal = parseFloat(duration.value) || 2.0;
                        const amplitudeVal1 = parseFloat(amplitude.value) || 1.0;
                        const amplitudeVal2 = amplitudeVal1; // Same amplitude for second signal
                        const phaseVal = parseFloat(phaseSpin.value) || 0;

                        const params1 = {
                            signal_type: signal1Type,
                            frequency: signal1Freq,
                            amplitude: amplitudeVal1,
                            phase: 0,
                            duration: durationVal,
                            sample_rate: 200
                        };
                        const params2 = {
                            signal_type: signal2Type,
                            frequency: signal2Freq,
                            amplitude: amplitudeVal2,
                            phase: phaseVal * Math.PI / 180, // Convert degrees to radians
                            duration: durationVal,
                            sample_rate: 200
                        };

                        try {
                            const [data1, data2] = await Promise.all([fetchSignal(params1), fetchSignal(params2)]);
                            if (data1.success && data2.success) {
                                const trace1 = {
                                    x: data1.signal.time,
                                    y: data1.signal.amplitude,
                                    type: 'scatter',
                                    mode: 'lines',
                                    name: signal1Type.charAt(0).toUpperCase() + signal1Type.slice(1) + ' (' + signal1Freq + ' Hz)',
                                    line: { color: '#1f77b4' }
                                };
                                const trace2 = {
                                    x: data2.signal.time,
                                    y: data2.signal.amplitude,
                                    type: 'scatter',
                                    mode: 'lines',
                                    name: signal2Type.charAt(0).toUpperCase() + signal2Type.slice(1) + ' (' + signal2Freq + ' Hz)',
                                    line: { color: '#ff7f0e' }
                                };
                                // Calculate sum of the two signals
                                const y1 = data1.signal.amplitude;
                                const y2 = data2.signal.amplitude;
                                let ySum = [];
                                for (let i = 0; i < Math.min(y1.length, y2.length); i++) {
                                    ySum.push(y1[i] + y2[i]);
                                }
                                const traceSum = {
                                    x: data1.signal.time,
                                    y: ySum,
                                    type: 'scatter',
                                    mode: 'lines',
                                    name: 'Sum of Signals',
                                    line: { color: '#2ca02c', dash: 'dashdot' }
                                };
                                if (window.Plotly) {
                                    Plotly.newPlot(comparisonPlot, [trace1, trace2, traceSum], {
                                        title: 'Signal Comparison',
                                        xaxis: { title: 'Time (s)' },
                                        yaxis: { title: 'Amplitude' },
                                        margin: { l: 60, r: 30, t: 50, b: 50 },
                                        plot_bgcolor: '#fff',
                                        paper_bgcolor: '#fff'
                                    }, { responsive: true });
                                }
                            }
                        } catch (err) {
                            console.error('Error updating comparison plot with new phase: ', err);
                        }
                    }
                }
            }, 150);
        });
    }
});
