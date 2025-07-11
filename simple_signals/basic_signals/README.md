# Basic Signals Feature Documentation

## Overview
The Basic Signals feature is an educational module designed to help users understand fundamental signal types and their properties. This feature provides interactive signal generation, visualization, and comparison tools.

## Features

### 🔧 Signal Generation
- **Sine Wave**: Pure sinusoidal signals with adjustable frequency, amplitude, and phase
- **Square Wave**: Digital-like signals with sharp transitions
- **Triangle Wave**: Linear ramp signals with symmetric rise and fall
- **Sawtooth Wave**: Asymmetric ramp signals

### 📊 Visualization
- Real-time signal plotting using Plotly
- Interactive plots with zoom, pan, and hover functionality
- Signal property display (RMS, peak amplitude, frequency, etc.)
- Responsive design for mobile and desktop

### 📚 Educational Content
- Detailed signal information with formulas and applications
- Interactive learning with real-time parameter adjustment
- Signal comparison tools for understanding differences

### ⚖️ Signal Comparison
- Side-by-side comparison of multiple signal types
- Overlay plots for easy visual comparison
- Different frequencies and amplitudes support

## File Structure
```
features/basic_signals/
├── __init__.py                 # Package initialization
├── basic_signals_app.py        # Flask blueprint with API endpoints
├── static/
│   ├── css/
│   │   └── basic_signals.css   # Feature-specific styles
│   └── js/
│       └── basic_signals.js    # Frontend JavaScript logic
├── templates/
│   └── basic_signals.html      # Main HTML template
└── README.md                   # This documentation
```

## API Endpoints

### POST /basic_signals/api/generate
Generate a basic signal with specified parameters.

**Request Body:**
```json
{
    "signal_type": "sine|square|triangle|sawtooth",
    "frequency": 1.0,
    "amplitude": 1.0,
    "phase": 0.0,
    "duration": 2.0,
    "sample_rate": 100
}
```

**Response:**
```json
{
    "success": true,
    "signal": {
        "time": [0, 0.01, 0.02, ...],
        "amplitude": [0, 0.063, 0.125, ...],
        "type": "sine",
        "properties": {
            "peak_amplitude": 1.0,
            "rms_value": 0.707,
            "mean_value": 0.0,
            "period": 1.0,
            "frequency": 1.0,
            "sample_rate": 100,
            "duration": 2.0,
            "num_samples": 200
        }
    }
}
```

### GET /basic_signals/api/signal_info/{signal_type}
Get educational information about a specific signal type.

**Response:**
```json
{
    "success": true,
    "info": {
        "name": "Sine Wave",
        "description": "A smooth, periodic oscillation...",
        "formula": "y(t) = A * sin(2πft + φ)",
        "properties": ["Property 1", "Property 2", ...],
        "applications": ["Application 1", "Application 2", ...]
    }
}
```

### POST /basic_signals/api/compare
Generate multiple signals for comparison.

**Request Body:**
```json
{
    "signals": [
        {"type": "sine", "frequency": 1.0, "amplitude": 1.0, "phase": 0.0},
        {"type": "square", "frequency": 1.0, "amplitude": 1.0, "phase": 0.0}
    ],
    "duration": 2.0,
    "sample_rate": 100
}
```

## Usage

### Basic Signal Generation
1. Select signal type from dropdown
2. Adjust parameters (frequency, amplitude, phase, duration)
3. Click "Generate Signal" to create and plot the signal
4. View signal properties in the properties panel

### Signal Information
1. Select a signal type
2. Click the info button (ℹ️) to learn about the signal
3. View formula, properties, and applications

### Signal Comparison
1. Click "Compare Signals" to open comparison mode
2. Configure two different signals
3. Click "Generate Comparison" to overlay both signals
4. Compare visual differences and properties

## Technical Details

### Memory Management
- Automatic cleanup of Plotly plots to prevent memory leaks
- Debounced parameter updates to prevent excessive API calls
- Cleanup handlers for page navigation and tab switching

### Performance Optimizations
- Request throttling to prevent API spam
- Efficient signal generation using NumPy
- Responsive UI with proper loading indicators

### Browser Compatibility
- Modern browsers with JavaScript ES6+ support
- Plotly.js for cross-browser plotting compatibility
- Responsive CSS for mobile devices

## Dependencies

### Backend
- Flask (web framework)
- NumPy (signal generation)
- SciPy (advanced signal processing)

### Frontend
- Plotly.js (interactive plotting)
- Modern JavaScript (ES6+)
- CSS3 (styling and animations)

## Future Enhancements

### Phase 1 (Completed)
- [x] Basic signal generation
- [x] Interactive plotting
- [x] Signal properties display
- [x] Educational content

### Phase 2 (Future)
- [ ] Fourier analysis visualization
- [ ] Signal filtering demonstrations
- [ ] Audio playback of generated signals
- [ ] Signal export functionality

### Phase 3 (Future)
- [ ] Advanced signal types (chirp, modulated signals)
- [ ] Signal noise addition and analysis
- [ ] Signal processing operations (convolution, correlation)
- [ ] Interactive tutorials and guided exercises

## Contributing

When adding new features to this module:

1. **Backend**: Add new routes to `basic_signals_app.py`
2. **Frontend**: Update JavaScript in `basic_signals.js`
3. **Styling**: Add styles to `basic_signals.css`
4. **Documentation**: Update this README

### Code Style
- Follow PEP 8 for Python code
- Use meaningful variable names
- Add comprehensive comments
- Include error handling
- Write unit tests for new functionality

### Testing
- Test all signal types with various parameters
- Verify memory cleanup functionality
- Test responsive design on different devices
- Validate API endpoints with various inputs

## License
This feature is part of the Signal Processing Lab educational project.
