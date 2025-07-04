/**
 * MathLab UI Controller
 * Handles user interface interactions for the Math Laboratory module
 */

// Initialize state
const mathlabState = {
    activeTab: 'algebraic',
    currentEquation: '',
    history: [],
    plotType: '2d',
    complexPlane: false,
    plotData: null,
    lastResult: null,
    diffEqConstants: [] // Will store detected constants like C1, C2, etc.
};

// DOM ready event
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all UI components
    initializeMathLab();
    
    // Plot type toggle handler (2D/3D)
    const plotTypeToggle = document.getElementById('plot-type-toggle');
    if (plotTypeToggle) {
        plotTypeToggle.addEventListener('change', function() {
            mathlabState.plotType = this.checked ? '3d' : '2d';
            // Toggle visibility of y-axis range inputs
            const yRangeControls = document.getElementById('y-range-controls');
            if (yRangeControls) {
                yRangeControls.style.display = this.checked ? 'flex' : 'none';
            }
        });
    }
    
    // Complex plane toggle handler
    const complexPlaneToggle = document.getElementById('complex-plane-toggle');
    if (complexPlaneToggle) {
        complexPlaneToggle.addEventListener('change', function() {
            mathlabState.complexPlane = this.checked;
        });
    }
    
    // Constants mode change handler
    const constantsMode = document.getElementById('constants-mode');
    if (constantsMode) {
        constantsMode.addEventListener('change', handleConstantsModeChange);
    }
    
    // Setup expression dropdown handlers for each tab
    initializeExpressionDropdowns();
    
    // Setup math function buttons
    document.querySelectorAll('.math-function-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            insertMathFunction(this.getAttribute('data-function'));
        });
    });
});

/**
 * Initialize the MathLab UI components
 */
function initializeMathLab() {
    // Register tab switching
    const tabs = document.querySelectorAll('.tab-button');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.id.replace('tab-', '');
            switchTab(tabId);
        });
    });
    
    // Setup tab switching (compatibility with both DOM structures)
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab') || button.id.replace('tab-', '');
            
            // For old-style tabs
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // For old-style tabs
            if (button.getAttribute('data-tab')) {
                button.classList.add('active');
                const tabContent = document.getElementById(`${tabId}-tab`);
                if (tabContent) tabContent.classList.add('active');
            }
            
            // Update state regardless of tab style
            mathlabState.activeTab = tabId;
        });
    });
    
    // Initialize equation solving for each type
    const solveButtons = [
        { id: 'solve-algebraic-btn', type: 'algebraic' },
        { id: 'solve-diff-btn', type: 'differential' },
        { id: 'calculate-integral-btn', type: 'integral' },
        { id: 'calculate-derivative-btn', type: 'derivative' }
    ];
    
    solveButtons.forEach(button => {
        const element = document.getElementById(button.id);
        if (element) {
            element.addEventListener('click', () => {
                console.log(`Solving ${button.type} equation`);
                solveEquation(button.type);
            });
            console.log(`Attached event listener to ${button.id} for ${button.type}`);
        } else {
            console.warn(`Button ${button.id} not found in DOM`);
        }
    });
    
    // Initialize plotting buttons
    const plotEquationBtn = document.getElementById('plot-equation-btn');
    if (plotEquationBtn) {
        plotEquationBtn.addEventListener('click', plotEquation);
    }

    const plotSolutionBtn = document.getElementById('plot-solution-btn');
    if (plotSolutionBtn) {
        plotSolutionBtn.addEventListener('click', plotResult);
    }
    
    // Initialize 3D plotting toggle
    const plotTypeToggle = document.getElementById('plot-type-toggle');
    if (plotTypeToggle) {
        plotTypeToggle.addEventListener('change', function() {
            mathlabState.plotType = this.checked ? '3d' : '2d';
            // Disable complex plane if 3D is enabled
            if (this.checked) {
                const complexToggle = document.getElementById('complex-plane-toggle');
                if (complexToggle && complexToggle.checked) {
                    complexToggle.checked = false;
                    mathlabState.complexPlane = false;
                }
            }
            updatePlotControls();
        });
    }
    
    // Initialize complex plane toggle
    const complexPlaneToggle = document.getElementById('complex-plane-toggle');
    if (complexPlaneToggle) {
        complexPlaneToggle.addEventListener('change', function() {
            mathlabState.complexPlane = this.checked;
            // Disable 3D if complex plane is enabled
            if (this.checked) {
                const plotTypeToggle = document.getElementById('plot-type-toggle');
                if (plotTypeToggle && plotTypeToggle.checked) {
                    plotTypeToggle.checked = false;
                    mathlabState.plotType = '2d';
                }
            }
            updatePlotControls();
        });
    }
    
    // Initialize constants handling for differential equations
    initializeConstantsHandling();
    
    // Initialize history clear
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearHistory);
    }
    
    // Initialize common expression dropdowns
    initializeExpressionDropdowns();
    
    // Initialize integral type selector to show/hide limits
    const integralTypeSelect = document.getElementById('integral-type');
    if (integralTypeSelect) {
        integralTypeSelect.addEventListener('change', function() {
            const limitsContainer = document.getElementById('integral-limits');
            if (limitsContainer) {
                limitsContainer.style.display = this.value === 'definite' ? 'flex' : 'none';
            }
        });
    }
    
    // Initialize math function buttons
    document.querySelectorAll('.math-function-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            insertMathFunction(this.dataset.function);
        });
    });
    
    // Set up the initial UI state
    switchTab('algebraic');
    updatePlotControls();
}

