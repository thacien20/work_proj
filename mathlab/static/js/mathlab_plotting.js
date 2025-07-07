/**
 * MathLab Plotting Library
 * Handles plotting of mathematical functions and equations
 * Uses Plotly.js for rendering
 */

/**
 * Render a plot based on data from the backend
 * @param {Object} plotData - Data from the backend containing plot points
 */
window.renderPlot = function(plotData) {
    console.log('renderPlot called with:', plotData ? 'data available' : 'no data');
    const plotContainer = document.getElementById('math-plot');
    if (!plotContainer) {
        console.error('Plot container not found! Make sure there is an element with ID "math-plot".');
        return;
    }

    // Ensure Plotly is loaded
    if (!window.Plotly) {
        console.warn('Plotly not found - attempting to load dynamically');
        plotContainer.innerHTML = '<div class="loading">Loading plotting library...</div>';
        const existingScript = document.querySelector('script[src*="plotly-latest.min.js"]');
        if (existingScript) {
            let checkAttempts = 0;
            const checkInterval = setInterval(() => {
                checkAttempts++;
                if (window.Plotly) {
                    clearInterval(checkInterval);
                    console.log('Plotly now available');
                    continueRendering(plotContainer, plotData);
                } else if (checkAttempts > 20) {
                    clearInterval(checkInterval);
                    console.error('Timed out waiting for Plotly to load');
                    plotContainer.innerHTML = '<div class="error">Error: Timed out waiting for plotting library to load. Please refresh the page.</div>';
                }
            }, 500);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.plot.ly/plotly-latest.min.js';
        script.crossOrigin = 'anonymous';
        script.onload = () => {
            console.log('Plotly loaded successfully!');
            continueRendering(plotContainer, plotData);
        };
        script.onerror = () => {
            console.error('Failed to load Plotly dynamically');
            plotContainer.innerHTML = '<div class="error">Error: Failed to load plotting library. Please refresh the page or check your internet connection.</div>';
        };
        document.head.appendChild(script);
        return;
    }
    continueRendering(plotContainer, plotData);
}

/**
 * Continue rendering the plot after Plotly is loaded
 * @param {HTMLElement} container - The container to render the plot in
 * @param {Object} plotData - Plot data from the backend
 */
function continueRendering(container, plotData) {
    container.innerHTML = '';
    if (plotData.plotType === '3d') {
        if (typeof render3DPlot === 'function') render3DPlot(container, plotData);
    } else if (plotData.plotType === 'complex') {
        if (typeof renderComplexPlot === 'function') renderComplexPlot(container, plotData);
    } else {
        render2DPlot(container, plotData);
    }
}

/**
 * Render a 2D plot
 * @param {HTMLElement} container - The container to render the plot in
 * @param {Object} data - Plot data from the backend
 */
function render2DPlot(container, data) {
    const plotDiv = document.createElement('div');
    plotDiv.className = 'plot-canvas';
    plotDiv.style.width = '100%';
    plotDiv.style.height = '500px';
    container.appendChild(plotDiv);

    if (data.traces && Array.isArray(data.traces) && data.traces.length > 0) {
        Plotly.newPlot(plotDiv, data.traces, {
            title: data.title,
            xaxis: { title: 'x', showgrid: true, zeroline: true },
            yaxis: { title: 'y', showgrid: true, zeroline: true },
            showlegend: true,
            legend: { x: 1, xanchor: 'right', y: 1 }
        });
        return;
    }

    const traces = [{
        x: data.x,
        y: data.y,
        mode: 'lines',
        line: { color: '#4299e1', width: 3 },
        name: 'f(x)',
        showlegend: false
    }, {
        x: data.x,
        y: new Array(data.x.length).fill(0),
        mode: 'lines',
        line: { color: 'gray', width: 1, dash: 'dash' },
        name: 'y = 0',
        showlegend: false
    }];

    if (data.roots && data.roots.length > 0) {
        traces.push({
            x: [Math.min(...data.x), Math.max(...data.x)],
            y: [0, 0],
            type: 'scatter',
            mode: 'lines',
            name: '',
            showlegend: false,
            line: { color: 'rgba(0,0,0,0.5)', width: 1, dash: 'dash' },
            hoverinfo: 'skip'
        }, {
            x: data.roots.map(root => parseFloat(root)),
            y: Array(data.roots.length).fill(0),
            type: 'scatter',
            mode: 'markers+text',
            name: '',
            showlegend: false,
            text: data.roots.map(root => `x=${parseFloat(root).toFixed(2)}`),
            textposition: 'top',
            marker: { size: 10, color: '#e74c3c', symbol: 'circle', line: { color: 'white', width: 2 } }
        });
    }

    if (data.specialPoints && (!data.roots || data.roots.length === 0)) {
        data.specialPoints.forEach(point => {
            traces.push({
                x: [point.x],
                y: [point.y],
                type: 'scatter',
                mode: 'markers+text',
                name: '',
                showlegend: false,
                text: point.label,
                textposition: 'top',
                marker: {
                    size: 10,
                    color: point.color || '#e74c3c',
                    symbol: point.symbol || 'circle',
                    line: { color: 'white', width: 1 }
                },
                hoverinfo: point.hideHover ? 'skip' : 'x+y+text'
            });
        });
    }

    const layout = {
        title: {
            text: data.title || 'Function Plot',
            font: { size: 16, family: 'Inter, Segoe UI, Arial, sans-serif' },
            xref: 'paper',
            x: 0.5,
            yref: 'paper',
            y: 1,
            pad: { t: 10 }
        },
        autosize: true,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(255,255,255,0.9)',
        font: { family: 'Inter, Segoe UI, Arial, sans-serif', color: '#2c3e50' },
        margin: { l: 60, r: 30, b: 50, t: 50, pad: 4 },
        xaxis: { title: 'x', gridcolor: 'rgba(0,0,0,0.1)', zerolinecolor: '#2c3e50', zerolinewidth: 2 },
        yaxis: { title: 'y', gridcolor: 'rgba(0,0,0,0.1)', zerolinecolor: '#2c3e50', zerolinewidth: 2 },
        hoverlabel: { bgcolor: '#333', font: { color: 'white' } },
        showlegend: false
    };

    if (data.annotations) {
        layout.annotations = data.annotations;
    }

    Plotly.newPlot(plotDiv, traces, layout, {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d']
    });

    if (plotDiv && plotDiv.on) {
        plotDiv.on('plotly_hover', updateCoordinateDisplay);
    }
}

/**
 * Update the coordinate display when hovering over the plot
 * @param {Object} eventData - The event data from Plotly
 */
function updateCoordinateDisplay(eventData) {
    const coordinateDisplay = document.getElementById('coordinateDisplay');
    if (!coordinateDisplay) return;
    const point = eventData.points[0];
    coordinateDisplay.innerHTML = `x: ${point.x.toFixed(4)}, y: ${point.y.toFixed(4)}`;
}

/**
 * Update plot parameters based on equation type
 * @param {string} equationType - The type of equation (algebraic, differential, etc.)
 */
function updatePlotParameters(equationType) {
    const defaultRanges = {
        'algebraic': [-10, 10],
        'differential': [0, 10],
        'integral': [-5, 5],
        'derivative': [-5, 5]
    };
    const range = defaultRanges[equationType] || [-10, 10];
    document.getElementById('xMin').value = range[0];
    document.getElementById('xMax').value = range[1];
}

/**
 * Save the current plot as an image
 */
function savePlot() {
    const plotDiv = document.querySelector('.plot-canvas');
    if (!plotDiv) return;
    Plotly.downloadImage(plotDiv, {
        format: 'png',
        width: 1200,
        height: 800,
        filename: 'mathlab_plot'
    });
}

/**
 * Reset the plot view to default
 */
function resetPlotView() {
    const plotDiv = document.querySelector('.plot-canvas');
    if (!plotDiv) return;
    Plotly.relayout(plotDiv, {
        'xaxis.autorange': true,
        'yaxis.autorange': true
    });
}

/**
 * Toggle grid lines on the plot
 * @param {boolean} showGrid - Whether to show grid lines
 */
function toggleGrid(showGrid) {
    const plotDiv = document.querySelector('.plot-canvas');
    if (!plotDiv) return;
    const gridColor = showGrid ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0)';
    Plotly.relayout(plotDiv, {
        'xaxis.gridcolor': gridColor,
        'yaxis.gridcolor': gridColor
    });
}

/**
 * Check if Plotly is properly loaded after page load
 */
window.addEventListener('load', () => {
    if (!window.Plotly) {
        console.warn('Plotly not loaded after page load - attempting to load it');
        const script = document.createElement('script');
        script.src = 'https://cdn.plot.ly/plotly-latest.min.js';
        script.crossOrigin = 'anonymous';
        script.onload = () => console.log('Plotly loaded successfully!');
        script.onerror = () => console.error('Failed to load Plotly');
        document.head.appendChild(script);
    } else {
        console.log('Plotly loaded successfully on page load');
    }
});