/**
 * MathLab UI Controller
 * Handles user interface interactions for the Math Laboratory module
 */

// Initialize state
const mathlabState = {
    activeTab: 'algebraic',
    currentEquation: '',
    history: [],
    plotData: null,
    lastResult: null,
    diffEqConstants: [] // Will store detected constants like C1, C2, etc.
};

// DOM ready event
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all UI components
    initializeMathLab();
    
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
        // Remove any existing listeners to avoid duplication
        plotEquationBtn.removeEventListener('click', plotEquation);
        // Add the listener
        plotEquationBtn.addEventListener('click', plotEquation);
        console.log('Plot equation button listener attached');
    } else {
        console.error('Plot equation button not found');
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
    const activeTabId = type || mathlabState.activeTab;
    let equation = '';
    let variable = 'x';
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
    // Warn for high-degree polynomials in algebraic tab
    if (activeTabId === 'algebraic') {
        const degree = getPolynomialDegree(equation);
        if (degree > 5) {
            if (!window.confirm(`Warning: Polynomials of degree higher than 5 will return CRootOf (symbolic) solutions and may not be solvable in radicals.\n\nYour equation appears to have degree ${degree}.\n\nDo you want to proceed anyway?`)) {
                return;
            }
        }
    }
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
function displayResult(data, originalEquation) {
    const resultPlaceholder = document.getElementById('result-placeholder');
    const mathResult = document.getElementById('math-result');
    const latexResult = document.getElementById('latex-result');

    // Hide placeholder and clear previous results
    resultPlaceholder.style.display = 'none';
    mathResult.innerHTML = '';
    latexResult.innerHTML = '';

    if (data.error) {
        resultPlaceholder.innerHTML = `<div class="error"><strong>Error:</strong> ${data.error}</div>`;
        resultPlaceholder.style.display = 'block';
        mathResult.style.display = 'none';
        latexResult.style.display = 'none';
        return;
    }

    // Store result for potential plotting, including the original equation
    data.originalEquation = originalEquation;
    mathlabState.lastResult = data;

    // Display the result (plain text only, no LaTeX)
    mathResult.innerHTML = `
        <div class="solution">
            <span class="label">Result:</span>
            <span class="value">${data.result || data.solution}</span>
        </div>
    `;
    mathResult.style.display = 'block';

    // Hide LaTeX result container
    latexResult.style.display = 'none';
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
 * Plot the current equation or result
 */
// Make plotEquation accessible globally
window.plotEquation = function() {
    console.log('plotEquation function called');
    // First check if Plotly is available
    let mathPlotContainer = document.getElementById('math-plot');
    if (!window.Plotly && mathPlotContainer) {
        mathPlotContainer.innerHTML = '<div class="loading">Loading plotting library...</div>';
        
        // Check if there's already a script loading Plotly
        const existingScript = document.querySelector('script[src*="plotly-latest.min.js"]');
        
        if (existingScript) {
            // A script is already trying to load Plotly, wait for it
            console.log('Plotly is already being loaded, waiting...');
            
            // Setup a timer to check periodically if Plotly becomes available
            let checkAttempts = 0;
            const checkInterval = setInterval(() => {
                checkAttempts++;
                if (window.Plotly) {
                    clearInterval(checkInterval);
                    console.log('Plotly now available');
                    plotEquation();
                } else if (checkAttempts > 20) { // 10 second timeout (20 * 500ms)
                    clearInterval(checkInterval);
                    console.error('Timed out waiting for Plotly to load');
                    mathPlotContainer.innerHTML = '<div class="error">Error: Timed out waiting for plotting library to load. Please refresh the page.</div>';
                }
            }, 500);
            
            return;
        }
        
        // Try to load Plotly dynamically if needed
        const script = document.createElement('script');
        script.src = 'https://cdn.plot.ly/plotly-latest.min.js';
        script.crossOrigin = 'anonymous';
        script.onload = function() {
            // Once loaded, retry the plotting
            plotEquation();
        };
        script.onerror = function() {
            mathPlotContainer.innerHTML = '<div class="error">Error: Failed to load plotting library. Please refresh the page.</div>';
        };
        document.head.appendChild(script);
        return;
    }
    
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
        xMin: xMin,
        xMax: xMax,
        points: points
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
            const mathPlotDiv = document.getElementById('math-plot');
            if (mathPlotDiv) {
                mathPlotDiv.innerHTML = `<div class="error">${data.error}</div>`;
            }
            return;
        }
        
        // Store plot data
        mathlabState.plotData = data;
        
        // Render the plot using mathlab_plotting.js
        renderPlot(data);
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

    // Display the solution (plain text only, no LaTeX)
    mathResult.innerHTML = `
        <div class="solution">
            <span class="label">Solution:</span>
            <span class="value">${data.solution}</span>
        </div>
    `;
    mathResult.style.display = 'block';

    // Hide LaTeX result container
    latexResult.style.display = 'none';

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

/**
 * Generate a unique ID for a LaTeX element
 * @param {string} prefix - Prefix for the ID
 * @returns {string} A unique ID
 */
function generateUniqueLatexId(prefix = 'latex') {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// Fallback initialization - ensure that all event listeners are attached
function ensureButtonsInitialized() {
    console.log('Ensuring all buttons are properly initialized');
    
    // Plot buttons
    const plotEquationBtn = document.getElementById('plot-equation-btn');
    if (plotEquationBtn) {
        plotEquationBtn.removeEventListener('click', plotEquation); // Remove any existing to avoid duplicates
        plotEquationBtn.addEventListener('click', plotEquation);
        console.log('Plot equation button re-initialized');
        
        // Add direct onclick attribute as fallback
        plotEquationBtn.setAttribute('onclick', 'plotEquation(); return false;');
    }
}

// Call the fallback initialization function after a short delay to ensure DOM is ready
setTimeout(ensureButtonsInitialized, 500);

// Also run initialization when window is fully loaded
window.addEventListener('load', function() {
    console.log('Window loaded - initializing all components');
    ensureButtonsInitialized();
    
    // Directly set onclick handlers as a last resort
    const plotEquationBtn = document.getElementById('plot-equation-btn');
    
    if (plotEquationBtn) {
        plotEquationBtn.onclick = function(e) {
            e.preventDefault();
            console.log("Plot equation button clicked");
            window.plotEquation();
            return false;
        };
    }
});

/**
 * Format LaTeX for readable text display when rendering fails
 * @param {string} latex - The LaTeX string to format
 * @returns {string} Formatted LaTeX for text display
 */
function formatLatexForDisplay(latex) {
    if (!latex) return '';
    
    // First, we'll handle special functions that might be causing rendering issues
    const specialFunctions = {
        'Si': 'Sine Integral',
        'Ci': 'Cosine Integral',
        'Ei': 'Exponential Integral',
        'Li': 'Logarithmic Integral',
        'erf': 'Error Function',
        'erfc': 'Complementary Error Function',
        'LambertW': 'Lambert W',
        'airyai': 'Airy Ai',
        'airybi': 'Airy Bi',
        'elliptic': 'Elliptic'
    };
    
    // Replace special function macros with more readable text
    Object.keys(specialFunctions).forEach(func => {
        const pattern = new RegExp(`\\\\${func}`, 'g');
        latex = latex.replace(pattern, specialFunctions[func]);
    });
    
    // Replace common LaTeX commands with more readable alternatives
    let formattedLatex = latex
        .replace(/\\operatorname\{([^{}]*)\}/g, '$1')             // Remove \operatorname
        .replace(/\\mathrm\{([^{}]*)\}/g, '$1')                   // Remove \mathrm
        .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)') // Basic fractions
        .replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)')               // Square roots
        .replace(/\\sqrt\[(\d+)\]\{([^{}]*)\}/g, 'root[$1]($2)')  // nth roots
        .replace(/\\cdot/g, '·')                                  // Dot multiplication
        .replace(/\\left/g, '')                                   // Remove \left
        .replace(/\\right/g, '')                                  // Remove \right
        .replace(/\\log\{([^{}]*)\}/g, 'log($1)')                 // Log function
        .replace(/\\log/g, 'log')                                 // Log function without braces
        .replace(/\\ln\{([^{}]*)\}/g, 'ln($1)')                   // Natural log function
        .replace(/\\ln/g, 'ln')                                   // Natural log without braces
        .replace(/\\sin/g, 'sin')                                 // Sin function
        .replace(/\\cos/g, 'cos')                                 // Cos function
        .replace(/\\tan/g, 'tan')                                 // Tan function
        .replace(/\\exp/g, 'exp')                                 // Exp function
        .replace(/\\\[/g, '')                                     // Remove display math delimiters
        .replace(/\\\]/g, '')                                     // Remove display math delimiters
        .replace(/\s+/g, ' ')                                     // Normalize whitespace
        .trim();
        
    // Handle nested fractions and other complex structures better
    let iterations = 0;
    while (formattedLatex.includes('\\frac') && iterations < 5) {
        formattedLatex = formattedLatex.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)');
        iterations++;
    }
    
    return formattedLatex;
}