/**
 * Initialize the dropdowns for common expressions
 */
function initializeExpressionDropdowns() {
    // Common expressions dropdown for algebraic tab
    const commonExpressionsSelect = document.getElementById('common-expressions');
    if (commonExpressionsSelect) {
        commonExpressionsSelect.addEventListener('change', function() {
            if (this.value) {
                document.getElementById('algebraic-equation').value = this.value;
                this.selectedIndex = 0; // Reset dropdown after selection
            }
        });
    }
    
    // Common differential equations dropdown
    const commonDiffEqSelect = document.getElementById('common-diff-equations');
    if (commonDiffEqSelect) {
        commonDiffEqSelect.addEventListener('change', function() {
            if (this.value) {
                document.getElementById('diff-equation').value = this.value;
                this.selectedIndex = 0; // Reset dropdown after selection
            }
        });
    }
    
    // Common integrals dropdown
    const commonIntegralsSelect = document.getElementById('common-integrals');
    if (commonIntegralsSelect) {
        commonIntegralsSelect.addEventListener('change', function() {
            if (this.value) {
                document.getElementById('integral-expression').value = this.value;
                this.selectedIndex = 0; // Reset dropdown after selection
            }
        });
    }
    
    // Common derivatives dropdown
    const commonDerivativesSelect = document.getElementById('common-derivatives');
    if (commonDerivativesSelect) {
        commonDerivativesSelect.addEventListener('change', function() {
            if (this.value) {
                document.getElementById('derivative-expression').value = this.value;
                this.selectedIndex = 0; // Reset dropdown after selection
            }
        });
    }
}

/**
 * Initialize handlers for the common expression dropdowns
 */
function initializeCommonExpressionDropdowns() {
    // For algebraic equations
    const commonExpressions = document.getElementById('common-expressions');
    if (commonExpressions) {
        commonExpressions.addEventListener('change', function() {
            if (this.value) {
                document.getElementById('algebraic-equation').value = this.value;
                // Reset the dropdown
                this.selectedIndex = 0;
            }
        });
    }
    
    // For differential equations
    const commonDiffEqs = document.getElementById('common-diff-equations');
    if (commonDiffEqs) {
        commonDiffEqs.addEventListener('change', function() {
            if (this.value) {
                document.getElementById('diff-equation').value = this.value;
                this.selectedIndex = 0;
            }
        });
    }
    
    // For integrals
    const commonIntegrals = document.getElementById('common-integrals');
    if (commonIntegrals) {
        commonIntegrals.addEventListener('change', function() {
            if (this.value) {
                document.getElementById('integral-expression').value = this.value;
                this.selectedIndex = 0;
            }
        });
    }
    
    // For derivatives
    const commonDerivatives = document.getElementById('common-derivatives');
    if (commonDerivatives) {
        commonDerivatives.addEventListener('change', function() {
            if (this.value) {
                document.getElementById('derivative-expression').value = this.value;
                this.selectedIndex = 0;
            }
        });
    }
    
    // For math function buttons
    const mathFunctionBtns = document.querySelectorAll('.math-function-btn');
    if (mathFunctionBtns) {
        mathFunctionBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                insertMathFunction(this.getAttribute('data-function'));
            });
        });
    }
}

