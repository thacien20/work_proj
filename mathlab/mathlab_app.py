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
    equation_str = equation_str.replace('^', '**')
    superscripts = {'²': '**2', '³': '**3', '⁴': '**4', '⁵': '**5', '⁶': '**6', '⁷': '**7', '⁸': '**8', '⁹': '**9'}
    for sup, repl in superscripts.items():
        equation_str = equation_str.replace(sup, repl)
    function_names = ['sin', 'cos', 'tan', 'exp', 'log', 'sqrt']
    for fname in function_names:
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
            if isinstance(result, dict):
                response_data = {
                    'solution': result['solution'],
                    'latex': convert_to_latex(result['solution']),
                    'expression': result.get('expression', ''),
                    'equation_type': result.get('equation_type', ''),
                    'has_crootof': result.get('has_crootof', False)
                }
                if result.get('note'):
                    response_data['note'] = result['note']
                return jsonify(response_data)
            else:
                return jsonify({'error': result})
                
        elif eq_type == 'differential':
            result = solve_differential(equation, data.get('variable', 'x'))
            if result.get('error'):
                return jsonify({
                    'error': result.get('error'),
                    'complexity': result.get('complexity')
                })
            if result.get('is_numerical'):
                return jsonify({
                    'solution': result.get('solution'),
                    'is_numerical': True,
                    'complexity': 'high',
                    'result': result.get('solution')
                })
            solution = result.get('solution', '')
            if solution and '=' in solution:
                const_pattern = r'C(\d+)'
                const_matches = re.findall(const_pattern, solution)
                constants = [f'C{i}' for i in const_matches]
                response_data = {
                    'solution': solution,
                    'latex': convert_to_latex(solution),
                    'constants': constants,
                    'result': solution
                }
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
            
    except Exception as e:
        return jsonify({'error': str(e)})

def solve_algebraic(equation_str):
    """Solve an algebraic equation using SymPy"""
    try:
        equation_str = preprocess_equation(equation_str)
        x = sp.symbols('x')
        if '=' in equation_str:
            left, right = equation_str.split('=')
            eq = sp.Eq(sp.sympify(left.strip()), sp.sympify(right.strip()))
            solution = sp.solve(eq, x)
            expr = sp.sympify(left.strip()) - sp.sympify(right.strip())
            solution_str, crootof_note, has_crootof = process_crootof_expressions(solution)
            result = {
                'solution': solution_str,
                'expression': str(expr),
                'equation_type': 'polynomial' if isinstance(expr, sp.Poly) or expr.is_polynomial() else 'general',
                'has_crootof': has_crootof
            }
            if crootof_note:
                result['note'] = crootof_note
            return result
        else:
            expr = sp.sympify(equation_str)
            solution = sp.simplify(expr)
            return {
                'solution': str(solution),
                'expression': str(expr),
            }
    except Exception as e:
        return f"Error: {str(e)}"

