/**
 * MathLab Plotting Library
 * Handles plotting of mathematical functions and equations
 * Uses Plotly.js for rendering
 */

/**
 * Render a plot based on data from the backend
 * @param {Object} plotData - Data from the backend containing plot points
 */
function renderPlot(plotData) {
    // Get the plot container - use 'math-plot' as that's the ID used in HTML
    const plotContainer = document.getElementById('math-plot');
    
    // Check if the plot container exists
    if (!plotContainer) {
        console.error('Plot container not found! Make sure there is an element with ID "math-plot".');
        return;
    }
    
    // Ensure Plotly is loaded
    if (!window.Plotly) {
        plotContainer.innerHTML = '<div class="error">Error: Plotly.js is not loaded</div>';
        return;
    }
    
    // Clear previous plot
    plotContainer.innerHTML = '';
    
    if (plotData.plotType === '3d') {
        render3DPlot(plotContainer, plotData);
    } else if (plotData.plotType === 'complex') {
        renderComplexPlot(plotContainer, plotData);
    } else {
        render2DPlot(plotContainer, plotData);
    }
}

/**
 * Render a 2D plot
 * @param {HTMLElement} container - The container to render the plot in
 * @param {Object} data - Plot data from the backend
 */
function render2DPlot(container, data) {
    // Create plot element
    const plotDiv = document.createElement('div');
    plotDiv.className = 'plot-canvas';
    plotDiv.style.width = '100%';
    plotDiv.style.height = '500px';
    container.appendChild(plotDiv);
    
    // Check if it's a family of solutions
    if (data.is_family && data.traces) {
        // For family of solutions, we have multiple traces
        Plotly.newPlot(plotDiv, data.traces, {
            title: data.title,
            xaxis: {
                title: 'x',
                showgrid: true,
                zeroline: true
            },
            yaxis: {
                title: 'y',
                showgrid: true,
                zeroline: true
            },
            showlegend: true,  // Show legend for family of solutions
            legend: {
                x: 1,
                xanchor: 'right',
                y: 1
            }
        });
        
        return;
    }
    
    // For regular plots
    const traces = [];
    
    // Create main trace for function
    const mainTrace = {
        x: data.x,
        y: data.y,
        mode: 'lines',
        line: {
            color: '#4299e1', 
            width: 3
        },
        name: 'f(x)',
        showlegend: false  // Hide legend for single function
    };
    traces.push(mainTrace);
    
    // Add zero line for reference (only shown if zoomed into a region)
    const zeroLine = {
        x: data.x,
        y: new Array(data.x.length).fill(0),
        mode: 'lines',
        line: {
            color: 'gray',
            width: 1,
            dash: 'dash'
        },
        name: 'y = 0',
        showlegend: false
    };
    traces.push(zeroLine);
    
    // Check if we have roots data - special highlighting for algebraic equations
    if (data.roots && data.roots.length > 0) {
        // Add horizontal line at y = 0 to emphasize the x-axis and roots
        traces.push({
            x: [Math.min(...data.x), Math.max(...data.x)],
            y: [0, 0],
            type: 'scatter',
            mode: 'lines',
            name: '', // Remove name
            showlegend: false, // Hide from legend
            line: {
                color: 'rgba(0,0,0,0.5)',
                width: 1,
                dash: 'dash'
            },
            hoverinfo: 'skip'
        });
        
        // Add markers at roots
        const rootsX = data.roots.map(root => parseFloat(root));
        const rootsY = Array(rootsX.length).fill(0);  // All roots have y=0
        
        traces.push({
            x: rootsX,
            y: rootsY,
            type: 'scatter',
            mode: 'markers+text',
            name: '', // Remove name
            showlegend: false, // Hide from legend
            text: rootsX.map(root => `x=${root.toFixed(2)}`),
            textposition: 'top',
            marker: {
                size: 10,
                color: '#e74c3c',
                symbol: 'circle',
                line: {
                    color: 'white',
                    width: 2
                }
            }
        });
    }
    
    // Add any additional special points (like critical points, etc.)
    if (data.specialPoints && (!data.roots || data.roots.length === 0)) {
        data.specialPoints.forEach(point => {
            traces.push({
                x: [point.x],
                y: [point.y],
                type: 'scatter',
                mode: 'markers+text',
                name: '', // Remove name
                showlegend: false, // Hide from legend
                text: point.label,
                textposition: 'top',
                marker: {
                    size: 10,
                    color: point.color || '#e74c3c',
                    symbol: point.symbol || 'circle',
                    line: {
                        color: 'white',
                        width: 1
                    }
                },
                hoverinfo: point.hideHover ? 'skip' : 'x+y+text'
            });
        });
    }
    
    // Create layout
    const layout = {
        title: {
            text: data.title || 'Function Plot',
            font: {
                size: 16,
                family: 'Inter, Segoe UI, Arial, sans-serif',
            },
            xref: 'paper',
            x: 0.5,  // Center the title
            yref: 'paper',
            y: 1,
            pad: {t: 10}
        },
        autosize: true,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(255,255,255,0.9)',
        font: {
            family: 'Inter, Segoe UI, Arial, sans-serif',
            color: '#2c3e50'
        },
        margin: {
            l: 60,
            r: 30,
            b: 50,
            t: 50,
            pad: 4
        },
        xaxis: {
            title: 'x',
            gridcolor: 'rgba(0,0,0,0.1)',
            zerolinecolor: '#2c3e50',
            zerolinewidth: 2
        },
        yaxis: {
            title: 'y',
            gridcolor: 'rgba(0,0,0,0.1)',
            zerolinecolor: '#2c3e50',
            zerolinewidth: 2
        },
        hoverlabel: {
            bgcolor: '#333',
            font: {color: 'white'}
        },
        showlegend: false  // Hide the legend completely
    };
    
    // Add any annotations
    if (data.annotations) {
        layout.annotations = data.annotations;
    }
    
    // Create the plot
    Plotly.newPlot(plotDiv, traces, layout, {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d']
    });
    
    // Add event handlers for hover, click, etc.
    if (plotDiv && plotDiv.on) {
        plotDiv.on('plotly_hover', function(eventData) {
            updateCoordinateDisplay(eventData);
        });
    }
}

