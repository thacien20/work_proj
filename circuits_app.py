from flask import Blueprint, request, jsonify, render_template
from circuits import differentiator_circuit_response, integrator_circuit_response

circuits_blueprint = Blueprint('circuits', __name__)

@circuits_blueprint.route('/')
def circuits_home():
    """Main circuits analysis page"""
    return render_template('circuits.html')

@circuits_blueprint.route('/differentiator', methods=['POST'])
def simulate_differentiator():
    data = request.get_json()
    R = data.get('R', 1000)
    C = data.get('C', 1e-6)
    V_in = data.get('V_in', 1.0)
    duration = data.get('duration', 0.05)
    points = data.get('points', 500)
    t, V_out = differentiator_circuit_response(R, C, V_in, duration, points)
    return jsonify({'t': t.tolist(), 'V_out': V_out.tolist()})

@circuits_blueprint.route('/integrator', methods=['POST'])
def simulate_integrator():
    data = request.get_json()
    R = data.get('R', 1000)
    C = data.get('C', 1e-6)
    V_in = data.get('V_in', 1.0)
    duration = data.get('duration', 0.05)
    points = data.get('points', 500)
    t, V_out = integrator_circuit_response(R, C, V_in, duration, points)
    return jsonify({'t': t.tolist(), 'V_out': V_out.tolist()})
