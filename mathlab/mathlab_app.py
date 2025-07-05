import re
import random
from flask import Blueprint, render_template, request, jsonify
import numpy as np
import sympy as sp
from sympy.parsing.sympy_parser import parse_expr
import json
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend

# Create the blueprint
mathlab_bp = Blueprint('mathlab', __name__, 
                    template_folder='templates',
                    static_folder='static',
                    static_url_path='/mathlab/static')

def preprocess_equation(equation_str):
    """
    Preprocess equation string to handle common syntax issues
    """
    # Replace ^ with ** for powers if needed (in case JavaScript preprocessing missed it)
    equation_str = equation_str.replace('^', '**')

    # Replace x² with x**2, x³ with x**3, etc. (superscript notation)
    superscripts = {'²': '**2', '³': '**3', '⁴': '**4', '⁵': '**5', '⁶': '**6', '⁷': '**7', '⁸': '**8', '⁹': '**9'}
    for sup, repl in superscripts.items():
        equation_str = equation_str.replace(sup, repl)

    # Accept sinx, cosx, etc. as sin(x), cos(x), etc.
    # Use a regex that avoids double-parentheses, e.g. sin(x) -> sin((x))
    function_names = ['sin', 'cos', 'tan', 'exp', 'log', 'sqrt']
    for fname in function_names:
        # This regex looks for a function name not followed by a parenthesis,
        # and captures the variable/argument that follows.
        equation_str = re.sub(rf'(\b{fname}\b)(?!\s*\()([a-zA-Z0-9_]+)', r'\1(\2)', equation_str)

    return equation_str

@mathlab_bp.route('/mathlab')
def mathlab():
    """Render the MathLab main page"""
    return render_template('mathlab.html')

@mathlab_bp.route('/mathlab/solve', methods=['POST'])
def solve_equation():
    """Solve mathematical equations"""
    data = request.get_json()
    eq_type = data.get('type', 'algebraic')
    equation = data.get('equation', '')
    
    try:
        if eq_type == 'algebraic':
            result = solve_algebraic(equation)
            
            # Check if result is a dictionary or error message string
            if isinstance(result, dict):
                response_data = {
                    'solution': result['solution'],
                    'latex': convert_to_latex(result['solution']),
                    'roots': result.get('roots', []),
                    'expression': result.get('expression', ''),
                    'equation_type': result.get('equation_type', ''),
                    'has_crootof': result.get('has_crootof', False)
                }
                
                # Add any notes (like CRootOf explanations)
                if result.get('note'):
                    response_data['note'] = result['note']
                    
                return jsonify(response_data)
            else:
                # It's an error message
                return jsonify({'error': result})
                
        elif eq_type == 'differential':
            result = solve_differential(equation, data.get('variable', 'x'))
            
            # Check for error
            if result.get('error'):
                return jsonify({
                    'error': result.get('error'),
                    'complexity': result.get('complexity')
                })
                
            # Check if this is a numerical solution
            if result.get('is_numerical'):
                return jsonify({
                    'solution': result.get('solution'),
                    'is_numerical': True,
                    'complexity': 'high',
                    'result': result.get('solution')
                })
            
            # Extract constants from the solution
            solution = result.get('solution', '')
            if solution and '=' in solution:
                # Extract constants (C1, C2, etc.) from the solution
                import re
                const_pattern = r'C(\d+)'
                const_matches = re.findall(const_pattern, solution)
                constants = [f'C{i}' for i in const_matches]
                
                # Prepare response with all available fields
                response_data = {
                    'solution': solution,
                    'latex': convert_to_latex(solution),
                    'constants': constants,
                    'result': solution  # Ensure result field is populated for UI
                }
                
                # Add any additional fields from the result
                if result.get('note'):
                    response_data['note'] = result.get('note')
                    
                if result.get('complexity'):
                    response_data['complexity'] = result.get('complexity')
                    
                return jsonify(response_data)
            else:
                return jsonify({
                    'error': result.get('error', 'Could not solve differential equation'),
                    'complexity': result.get('complexity')
                })
        elif eq_type == 'integral':
            result = calculate_integral(data)
        elif eq_type == 'derivative':
            result = calculate_derivative(data)
        else:
            return jsonify({'error': 'Invalid equation type'})
            
        # Handle other equation types that return strings
        if eq_type != 'algebraic' and eq_type != 'differential':
            return jsonify({
                'solution': result,
                'latex': convert_to_latex(result)
            })
            
    except Exception as e:
        return jsonify({'error': str(e)})