/**
 * Render a 3D surface plot
 * @param {HTMLElement} container - The container to render the plot in
 * @param {Object} data - Plot data from the backend
 */
function render3DPlot(container, data) {
    // Create plot element
    const plotDiv = document.createElement('div');
    plotDiv.className = 'plot-canvas';
    plotDiv.style.width = '100%';
    plotDiv.style.height = '600px';
    container.appendChild(plotDiv);
    
    // Create the 3D surface
    const traces = [{
        type: 'surface',
        x: data.x,
        y: data.y,
        z: data.z,
        colorscale: data.colorscale || 'Viridis',
        showscale: false, // Hide the colorscale legend
        contours: {
            z: {
                show: true,
                usecolormap: true,
                highlightcolor: "#42f5ef",
                project: {z: true}
            }
        }
    }];
    
    // Add any additional traces if provided
    if (data.additionalTraces) {
        // Make sure all additional traces have showlegend: false
        const tracesWithoutLegends = data.additionalTraces.map(trace => {
            return { ...trace, showlegend: false, name: '' };
        });
        traces.push(...tracesWithoutLegends);
    }
    
    const layout = {
        title: data.title || '3D Surface Plot',
        autosize: true,
        paper_bgcolor: 'rgba(0,0,0,0)',
        scene: {
            xaxis: {title: 'x'},
            yaxis: {title: 'y'},
            zaxis: {title: 'z'},
            camera: {
                eye: {x: 1.5, y: 1.5, z: 1}
            }
        },
        margin: {
            l: 20,
            r: 20,
            b: 20,
            t: 60,
            pad: 0
        },
        font: {
            family: 'Inter, Segoe UI, Arial, sans-serif',
            color: '#2c3e50'
        },
        showlegend: false  // Hide the legend completely
    };
    
    // Create the plot
    Plotly.newPlot(plotDiv, traces, layout, {
        responsive: true,
        displayModeBar: true,
        displaylogo: false
    });
}

