# Signal Processing Web Tool

## Overview
A web-based interactive tool for generating, visualizing, and analyzing signals (sine, square, triangle, custom). Features include:
- Signal generation with adjustable parameters (frequency, points, noise, type)
- Overlay and element-wise operations (add, subtract, multiply, divide)
- FFT computation and visualization
- Rectangle-draw zoom and pan for both time and frequency domains
- Export/import signals as CSV
- Clean, modern UI with robust error handling

## Features
- Generate and plot time-domain signals
- Plot FFT (frequency spectrum)
- Overlay signals for comparison
- Perform mathematical operations between signals
- Zoom and pan with mouse (rectangle-draw)
- Export/import signal data (CSV)
- Custom signal formula support

## Usage
1. Set signal parameters and click **Generate Signal**.
2. To compare, click **Add Overlay**, change parameters, and generate a new signal.
3. Use **Operations** to combine main and overlay signals.
4. Use mouse to zoom/pan; double-click to reset zoom.
5. Export or import signals as needed.

## Installation & Running
1. Clone the repo.
2. Install Python dependencies (Flask, numpy, etc.).
3. Run `python app.py` (or use `start_server.bat` on Windows).
4. Open your browser at `http://localhost:5000`.

## File Structure
- `app.py` — Flask backend
- `static/js/` — Frontend logic (UI, plotting, signal, state)
- `templates/index.html` — Main HTML UI
- `static/css/styles.css` — Styles
- `signal_processing.py` — Signal/FFT backend logic

## Requirements
- Python 3.x
- Flask
- numpy, scipy

## License
MIT (or your preferred license)
