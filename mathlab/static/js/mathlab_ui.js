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
        // Remove any existing listeners to avoid duplication
        plotEquationBtn.removeEventListener('click', plotEquation);
        // Add the listener
        plotEquationBtn.addEventListener('click', plotEquation);
        console.log('Plot equation button listener attached');
    } else {
        console.error('Plot equation button not found');
    }

    const plotSolutionBtn = document.getElementById('plot-solution-btn');
    if (plotSolutionBtn) {
        // Remove any existing listeners to avoid duplication
        plotSolutionBtn.removeEventListener('click', plotResult);
        // Add the listener
        plotSolutionBtn.addEventListener('click', plotResult);
        console.log('Plot solution button listener attached');
    } else {
        console.error('Plot solution button not found');
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
        
    // Add complexity note if available
    if (data.note) {
        // Check if this is a CRootOf explanation
        if (data.note.includes('CRootOf') || data.has_crootof) {
            resultHTML += `<div class="crootof-explanation">
                <div class="title">About CRootOf Expressions</div>
                <div class="message">${data.note}</div>
                <div class="numerical-approximation">
                    <span class="label">Explanation:</span> 
                    <p>CRootOf represents roots of high-degree polynomials (like x⁵) that cannot be expressed with simple radicals.</p>
                    <p>These are exact symbolic solutions, but the numerical approximations are often more practical for use.</p>
                </div>
            </div>`;
        } else {
            resultHTML += `<div class="complexity-note">
                <span class="icon">ℹ️</span>
                <span class="message">${data.note}</span>
            </div>`;
        }
    }
    
    // Add a warning based on complexity level
    if (data.complexity) {
        let warningMessage = "";
        let warningIcon = "ℹ️";
        
        if (data.complexity === 'high' || data.complexity === 'very complex') {
            warningIcon = "⚠️";
            warningMessage = `<p>This expression is highly complex. Consider breaking it into smaller parts for better results.</p>
                <ul class="suggestion-list">
                    <li>Test simpler expressions first</li>
                    <li>Break down terms and analyze separately</li>
                    <li>For integrals, try using numerical methods with specific bounds</li>
                </ul>`;
        } else if (data.complexity === 'complex' || data.complexity === 'moderately complex') {
            warningMessage = `<p>This expression has moderate complexity. Results may benefit from verification.</p>
                <ul class="suggestion-list">
                    <li>Verify key parts of the solution</li>
                    <li>Consider simplifying if possible</li>
                </ul>`;
        }
        
        if (warningMessage) {
            resultHTML += `<div class="complexity-warning">
                <span class="icon">${warningIcon}</span>
                <div class="message">${warningMessage}</div>
            </div>`;
        }
    }
    
    // Special message for numerical solutions
    if (data.is_numerical) {
        resultHTML += `<div class="complexity-note">
            <span class="icon">🔢</span>
            <span class="message">Using numerical methods for this complex expression. For symbolic results, try simplifying the input.</span>
        </div>`;
    }
    
    // Add roots information if available
    if (data.roots && data.roots.length > 0) {
        resultHTML += `<div class="roots">
            <span class="label">Roots:</span>
            <span class="value">${data.roots.map(root => `x = ${parseFloat(root).toFixed(4)}`).join(', ')}</span>
        </div>`;
        
        // Add a specific message about plotting with roots
        if (data.roots.length >= 2) {
            resultHTML += `<div class="plottable-message">
                <p>This equation has ${data.roots.length} real roots. Click "Plot Solution" to visualize the function between the roots.</p>
            </div>`;
        } else if (data.roots.length === 1) {
            resultHTML += `<div class="plottable-message">
                <p>This equation has 1 real root at x = ${parseFloat(data.roots[0]).toFixed(4)}. Click "Plot Solution" to visualize the function around this root.</p>
            </div>`;
        } else {
            resultHTML += `<div class="plottable-message">
                <p>This equation has roots that couldn't be calculated analytically. Click "Plot Solution" to visualize the function.</p>
            </div>`;
        }
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
        
        // Check for explicit error messages from the backend
        if (data.latex.includes("too complex") || data.latex.includes("Could not render")) {
            latexResult.innerHTML = `
                <div class="latex-render">
                    <span class="label">LaTeX:</span>
                    <div class="math-error">${data.latex}</div>
                    <div class="note">Note: The expression is too complex for LaTeX rendering.</div>
                </div>
            `;
        } 
        // Check for problematic expressions like the one in your example
        else if (
            // Detect very complex nested fractions and roots with complex numbers
            (data.latex.includes("\\sqrt") && data.latex.includes("\\cdot i") && data.latex.includes("\\frac")) ||
            // Detect expressions with multiple complex numbers and cube roots
            (data.latex.includes("\\sqrt[3]") && data.latex.includes("\\cdot i")) ||
            // Detect very long expressions (common in complex roots)
            (data.latex.length > 300 && (data.latex.includes("\\sqrt") || data.latex.includes("\\frac")))
        ) {
            // Handle these problematic expressions with a text representation
            latexResult.innerHTML = `
                <div class="latex-render">
                    <span class="label">LaTeX:</span>
                    <div class="complex-math-display">
                        <div class="complex-notice">Complex expression detected - showing simplified version</div>
                        <pre class="latex-text-display">${formatLatexForDisplay(data.latex)}</pre>
                        <div class="complex-hint">This expression contains complex mathematical notation that may not render properly.</div>
                    </div>
                </div>
            `;
            
            // Add some styling for the text representation
            const style = document.createElement('style');
            style.textContent = `
                .complex-math-display { padding: 10px; background: #f8f8f8; border: 1px solid #ddd; border-radius: 4px; }
                .complex-notice { color: #e67e22; margin-bottom: 8px; font-weight: bold; }
                .complex-hint { color: #666; font-size: 0.85em; margin-top: 8px; }
                .latex-text-display { max-height: 200px; overflow: auto; padding: 10px; background: #fff; 
                                     border: 1px solid #eee; font-family: monospace; margin: 0; }
            `;
            document.head.appendChild(style);
        } else {
            // Normal rendering with error handling
            try {
                // Special handling for CRootOf expressions
                if (data.has_crootof || (data.latex && data.latex.includes('CRootOf'))) {
                    // Generate a unique ID for this CRootOf LaTeX content
                    const uniqueCrootOfId = generateUniqueLatexId('crootof');
                    
                    latexResult.innerHTML = `
                        <div class="latex-render">
                            <span class="label">LaTeX:</span>
                            <div class="math" id="${uniqueCrootOfId}">${data.latex}</div>
                            <div class="help-text">
                                <small>Note: CRootOf expressions may be clearer in the numerical approximation above.</small>
                            </div>
                        </div>
                    `;
                    
                    // Ensure proper rendering for CRootOf expressions
                    setTimeout(() => {
                        const mathContent = document.getElementById(uniqueCrootOfId);
                        if (mathContent) {
                            // Create a proper MathJax element
                            const mathJaxScript = document.createElement('script');
                            mathJaxScript.type = 'math/tex; mode=display';
                            mathJaxScript.text = data.latex;
                            
                            // Replace our placeholder with the proper MathJax element
                            mathContent.innerHTML = '';
                            mathContent.appendChild(mathJaxScript);
                            
                            // Force MathJax to process this specific element
                            if (window.MathJax && window.MathJax.typesetPromise) {
                                window.MathJax.typesetPromise([mathContent]);
                            }
                        }
                    }, 0);
                } else {
                    // Check if the LaTeX expression is too complex (very long or has many complex notations)
                    const isVeryComplex = data.latex.length > 300 || 
                                        (data.latex.match(/\\sqrt/g) || []).length > 5 || 
                                        (data.latex.match(/\\frac/g) || []).length > 8 ||
                                        (data.latex.split('+').length > 10) ||
                                        data.latex.includes('\\cdot i');
                    
                    if (isVeryComplex && data.complexity === 'high') {
                        // For very complex expressions, wrap in an additional container with pre-processing
                        // Generate a unique ID for this complex expression
                        const uniqueComplexId = generateUniqueLatexId('complex');
                        
                        latexResult.innerHTML = `
                            <div class="latex-render">
                                <span class="label">LaTeX:</span>
                                <div class="math-complex">
                                    <div class="complex-warning">Complex expression - rendering with special handling</div>
                                    <div class="math" id="${uniqueComplexId}">${data.latex}</div>
                                </div>
                            </div>
                        `;
                        
                        // Special handling for complex expressions
                        setTimeout(() => {
                            const mathContent = document.getElementById(uniqueComplexId);
                            if (mathContent) {
                                // Create a proper MathJax element
                                const mathJaxScript = document.createElement('script');
                                mathJaxScript.type = 'math/tex; mode=display';
                                mathJaxScript.text = data.latex;
                                
                                // Replace our placeholder with the proper MathJax element
                                mathContent.innerHTML = '';
                                mathContent.appendChild(mathJaxScript);
                                
                                // Force MathJax to process this specific element
                                if (window.MathJax && window.MathJax.typesetPromise) {
                                    window.MathJax.typesetPromise([mathContent])
                                    .then(() => {
                                        // Add horizontal scrolling for very large renderings
                                        const container = mathContent.querySelector('mjx-container');
                                        if (container) {
                                            container.style.overflowX = 'auto';
                                            container.style.maxWidth = '100%';
                                        }
                                    })
                                    .catch(err => console.warn('MathJax complex rendering error:', err));
                                }
                            }
                        }, 0);
                    } else {
                        // Generate a unique ID for this LaTeX content
                        const uniqueId = generateUniqueLatexId('standard');
                        
                        // Normal rendering for simpler expressions
                        latexResult.innerHTML = `
                            <div class="latex-render">
                                <span class="label">LaTeX:</span>
                                <div class="math" id="${uniqueId}">${data.latex}</div>
                            </div>
                        `;
                        
                        // Ensure proper rendering by using MathJax's specific methods
                        setTimeout(() => {
                            const mathContent = document.getElementById(uniqueId);
                            if (mathContent) {
                                // Create a proper MathJax element
                                const mathJaxScript = document.createElement('script');
                                mathJaxScript.type = 'math/tex; mode=display';
                                mathJaxScript.text = data.latex;
                                
                                // Replace our placeholder with the proper MathJax element
                                mathContent.innerHTML = '';
                                mathContent.appendChild(mathJaxScript);
                                
                                // Force MathJax to process this specific element
                                if (window.MathJax && window.MathJax.typesetPromise) {
                                    window.MathJax.typesetPromise([mathContent]);
                                }
                            }
                        }, 0);
                    }
                }
            } catch (e) {
                // Fallback for client-side errors
                latexResult.innerHTML = `
                    <div class="latex-render">
                        <span class="label">LaTeX:</span>
                        <div class="math-error">LaTeX rendering failed: Expression too complex</div>
                    </div>
                `;
            }
        }
    } else {
        latexResult.style.display = 'none';
    }
    
    // Re-render any LaTeX with error handling
    if (window.MathJax) {
        // Check if we need to apply special handling for very complex expressions
        const hasVeryComplexExpression = document.querySelector('.math-complex') !== null;
        
        // Add a timeout to prevent browser hanging on extremely complex LaTeX
        const mathjaxTimeout = setTimeout(() => {
            console.warn('MathJax processing timeout - expression might be too complex');
            
            // Find any still-unprocessed LaTeX and replace with warning
            document.querySelectorAll('.math').forEach(el => {
                // Check if MathJax has processed this element
                if (!el.querySelector('.MJX-math') && !el.querySelector('mjx-math')) {
                    const parent = el.parentNode;
                    const warning = document.createElement('div');
                    warning.className = 'math-error';
                    warning.innerHTML = 'Expression too complex to render. Try simplifying the input.';
                    parent.replaceChild(warning, el);
                }
            });
        }, 5000); // 5 second timeout
        
        // Use a more compatible way to trigger MathJax typesetting
        try {
            // For very complex expressions, try pre-processing to help with rendering
            if (hasVeryComplexExpression) {
                console.log("Processing complex LaTeX expression with special handling");
                
                // Add special styling to help with complex expressions
                const styleId = 'complex-math-styles';
                if (!document.getElementById(styleId)) {
                    const style = document.createElement('style');
                    style.id = styleId;
                    style.textContent = `
                        .math-complex .math { overflow-x: auto; max-width: 100%; padding: 10px 0; }
                        .math-complex mjx-container { min-width: 0 !important; }
                        .complex-warning { color: #ff9800; font-size: 0.8em; margin-bottom: 5px; }
                    `;
                    document.head.appendChild(style);
                }
            }
            
            // Check which MathJax API is available (v3 vs v2)
            if (typeof MathJax.typesetPromise === 'function') {
                // MathJax v3 API with custom options for complex expressions
                const options = hasVeryComplexExpression ? 
                    { scale: 0.9, displayAlign: 'left', displayIndent: '0' } : {};
                
                MathJax.typesetPromise()
                .then(() => {
                    // Clear timeout if rendering completes successfully
                    clearTimeout(mathjaxTimeout);
                    
                    // Add horizontal scrolling for very large expressions
                    if (hasVeryComplexExpression) {
                        document.querySelectorAll('.math-complex .math mjx-container').forEach(container => {
                            container.style.overflowX = 'auto';
                            container.style.maxWidth = '100%';
                        });
                    }
                })
                .catch(error => {
                    console.error('MathJax v3 error:', error);
                    clearTimeout(mathjaxTimeout); // Clear the timeout
                    handleMathJaxError();
                });
            } else if (typeof MathJax.Hub !== 'undefined' && typeof MathJax.Hub.Queue === 'function') {
                // MathJax v2 API
                MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
                
                // Also queue a function to clear the timeout
                MathJax.Hub.Queue(() => {
                    clearTimeout(mathjaxTimeout);
                    console.log('MathJax v2 typesetting complete');
                });
            } else {
                // If we can't detect the proper API, try a simple approach
                console.warn('MathJax API not properly detected, attempting to render anyway');
                if (typeof MathJax.typeset === 'function') {
                    MathJax.typeset();
                    clearTimeout(mathjaxTimeout);
                } else {
                    // Last resort
                    console.warn('No MathJax API methods detected for typesetting');
                    clearTimeout(mathjaxTimeout);
                }
            }
        } catch (mjError) {
            console.error('Error calling MathJax:', mjError);
            clearTimeout(mathjaxTimeout);
            handleMathJaxError();
        }
        
        // Define a function to handle MathJax errors
        function handleMathJaxError() {
            // Try to recover from the error first by transforming LaTeX into a more digestible format
            if (data.latex) {
                try {
                    // For very complex expressions, offer a text representation alternative
                    const latexDisplay = document.createElement('pre');
                    latexDisplay.className = 'latex-text-display';
                    latexDisplay.style.maxHeight = '200px';
                    latexDisplay.style.overflow = 'auto';
                    latexDisplay.style.padding = '10px';
                    latexDisplay.style.background = '#f8f8f8';
                    latexDisplay.style.color = '#333';
                    latexDisplay.style.border = '1px solid #ddd';
                    latexDisplay.style.borderRadius = '4px';
                    latexDisplay.style.fontSize = '0.9em';
                    latexDisplay.style.marginTop = '10px';
                    latexDisplay.style.whiteSpace = 'pre-wrap';
                    latexDisplay.style.wordBreak = 'break-all';
                    
                    // Format the LaTeX for better readability
                    let formattedLatex = formatLatexForDisplay(data.latex);
                    
                    latexDisplay.textContent = formattedLatex;
                    
                    // Replace the existing LaTeX container with our text representation
                    const mathElements = document.querySelectorAll('.math');
                    mathElements.forEach(el => {
                        el.innerHTML = '<div class="math-error">LaTeX expression too complex for browser rendering</div>';
                        el.appendChild(latexDisplay);
                    });
                    
                    // Add special notice
                    const noticeDiv = document.createElement('div');
                    noticeDiv.className = 'latex-notice';
                    noticeDiv.style.fontSize = '0.85em';
                    noticeDiv.style.marginTop = '5px';
                    noticeDiv.style.color = '#666';
                    noticeDiv.textContent = "The raw LaTeX code is displayed above because the expression is too complex for rendering";
                    
                    mathElements[0].appendChild(noticeDiv);
                    return; // Early return since we handled it
                } catch(e) {
                    console.error("Error in LaTeX recovery:", e);
                    // Continue with standard error handling
                }
            }
            
            // Standard error handling if recovery fails
            const mathElements = document.querySelectorAll('.math');
            mathElements.forEach(el => {
                el.innerHTML = '<div class="math-error">Error: LaTeX expression too complex to render. Try breaking it into smaller parts.</div>';
            });
            
            // Add a suggestion if this was a complex expression
            if (data.complexity === 'high' || data.complexity === 'very complex' || data.complexity === 'complex') {
                const suggestionDiv = document.createElement('div');
                suggestionDiv.className = 'complexity-warning';
                suggestionDiv.innerHTML = `
                    <p><strong>⚠️ Rendering Error:</strong> This expression is too complex for LaTeX rendering.</p>
                    <ul class="suggestion-list">
                        <li>Try breaking it down into smaller parts</li>
                        <li>Verify the expression manually</li>
                        <li>For complex expressions, focus on numeric results</li>
                    </ul>
                `;
                resultContainer.appendChild(suggestionDiv);
            }
        }
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
        
        // Add a note about complex values if the backend detected them
        if (data.hasComplex) {
            const noteElement = document.createElement('div');
            noteElement.className = 'complex-note';
            noteElement.innerHTML = '<small>Note: For complex results, only real parts are plotted. Imaginary results appear as gaps in the plot. Try the "Complex Plane" toggle to visualize complex values.</small>';
            mathPlotDiv.appendChild(noteElement);
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
// Make plotResult accessible globally
window.plotResult = function() {
    console.log('plotResult function called');
    if (!mathlabState.lastResult) {
        alert("No result to plot. Please solve an equation first.");
        return;
    }
    
    // First check if Plotly is available
    const plotContainer = document.getElementById('math-plot');
    if (!window.Plotly && plotContainer) {
        plotContainer.innerHTML = '<div class="loading">Loading plotting library...</div>';
        
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
                    plotResult();
                } else if (checkAttempts > 20) { // 10 second timeout (20 * 500ms)
                    clearInterval(checkInterval);
                    console.error('Timed out waiting for Plotly to load');
                    plotContainer.innerHTML = '<div class="error">Error: Timed out waiting for plotting library to load. Please refresh the page.</div>';
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
            plotResult();
        };
        script.onerror = function() {
            plotContainer.innerHTML = '<div class="error">Error: Failed to load plotting library. Please refresh the page.</div>';
        };
        document.head.appendChild(script);
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
        console.log('Plot backend response:', data); // Debug log
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
        
        // Add warning if we're using a single-root approximation (global box)
        if (
            mathlabState.activeTab === 'algebraic' &&
            data.singleRootWarning &&
            data.roots && Array.isArray(data.roots) && data.roots.length === 1
        ) {
            showSingleRootWarning(parseFloat(data.roots[0]).toFixed(4));
        }
    })
    .catch(error => {
        const mathPlotContainer = document.getElementById('math-plot');
        if (mathPlotContainer) {
            mathPlotContainer.innerHTML = `<div class="error">Error: ${error.message}</div>`;
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
        // Generate a unique ID for this differential equation
        const uniqueDiffEqId = generateUniqueLatexId('diffeq');
        
        latexResult.innerHTML = `
            <div class="latex-render">
                <span class="label">LaTeX:</span>
                <div class="math" id="${uniqueDiffEqId}">${data.latex}</div>
            </div>
        `;
        latexResult.style.display = 'block';
        
        // Enhanced LaTeX rendering for differential equations
        setTimeout(() => {
            const mathContent = document.getElementById(uniqueDiffEqId);
            if (mathContent) {
                // Create a proper MathJax element
                const mathJaxScript = document.createElement('script');
                mathJaxScript.type = 'math/tex; mode=display';
                mathJaxScript.text = data.latex;
                
                // Replace our placeholder with the proper MathJax element
                mathContent.innerHTML = '';
                mathContent.appendChild(mathJaxScript);
                
                // Force MathJax to process this specific element
                if (window.MathJax && window.MathJax.typesetPromise) {
                    window.MathJax.typesetPromise([mathContent])
                        .catch(err => console.warn('MathJax differential equation render error:', err));
                }
            }
        }, 0);
        
        // Backup re-render method using global MathJax functionality
        if (window.MathJax) {
            // Use our global typeset function if available
            if (window.typesetMath) {
                window.typesetMath().catch(err => console.warn('MathJax typeset error:', err));
            } 
            // Fallback methods if global function isn't available
            else if (typeof MathJax.typesetPromise === 'function') {
                MathJax.typesetPromise().catch(err => console.warn('MathJax error:', err));
            } else if (typeof MathJax.Hub !== 'undefined' && typeof MathJax.Hub.Queue === 'function') {
                MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
            } else if (typeof MathJax.typeset === 'function') {
                MathJax.typeset();
            } else {
                console.warn('No compatible MathJax API found for rendering');
            }
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
    
    const plotSolutionBtn = document.getElementById('plot-solution-btn');
    if (plotSolutionBtn) {
        plotSolutionBtn.removeEventListener('click', plotResult); // Remove any existing to avoid duplicates
        plotSolutionBtn.addEventListener('click', plotResult);
        console.log('Plot solution button re-initialized');
        
        // Add direct onclick attribute as fallback
        plotSolutionBtn.setAttribute('onclick', 'plotResult(); return false;');
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
    const plotSolutionBtn = document.getElementById('plot-solution-btn');
    
    if (plotEquationBtn) {
        plotEquationBtn.onclick = function(e) {
            e.preventDefault();
            console.log("Plot equation button clicked");
            window.plotEquation();
            return false;
        };
    }
    
    if (plotSolutionBtn) {
        plotSolutionBtn.onclick = function(e) {
            e.preventDefault();
            console.log("Plot solution button clicked");
            window.plotResult();
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

// Add a global warning box for single root warning
function showSingleRootWarning(rootValue) {
    let warningBox = document.getElementById('single-root-global-warning');
    if (!warningBox) {
        warningBox = document.createElement('div');
        warningBox.id = 'single-root-global-warning';
        warningBox.style.display = 'none';
        warningBox.innerHTML = `
            <div class="alert alert-warning">
                <strong>⚠️ Single Root Warning:</strong> This plot is centered around the only detected root at x = <span id="single-root-value"></span>.<br>
                <ul>
                    <li>The plot shows a ±5 unit range around this single root</li>
                    <li>This is an approximation and may not capture all roots or the complete function behavior</li>
                    <li>There could be additional roots outside this limited view range</li>
                    <li>For more accurate plots, consider simplifying the equation or specifying a custom plot range</li>
                </ul>
            </div>
        `;
        document.body.appendChild(warningBox);
        // Add styling for the warning
        const style = document.createElement('style');
        style.textContent = `
            #single-root-global-warning {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 9999;
                min-width: 350px;
                max-width: 90vw;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            }
            #single-root-global-warning .alert.alert-warning {
                padding: 12px 18px;
                background-color: #fff3cd;
                border-left: 5px solid #ffc107;
                color: #856404;
                font-size: 1em;
            }
            #single-root-global-warning ul {
                margin: 8px 0 0 0;
                padding-left: 22px;
                font-size: 0.97em;
            }
        `;
        document.head.appendChild(style);
    }
    document.getElementById('single-root-value').textContent = rootValue;
    warningBox.style.display = 'block';
    // Auto-hide after 10 seconds
    setTimeout(() => { warningBox.style.display = 'none'; }, 10000);
}