def solve_algebraic(equation_str):
    """Solve an algebraic equation using SymPy"""
    try:
        # Preprocess the equation string
        equation_str = preprocess_equation(equation_str)
        
        # Convert the string to a SymPy expression
        x = sp.symbols('x')
        
        # Check if equation contains '=' sign
        if '=' in equation_str:
            left, right = equation_str.split('=')
            eq = sp.Eq(sp.sympify(left.strip()), sp.sympify(right.strip()))
            solution = sp.solve(eq, x)
            
            # Extract the expression for plotting (moved left side - right side = 0)
            expr = sp.sympify(left.strip()) - sp.sympify(right.strip())
            
            # Process CRootOf expressions if present
            solution_str, crootof_note, has_crootof = process_crootof_expressions(solution)
            
            # Extract numerical roots for plotting
            numerical_roots = []
            for root in solution:
                try:
                    if hasattr(root, 'is_real') and root.is_real:
                        if hasattr(root, 'evalf'):
                            numerical_roots.append(float(root.evalf()))
                        else:
                            numerical_roots.append(float(root))
                except:
                    # Skip roots that can't be converted to float
                    pass
            
            # Return additional data for enhanced plotting
            result = {
                'solution': solution_str,
                'roots': numerical_roots,
                'expression': str(expr),
                'equation_type': 'polynomial' if isinstance(expr, sp.Poly) or expr.is_polynomial() else 'general',
                'has_crootof': has_crootof
            }
            
            # Add explanation for CRootOf if present
            if crootof_note:
                result['note'] = crootof_note
                
            return result
        else:
            # Assume it's an expression to simplify
            expr = sp.sympify(equation_str)
            solution = sp.simplify(expr)
            
            return {
                'solution': str(solution),
                'expression': str(expr)
            }
            
    except Exception as e:
        return f"Error: {str(e)}"

def solve_differential(equation_str, var='x'):
    """Solve a differential equation using SymPy"""
    try:
        # Preprocess the equation string
        equation_str = preprocess_equation(equation_str)

        # Define symbols and function
        x = sp.Symbol(var)
        y = sp.Function('y')
        y_func = y(x)

        # Check for common syntax errors
        if '=' not in equation_str:
            return {'error': "Differential equation must contain exactly one '=' sign"}
            
        if equation_str.count('=') > 1:
            return {'error': "Multiple equals signs detected. Differential equation should have form 'dy/dx = expression' or similar."}
        
        # Check for expected differential notation
        if 'dy/dx' not in equation_str.lower() and 'd²y/dx²' not in equation_str and 'derivative' not in equation_str.lower():
            return {'error': "Missing differential notation. For differential equations, use 'dy/dx = ...' format."}
        
        # Check for equations ending with "=0"
        if equation_str.endswith('=0') and 'dy/dx' in equation_str and '=' in equation_str[:-2]:
            return {'error': "Invalid format. Please use 'dy/dx = expression' format instead of 'dy/dx = expression = 0'"}

        left, right = equation_str.split('=', 1)
        left = left.strip()
        right = right.strip()

        # Replace derivative notations
        left = left.replace("d²y/dx²", "Derivative(y(x), x, 2)")
        left = left.replace("dy/dx", "Derivative(y(x), x)")
        right = right.replace("d²y/dx²", "Derivative(y(x), x, 2)")
        right = right.replace("dy/dx", "Derivative(y(x), x)")
        
        # Replace standalone y with y(x)
        left = re.sub(r'(?<![a-zA-Z0-9_])\by(?!\()', 'y(x)', left)
        right = re.sub(r'(?<![a-zA-Z0-9_])\by(?!\()', 'y(x)', right)

        # Define the local namespace for parsing
        locals_dict = {
            'x': x,
            'y': y,
            'Derivative': sp.Derivative,
            'sin': sp.sin, 'cos': sp.cos, 'tan': sp.tan, 'exp': sp.exp, 'log': sp.log, 'sqrt': sp.sqrt
        }
        locals_dict['y(x)'] = y_func

        try:
            # Parse expressions
            left_expr = sp.sympify(left, locals=locals_dict)
            right_expr = sp.sympify(right, locals=locals_dict)
        except Exception as parse_error:
            return {'error': f"Error parsing the differential equation: {str(parse_error)}\nPlease check your syntax."}

        # Create the equation
        diff_eq = sp.Eq(left_expr, right_expr)
        
        # Check if the equation is too complex for symbolic solving
        is_complex, complexity_level = is_expression_complex(right_expr - left_expr)
        
        if is_complex:
            # For very complex expressions, use a numerical approach or simplified solution
            try:
                # Try to use sympy with a timeout to avoid hanging
                import signal
                
                def timeout_handler(signum, frame):
                    raise TimeoutError("Symbolic solving took too long")
                
                # Set 5-second timeout for symbolic solving
                signal.signal(signal.SIGALRM, timeout_handler)
                signal.alarm(5)
                
                try:
                    # Try to solve with a time limit
                    solution = sp.dsolve(diff_eq, y_func)
                    
                    # If we get here, the solve worked within the time limit
                    signal.alarm(0)  # Cancel the timeout
                    
                    # Handle list of solutions
                    if isinstance(solution, list):
                        if not solution:
                            raise ValueError("Could not solve equation symbolically")
                        solution = solution[0]  # Take the first solution
                        
                    # Check if the solution is an Equality, which indicates success
                    if isinstance(solution, sp.Equality):
                        solution_str = f"y(x) = {solution.rhs}"
                        
                        # Convert to LaTeX with our enhanced function that handles complexity
                        try:
                            solution_latex = convert_to_latex(str(solution))
                        except:
                            solution_latex = "LaTeX rendering unavailable for complex solution"
                        
                        # Add a note about the complexity
                        note = f"Note: This is a {complexity_level} differential equation. The solution may be simplified."
                        
                        return {
                            'solution': solution_str,
                            'latex': solution_latex,
                            'note': note,
                            'complexity': complexity_level
                        }
                        
                except TimeoutError:
                    # If the symbolic solution timed out, provide a numerical fallback
                    return {
                        'solution': "This differential equation is too complex for symbolic solving. Try breaking down your equation into simpler components or using numerical methods.",
                        'is_numerical': True,
                        'complexity': complexity_level,
                        'note': "Suggestion: Try inputting each term separately or use numerical methods for complex differential equations."
                    }
                    
            except Exception as e:
                error_msg = str(e)
                suggestion = ""
                
                if "maximum recursion depth" in error_msg:
                    suggestion = "Try simplifying your expression by breaking it into separate terms."
                elif "timeout" in error_msg.lower():
                    suggestion = "The equation is too complex for symbolic solving. Try numerical methods."
                else:
                    suggestion = "Try simplifying the equation or checking the syntax."
                    
                return {
                    'error': f"This differential equation is {complexity_level} and could not be solved symbolically: {error_msg[:100]}",
                    'complexity': complexity_level,
                    'note': suggestion
                }
                
        else:
            # Standard approach for simpler equations
            try:
                # Solve the differential equation for y(x)
                solution = sp.dsolve(diff_eq, y_func)
                
                # Handle list of solutions
                if isinstance(solution, list):
                    if not solution:
                        return {'error': 'Could not solve differential equation'}
                    solution = solution[0]  # Take the first solution
                
                # Check if the solution is an Equality, which indicates success
                if isinstance(solution, sp.Equality):
                    solution_str = f"y(x) = {solution.rhs}"
                    solution_latex = sp.latex(solution)
                    return {
                        'solution': solution_str,
                        'latex': solution_latex
                    }
                else:
                    return {'error': 'Could not solve differential equation'}
            except Exception as e:
                return {'error': f"Could not solve differential equation: {str(e)}"}

    except Exception as e:
        # Provide more helpful error messages for common issues
        error_str = str(e)
        if "maximum recursion depth" in error_str:
            return {'error': "The differential equation is too complex to solve symbolically."}
        elif "could not parse" in error_str and ("=" in equation_str.count('=') > 1):
            return {'error': "Multiple equals signs detected. Please use the form 'dy/dx = expression'."}
        else:
            return {'error': f"An error occurred: {error_str}"}