/**
 * Switch between equation types (algebraic, differential, etc.)
 */
function switchTab(tabName) {
    // Update active tab button
    document.querySelectorAll('.tab-button').forEach(tab => {
        const isActive = tab.id === `tab-${tabName}`;
        tab.setAttribute('aria-selected', isActive);
    });
    
    // Update visible tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        const isActive = panel.id === `panel-${tabName}`;
        panel.setAttribute('aria-hidden', !isActive);
        panel.style.display = isActive ? 'block' : 'none';
    });
    
    // Update state
    mathlabState.activeTab = tabName;
    
    // Update placeholder text
    updatePlaceholderText(tabName);
}

/**
 * Update the equation input placeholder based on selected tab
 */
function updatePlaceholderText(tabName) {
    const placeholders = {
        'algebraic': 'e.g., x**2 + 3*x - 4 = 0',
        'differential': 'e.g., dy/dx + 2*y = x',
        'integral': 'e.g., x**2 + sin(x)',
        'derivative': 'e.g., x**3 + ln(x)'
    };
    
    // Get the input field for the selected tab
    let inputField;
    switch(tabName) {
        case 'algebraic':
            inputField = document.getElementById('algebraic-equation');
            break;
        case 'differential':
            inputField = document.getElementById('diff-equation');
            break;
        case 'integral':
            inputField = document.getElementById('integral-expression');
            break;
        case 'derivative':
            inputField = document.getElementById('derivative-expression');
            break;
    }
    
    if (inputField) {
        inputField.placeholder = placeholders[tabName] || 'Enter an equation...';
    }
}

/**
 * Update example equations based on selected tab
 */
function updateExamples(tabName) {
    // Hide all example categories
    document.querySelectorAll('.examples-category').forEach(cat => {
        cat.style.display = 'none';
    });
    
    // Show only relevant category
    const category = document.getElementById(`${tabName}-examples`);
    if (category) {
        category.style.display = 'block';
    }
}

/**
 * Load an example equation into the input field
 */
function loadExample(equation, type) {
    document.getElementById('equation').value = equation;
    if (type && type !== mathlabState.activeTab) {
        switchTab(type);
    }
}

/**
 * Solve the current equation
 */
function solveEquation(type = null) {
    // If no type is provided, use the active tab
    if (!type) {
        type = mathlabState.activeTab;
    }
    
    // Get the active tab from the button that was clicked or from state
    const activeTabId = type || mathlabState.activeTab;
    
    // Get the equation based on the active tab
    let equation = '';
    let variable = 'x';
    
    // Define the mapping of input elements
    const inputMappings = {
        'algebraic': {
            equation: ['algebraic-equation', 'algebraic-expression'],
            variable: ['algebraic-variable']
        },
        'differential': {
            equation: ['diff-equation', 'differential-expression'],
            variable: ['diff-variable']
        },
        'integral': {
            equation: ['integral-expression'],
            variable: ['integral-variable']
        },
        'derivative': {
            equation: ['derivative-expression'],
            variable: ['derivative-variable']
        }
    };
    
    // Try to get the equation from any of the possible input field IDs
    const mapping = inputMappings[activeTabId];
    if (mapping) {
        for (let fieldId of mapping.equation) {
            const field = document.getElementById(fieldId);
            if (field && field.value.trim()) {
                equation = field.value.trim();
                break;
            }
        }
        
        for (let fieldId of mapping.variable) {
            const field = document.getElementById(fieldId);
            if (field && field.value.trim()) {
                variable = field.value.trim();
                break;
            }
        }
    }
    
    if (!equation) {
        alert('Please enter an equation or expression');
        return;
    }
    
    // Pre-process equation to handle common syntax issues
    equation = preprocessEquation(equation);
    
    // Prepare the request data
    const data = {
        type: activeTabId,
        equation: equation,
        variable: variable
    };
    
    // Additional parameters for specific types
    if (activeTabId === 'integral') {
        // Check if it's a definite integral
        const integralType = document.getElementById('integral-type')?.value;
        if (integralType === 'definite') {
            const lowerLimit = document.getElementById('lower-limit')?.value;
            const upperLimit = document.getElementById('upper-limit')?.value;
            
            if (lowerLimit && upperLimit) {
                data.lowerLimit = lowerLimit;
                data.upperLimit = upperLimit;
            }
        }
    } else if (activeTabId === 'derivative') {
        // Add order parameter for derivatives
        const order = parseInt(document.getElementById('derivative-order')?.value) || 1;
        data.order = order;
    }
    
    // Show loading state
    const resultPlaceholder = document.getElementById('result-placeholder');
    if (resultPlaceholder) {
        resultPlaceholder.innerHTML = '<div class="loading">Processing...</div>';
        resultPlaceholder.style.display = 'block';
    }
    
    // Send request to backend
    fetch('/mathlab/solve', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Backend response:', data); // Debug log
        if (activeTabId === 'differential') {
            processDiffEqSolution(data);
        } else {
            displayResult(data, equation);
        }
    })
    .catch(error => {
        console.error('Request error:', error); // Debug log
        const resultPlaceholder = document.getElementById('result-placeholder');
        if (resultPlaceholder) {
            resultPlaceholder.innerHTML = `<div class="error">Error: ${error.message}</div>`;
            resultPlaceholder.style.display = 'block';
        }
    });
    
    // Add to history
    addToHistory(equation, activeTabId);
}

