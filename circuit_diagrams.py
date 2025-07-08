import matplotlib
matplotlib.use('Agg')
import schemdraw
import schemdraw.elements as elm
import os

def draw_rc_circuit(filename='static/diagrams/rc_circuit.png'):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with schemdraw.Drawing() as d:
        d += elm.SourceV().up().label('Vin')
        d += elm.Resistor().right().label('R')
        d += elm.Capacitor().down().label('C')
        d += elm.Line().left()
        d += elm.Ground()
        d.save(filename)

def draw_rl_circuit(filename='static/diagrams/rl_circuit.png'):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with schemdraw.Drawing() as d:
        d += elm.SourceV().up().label('Vin')
        d += elm.Resistor().right().label('R')
        d += elm.Inductor().down().label('L')
        d += elm.Line().left()
        d += elm.Ground()
        d.save(filename)

def draw_rlc_circuit(filename='static/diagrams/rlc_circuit.png'):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with schemdraw.Drawing() as d:
        d += elm.SourceV().up().label('Vin')
        d += elm.Resistor().right().label('R')
        d += elm.Inductor().right().label('L')
        d += elm.Capacitor().down().label('C')
        d += elm.Line().left()
        d += elm.Ground()
        d.save(filename)
