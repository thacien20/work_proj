import numpy as np
from scipy import signal
from rlc import rlc_circuit_step_response

def rc_circuit_step_response(R=1000, C=1e-6, V_in=1.0, duration=0.05, points=500):
    """
    Simulate the step response of an RC circuit.
    Args:
        R (float): Resistance in Ohms
        C (float): Capacitance in Farads
        V_in (float): Input step voltage
        duration (float): Duration of simulation in seconds
        points (int): Number of points in output
    Returns:
        t (np.ndarray): Time array
        V_out (np.ndarray): Output voltage array
    """
    if R <= 0 or C <= 0 or duration <= 0 or points <= 1:
        raise ValueError("Invalid parameters for RC circuit simulation.")
    num = [1]
    den = [R*C, 1]
    system = signal.TransferFunction(num, den)
    t = np.linspace(0, duration, points)
    tout, V_out = signal.step(system, T=t)
    V_out = V_in * V_out
    return tout, V_out

def rl_circuit_step_response(R=1000, L=1e-3, V_in=1.0, duration=0.05, points=500):
    """
    Simulate the step response of an RL circuit.
    Args:
        R (float): Resistance in Ohms
        L (float): Inductance in Henrys
        V_in (float): Input step voltage
        duration (float): Duration of simulation in seconds
        points (int): Number of points in output
    Returns:
        t (np.ndarray): Time array
        I_out (np.ndarray): Output current array
    """
    if R <= 0 or L <= 0 or duration <= 0 or points <= 1:
        raise ValueError("Invalid parameters for RL circuit simulation.")
    num = [1]
    den = [L, R]
    system = signal.TransferFunction(num, den)
    t = np.linspace(0, duration, points)
    tout, I_out = signal.step(system, T=t)
    I_out = V_in * I_out
    return tout, I_out

def rlc_circuit_step_response(R=1000, L=1e-3, C=1e-6, V_in=1.0, duration=0.05, points=500):
    from rlc import rlc_circuit_step_response as rlc_func
    return rlc_func(R, L, C, V_in, duration, points)