/**
 * Display the solution result
 */
function displayResult(data, equation) {
    const resultContainer = document.querySelector('.result-display');
    const resultPlaceholder = document.getElementById('result-placeholder');
    const mathResult = document.getElementById('math-result');
    const latexResult = document.getElementById('latex-result');
    
    if (data.error) {
        // Check if the error might be related to syntax and add helpful message
        const syntaxError = data.error.includes('parse') || data.error.includes('syntax') || data.error.includes('unexpected');
        let errorMessage = `<div class="error">${data.error}</div>`;
        
        if (syntaxError) {
            errorMessage += `
                <div class="syntax-help">
                    <strong>Syntax Tips:</strong>
                    <ul>
                        <li>Use <code>**</code> for powers (e.g., <code>x**2</code> not <code>x^2</code>)</li>
                        <li>Use <code>*</code> for multiplication (e.g., <code>3*x</code>)</li>
                        <li>Common functions: <code>sin(x)</code>, <code>cos(x)</code>, <code>exp(x)</code>, <code>log(x)</code></li>
                    </ul>
                </div>
            `;
        }
        
        resultPlaceholder.innerHTML = errorMessage;
        resultPlaceholder.style.display = 'block';
        mathResult.style.display = 'none';
        latexResult.style.display = 'none';
        return;
    }
    
    // Store result for potential plotting
    mathlabState.lastResult = data;
    
    // Hide placeholder
    resultPlaceholder.style.display = 'none';
    
    // Display result in math-result
    mathResult.style.display = 'block';
    
    // Start with the equation
    let resultHTML = `<div class="equation">${equation}</div>
        <div class="solution">
            <span class="label">Solution:</span>
            <span class="value">${data.result}</span>
        </div>`;
    
    // Add roots information if available
    if (data.roots && data.roots.length > 0) {
        resultHTML += `<div class="roots">
            <span class="label">Roots:</span>
            <span class="value">${data.roots.map(root => `x = ${parseFloat(root).toFixed(4)}`).join(', ')}</span>
        </div>`;
        
        // Add a specific message about plotting with roots
        resultHTML += `<div class="plottable-message">
            <p>This equation has ${data.roots.length} real root(s). Click "Plot Solution" to visualize the function between the roots.</p>
        </div>`;
    }
    // Otherwise add a general message if it's plottable
    else if (isPlottable(data)) {
        resultHTML += `<div class="plottable-message">
            <p>This result can be visualized. Use the "Plot Solution" button below.</p>
        </div>`;
    }
    
    mathResult.innerHTML = resultHTML;
    
    // Add LaTeX if available
    if (data.latex) {
        latexResult.style.display = 'block';
        latexResult.innerHTML = `
            <div class="latex-render">
                <span class="label">LaTeX:</span>
                <div class="math">\\[${data.latex}\\]</div>
            </div>
        `;
    } else {
        latexResult.style.display = 'none';
    }
    
    // Re-render any LaTeX
    if (window.MathJax) {
        MathJax.typesetPromise();
    }
    
    // Update constants UI if in differential tab
    if (mathlabState.activeTab === 'differential') {
        updateConstantsUI(data.solution);
    }
}