def calculate_integral(data):
    """Calculate indefinite or definite integral"""
    try:
        expression_str = preprocess_equation(data.get('equation', ''))
        var = data.get('variable', 'x')
        x = sp.Symbol(var)
        expr = sp.sympify(expression_str)
        
        # Check if expression is complex
        is_complex, complexity_level = is_expression_complex(expr)
        
        lower_limit = data.get('lower_limit')
        upper_limit = data.get('upper_limit')
        
        # For definite integrals with complex expressions, use numerical integration
        if is_complex and lower_limit is not None and upper_limit is not None:
            try:
                # Import numerical integration
                from scipy import integrate as scipy_integrate
                import numpy as np
                
                # Create a lambda function for numerical evaluation
                f = sp.lambdify(x, expr, "numpy")
                
                # Perform numerical integration
                result_val, error_est = scipy_integrate.quad(f, float(lower_limit), float(upper_limit))
                
                # Return both the numerical result and a note about numerical integration
                result = f"{result_val} (Numerical integration, estimated error: {error_est:.2e})"
                return f"{result}\n(Note: Used numerical integration for {complexity_level} expression.)"
                
            except Exception as num_error:
                # If numerical integration fails, try symbolic with a timeout
                import signal
                
                def timeout_handler(signum, frame):
                    raise TimeoutError("Integration took too long")
                
                # Set 5-second timeout
                signal.signal(signal.SIGALRM, timeout_handler)
                signal.alarm(5)
                
                try:
                    result = sp.integrate(expr, (x, float(lower_limit), float(upper_limit)))
                    signal.alarm(0)  # Cancel the timeout
                    return str(result)
                except TimeoutError:
                    return f"Error: Integration too complex. Try simplifying the expression or using smaller intervals."
                except Exception as e:
                    return f"Error: {str(e)}"
                
        else:
            # For indefinite integrals or simple expressions, use symbolic integration
            try:
                if lower_limit is not None and upper_limit is not None:
                    result = sp.integrate(expr, (x, float(lower_limit), float(upper_limit)))
                else:
                    result = sp.integrate(expr, x)
                    
                result_str = str(result)
                
                # Add a note if the expression was complex
                if is_complex:
                    return f"{result_str}\n(Note: Expression is {complexity_level}. Verify the result.)"
                else:
                    return result_str
                    
            except Exception as e:
                if "maximum recursion depth" in str(e):
                    return f"Error: Expression too complex for symbolic integration. Try simplifying the expression."
                return f"Error: {str(e)}"
    except Exception as e:
        return f"Error: {str(e)}"