def solve_differential(equation_str, var='x'):
    """Solve a differential equation using SymPy"""
    try:
        equation_str = preprocess_equation(equation_str)
        x = sp.Symbol(var)
        y = sp.Function('y')
        y_func = y(x)
        if '=' not in equation_str:
            return {'error': "Differential equation must contain exactly one '=' sign"}
        if equation_str.count('=') > 1:
            return {'error': "Multiple equals signs detected. Differential equation should have form 'dy/dx = expression' or similar."}
        if 'dy/dx' not in equation_str.lower() and 'd²y/dx²' not in equation_str and 'derivative' not in equation_str.lower():
            return {'error': "Missing differential notation. For differential equations, use 'dy/dx = ...' format."}
        if equation_str.endswith('=0') and 'dy/dx' in equation_str and '=' in equation_str[:-2]:
            return {'error': "Invalid format. Please use 'dy/dx = expression' format instead of 'dy/dx = expression = 0'"}
        left, right = equation_str.split('=', 1)
        left = left.strip()
        right = right.strip()
        left = left.replace("d²y/dx²", "Derivative(y(x), x, 2)")
        left = left.replace("dy/dx", "Derivative(y(x), x)")
        right = right.replace("d²y/dx²", "Derivative(y(x), x, 2)")
        right = right.replace("dy/dx", "Derivative(y(x), x)")
        left = re.sub(r'(?<![a-zA-Z0-9_])\by(?!\()', 'y(x)', left)
        right = re.sub(r'(?<![a-zA-Z0-9_])\by(?!\()', 'y(x)', right)
        locals_dict = {
            'x': x,
            'y': y,
            'Derivative': sp.Derivative,
            'sin': sp.sin, 'cos': sp.cos, 'tan': sp.tan, 'exp': sp.exp, 'log': sp.log, 'sqrt': sp.sqrt
        }
        locals_dict['y(x)'] = y_func
        try:
            left_expr = sp.sympify(left, locals=locals_dict)
            right_expr = sp.sympify(right, locals=locals_dict)
        except Exception as parse_error:
            return {'error': f"Error parsing the differential equation: {str(parse_error)}\nPlease check your syntax."}
        diff_eq = sp.Eq(left_expr, right_expr)
        try:
            solution = sp.dsolve(diff_eq, y_func)
            if isinstance(solution, list):
                if not solution:
                    return {'error': 'Could not solve differential equation'}
                solution = solution[0]
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
        error_str = str(e)
        if "maximum recursion depth" in error_str:
            return {'error': "The differential equation is too complex to solve symbolically."}
        elif "could not parse" in error_str and equation_str.count('=') > 1:
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
        if lower_limit is not None and upper_limit is not None:
            try:
                from scipy import integrate as scipy_integrate
                f = sp.lambdify(x, expr, "numpy")
                result_val, error_est = scipy_integrate.quad(f, float(lower_limit), float(upper_limit))
                integral_expr = sp.Integral(expr, (x, float(lower_limit), float(upper_limit)))
                latex = sp.latex(integral_expr)
                result = f"{result_val} (Numerical integration, estimated error: {error_est:.2e})"
                return {
                    'result': result,
                    'latex': latex
                }
            except Exception as num_error:
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
            try:
                result = sp.integrate(expr, x)
                latex = sp.latex(result)
                return {
                    'result': str(result),
                    'latex': latex
                }
            except Exception as e:
                if "maximum recursion depth" in str(e):
                    return {'result': f"Error: Expression too complex for symbolic integration.", 'latex': ''}
                return {'result': f"Error: {str(e)}", 'latex': ''}
    except Exception as e:
        return {'result': f"Error: {str(e)}", 'latex': ''}

