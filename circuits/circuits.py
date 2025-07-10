import numpy as np
from scipy import signal

def rc_circuit_response(R=1000, C=1e-6, V_in=5.0, duration=0.01, points=1000):
    """RC circuit with defaults:
    R = 1kΩ, C = 1µF, V_in = 5V
    Time constant τ = RC = 1ms
    Duration = 10ms (10 time constants)
    """
    t = np.linspace(0, duration, points)
    V_out = V_in * (1 - np.exp(-t / (R * C)))
    I_out = (V_in / R) * np.exp(-t / (R * C))
    print("RC I_out sample:", I_out[:5])  # Debug: print first 5 current values
    return t, V_out, I_out

def rl_circuit_response(R=100, L=0.1, V_in=5.0, duration=0.01, points=1000):
    """RL circuit with defaults:
    R = 100Ω, L = 0.1H, V_in = 5V
    Time constant τ = L/R = 1ms
    Duration = 10ms (10 time constants)
    """
    t = np.linspace(0, duration, points)
    # For RL circuit, current is:
    # i(t) = (V_in/R)(1 - e^(-Rt/L))
    I_out = (V_in / R) * (1 - np.exp(-R * t / L))
    # Voltage across inductor: V_L = L*di/dt = V_in*e^(-Rt/L)
    # Voltage across resistor: V_R = R*i(t) = V_in(1 - e^(-Rt/L))
    V_out = V_in * (1 - np.exp(-R * t / L))  # This is correct - voltage across R
    return t, V_out, I_out

def rlc_circuit_response(R=100, L=0.5, C=10e-6, V_in=5.0, duration=0.05, points=1000):
    """RLC circuit with defaults for clear underdamped response:
    R = 100Ω (reduced resistance)
    L = 0.5H (increased inductance)
    C = 10µF (increased capacitance)
    V_in = 5V
    Natural frequency ω₀ = 1/√(LC) ≈ 1414 rad/s
    Damping ratio ζ = R/(2*√(L/C)) ≈ 0.112 (underdamped)
    Duration = 50ms (to see multiple oscillations)
    """
    t = np.linspace(0, duration, points)
    alpha = R / (2 * L)  # Damping factor
    omega_0 = 1 / np.sqrt(L * C)  # Natural frequency
    omega_d = np.sqrt(omega_0**2 - alpha**2)  # Damped frequency

    # Check if circuit is underdamped
    if omega_d > 0:
        V_out = V_in * np.exp(-alpha * t) * (
            np.cos(omega_d * t) + (alpha/omega_d) * np.sin(omega_d * t)
        )
        I_out = (V_in / (L * omega_d)) * np.exp(-alpha * t) * np.sin(omega_d * t)
    else:
        # Critically damped or overdamped case
        V_out = V_in * (1 - np.exp(-alpha * t))
        I_out = (V_in / R) * np.exp(-alpha * t)

    # Replace any NaN values with 0
    V_out = np.nan_to_num(V_out, 0.0)
    I_out = np.nan_to_num(I_out, 0.0)
    
    return t, V_out, I_out

def differentiator_circuit_response(R=1000, C=1e-6, V_in=5.0, duration=0.01, points=1000):
    """
    Practical op-amp differentiator with high-frequency roll-off
    R = 1kΩ, C = 1µF default
    Transfer function: H(s) = sRC/(1 + sRC/100)  # Added pole for stability
    """
    if R <= 0 or C <= 0 or duration <= 0 or points <= 1:
        raise ValueError("Invalid parameters for differentiator simulation.")
    
    # Use practical differentiator with frequency limiting
    RC = R * C
    num = [RC, 0]  # s*RC
    den = [RC/100, 1]  # 1 + s*RC/100 (pole at 100/RC Hz)
    
    system = signal.TransferFunction(num, den)
    t = np.linspace(0, duration, points)
    tout, V_out = signal.step(system, T=t)
    V_out = V_in * V_out
    V_out = np.nan_to_num(V_out, 0.0)  # Replace NaN with 0
    
    return tout, V_out

def integrator_circuit_response(R=1000, C=1e-6, V_in=5.0, duration=0.01, points=1000):
    """
    Practical op-amp integrator with DC feedback
    R = 1kΩ, C = 1µF default
    Transfer function: H(s) = -1/(sRC + 0.001)  # Added small term to prevent DC drift
    """
    if R <= 0 or C <= 0 or duration <= 0 or points <= 1:
        raise ValueError("Invalid parameters for integrator simulation.")
    
    # Use practical integrator with DC stability
    RC = R * C
    num = [-1]  # Negative for inverting configuration
    den = [RC, 0.001]  # sRC + small term for DC stability
    
    system = signal.TransferFunction(num, den)
    t = np.linspace(0, duration, points)
    tout, V_out = signal.step(system, T=t)
    V_out = V_in * V_out
    V_out = np.nan_to_num(V_out, 0.0)  # Replace NaN with 0
    
    return tout, V_out
    num = [1]
    den = [R*C, 0]
    system = signal.TransferFunction(num, den)
    t = np.linspace(0, duration, points)
    tout, V_out = signal.step(system, T=t)
    V_out = V_in * V_out
    return tout, V_out
     