def calculate_derivative(data):
    """Calculate derivative of an expression"""
    try:
        expression_str = preprocess_equation(data.get('equation', ''))
        var = data.get('variable', 'x')
        order = int(data.get('order', 1))
        
        # Check for common syntax errors
        if '=' in expression_str:
            # Check for multiple equals signs
            if expression_str.count('=') > 1:
                return "Error: Multiple equals signs detected. For derivatives, please enter only the function to differentiate without setting it equal to anything."
            
            # Check if they're using differential notation and equals
            if 'dy/dx' in expression_str or 'd/dx' in expression_str:
                return "Error: For derivative calculation, please enter just the expression to differentiate (without 'dy/dx =' or '= 0')."
            
            # Otherwise, extract the expression on the right side of the equals
            try:
                # Try to extract the right side if equation is in form f(x) = expression
                left, right = expression_str.split('=')
                expression_str = right.strip()
                # If we get here, warn that we're only using the right side
                expression_note = f"Note: Taking derivative of the right side: {expression_str}"
            except:
                return "Error: Invalid equation format. For derivatives, enter the expression without equals signs."
        
        # Check for differential notation without equals sign
        if 'dy/dx' in expression_str or 'd/dx' in expression_str:
            return "Error: For derivative calculation, please enter just the expression to differentiate without 'dy/dx' or 'd/dx'."
            
        x = sp.Symbol(var)
        try:
            expr = sp.sympify(expression_str)
        except Exception as parse_error:
            return f"Error parsing the expression: {str(parse_error)}\nPlease check your syntax and ensure you're entering a valid mathematical expression."
        
        result = sp.diff(expr, x, order)
        result_str = str(result)
        
        # If we previously extracted from an equation, add the note
        if 'expression_note' in locals():
            result_str = f"{result_str}\n({expression_note})"
            
        return result_str
    except Exception as e:
        return f"Error: {str(e)}"

def convert_to_latex(expr_input):
    """Convert a SymPy expression or string to LaTeX format with safeguards for complexity"""
    import sympy as sp
    from sympy.printing import latex
    try:
        # If input is a string, try to parse to SymPy
        if isinstance(expr_input, str):
            # Check for excessive length
            if len(expr_input) > 1000:
                return f"Expression too complex for LaTeX rendering (length: {len(expr_input)})"
            # Try to parse string to SymPy expression
            try:
                expr = sp.sympify(expr_input)
            except Exception as parse_err:
                return f"Could not render as LaTeX: {str(parse_err)[:100]}"
        else:
            expr = expr_input
        # Now expr is a SymPy object
        latex_result = latex(expr, 
                            mode='inline',
                            long_frac_ratio=3,
                            mul_symbol='dot',
                            fold_short_frac=True,
                            fold_frac_powers=True,
                            fold_func_brackets=True,
                            order=None,
                            mat_str='pmatrix',
                            mat_delim='')
        if len(latex_result) > 2500:
            simplified_expr = sp.simplify(expr)
            simplified_latex = latex(simplified_expr, 
                                    mode='inline',
                                    long_frac_ratio=2,
                                    mul_symbol='dot',
                                    fold_short_frac=True,
                                    fold_frac_powers=True,
                                    fold_func_brackets=True)
            if len(simplified_latex) > 2500:
                return f"LaTeX representation too complex (length: {len(latex_result)}). Try simplifying your input."
            else:
                return simplified_latex
        return latex_result
    except Exception as e:
        error_msg = str(e)[:100]
        if "recursion depth" in error_msg:
            return "Could not render LaTeX: expression too complex causing recursion limit"
        return f"Could not render as LaTeX: {error_msg}"

