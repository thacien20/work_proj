import numpy as np
from scipy import signal

def rlc_circuit_step_response(R=1000, L=1e-3, C=1e-6, V_in=1.0, duration=0.05, points=500):
    """
    Simulate the step response of a series RLC circuit (underdamped, critically damped, overdamped).
    Returns both voltage across capacitor and current through the circuit.
    Args:
        R (float): Resistance in Ohms
        L (float): Inductance in Henrys
        C (float): Capacitance in Farads
        V_in (float): Input step voltage
        duration (float): Duration of simulation in seconds
        points (int): Number of points in output
    Returns:
        t (np.ndarray): Time array
        V_out (np.ndarray): Output voltage across the capacitor
        I_out (np.ndarray): Output current through the circuit
    """
    if R <= 0 or L <= 0 or C <= 0 or duration <= 0 or points <= 1:
        raise ValueError("Invalid parameters for RLC circuit simulation.")
    num = [1]
    den = [L*C, R*C, 1]
    system = signal.TransferFunction(num, den)
    t = np.linspace(0, duration, points)
    tout, V_out = signal.step(system, T=t)
    V_out = V_in * V_out
    # Current: I(t) = C * dV/dt (since V_out is across C)
    dVdt = np.gradient(V_out, tout)
    I_out = C * dVdt
    return tout, V_out, I_out