/**
 * Check if a result can be plotted
 */
function isPlottable(data) {
    // Logic to determine if the result is plottable
    // For example, check if it's a function or equation
    return data.result && (
        data.result.includes('x') || 
        data.result.includes('=') ||
        data.result.includes('Function')
    );
}

/**
 * Preprocess equation to fix common syntax issues
 */
function preprocessEquation(equation) {
    // No processing needed if equation already uses correct syntax
    if (equation.includes('**')) {
        return equation;
    }
    
    // Handle common error: using ^ instead of ** for exponents
    // This regex looks for the pattern: <digit/variable/parenthesis><^><digit>
    // e.g., x^2, 3^4, (x+1)^3
    const powerRegex = /([a-z0-9\)])(\^)([0-9]+)/gi;
    equation = equation.replace(powerRegex, '$1**$3');
    
    return equation;
}

/**
 * Add an equation to history
 */
function addToHistory(equation, type) {
    // Add to history array with timestamp
    mathlabState.history.unshift({
        equation: equation,
        type: type,
        timestamp: new Date().toLocaleTimeString()
    });
    
    // Keep only the last 10 items
    if (mathlabState.history.length > 10) {
        mathlabState.history.pop();
    }
    
    // Update history display
    updateHistoryDisplay();
}

/**
 * Update the history display in the sidebar
 */
