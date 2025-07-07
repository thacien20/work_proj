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

@mathlab_bp.route('/mathlab', strict_slashes=False)
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
            # result is now a dict with 'result' and 'latex'
            return jsonify({
                'solution': result['result'],
                'latex': result['latex'],
                'result': result['result']
            })
        elif eq_type == 'derivative':
            result = calculate_derivative(data)
            return jsonify({
                'solution': result['result'],
                'latex': result['latex'],
                'result': result['result']
            })
        else:
            return jsonify({'error': 'Invalid equation type'})
        # Handle other equation types that return strings
        if eq_type != 'algebraic' and eq_type != 'differential' and eq_type != 'integral':
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

        # Standard approach for all equations (no complexity check)
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
    """Calculate indefinite or definite integral and always return symbolic LaTeX"""
    try:
        expression_str = preprocess_equation(data.get('equation', ''))
        var = data.get('variable', 'x')
        x = sp.Symbol(var)
        expr = sp.sympify(expression_str)
        lower_limit = data.get('lower_limit')
        upper_limit = data.get('upper_limit')
        # For definite integrals, use numerical integration if limits are provided
        if lower_limit is not None and upper_limit is not None:
            try:
                from scipy import integrate as scipy_integrate
                import numpy as np
                f = sp.lambdify(x, expr, "numpy")
                result_val, error_est = scipy_integrate.quad(f, float(lower_limit), float(upper_limit))
                # Symbolic integral for LaTeX
                integral_expr = sp.Integral(expr, (x, float(lower_limit), float(upper_limit)))
                latex = sp.latex(integral_expr)
                result = f"{result_val} (Numerical integration, estimated error: {error_est:.2e})"
                return {
                    'result': result,
                    'latex': latex
                }
            except Exception as num_error:
                # If numerical integration fails, try symbolic
                try:
                    result = sp.integrate(expr, (x, float(lower_limit), float(upper_limit)))
                    integral_expr = sp.Integral(expr, (x, float(lower_limit), float(upper_limit)))
                    latex = sp.latex(integral_expr)
                    return {
                        'result': str(result),
                        'latex': latex
                    }
                except Exception as e:
                    return {'result': f"Error: {str(e)}", 'latex': ''}
        else:
            # For indefinite integrals or simple expressions, use symbolic integration
            try:
                result = sp.integrate(expr, x)
                latex = sp.latex(result)
                return {
                    'result': str(result),
                    'latex': latex
                }
            except Exception as e:
                if "maximum recursion depth" in str(e):
                    return {'result': f"Error: Expression too complex for symbolic integration. Try simplifying the expression.", 'latex': ''}
                return {'result': f"Error: {str(e)}", 'latex': ''}
    except Exception as e:
        return {'result': f"Error: {str(e)}", 'latex': ''}