def calculate_derivative(data):
    """Calculate derivative of an expression and return both result and LaTeX"""
    try:
        expression_str = preprocess_equation(data.get('equation', ''))
        var = data.get('variable', 'x')
        order = int(data.get('order', 1))
        if '=' in expression_str:
            if expression_str.count('=') > 1:
                return {'result': "Error: Multiple equals signs detected.", 'latex': ''}
            if 'dy/dx' in expression_str or 'd/dx' in expression_str:
                return {'result': "Error: For derivative calculation, enter just the expression.", 'latex': ''}
            try:
                left, right = expression_str.split('=')
                expression_str = right.strip()
                expression_note = f"Note: Taking derivative of the right side: {expression_str}"
            except:
                return {'result': "Error: Invalid equation format.", 'latex': ''}
        if 'dy/dx' in expression_str or 'd/dx' in expression_str:
            return {'result': "Error: For derivative calculation, enter just the expression.", 'latex': ''}
        x = sp.Symbol(var)
        try:
            expr = sp.sympify(expression_str)
        except Exception as parse_error:
            return {'result': f"Error parsing the expression: {str(parse_error)}", 'latex': ''}
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
    try:
        if isinstance(expr_input, str):
            if len(expr_input) > 1000:
                return f"Expression too complex for LaTeX rendering (length: {len(expr_input)})"
            try:
                expr = sp.sympify(expr_input)
            except Exception as parse_err:
                return f"Could not render as LaTeX: {str(parse_err)[:100]}"
        else:
            expr = expr_input
        latex_result = sp.latex(expr, 
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
            simplified_latex = sp.latex(simplified_expr, 
                                      mode='inline',
                                      long_frac_ratio=2,
                                      mul_symbol='dot',
                                      fold_short_frac=True,
                                      fold_frac_powers=True,
                                      fold_func_brackets=True)
            if len(simplified_latex) > 2500:
                return f"LaTeX representation too complex (length: {len(latex_result)})."
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
    """Generate plot data for an equation (2D only)"""
    data = request.get_json()
    equation = preprocess_equation(data.get('equation', ''))
    eq_type = data.get('type', 'algebraic')
    try:
        x_min = float(data.get('xMin', -15))
        x_max = float(data.get('xMax', 15))
        points = int(data.get('points', 200))
        # Remove all root logic for algebraic equations
        x = np.linspace(x_min, x_max, points)
        if eq_type == 'algebraic':
            # Only plot the main function curve, no overlays or root markers
            y = evaluate_algebraic(equation, x)
            title = f"{equation}"
            single_root_warning = False
            y_values = np.array(y, dtype=np.float64)
            valid_indices = np.isfinite(y_values)
            x_filtered = x[valid_indices].tolist()
            y_filtered = y_values[valid_indices].tolist()
            filtered_percentage = (len(y_values) - np.sum(valid_indices)) / len(y_values) * 100 if len(y_values) > 0 else 0
            return jsonify({
                'x': x_filtered,
                'y': y_filtered,
                'title': title,
                'label': equation,
                'plotType': '2d',
                'hasComplex': False,
                'filteredPercentage': filtered_percentage,
                'singleRootWarning': single_root_warning
            })
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
                for sol in solutions:
                    y_values = np.array(sol['y'], dtype=np.float64)
                    valid_indices = np.isfinite(y_values)
                    x_filtered = x[valid_indices].tolist()
                    y_filtered = y_values[valid_indices].tolist()
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
                y_values = np.array(y, dtype=np.float64)
                valid_indices = np.isfinite(y_values)
                x_filtered = x[valid_indices].tolist()
                y_filtered = y_values[valid_indices].tolist()
                constants_str = ", ".join([f"{k} = {v:.2f}" for k, v in used_constants.items()])
                title = f"Solution to {equation}<br>with {constants_str}"
                root_points = []
        elif eq_type == 'integral':
            integral_result = calculate_integral(data)
            if 'error' in integral_result:
                return jsonify({'error': integral_result['result']})
            integral_expr = integral_result['result']
            y = evaluate_integral(integral_expr, x)
            y_values = np.array(y, dtype=np.float64)
            valid_indices = np.isfinite(y_values)
            x_filtered = x[valid_indices].tolist()
            y_filtered = y_values[valid_indices].tolist()
            title = f"Integral of {equation}"
        elif eq_type == 'derivative':
            original_expr_str = equation
            x_sym = sp.symbols('x')
            try:
                original_expr = sp.sympify(original_expr_str)
                derivative_expr = sp.diff(original_expr, x_sym)
                y_original = safe_lambdify(original_expr, x)
                y_derivative = safe_lambdify(derivative_expr, x)
            except Exception as e:
                return jsonify({'error': f"Error evaluating expressions for plotting: {str(e)}"})
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
        
        y_values = np.array(y, dtype=np.float64)
        valid_indices = np.isfinite(y_values)
        x_filtered = x[valid_indices].tolist()
        y_filtered = y_values[valid_indices].tolist()
        filtered_percentage = (len(y_values) - np.sum(valid_indices)) / len(y_values) * 100 if len(y_values) > 0 else 0
        return jsonify({
            'x': x_filtered,
            'y': y_filtered,
            'title': title,
            'label': equation,
            'plotType': '2d',
            'hasComplex': False,
            'filteredPercentage': filtered_percentage,
            'singleRootWarning': False
        })
    except Exception as e:
        return jsonify({'error': str(e)})

def safe_lambdify(expr, x_values):
    """
    Evaluate a sympy expression safely for plotting, handling sqrt and log for negative values.
    """
    x_sym = sp.symbols('x')
    f = sp.lambdify(x_sym, expr, modules=["numpy"])
    y = f(x_values)
    y = np.array(y, dtype=np.complex128)
    y = np.where(np.abs(y.imag) < 1e-8, y.real, np.nan)
    return y

def evaluate_algebraic(equation_str, x_values, roots=None):
    """Evaluate an algebraic expression for given x values and prepare vertical lines for real roots only."""
    try:
        equation_str = preprocess_equation(equation_str)
        if '=' in equation_str:
            left, right = equation_str.split('=')
            expr = sp.sympify(left.strip()) - sp.sympify(right.strip())
        else:
            expr = sp.sympify(equation_str.strip())
        x_sym = sp.symbols('x')
        f = sp.lambdify(x_sym, expr, 'numpy')
        y = f(x_values)
        return y
    except Exception as e:
        raise ValueError(f"Error evaluating expression: {str(e)}")

def evaluate_differential_solution(equation_str, x_values, constants_mode='auto', constants=None, family_params=None):
    """
    Evaluate the solution to a differential equation for given x values.
    """
    try:
        result = solve_differential(equation_str)
        if 'error' in result:
            raise ValueError(result['error'])
        solution = result.get('solution', '')
        if '=' not in solution:
            raise ValueError("Could not extract solution from differential equation")
        solution_expr = solution.split('=', 1)[1].strip()
        const_pattern = r'C(\d+)'
        const_matches = re.findall(const_pattern, solution_expr)
        const_names = [f'C{i}' for i in const_matches]
        x_sym = sp.symbols('x')
        if constants_mode == 'auto':
            auto_constants = {f'C{i}': random.uniform(-5, 5) for i in const_matches}
            for const_name, const_value in auto_constants.items():
                solution_expr = solution_expr.replace(const_name, str(const_value))
            try:
                y_expr = sp.sympify(solution_expr, locals={'x': x_sym, 'exp': sp.exp})
                f = sp.lambdify(x_sym, y_expr, 'numpy')
                y = f(x_values)
                y = np.array(y, dtype=np.complex128)
                y = np.where(np.abs(y.imag) < 1e-8, y.real, np.nan)
                return y, auto_constants
            except Exception as e:
                raise ValueError(f"Error parsing solution expression: {str(e)}")
        elif constants_mode == 'custom':
            if not constants:
                constants = {}
            for const_name in const_names:
                if const_name not in constants:
                    constants[const_name] = 1.0
            for const_name, const_value in constants.items():
                solution_expr = solution_expr.replace(const_name, str(const_value))
            try:
                y_expr = sp.sympify(solution_expr, locals={'x': x_sym, 'exp': sp.exp})
                f = sp.lambdify(x_sym, y_expr, 'numpy')
                y = f(x_values)
                y = np.array(y, dtype=np.complex128)
                y = np.where(np.abs(y.imag) < 1e-8, y.real, np.nan)
                return y, constants
            except Exception as e:
                raise ValueError(f"Error parsing solution expression: {str(e)}")
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
                try:
                    y_expr = sp.sympify(current_expr, locals={'x': x_sym, 'exp': sp.exp})
                    f = sp.lambdify(x_sym, y_expr, 'numpy')
                    y = f(x_values)
                    y = np.array(y, dtype=np.complex128)
                    y = np.where(np.abs(y.imag) < 1e-8, y.real, np.nan)
                    solutions.append({
                        'y': y,
                        'constant_value': value,
                        'constant_name': family_constant
                    })
                except Exception as e:
                    raise ValueError(f"Error parsing solution expression for {family_constant}={value}: {str(e)}")
            return solutions, family_params
        else:
            raise ValueError("Invalid constants mode")
    except Exception as e:
        raise ValueError(f"Error evaluating differential solution: {str(e)}")

def calculate_integral_for_plot(integral_expr_str, x_values):
    """
    Given the already computed indefinite integral expression as a string (e.g., 'C1 + sin(x)'),
    substitute C1=1 and evaluate at each x in x_values.
    Returns a NumPy array with real values or NaN for invalid points.
    """
    try:
        x_sym = sp.symbols('x')
        C1 = sp.Symbol('C1')
        expr = sp.sympify(integral_expr_str, locals={'x': x_sym, 'C1': C1, 'exp': sp.exp, 'sin': sp.sin, 'cos': sp.cos})
        expr = expr.subs(C1, 1)
        f = sp.lambdify(x_sym, expr, modules=['numpy'])
        y = f(x_values)
        y = np.array(y, dtype=np.complex128)
        y = np.where(np.abs(y.imag) < 1e-8, y.real, np.nan)
        return y
    except Exception as e:
        raise ValueError(f"Error evaluating integral expression '{integral_expr_str}': {str(e)}")

def evaluate_integral(integral_expr_str, x_values):
    """
    For plotting: use the integral expression string (not the original function), plug in x values.
    """
    return calculate_integral_for_plot(integral_expr_str, x_values)

def find_special_points(equation_str, x_min, x_max):
    """Find roots and critical points of a function"""
    special_points = []
    try:
        x = sp.symbols('x')
        if '=' in equation_str:
            left, right = equation_str.split('=')
            expr = sp.sympify(left.strip()) - sp.sympify(right.strip())
        else:
            expr = sp.sympify(equation_str.strip())
        try:
            roots = sp.solve(expr, x)
            for root in roots:
                if root.is_real and x_min <= float(root) <= x_max:
                    special_points.append({
                        'x': float(root),
                        'y': 0,
                        'label': 'Root',
                        'color': '#e74c3c',
                        'showlegend': False
                    })
        except:
            pass
        try:
            derivative = sp.diff(expr, x)
            critical_points = sp.solve(derivative, x)
            for cp in critical_points:
                if cp.is_real and x_min <= float(cp) <= x_max:
                    y_value = expr.subs(x, cp)
                    special_points.append({
                        'x': float(cp),
                        'y': float(y_value),
                        'label': 'Critical Point',
                        'color': '#3498db',
                        'showlegend': False
                    })
        except:
            pass
        return special_points
    except:
        return []

def process_crootof_expressions(solution, numerical=True):
    """
    Process CRootOf expressions in a solution to make them more user-friendly
    """
    solution_str = str(solution)
    if 'CRootOf' not in solution_str:
        return solution_str, None, False
    explanation = (
        "Note: CRootOf expressions represent the roots of a polynomial that cannot be expressed "
        "in closed form using radicals. Numerical approximations are provided."
    )
    if not numerical:
        return solution_str, explanation, True
    try:
        if isinstance(solution, list):
            numerical_roots = []
            for root in solution:
                if hasattr(root, 'evalf'):
                    num_value = complex(root.evalf(6))
                    if abs(num_value.imag) < 1e-10:
                        numerical_roots.append(f"{float(num_value.real):.6f}")
                    else:
                        numerical_roots.append(f"{num_value.real:.6f} + {num_value.imag:.6f}i")
                else:
                    numerical_roots.append(str(root))
            numerical_solution = f"[{', '.join(numerical_roots)}]"
            return numerical_solution, explanation, True
        else:
            if hasattr(solution, 'evalf'):
                return str(solution.evalf(6)), explanation, True
            else:
                return solution_str, explanation, True
    except Exception as e:
        print(f"Error converting CRootOf to numerical: {e}")
        return solution_str, explanation, True

# Ensure this is at the bottom of the file and NOT inside any function or conditional
# This allows 'from .mathlab_app import mathlab_bp' to work for Flask blueprints
#__all__ = ['mathlab_bp']