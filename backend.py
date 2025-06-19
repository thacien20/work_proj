from flask import Flask, request, jsonify, send_from_directory
import numpy as np
import numexpr # Make sure numexpr is installed: pip install numexpr

# --- Configuration ---
STATIC_FOLDER = 'static' # Recommended: place index.html and other static files here
DEFAULT_FREQUENCY = 1.0
DEFAULT_POINTS = 1024
DEFAULT_NOISE = 0.1
MAX_POINTS = 100000 # Example limit to prevent excessive computation

app = Flask(__name__, static_folder=STATIC_FOLDER) # static_url_path will default to /static

# Ensure the static folder exists
import os
if not os.path.exists(STATIC_FOLDER):
    os.makedirs(STATIC_FOLDER)


@app.route('/')
def serve_index():
    """Serves the main HTML page."""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/signal', methods=['POST'])
def generate_signal():
    """Generates a signal based on parameters and returns its FFT."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid JSON payload'}), 400

        # Safely get parameters with default values
        frequency = float(data.get('frequency', DEFAULT_FREQUENCY))
        points = int(data.get('points', DEFAULT_POINTS))
        noise = float(data.get('noise', DEFAULT_NOISE))
        signal_type = data.get('signalType', 'sine').lower() # Convert to lowercase for consistent comparison
        custom_formula = data.get('customFormula', None)

        # --- Input validation ---
        if not (0 < points <= MAX_POINTS):
            return jsonify({'error': f'Invalid input: points must be between 1 and {MAX_POINTS}'}), 400
        if frequency <= 0:
            return jsonify({'error': 'Invalid input: frequency must be greater than 0'}), 400
        if not (0 <= noise <= 1):
            return jsonify({'error': 'Invalid input: noise must be between 0 and 1'}), 400

        t = np.arange(points) / points
        signal = np.zeros(points) # Initialize signal array

        if signal_type == 'sine':
            signal = np.sin(2 * np.pi * frequency * t)
        elif signal_type == 'square':
            signal = np.sign(np.sin(2 * np.pi * frequency * t))
        elif signal_type == 'triangle':
            signal = 2 * np.abs(2 * (t * frequency - np.floor(t * frequency + 0.5))) - 1
        elif signal_type == 'custom' and custom_formula and custom_formula.strip():
            # Define a safe dictionary of allowed functions and variables
            safe_dict = {
                't': t,
                'frequency': frequency,
                'pi': np.pi,
                'sin': np.sin,
                'cos': np.cos,
                'tan': np.tan, # Example: add more numpy functions if needed
                'sinh': np.sinh,
                'cosh': np.cosh,
                'tanh': np.tanh,
                'exp': np.exp,
                'log': np.log,
                'log10': np.log10,
                'sqrt': np.sqrt,
                'abs': np.abs,
                'sign': np.sign,
                'floor': np.floor,
                'ceil': np.ceil,
                'round': np.round
            }
            try:
                # Evaluate the custom formula. numexpr automatically handles the context.
                signal = numexpr.evaluate(custom_formula, local_dict=safe_dict)
                if signal.shape != t.shape:
                    return jsonify({'error': 'Custom formula did not produce a signal of the expected shape.'}), 400
            except Exception as e:
                return jsonify({'error': f'Error evaluating custom formula: {str(e)}'}), 400
        elif signal_type == 'custom': # Fallback for 'custom' if no formula or empty
            signal = np.sin(2 * np.pi * frequency * t) + 0.5 * np.sign(np.sin(2 * np.pi * frequency * t))
        else:
            # Default to sine if an unknown signal_type is provided
            signal = np.sin(2 * np.pi * frequency * t)


        # Add noise
        if noise > 0:
            signal += (np.random.rand(points) - 0.5) * noise

        # Apply Hamming window
        window = np.hamming(points)
        windowed_signal = signal * window

        # Zero-fill to twice the length
        zero_filled = np.zeros(2 * points)
        zero_filled[:points] = windowed_signal

        # Use rfft for real signals to optimize computation
        fft = np.fft.rfft(zero_filled)
        fft_magnitude = np.abs(fft)

        # Normalize FFT magnitude
        max_magnitude = np.max(fft_magnitude)
        if max_magnitude > 0:
            fft_magnitude /= max_magnitude
        # If max_magnitude is 0, fft_magnitude remains all zeros, which is correct.

        # Frequency axis for rfft
        freq_axis = np.fft.rfftfreq(len(zero_filled), d=1/points)

        return jsonify({
            'signal': signal.tolist(),
            'fft': fft_magnitude.tolist(),
            'freq_axis': freq_axis.tolist()
        }), 200 # OK

    except ValueError as ve:
        # Catch errors from float() or int() conversions
        return jsonify({'error': f'Invalid data type for input parameter: {str(ve)}'}), 400
    except KeyError as ke:
        # If expected JSON keys are missing (less likely with .get())
        return jsonify({'error': f'Missing required parameter: {str(ke)}'}), 400
    except Exception as e:
        # Catch any other unexpected errors
        app.logger.error(f"An unexpected error occurred: {e}", exc_info=True) # Log the full traceback
        return jsonify({'error': f'An internal server error occurred: {str(e)}'}), 500

if __name__ == '__main__':
    # For development, use Flask's built-in server.
    # For production, use a WSGI server like Gunicorn or uWSGI.
    print(f"Serving static files from: {os.path.abspath(STATIC_FOLDER)}")
    app.run(debug=True, host='0.0.0.0', port=5000)
    # In production, set debug=False and use a production WSGI server.
    # Example for Gunicorn: gunicorn -w 4 -b 0.0.0.0:5000 app:app