@mathlab_bp.route('/mathlab/plot', methods=['POST'])
def plot_equation():
    """Generate plot data for an equation"""
    data = request.get_json()
    equation = preprocess_equation(data.get('equation', ''))
    plot_type = data.get('plotType', '2d')
    eq_type = data.get('type', 'algebraic')
    complex_plane = data.get('complexPlane', False)
    
    try:
        # Get plot range
        x_min = float(data.get('xMin', -10))
        x_max = float(data.get('xMax', 10))
        points = int(data.get('points', 100))
        
        # Get roots if they were provided (for enhanced algebraic plotting)
        roots = data.get('roots', [])
        
        # Adjust plot range if roots are provided
        if roots:
            if len(roots) >= 2:
                sorted_roots = sorted(roots)
                # Add padding around roots
                padding = (sorted_roots[-1] - sorted_roots[0]) * 0.2
                x_min = min(sorted_roots) - padding
                x_max = max(sorted_roots) + padding
            elif len(roots) == 1:
                # If only one root is found, center the plot around it
                root = float(roots[0])
                # Use a reasonable range around the single root (±5 units)
                x_min = root - 5
                x_max = root + 5
                # Flag this as a single root approximation
                single_root_approximation = True
        else:
            # Make sure we don't have a single root approximation
            single_root_approximation = False
        
        # Create data points
        x = np.linspace(x_min, x_max, points)
        
        # Parse the equation
        if eq_type == 'algebraic':
            # Enhanced plotting for algebraic equations with roots
            if roots:
                y, root_points = evaluate_algebraic(equation, x, roots)
                sorted_roots = sorted([float(root) for root in roots])
                roots_str = ", ".join([f"{root:.2f}" for root in sorted_roots])
                # More concise title that shows the equation and roots
                title = f"{equation}"
                # Add warning to the response about single root approximation
                if len(roots) == 1 and single_root_approximation:
                    single_root_warning = True
                else:
                    single_root_warning = False
            else:
                y, root_points = evaluate_algebraic(equation, x)  # Now always returns tuple
                title = f"{equation}"
        elif eq_type == 'differential':
            # Handle constants for differential equations
            constants_mode = data.get('constantsMode', 'auto')
            constants = data.get('constants', {})
            
            # For family of solutions
            if constants_mode == 'family':
                family_params = {
                    'constant': data.get('familyConstant', 'C1'),
                    'min': float(data.get('familyMin', -5)),
                    'max': float(data.get('familyMax', 5)),
                    'count': int(data.get('familyCount', 5))
                }
                
                # Get a family of solutions
                solutions, params = evaluate_differential_solution(equation, x, 
                                                                   constants_mode=constants_mode,
                                                                   family_params=family_params)
                
                # Multiple traces for family of solutions
                traces = []
                for i, sol in enumerate(solutions):
                    y_values = sol['y']
                    
                    # Check for complex values
                    has_complex = np.any(np.iscomplex(y_values))
                    
                    # Filter out any complex values or infinities
                    valid_indices = np.isfinite(y_values) & np.isreal(y_values)
                    x_filtered = x[valid_indices].tolist()
                    y_filtered = np.real(y_values[valid_indices]).tolist()
                    
                    # Create trace with a different color for each value
                    value = sol['constant_value']
                    constant_name = sol['constant_name']
                    trace = {
                        'x': x_filtered,
                        'y': y_filtered,
                        'mode': 'lines',
                        'name': f"{constant_name} = {value:.2f}",
                        'showlegend': True  # Show legend for family of solutions
                    }
                    traces.append(trace)
                
                # Generate title with family info
                title = f"Solution to {equation}<br>Family of solutions with {params['constant']} varying from {params['min']} to {params['max']}"
                
                # Add zero line for reference
                zero_line = {
                    'x': x.tolist(),
                    'y': np.zeros_like(x).tolist(),
                    'mode': 'lines',
                    'line': {'dash': 'dash', 'color': 'gray'},
                    'name': 'y = 0',
                    'showlegend': False
                }
                traces.append(zero_line)
                
                return jsonify({
                    'traces': traces,
                    'title': title,
                    'is_family': True
                })
            else:
                # Single solution with specified or auto constants
                y, used_constants = evaluate_differential_solution(equation, x, 
                                                               constants_mode=constants_mode,
                                                               constants=constants)
                
                # Add the constants to the title
                constants_str = ", ".join([f"{k} = {v:.2f}" for k, v in used_constants.items()])
                title = f"Solution to {equation}<br>with {constants_str}"
                root_points = []
        elif eq_type == 'integral':
            y = evaluate_integral(equation, x)
            root_points = []
            title = f"Integral of {equation}"
        elif eq_type == 'derivative':
            y = evaluate_derivative(equation, x)
            root_points = []
            title = f"Derivative of {equation}"
        else:
            return jsonify({'error': 'Invalid equation type'})
        
        # Complex plane plotting
        if complex_plane:
            # Use all values including complex
            if isinstance(y, tuple):
                y_values = y[0]
            else:
                y_values = y
            
            # Filter only finite values
            valid_indices = np.isfinite(y_values)
            x_filtered = x[valid_indices].tolist()
            
            # Extract real and imaginary parts
            y_real = np.real(y_values[valid_indices]).tolist()
            y_imag = np.imag(y_values[valid_indices]).tolist()
            
            # Calculate magnitude and phase
            y_mag = np.abs(y_values[valid_indices]).tolist()
            
            # Find any special points
            special_points = root_points if roots else find_special_points(equation, x_min, x_max)
            
            return jsonify({
                'x': x_filtered,
                'y_real': y_real,
                'y_imag': y_imag,
                'y_mag': y_mag,
                'title': f"Complex Plot of {equation}",
                'label': equation,
                'specialPoints': special_points,
                'roots': roots if roots else [],
                'plotType': 'complex',
                'hasComplex': True
            })
            
        # For 2D plots
        elif plot_type == '2d':
            # Filter out any complex values or infinities
            if isinstance(y, tuple):
                # Handle case where y includes special points
                y_values = y[0]
            else:
                y_values = y
                
            # Detect complex values in results
            has_complex = not np.all(np.isreal(y_values))
            
            # Filter out any complex values or infinities
            valid_indices = np.isfinite(y_values) & np.isreal(y_values)
            x_filtered = x[valid_indices].tolist()
            y_filtered = y_values[valid_indices].real.tolist() if hasattr(y_values, 'real') else y_values[valid_indices].tolist()
            
            # If we filtered a significant number of points, record this fact
            filtered_percentage = 0 if len(y_values) == 0 else (len(y_values) - np.sum(valid_indices)) / len(y_values) * 100
            
            # Find any special points (roots, critical points)
            special_points = root_points if roots else find_special_points(equation, x_min, x_max)
            
            # Add single root warning if applicable
            single_root_warning = False
            if roots and len(roots) == 1 and 'single_root_approximation' in locals() and single_root_approximation:
                single_root_warning = True
            
            return jsonify({
                'x': x_filtered,
                'y': y_filtered,
                'title': title,
                'label': equation,
                'specialPoints': special_points,
                'roots': roots if roots else [],
                'plotType': '2d',
                'hasComplex': has_complex,
                'filteredPercentage': filtered_percentage,
                'singleRootWarning': single_root_warning
            })
        
        # For 3D plots
        elif plot_type == '3d':
            # Get y range for 3D plots
            y_min = float(data.get('yMin', -10))
            y_max = float(data.get('yMax', 10))
            
            # Create a meshgrid for 3D plotting
            x_grid = np.linspace(x_min, x_max, points)
            y_grid = np.linspace(y_min, y_max, points)
            X, Y = np.meshgrid(x_grid, y_grid)
            
            # Evaluate the function for each (x,y) pair
            Z = evaluate_3d_function(equation, X, Y)
            
            # Detect complex values in results
            has_complex = not np.all(np.isreal(Z))
            
            # Filter out any complex values or infinities
            Z = np.where(np.isfinite(Z) & np.isreal(Z), Z.real, np.nan)
            
            # Calculate percentage of filtered values
            filtered_percentage = np.sum(~np.isfinite(Z) | ~np.isreal(Z)) / Z.size * 100
            
            return jsonify({
                'x': X.tolist(),
                'y': Y.tolist(),
                'z': Z.tolist(),
                'title': f"3D Plot of {equation}",
                'plotType': '3d',
                'hasComplex': has_complex,
                'filteredPercentage': float(filtered_percentage)
            })
            
        else:
            return jsonify({'error': 'Invalid plot type'})
            
    except Exception as e:
        return jsonify({'error': str(e)})