function updateHistoryDisplay() {
    const historyContainer = document.getElementById('historyList');
    if (!historyContainer) return;
    
    historyContainer.innerHTML = '';
    
    mathlabState.history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-equation" title="Click to use this equation again">${item.equation}</div>
            <div class="history-meta">
                <span class="history-type">${item.type}</span>
                <span class="history-time">${item.timestamp}</span>
            </div>
        `;
        
        // Add click handler to reuse equation
        historyItem.addEventListener('click', () => {
            loadExample(item.equation, item.type);
        });
        
        historyContainer.appendChild(historyItem);
    });
}

/**
 * Clear the history
 */
function clearHistory() {
    mathlabState.history = [];
    updateHistoryDisplay();
}

/**
 * Update plot controls based on 2D/3D and complex plane selection
 */
function updatePlotControls() {
    const is3D = mathlabState.plotType === '3d';
    const isComplex = mathlabState.complexPlane;
    
    // Show/hide 3D specific controls
    const controls3D = document.getElementById('3d-controls');
    if (controls3D) {
        controls3D.style.display = is3D ? 'block' : 'none';
    }
    
    // Update plot button text if present
    const plotBtn = document.getElementById('plot-equation-btn');
    if (plotBtn) {
        if (is3D) {
            plotBtn.textContent = 'Create 3D Plot';
        } else if (isComplex) {
            plotBtn.textContent = 'Plot in Complex Plane';
        } else {
            plotBtn.textContent = 'Plot Expression';
        }
    }
    
    const solutionBtn = document.getElementById('plot-solution-btn');
    if (solutionBtn) {
        if (is3D) {
            solutionBtn.textContent = 'Plot 3D Solution';
        } else if (isComplex) {
            solutionBtn.textContent = 'Plot Solution in Complex Plane';
        } else {
            solutionBtn.textContent = 'Plot Solution';
        }
    }
}

/**
 * Plot the current equation or result
 */
function plotEquation() {
    // Get the active tab's input field
    let equation = '';
    
    switch (mathlabState.activeTab) {
        case 'algebraic':
            equation = document.getElementById('algebraic-equation').value.trim();
            break;
        case 'differential':
            equation = document.getElementById('diff-equation').value.trim();
            break;
        case 'integral':
            equation = document.getElementById('integral-expression').value.trim();
            break;
        case 'derivative':
            equation = document.getElementById('derivative-expression').value.trim();
            break;
    }
    
    if (!equation) {
        alert('Please enter an equation or expression to plot');
        return;
    }
    
    // Default plot parameters (we can add UI for these later)
    const xMin = -10;
    const xMax = 10;
    const points = 100;
    
    // Prepare plot data
    const plotData = {
        equation: equation,
        type: mathlabState.activeTab,
        plotType: mathlabState.plotType,
        xMin: xMin,
        xMax: xMax,
        points: points,
        complexPlane: mathlabState.complexPlane
    };
    
    // Add constants mode and values for differential equations
    if (mathlabState.activeTab === 'differential') {
        const constantsMode = document.getElementById('constants-mode')?.value || 'auto';
        plotData.constantsMode = constantsMode;
        
        if (constantsMode === 'custom') {
            // Get user-defined constant values
            const constants = {};
            const constantInputs = document.querySelectorAll('.constant-input');
            constantInputs.forEach(input => {
                const name = input.getAttribute('data-constant');
                const value = parseFloat(input.value);
                if (!isNaN(value)) {
                    constants[name] = value;
                }
            });
            plotData.constants = constants;
        } else if (constantsMode === 'family') {
            // For family of solutions, get range and number of solutions
            plotData.familyConstant = document.getElementById('family-constant')?.value || 'C1';
            plotData.familyMin = parseFloat(document.getElementById('family-min')?.value || -5);
            plotData.familyMax = parseFloat(document.getElementById('family-max')?.value || 5);
            plotData.familyCount = parseInt(document.getElementById('family-count')?.value || 5);
        }
    }
    
    // Add 3D parameters if needed
    if (mathlabState.plotType === '3d') {
        plotData.yMin = parseFloat(document.getElementById('y-min')?.value) || -10;
        plotData.yMax = parseFloat(document.getElementById('y-max')?.value) || 10;
    }
    
    // Show loading state
    const plotContainer = document.getElementById('math-plot');
    if (plotContainer) {
        plotContainer.innerHTML = '<div class="loading">Generating plot...</div>';
    }
    
    // Send request to backend
    fetch('/mathlab/plot', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(plotData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            const plotContainer = document.getElementById('math-plot');
            if (plotContainer) {
                plotContainer.innerHTML = `<div class="error">${data.error}</div>`;
            }
            return;
        }
        
        // Store plot data
        mathlabState.plotData = data;
        
        // Render the plot using mathlab_plotting.js
        renderPlot(data);
        
        // Add a note about complex values if the backend detected them
        if (data.hasComplex) {
            const plotContainer = document.getElementById('math-plot');
            const noteElement = document.createElement('div');
            noteElement.className = 'complex-note';
            noteElement.innerHTML = '<small>Note: For complex results, only real parts are plotted. Imaginary results appear as gaps in the plot. Try the "Complex Plane" toggle to visualize complex values.</small>';
            plotContainer.appendChild(noteElement);
        }
    })
    .catch(error => {
        const plotContainer = document.getElementById('math-plot');
        if (plotContainer) {
            plotContainer.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        }
    });
}

/**
 * Plot the last result
 */
function plotResult() {
    if (!mathlabState.lastResult) {
        alert("No result to plot. Please solve an equation first.");
        return;
    }
    
    // Get the equation from the current tab
    let equation = '';
    switch (mathlabState.activeTab) {
        case 'algebraic':
            // For algebraic equations, use original equation or expression from result
            equation = mathlabState.lastResult.expression || document.getElementById('algebraic-equation').value.trim();
            break;
        case 'differential':
            equation = mathlabState.lastResult.solution;
            if (!equation) {
                alert("No solution available to plot.");
                return;
            }
            break;
        case 'integral':
            // For integrals, we want to plot the result (antiderivative)
            equation = mathlabState.lastResult.result;
            break;
        case 'derivative':
            // For derivatives, we want to plot the result (derivative function)
            equation = mathlabState.lastResult.result;
            break;
    }
    
    // Prepare plot data
    const plotData = {
        equation: equation,
        type: mathlabState.activeTab,
        plotType: mathlabState.plotType, // Use current plot type (2d or 3d)
        xMin: -10,
        xMax: 10,
        points: 200,  // More points for smoother curves
        complexPlane: mathlabState.complexPlane
    };
    
    // Add constants for differential equations
    if (mathlabState.activeTab === 'differential') {
        const constantsMode = document.getElementById('constants-mode')?.value || 'auto';
        plotData.constantsMode = constantsMode;

        if (constantsMode === 'custom') {
            const constants = {};
            const constantInputs = document.querySelectorAll('.constant-input');
            constantInputs.forEach(input => {
                const name = input.getAttribute('data-constant');
                const value = parseFloat(input.value);
                if (!isNaN(value)) {
                    constants[name] = value;
                }
            });
            plotData.constants = constants;
        } else if (constantsMode === 'family') {
            plotData.familyConstant = document.getElementById('family-constant')?.value || 'C1';
            plotData.familyMin = parseFloat(document.getElementById('family-min')?.value || -5);
            plotData.familyMax = parseFloat(document.getElementById('family-max')?.value || 5);
            plotData.familyCount = parseInt(document.getElementById('family-count')?.value || 5);
        }
    }
    
    // Add 3D parameters if needed
    if (mathlabState.plotType === '3d') {
        plotData.yMin = parseFloat(document.getElementById('y-min')?.value) || -10;
        plotData.yMax = parseFloat(document.getElementById('y-max')?.value) || 10;
    }
    
    // Add roots if available (for enhanced algebraic equation visualization)
    if (mathlabState.activeTab === 'algebraic' && mathlabState.lastResult.roots) {
        plotData.roots = mathlabState.lastResult.roots;
    }
    
    // Show loading state
    const plotContainer = document.getElementById('math-plot');
    if (plotContainer) {
        plotContainer.innerHTML = '<div class="loading">Generating plot from solution...</div>';
    }
    
    // Send request to backend
    fetch('/mathlab/plot', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(plotData)
    })
    .then(response => response.json())
    .then(data => {
        const plotContainer = document.getElementById('math-plot');
        if (data.error) {
            if (plotContainer) {
                plotContainer.innerHTML = `<div class="error">${data.error}</div>`;
            }
            return;
        }
        
        // Store plot data
        mathlabState.plotData = data;
        
        // Render the plot
        renderPlot(data);
        
        // Add a note about complex values if the backend detected them
        if (data.hasComplex) {
            const noteElement = document.createElement('div');
            noteElement.className = 'complex-note';
            noteElement.innerHTML = '<small>Note: For complex results, only real parts are plotted. Imaginary results appear as gaps in the plot. Try the "Complex Plane" toggle to visualize complex values.</small>';
            plotContainer.appendChild(noteElement);
        }
    })
    .catch(error => {
        const plotContainer = document.getElementById('math-plot');
        if (plotContainer) {
            plotContainer.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        }
    });
}

/**
 * Insert a math function into the active input field
 * @param {string} funcText - The function text to insert
 */
function insertMathFunction(funcText) {
    if (!funcText) return;
    
    let inputField;
    
    // Find the active input field based on current tab
    switch (mathlabState.activeTab) {
        case 'algebraic':
            inputField = document.getElementById('algebraic-equation');
            break;
        case 'differential':
            inputField = document.getElementById('diff-equation');
            break;
        case 'integral':
            inputField = document.getElementById('integral-expression');
            break;
        case 'derivative':
            inputField = document.getElementById('derivative-expression');
            break;
    }
    
    if (!inputField) return;
    
    // Insert the function at cursor position or append to the end
    const startPos = inputField.selectionStart || 0;
    const endPos = inputField.selectionEnd || 0;
    const currentValue = inputField.value;
    
    inputField.value = currentValue.substring(0, startPos) + 
                      funcText + 
                      currentValue.substring(endPos);
    
    // Set cursor position after the inserted function
    const newCursorPos = startPos + funcText.length;
}

/**
 * Process and display the solution for a differential equation
 */
function processDiffEqSolution(data) {
    const resultPlaceholder = document.getElementById('result-placeholder');
    const mathResult = document.getElementById('math-result');
    const latexResult = document.getElementById('latex-result');

    // Hide placeholder and clear previous results
    resultPlaceholder.style.display = 'none';
    mathResult.innerHTML = '';
    latexResult.innerHTML = '';

    if (data.error) {
        let errorMessage = `<div class="error"><strong>Error:</strong> ${data.error}</div>`;
        // Provide helpful syntax tips for common errors
        if (data.error.includes('parsing') || data.error.includes('Syntax') || data.error.includes('invalid')) {
            errorMessage += `
                <div class="syntax-help">
                    <strong>Syntax Tips:</strong>
                    <ul>
                        <li>Use <code>dy/dx</code> for the first derivative.</li>
                        <li>Use <code>d²y/dx²</code> for the second derivative.</li>
                        <li>Ensure your equation includes an equals sign, e.g., <code>dy/dx = sin(x)</code>.</li>
                        <li>Use <code>**</code> for powers (e.g., <code>x**2</code>) and <code>*</code> for multiplication.</li>
                        <li>Check that function names are correct, e.g., <code>sin(x)</code>, <code>exp(x)</code>.</li>
                    </ul>
                </div>
            `;
        }
        resultPlaceholder.innerHTML = errorMessage;
        resultPlaceholder.style.display = 'block';
        mathResult.style.display = 'none';
        latexResult.style.display = 'none';
        return;
    }

    // Store result for potential plotting
    mathlabState.lastResult = data;

    // Display the solution
    mathResult.innerHTML = `
        <div class="solution">
            <span class="label">Solution:</span>
            <span class="value">${data.solution}</span>
        </div>
        <div class="plottable-message">
            <p>This solution can be visualized. Use the "Plot Solution" button.</p>
        </div>
    `;
    mathResult.style.display = 'block';

    // Display LaTeX if available
    if (data.latex) {
        latexResult.innerHTML = `
            <div class="latex-render">
                <span class="label">LaTeX:</span>
                <div class="math">\\[${data.latex}\\]</div>
            </div>
        `;
        latexResult.style.display = 'block';
        // Re-render LaTeX
        if (window.MathJax) {
            MathJax.typesetPromise();
        }
    } else {
        latexResult.style.display = 'none';
    }

    // Update the UI for handling solution constants (e.g., C1, C2)
    updateConstantsUI(data.solution);
}

/**
 * Initialize event listeners for constants handling in differential equations
 */
function initializeConstantsHandling() {
    const constantsModeSelect = document.getElementById('constants-mode');
    if (constantsModeSelect) {
        constantsModeSelect.addEventListener('change', handleConstantsModeChange);
    }
}

/**
 * Handle changes in the constants mode dropdown
 */
function handleConstantsModeChange() {
    const mode = this.value;
    const constantsContainer = document.getElementById('constants-container');
    if (!constantsContainer) return;

    // Update UI based on selected mode
    updateConstantsUI(mathlabState.lastResult ? mathlabState.lastResult.solution : '', mode);
}

/**
 * Update the UI for setting constants based on the solution
 * @param {string} solutionString - The solution equation string, e.g., "y(x) = C1*sin(x) + C2*cos(x)"
 * @param {string} modeOverride - Optional override for the constants mode
 */
function updateConstantsUI(solutionString, modeOverride) {
    const constantsContainer = document.getElementById('constants-container');
    if (!constantsContainer) return;

    const mode = modeOverride || document.getElementById('constants-mode').value;
    
    // Find all constants (C1, C2, etc.) in the solution string
    const constants = solutionString.match(/C\d+/g) || [];
    mathlabState.diffEqConstants = [...new Set(constants)]; // Store unique constants

    let html = '';

    if (mode === 'custom') {
        if (mathlabState.diffEqConstants.length > 0) {
            html = '<h6>Set Constant Values:</h6>';
            mathlabState.diffEqConstants.forEach((c, index) => {
                html += `
                    <div class="form-group compact-form">
                        <label for="const-${c}">${c}:</label>
                        <input type="number" id="const-${c}" class="control-input constant-input" data-constant="${c}" value="${index + 1}">
                    </div>
                `;
            });
        } else {
            html = '<div class="info-note"><p>No constants (like C1, C2) found in the solution.</p></div>';
        }
    } else if (mode === 'family') {
        if (mathlabState.diffEqConstants.length > 0) {
            html = `
                <h6>Plot a Family of Solutions:</h6>
                <div class="form-group">
                    <label for="family-constant">Vary Constant:</label>
                    <select id="family-constant" class="control-input">
                        ${mathlabState.diffEqConstants.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>
                <div class="compact-form">
                    <div class="form-group">
                        <label for="family-min">Min Value:</label>
                        <input type="number" id="family-min" class="control-input" value="-5">
                    </div>
                    <div class="form-group">
                        <label for="family-max">Max Value:</label>
                        <input type="number" id="family-max" class="control-input" value="5">
                    </div>
                </div>
                <div class="form-group">
                    <label for="family-count">Number of Curves:</label>
                    <input type="number" id="family-count" class="control-input" value="5" min="2" max="20">
                </div>
            `;
        } else {
            html = '<div class="info-note"><p>No constants found to create a family of solutions.</p></div>';
        }
    } else { // 'auto' mode
        html = '<div class="info-note"><p>Constants will be automatically set to 1 when plotting.</p></div>';
    }

    constantsContainer.innerHTML = html;
}