/**
 * Check if the LaTeX contains special functions that need custom handling
 * @param {string} latex - The LaTeX string to check
 * @returns {boolean} True if special functions are detected
 */
function containsSpecialFunctions(latex) {
    if (!latex) return false;
    
    // List of special function patterns to check for
    const specialFunctionPatterns = [
        'Si\\(', 'Si{', '\\\\operatorname{Si}', 
        'Ci\\(', 'Ci{', '\\\\operatorname{Ci}',
        'Ei\\(', 'Ei{', '\\\\operatorname{Ei}',
        'LambertW',
        'airyai', 'airybi',
        'elliptic'
    ];
    
    // Check if any special function patterns are present
    return specialFunctionPatterns.some(pattern => 
        latex.includes(pattern) || 
        new RegExp(pattern).test(latex)
    );
}

/**
 * Enhanced LaTeX rendering for expressions with special functions
 * @param {HTMLElement} container - The container to render LaTeX in
 * @param {string} latex - The LaTeX string to render
 */
function renderSpecialFunctionLatex(container, latex) {
    if (!container || !latex) return;
    
    // Check for common special functions
    if (latex.includes('Si(') || latex.includes('\\operatorname{Si}')) {
        // Add explanation for Sine Integral function
        const specialFuncNote = document.createElement('div');
        specialFuncNote.className = 'special-function-note';
        specialFuncNote.innerHTML = `
            <div class="special-function-info">
                <strong>Note:</strong> Si(x) is the Sine Integral function defined as 
                <span class="math-inline">Si(x) = ∫<sub>0</sub><sup>x</sup> sin(t)/t dt</span>
            </div>
        `;
        
        // Add the explanation after the LaTeX rendering
        container.parentNode.appendChild(specialFuncNote);
        
        // Add styling for the note
        const style = document.createElement('style');
        style.textContent = `
            .special-function-note {
                margin-top: 10px;
                padding: 8px;
                background-color: #f0f8ff;
                border-left: 3px solid #1e90ff;
                font-size: 0.9em;
            }
            .special-function-info {
                color: #333;
            }
            .math-inline {
                font-family: 'Georgia', serif;
                background: #f9f9f9;
                padding: 0 3px;
            }
        `;
        document.head.appendChild(style);
    }
}

// Patch solveEquation to warn for degree > 5 in algebraic
const originalSolveEquation = solveEquation;
solveEquation = function(type = null) {
    // If no type is provided, use the active tab
    if (!type) {
        type = mathlabState.activeTab;
    }
    const activeTabId = type || mathlabState.activeTab;
    let equation = '';
    let variable = 'x';
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
    // Warn for high-degree polynomials in algebraic tab
    if (activeTabId === 'algebraic') {
        const degree = getPolynomialDegree(equation);
        if (degree > 5) {
            if (!window.confirm(`Warning: Polynomials of degree higher than 5 will return CRootOf (symbolic) solutions and may not be solvable in radicals.\n\nYour equation appears to have degree ${degree}.\n\nDo you want to proceed anyway?`)) {
                return;
            }
        }
    }
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