def evaluate_algebraic(equation_str, x_values, roots=None):
    """Evaluate an algebraic expression for given x values"""
    try:
        # Preprocess the equation string
        equation_str = preprocess_equation(equation_str)
        
        # Check if equation contains '='
        if '=' in equation_str:
            left, right = equation_str.split('=')
            expr = sp.sympify(left.strip()) - sp.sympify(right.strip())
        else:
            expr = sp.sympify(equation_str.strip())
            
        # Convert sympy expression to numpy function
        x_sym = sp.symbols('x')
        f = sp.lambdify(x_sym, expr, 'numpy')
        
        # Evaluate function for all x values
        y = f(x_values)
        
        # Initialize empty special_points list
        special_points = []
        
        # If roots are provided, create special points for them
        if roots and isinstance(roots, list):
            # Handle cases with any number of roots (even just one)
            for root in roots:
                special_points.append({
                    'x': float(root),
                    'y': 0,  # At roots, y is always 0
                    'label': f'Root: x = {root:.4f}',
                    'color': '#e74c3c',
                    'showlegend': False  # Ensure this point doesn't show in legend
                })
        
        # Always return both y values and special points (which may be empty)
        return y, special_points
    except Exception as e:
        raise ValueError(f"Error evaluating expression: {str(e)}")

def evaluate_differential_solution(equation_str, x_values, constants_mode='auto', constants=None, family_params=None):
    """Evaluate the solution to a differential equation for given x values"""
    try:
        # Solve the differential equation first
        result = solve_differential(equation_str)
        
        if 'error' in result:
            raise ValueError(result['error'])
            
        solution = result.get('solution', '')
        
        # Extract the solution function (assuming it's in the form y(x) = ...)
        if '=' in solution:
            solution_expr = solution.split('=')[1].strip()
            
            # Extract constants (C1, C2, etc.) from the solution
            const_pattern = r'C(\d+)'
            import re
            const_matches = re.findall(const_pattern, solution_expr)
            const_names = [f'C{i}' for i in const_matches]
            
            # Handle constants based on mode
            if constants_mode == 'auto':
                # Auto-generate random constants between -5 and 5
                import random
                auto_constants = {f'C{i}': random.uniform(-5, 5) for i in const_matches}
                for const_name, const_value in auto_constants.items():
                    solution_expr = solution_expr.replace(const_name, str(const_value))
                    
                # Convert to numpy function with substituted constants
                x_sym = sp.symbols('x')
                try:
                    # Use our helper function to safely parse expressions
                    if 'y(x)' in solution_expr:
                        y_expr = parse_solution_expression(f"y(x) = {solution_expr}")
                    else:
                        y_expr = sp.sympify(solution_expr, locals={'x': x_sym, 'exp': sp.exp})
                    f = sp.lambdify(x_sym, y_expr, 'numpy')
                except Exception as e:
                    raise ValueError(f"Error parsing solution expression: {str(e)}")
                
                # Evaluate function for all x values
                y = f(x_values)
                return y, auto_constants
                
            elif constants_mode == 'custom':
                # Use user-provided constants
                if not constants:
                    constants = {}
                    
                # For any missing constants, use default value of 1
                for const_name in const_names:
                    if const_name not in constants:
                        constants[const_name] = 1.0
                
                # Substitute constants in the solution
                for const_name, const_value in constants.items():
                    solution_expr = solution_expr.replace(const_name, str(const_value))
                
                # Convert to numpy function with substituted constants
                x_sym = sp.symbols('x')
                try:
                    # Use our helper function to safely parse expressions
                    if 'y(x)' in solution_expr:
                        y_expr = parse_solution_expression(f"y(x) = {solution_expr}")
                    else:
                        y_expr = sp.sympify(solution_expr, locals={'x': x_sym, 'exp': sp.exp})
                    f = sp.lambdify(x_sym, y_expr, 'numpy')
                except Exception as e:
                    raise ValueError(f"Error parsing solution expression: {str(e)}")
                
                # Evaluate function for all x values
                y = f(x_values)
                return y, constants
                
            elif constants_mode == 'family':
                # Generate a family of solutions by varying one constant
                if not family_params:
                    family_params = {
                        'constant': 'C1',
                        'min': -5,
                        'max': 5,
                        'count': 5
                    }
                
                family_constant = family_params.get('constant', 'C1')
                family_min = float(family_params.get('min', -5))
                family_max = float(family_params.get('max', 5))
                family_count = int(family_params.get('count', 5))
                
                # Generate values for the family constant
                family_values = np.linspace(family_min, family_max, family_count)
                
                # For other constants, use default value of 1
                default_constants = {const: 1.0 for const in const_names if const != family_constant}
                
                solutions = []
                for value in family_values:
                    # Make a copy of the solution expression
                    current_expr = solution_expr
                    
                    # Substitute the family constant
                    current_expr = current_expr.replace(family_constant, str(value))
                    
                    # Substitute default values for other constants
                    for const_name, const_value in default_constants.items():
                        current_expr = current_expr.replace(const_name, str(const_value))
                    
                    # Convert to numpy function
                    x_sym = sp.symbols('x')
                    try:
                        # Use our helper function to safely parse expressions
                        if 'y(x)' in current_expr:
                            y_expr = parse_solution_expression(f"y(x) = {current_expr}")
                        else:
                            y_expr = sp.sympify(current_expr, locals={'x': x_sym, 'exp': sp.exp})
                        f = sp.lambdify(x_sym, y_expr, 'numpy')
                    except Exception as e:
                        raise ValueError(f"Error parsing solution expression: {str(e)}")
                    
                    # Evaluate function for all x values
                    y = f(x_values)
                    solutions.append({
                        'y': y,
                        'constant_value': value,
                        'constant_name': family_constant
                    })
                
                return solutions, family_params
            
        else:
            raise ValueError("Could not extract solution from differential equation")
    except Exception as e:
        raise ValueError(f"Error evaluating differential solution: {str(e)}")

