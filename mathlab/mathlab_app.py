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
                return jsonify({
                    'solution': result['solution'],
                    'latex': convert_to_latex(result['solution']),
                    'roots': result.get('roots', []),
                    'expression': result.get('expression', ''),
                    'equation_type': result.get('equation_type', '')
                })
            else:
                # It's an error message
                return jsonify({'error': result})
                
        elif eq_type == 'differential':
            result = solve_differential(equation, data.get('variable', 'x'))
            
            # Extract constants from the solution
            solution = result.get('solution', '')
            if solution and '=' in solution:
                # Extract constants (C1, C2, etc.) from the solution
                import re
                const_pattern = r'C(\d+)'
                const_matches = re.findall(const_pattern, solution)
                constants = [f'C{i}' for i in const_matches]
                
                return jsonify({
                    'solution': solution,
                    'latex': convert_to_latex(solution),
                    'constants': constants,
                    'error': result.get('error')
                })
            else:
                return jsonify({
                    'error': result.get('error', 'Could not solve differential equation')
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
            
            # Convert solution to string list for display
            solution_str = str(solution)
            
            # Return additional data for enhanced plotting
            return {
                'solution': solution_str,
                'roots': [float(root) for root in solution if root.is_real],
                'expression': str(expr),
                'equation_type': 'polynomial' if isinstance(expr, sp.Poly) or expr.is_polynomial() else 'general'
            }
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

        # Parse the equation string and handle derivatives
        if '=' not in equation_str:
            return {'error': "Differential equation must contain '=' sign"}

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

        # Parse expressions
        left_expr = sp.sympify(left, locals=locals_dict)
        right_expr = sp.sympify(right, locals=locals_dict)

        # Create the equation
        diff_eq = sp.Eq(left_expr, right_expr)

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
        return {'error': f"An error occurred: {str(e)}"}


def calculate_integral(data):
    """Calculate indefinite or definite integral"""
    try:
        expression_str = preprocess_equation(data.get('equation', ''))
        var = data.get('variable', 'x')
        x = sp.Symbol(var)
        expr = sp.sympify(expression_str)
        
        lower_limit = data.get('lower_limit')
        upper_limit = data.get('upper_limit')

        if lower_limit is not None and upper_limit is not None:
            result = sp.integrate(expr, (x, float(lower_limit), float(upper_limit)))
        else:
            result = sp.integrate(expr, x)
            
        return str(result)
    except Exception as e:
        return f"Error: {str(e)}"

def calculate_derivative(data):
    """Calculate derivative of an expression"""
    try:
        expression_str = preprocess_equation(data.get('equation', ''))
        var = data.get('variable', 'x')
        order = int(data.get('order', 1))
        x = sp.Symbol(var)
        expr = sp.sympify(expression_str)
        
        result = sp.diff(expr, x, order)
        return str(result)
    except Exception as e:
        return f"Error: {str(e)}"

def convert_to_latex(expr_str):
    """Convert a string expression to LaTeX format"""
    try:
        expr = sp.sympify(expr_str)
        return sp.latex(expr)
    except:
        # If we can't convert to SymPy, return the original string
        return expr_str

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
        if roots and len(roots) >= 2:
            sorted_roots = sorted(roots)
            # Add padding around roots
            padding = (sorted_roots[-1] - sorted_roots[0]) * 0.2
            x_min = min(sorted_roots) - padding
            x_max = max(sorted_roots) + padding
        
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
            else:
                y = evaluate_algebraic(equation, x)
                root_points = []
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
            
            return jsonify({
                'x': x_filtered,
                'y': y_filtered,
                'title': title,
                'label': equation,
                'specialPoints': special_points,
                'roots': roots if roots else [],
                'plotType': '2d',
                'hasComplex': has_complex,
                'filteredPercentage': filtered_percentage
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
        
        # If roots are provided, adjust x_values range to focus on the region between roots
        if roots and len(roots) >= 2 and isinstance(roots, list):
            # Sort the roots
            sorted_roots = sorted(roots)
            # Add special points for the roots to the return value
            special_points = []
            for root in sorted_roots:
                special_points.append({
                    'x': float(root),
                    'y': 0,  # At roots, y is always 0
                    'label': f'Root: x = {root:.4f}',
                    'color': '#e74c3c',
                    'showlegend': False  # Ensure this point doesn't show in legend
                })
            return y, special_points
        
        return y
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
                y_expr = sp.sympify(solution_expr)
                f = sp.lambdify(x_sym, y_expr, 'numpy')
                
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
                y_expr = sp.sympify(solution_expr)
                f = sp.lambdify(x_sym, y_expr, 'numpy')
                
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
                    y_expr = sp.sympify(current_expr)
                    f = sp.lambdify(x_sym, y_expr, 'numpy')
                    
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