/**
 * Render a complex plane plot
 * @param {HTMLElement} container - The container to render the plot in
 * @param {Object} data - Plot data from the backend with real and imaginary parts
 */
function renderComplexPlot(container, data) {
    // Create plot element
    const plotDiv = document.createElement('div');
    plotDiv.className = 'plot-canvas';
    plotDiv.style.width = '100%';
    plotDiv.style.height = '500px';
    container.appendChild(plotDiv);
    
    // Set up traces for the complex plane
    const traces = [];
    
    // Real vs Imaginary parts - this is the main complex plane representation
    traces.push({
        x: data.y_real,
        y: data.y_imag,
        type: 'scatter',
        mode: 'markers',
        marker: {
            size: 6,
            color: data.y_mag, // Color by magnitude
            colorscale: 'Viridis',
            colorbar: {
                title: 'Magnitude',
                thickness: 15,
                titleside: 'right'
            },
            showscale: true,
        },
        name: '',
        showlegend: false,
        hovertemplate: 'Re: %{x:.4f}<br>Im: %{y:.4f}<extra></extra>'
    });
    
    // Add parameter curve connecting the points
    // This helps show how the complex values evolve along the x-axis
    traces.push({
        x: data.y_real,
        y: data.y_imag,
        type: 'scatter',
        mode: 'lines',
        line: {
            color: 'rgba(200,200,200,0.3)',
            width: 1.5
        },
        name: '',
        showlegend: false,
        hoverinfo: 'skip'
    });
    
    // Create layout for complex plane
    const layout = {
        title: {
            text: data.title || 'Complex Plane',
            font: {
                size: 16,
                family: 'Inter, Segoe UI, Arial, sans-serif',
            },
            xref: 'paper',
            x: 0.5,  // Center the title
        },
        autosize: true,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(255,255,255,0.9)',
        font: {
            family: 'Inter, Segoe UI, Arial, sans-serif',
            color: '#2c3e50'
        },
        xaxis: {
            title: 'Real Part',
            zeroline: true,
            zerolinecolor: '#2c3e50',
            zerolinewidth: 2,
            gridcolor: 'rgba(0,0,0,0.1)',
        },
        yaxis: {
            title: 'Imaginary Part',
            zeroline: true,
            zerolinecolor: '#2c3e50',
            zerolinewidth: 2,
            gridcolor: 'rgba(0,0,0,0.1)',
        },
        showlegend: false,
        margin: {
            l: 60,
            r: 30,
            b: 50,
            t: 60,
            pad: 4
        },
        hoverlabel: {
            bgcolor: '#333',
            font: {color: 'white'}
        },
        annotations: [{
            xref: 'paper',
            yref: 'paper',
            x: 1,
            y: -0.1,
            text: 'Complex values of f(x) shown in the complex plane (Re, Im)',
            showarrow: false,
            font: {
                size: 10,
                color: 'rgba(0,0,0,0.6)'
            }
        }]
    };
    
    // Create the plot
    Plotly.newPlot(plotDiv, traces, layout, {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d']
    });
    
    // Add legend below the plot
    const legendDiv = document.createElement('div');
    legendDiv.className = 'complex-legend';
    legendDiv.innerHTML = `
        <div class="legend-item">
            <span class="color-dot" style="background: linear-gradient(90deg, #440154, #21908C, #FDE725);"></span>
            <span>Color indicates magnitude |f(x)|</span>
        </div>
    `;
    container.appendChild(legendDiv);
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