def calculate_derivative(data):
    """Calculate derivative of an expression and return both result and LaTeX"""
    try:
        expression_str = preprocess_equation(data.get('equation', ''))
        var = data.get('variable', 'x')
        order = int(data.get('order', 1))
        # Check for common syntax errors
        if '=' in expression_str:
            if expression_str.count('=') > 1:
                return {'result': "Error: Multiple equals signs detected. For derivatives, please enter only the function to differentiate without setting it equal to anything.", 'latex': ''}
            if 'dy/dx' in expression_str or 'd/dx' in expression_str:
                return {'result': "Error: For derivative calculation, please enter just the expression to differentiate (without 'dy/dx =' or '= 0').", 'latex': ''}
            try:
                left, right = expression_str.split('=')
                expression_str = right.strip()
                expression_note = f"Note: Taking derivative of the right side: {expression_str}"
            except:
                return {'result': "Error: Invalid equation format. For derivatives, enter the expression without equals signs.", 'latex': ''}
        if 'dy/dx' in expression_str or 'd/dx' in expression_str:
            return {'result': "Error: For derivative calculation, please enter just the expression to differentiate without 'dy/dx' or 'd/dx'.", 'latex': ''}
        x = sp.Symbol(var)
        try:
            expr = sp.sympify(expression_str)
        except Exception as parse_error:
            return {'result': f"Error parsing the expression: {str(parse_error)}\nPlease check your syntax and ensure you're entering a valid mathematical expression.", 'latex': ''}
        result = sp.diff(expr, x, order)
        result_str = str(result)
        latex = sp.latex(result)
        if 'expression_note' in locals():
            result_str = f"{result_str}\n({expression_note})"
        return {'result': result_str, 'latex': latex}
    except Exception as e:
        return {'result': f"Error: {str(e)}", 'latex': ''}

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
    """Generate plot data for an equation (2D only, 3D and complex plane removed)"""
    data = request.get_json()
    equation = preprocess_equation(data.get('equation', ''))
    eq_type = data.get('type', 'algebraic')
    # Only support 2D plots now
    try:
        # Set new defaults: xMin = -15, xMax = 15, points = 200
        x_min = float(data.get('xMin', -15))
        x_max = float(data.get('xMax', 15))
        points = int(data.get('points', 200))
        roots = data.get('roots', [])
        if roots:
            if len(roots) >= 2:
                sorted_roots = sorted(roots)
                padding = (sorted_roots[-1] - sorted_roots[0]) * 0.2
                x_min = min(sorted_roots) - padding
                x_max = max(sorted_roots) + padding
            elif len(roots) == 1:
                root = float(roots[0])
                x_min = root - 5
                x_max = root + 5
                single_root_approximation = True
        else:
            single_root_approximation = False
        x = np.linspace(x_min, x_max, points)
        if eq_type == 'algebraic':
            if roots:
                y, root_points = evaluate_algebraic(equation, x, roots)
                title = f"{equation}"
                single_root_warning = len(roots) == 1 and single_root_approximation
            else:
                y, root_points = evaluate_algebraic(equation, x)
                title = f"{equation}"
        elif eq_type == 'differential':
            constants_mode = data.get('constantsMode', 'auto')
            constants = data.get('constants', {})
            if constants_mode == 'family':
                family_params = {
                    'constant': data.get('familyConstant', 'C1'),
                    'min': float(data.get('familyMin', -5)),
                    'max': float(data.get('familyMax', 5)),
                    'count': int(data.get('familyCount', 5))
                }
                solutions, params = evaluate_differential_solution(equation, x, constants_mode=constants_mode, family_params=family_params)
                traces = []
                for i, sol in enumerate(solutions):
                    y_values = sol['y']
                    valid_indices = np.isfinite(y_values) & np.isreal(y_values)
                    x_filtered = x[valid_indices].tolist()
                    y_filtered = np.real(y_values[valid_indices]).tolist()
                    value = sol['constant_value']
                    constant_name = sol['constant_name']
                    trace = {
                        'x': x_filtered,
                        'y': y_filtered,
                        'mode': 'lines',
                        'name': f"{constant_name} = {value:.2f}",
                        'showlegend': True
                    }
                    traces.append(trace)
                zero_line = {
                    'x': x.tolist(),
                    'y': np.zeros_like(x).tolist(),
                    'mode': 'lines',
                    'line': {'dash': 'dash', 'color': 'gray'},
                    'name': 'y = 0',
                    'showlegend': False
                }
                traces.append(zero_line)
                title = f"Solution to {equation}<br>Family of solutions with {params['constant']} varying from {params['min']} to {params['max']}"
                return jsonify({
                    'traces': traces,
                    'title': title,
                    'is_family': True
                })
            else:
                y, used_constants = evaluate_differential_solution(equation, x, constants_mode=constants_mode, constants=constants)
                constants_str = ", ".join([f"{k} = {v:.2f}" for k, v in used_constants.items()])
                title = f"Solution to {equation}<br>with {constants_str}"
                root_points = []
        elif eq_type == 'integral':
            y = evaluate_integral(equation, x)
            root_points = []
            title = f"Integral of {equation}"
        elif eq_type == 'derivative':
            # Plot both the original expression and its derivative
            original_expr_str = equation
            x_sym = sp.symbols('x')
            try:
                original_expr = sp.sympify(original_expr_str)
                derivative_expr = sp.diff(original_expr, x_sym)
                y_original = safe_lambdify(original_expr, x)
                y_derivative = safe_lambdify(derivative_expr, x)
            except Exception as e:
                return jsonify({'error': f"Error evaluating expressions for plotting: {str(e)}"})
            root_points = []
            title = f"Original: {original_expr_str}<br>Derivative: {sp.latex(derivative_expr)}"
            traces = [
                {
                    'x': x.tolist(),
                    'y': y_original.tolist(),
                    'mode': 'lines',
                    'name': 'Original',
                    'line': {'color': '#3182ce', 'width': 3}
                },
                {
                    'x': x.tolist(),
                    'y': y_derivative.tolist(),
                    'mode': 'lines',
                    'name': 'Derivative',
                    'line': {'color': '#e74c3c', 'width': 3, 'dash': 'dash'}
                }
            ]
            return jsonify({
                'traces': traces,
                'title': title,
                'plotType': '2d',
                'label': equation,
                'specialPoints': [],
                'roots': [],
                'hasComplex': not (np.all(np.isreal(y_original)) and np.all(np.isreal(y_derivative))),
                'filteredPercentage': 0,
                'singleRootWarning': False
            })
        else:
            return jsonify({'error': 'Invalid equation type'})
        # Only 2D plot supported
        if isinstance(y, tuple):
            y_values = y[0]
        else:
            y_values = y
        has_complex = not np.all(np.isreal(y_values))
        valid_indices = np.isfinite(y_values) & np.isreal(y_values)
        x_filtered = x[valid_indices].tolist()
        y_filtered = y_values[valid_indices].real.tolist() if hasattr(y_values, 'real') else y_values[valid_indices].tolist()
        filtered_percentage = 0 if len(y_values) == 0 else (len(y_values) - np.sum(valid_indices)) / len(y_values) * 100
        special_points = root_points if roots else find_special_points(equation, x_min, x_max)
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
    except Exception as e:
        return jsonify({'error': str(e)})

