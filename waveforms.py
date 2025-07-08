WAVEFORMS = [
    {'id': 'sine', 'name': 'Sine Wave', 'description': 'Standard sinusoidal waveform'},
    {'id': 'square', 'name': 'Square Wave', 'description': 'Digital-style waveform with sharp transitions'},
    {'id': 'triangle', 'name': 'Triangle Wave', 'description': 'Linear rise and fall waveform'},
    {'id': 'sawtooth', 'name': 'Sawtooth Wave', 'description': 'Linear rise with sharp fall waveform'},
    {'id': 'custom', 'name': 'Custom Formula', 'description': 'Define your own waveform using mathematical expressions'}
]

def get_waveforms():
    """Return available waveform types with descriptions."""
    return {'waveforms': WAVEFORMS}