def evaluate_integral(equation_str, x_values):
    """Evaluate the indefinite integral for given x values"""
    try:
        # Calculate the indefinite integral
        x_sym = sp.symbols('x')
        expr = sp.sympify(equation_str)
        integral = sp.integrate(expr, x_sym)
        
        # Convert to numpy function
        f = sp.lambdify(x_sym, integral, 'numpy')
        
        # Evaluate function for all x values
        y = f(x_values)
        return y
    except Exception as e:
        raise ValueError(f"Error evaluating integral: {str(e)}")

def evaluate_derivative(equation_str, x_values):
    """Evaluate the derivative for given x values"""
    try:
        # Calculate the derivative
        x_sym = sp.symbols('x')
        expr = sp.sympify(equation_str)
        derivative = sp.diff(expr, x_sym)
        
        # Convert to numpy function
        f = sp.lambdify(x_sym, derivative, 'numpy')
        
        # Evaluate function for all x values
        y = f(x_values)
        return y
    except Exception as e:
        raise ValueError(f"Error evaluating derivative: {str(e)}")

def evaluate_3d_function(equation_str, x_grid, y_grid):
    """Evaluate a function z = f(x,y) for a grid of x,y values"""
    try:
        # Parse the expression
        x_sym, y_sym = sp.symbols('x y')
        
        # Check if equation contains '='
        if '=' in equation_str:
            left, right = equation_str.split('=')
            # Assuming z is isolated on the left
            if 'z' in left and left.strip() == 'z':
                expr = sp.sympify(right.strip())
            else:
                expr = sp.sympify(left.strip()) - sp.sympify(right.strip())
        else:
            expr = sp.sympify(equation_str.strip())
            
        # Convert sympy expression to numpy function
        f = sp.lambdify((x_sym, y_sym), expr, 'numpy')
        
        # Evaluate function for all x,y grid points
        Z = f(x_grid, y_grid)
        return Z
    except Exception as e:
        raise ValueError(f"Error evaluating 3D function: {str(e)}")

def find_special_points(equation_str, x_min, x_max):
    """Find roots and critical points of a function"""
    special_points = []
    try:
        # Parse the expression
        x = sp.symbols('x')
        
        # Check if equation contains '='
        if '=' in equation_str:
            left, right = equation_str.split('=')
            expr = sp.sympify(left.strip()) - sp.sympify(right.strip())
        else:
            expr = sp.sympify(equation_str.strip())
            
        # Find roots (where expr = 0)
        try:
            roots = sp.solve(expr, x)
            for root in roots:
                if root.is_real and x_min <= float(root) <= x_max:
                    special_points.append({
                        'x': float(root),
                        'y': 0,
                        'label': 'Root',
                        'color': '#e74c3c',
                        'showlegend': False  # Ensure this point doesn't show in legend
                    })
        except:
            pass
            
        # Find critical points (where derivative = 0)
        try:
            derivative = sp.diff(expr, x)
            critical_points = sp.solve(derivative, x)
            for cp in critical_points:
                if cp.is_real and x_min <= float(cp) <= x_max:
                    # Evaluate function at critical point
                    y_value = expr.subs(x, cp)
                    special_points.append({
                        'x': float(cp),
                        'y': float(y_value),
                        'label': 'Critical Point',
                        'color': '#3498db',
                        'showlegend': False  # Ensure this point doesn't show in legend
                    })
        except:
            pass
            
        return special_points
    except:
        return []