def safe_lambdify(expr, x_values):
    """
    Evaluate a sympy expression safely for plotting, handling sqrt and log for negative values.
    Returns real values where possible, NaN otherwise.
    """
    x_sym = sp.symbols('x')
    # Try to use numpy with complex support, but only return real part where imag is close to zero
    f = sp.lambdify(x_sym, expr, modules=["numpy"])
    y = f(x_values)
    # If result is complex, set values with significant imaginary part to NaN
    if np.iscomplexobj(y):
        y_real = np.real(y)
        y_imag = np.imag(y)
        # Set to NaN where imaginary part is significant (e.g., > 1e-8)
        y_real[np.abs(y_imag) > 1e-8] = np.nan
        return y_real
    return y

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

def evaluate_differential_solution(equation_str, x_values, constants_mode='auto', constants=None, family_params=None):
    """
    Evaluate the solution to a differential equation for given x values.
    Returns either (y, used_constants) or (solutions, family_params) for family mode.
    """
    try:
        # Solve the differential equation first
        result = solve_differential(equation_str)
        if 'error' in result:
            raise ValueError(result['error'])
        solution = result.get('solution', '')
        # Extract the solution function (assuming it's in the form y(x) = ...)
        if '=' in solution:
            solution_expr = solution.split('=', 1)[1].strip()
            # Extract constants (C1, C2, etc.) from the solution
            const_pattern = r'C(\d+)'
            import re
            const_matches = re.findall(const_pattern, solution_expr)
            const_names = [f'C{i}' for i in const_matches]
            # Handle constants based on mode
            if constants_mode == 'auto':
                import random
                auto_constants = {f'C{i}': random.uniform(-5, 5) for i in const_matches}
                for const_name, const_value in auto_constants.items():
                    solution_expr = solution_expr.replace(const_name, str(const_value))
                x_sym = sp.symbols('x')
                try:
                    y_expr = sp.sympify(solution_expr, locals={'x': x_sym, 'exp': sp.exp})
                    f = sp.lambdify(x_sym, y_expr, 'numpy')
                except Exception as e:
                    raise ValueError(f"Error parsing solution expression: {str(e)}")
                y = f(x_values)
                return y, auto_constants
            elif constants_mode == 'custom':
                if not constants:
                    constants = {}
                for const_name in const_names:
                    if const_name not in constants:
                        constants[const_name] = 1.0
                for const_name, const_value in constants.items():
                    solution_expr = solution_expr.replace(const_name, str(const_value))
                x_sym = sp.symbols('x')
                try:
                    y_expr = sp.sympify(solution_expr, locals={'x': x_sym, 'exp': sp.exp})
                    f = sp.lambdify(x_sym, y_expr, 'numpy')
                except Exception as e:
                    raise ValueError(f"Error parsing solution expression: {str(e)}")
                y = f(x_values)
                return y, constants
            elif constants_mode == 'family':
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
                family_values = np.linspace(family_min, family_max, family_count)
                default_constants = {const: 1.0 for const in const_names if const != family_constant}
                solutions = []
                for value in family_values:
                    current_expr = solution_expr
                    current_expr = current_expr.replace(family_constant, str(value))
                    for const_name, const_value in default_constants.items():
                        current_expr = current_expr.replace(const_name, str(const_value))
                    x_sym = sp.symbols('x')
                    try:
                        y_expr = sp.sympify(current_expr, locals={'x': x_sym, 'exp': sp.exp})
                        f = sp.lambdify(x_sym, y_expr, 'numpy')
                    except Exception as e:
                        raise ValueError(f"Error parsing solution expression: {str(e)}")
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
    """
    Given an indefinite integral expression (as a string), evaluate it at each x in x_values,
    substituting C1=1 if present. No integration is performed here; just plug in values.
    """
    try:
        # equation_str is the original function to integrate, not the integral itself
        expr = sp.sympify(preprocess_equation(equation_str))
        x_sym = sp.symbols('x')
        C1 = sp.Symbol('C1')
        # Compute the indefinite integral symbolically
        integral_expr = sp.integrate(expr, x_sym)
        # Substitute C1 with 1 if present
        integral_expr = integral_expr.subs(C1, 1)
        # Evaluate the integral expression at each x value
        y = []
        for val in x_values:
            try:
                y_val = float(integral_expr.subs(x_sym, float(val)))
            except Exception:
                y_val = float('nan')
            y.append(y_val)
        return y
    except Exception as e:
        raise ValueError(f"Error evaluating integral: {str(e)}")