def is_expression_complex(expr):
    """
    Check if an expression is likely to be too complex for symbolic solving
    Returns True if expression is complex enough that we should use numerical methods
    """
    expr_str = str(expr)
    
    # Count occurrences of potentially problematic patterns
    high_degree_count = len(re.findall(r'x\*\*[5-9]|x\*\*\d{2,}', expr_str))  # Powers of x^5 or higher
    trig_count = expr_str.count('sin') + expr_str.count('cos') + expr_str.count('tan')
    exp_count = expr_str.count('exp')
    log_count = expr_str.count('log')
    length_score = len(expr_str) / 50  # Normalize by 50 chars
    
    # Check for nested functions (which are particularly problematic)
    nested_func_patterns = [
        r'sin\(.+sin\(', r'cos\(.+cos\(', r'log\(.+log\(',
        r'exp\(.+exp\(', r'tan\(.+tan\(',
        r'sin\(.+cos\(', r'cos\(.+sin\(', r'exp\(.+log\(',
        r'log\(.+exp\('
    ]
    
    nested_count = 0
    for pattern in nested_func_patterns:
        nested_count += len(re.findall(pattern, expr_str))
    
    # Check for multiplication of complex terms
    term_count = len(re.findall(r'[+\-*/]', expr_str))  # Count operators as a proxy for term complexity
    
    # Calculate complexity score with refined weights
    complexity_score = (high_degree_count*3 + 
                        trig_count*1.5 + 
                        exp_count*2 + 
                        log_count*1.5 + 
                        nested_count*5 +  # Heavily weight nested functions
                        term_count*0.5 +  # Count terms
                        length_score)
    
    # Determine if expression is complex based on score
    is_complex = complexity_score > 4  # Threshold for "complex" expressions
    
    # More detailed classification for user feedback
    complexity_level = "simple"
    if complexity_score > 10:
        complexity_level = "very complex"
    elif complexity_score > 6:
        complexity_level = "complex"
    elif complexity_score > 4:
        complexity_level = "moderately complex"
    
    print(f"Expression complexity: {complexity_score:.2f} ({complexity_level})")
    
    return is_complex, complexity_level

def process_crootof_expressions(solution, numerical=True):
    """
    Process CRootOf expressions in a solution to make them more user-friendly
    
    Args:
        solution: The solution string or SymPy expression
        numerical: If True, will attempt to convert to numerical values
    
    Returns:
        Tuple of (processed_solution, explanation, has_crootof)
    """
    solution_str = str(solution)
    
    # Check if this contains CRootOf expressions
    if 'CRootOf' not in solution_str:
        return solution_str, None, False
    
    explanation = (
        "Note: CRootOf expressions represent the roots of a polynomial that cannot be expressed "
        "in closed form using radicals. Numerical approximations are provided."
    )
    
    # If we just want to leave it symbolic
    if not numerical:
        return solution_str, explanation, True
    
    # Try to convert to numerical approximations
    try:
        if isinstance(solution, list):
            # For a list of roots
            numerical_roots = []
            for root in solution:
                if hasattr(root, 'evalf'):
                    # Evaluate to numerical form with 6 decimal places
                    num_value = complex(root.evalf(6))
                    if abs(num_value.imag) < 1e-10:  # Practically real
                        numerical_roots.append(f"{float(num_value.real):.6f}")
                    else:
                        numerical_roots.append(f"{num_value.real:.6f} + {num_value.imag:.6f}i")
                else:
                    numerical_roots.append(str(root))
            
            # Format the numerical list
            numerical_solution = f"[{', '.join(numerical_roots)}]"
            return numerical_solution, explanation, True
        else:
            # For a single expression
            if hasattr(solution, 'evalf'):
                return str(solution.evalf(6)), explanation, True
            else:
                return solution_str, explanation, True
    except Exception as e:
        print(f"Error converting CRootOf to numerical: {e}")
        return solution_str, explanation, True

def might_produce_crootof(equation_str):
    """
    Check if an equation might produce CRootOf expressions
    
    Args:
        equation_str: String representation of an equation
    
    Returns:
        Boolean indicating if the equation might produce CRootOf
    """
    try:
        # Preprocess the equation
        equation_str = preprocess_equation(equation_str)
        
        # Check if it's a polynomial equation
        if '=' in equation_str:
            left, right = equation_str.split('=')
            expr = sp.sympify(left.strip()) - sp.sympify(right.strip())
        else:
            expr = sp.sympify(equation_str)
            
        # Check if it's a polynomial
        if not expr.is_polynomial():
            return False
            
        # Check the degree of the polynomial
        try:
            x = sp.symbols('x')
            poly = sp.Poly(expr, x)
            degree = poly.degree()
            
            # Polynomial equations of degree 5 or higher often result in CRootOf
            if degree >= 5:
                return True
        except:
            pass
            
        return False
    except:
        return False

def parse_solution_expression(solution_str):
    """
    Parse a solution expression safely, handling common patterns like 'y(x) = expression'
    """
    if '=' in solution_str:
        # Split at the equals sign and take the right side
        solution_expr = solution_str.split('=', 1)[1].strip()
        
        try:
            # Try to parse the right-hand side expression
            x = sp.Symbol('x')
            C1, C2 = sp.symbols('C1 C2')
            expr = sp.sympify(solution_expr, locals={'x': x, 'C1': C1, 'C2': C2, 'exp': sp.exp})
            return expr
        except Exception as e:
            # If parsing fails, return a string representation
            return f"Could not parse '{solution_expr}': {str(e)}"
    else:
        # If there's no equals sign, try to parse the whole string
        try:
            return sp.sympify(solution_str)
        except Exception as e:
            return f"Could not parse '{solution_str}': {str(e)}"
