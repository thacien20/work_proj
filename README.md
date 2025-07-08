<<<<<<< HEAD
# Signal Processing Web App

This project is a web-based signal processing tool that allows users to generate, visualize, and analyze signals in both the time and frequency domains. It features interactive plotting, filtering, mathematical operations, overlays, and CSV import/export.

## Features

- **Signal Generation:** Create sine, square, triangle, or custom signals with adjustable frequency, sample points, and noise.
- **Interactive Visualization:** Zoom, pan, and overlay signals on time and frequency domain plots.
- **Filtering:** Apply low pass, high pass, band pass, and band stop filters.
- **Operations:** Add, subtract, multiply, or divide signals and constants.
- **Analysis:** Perform convolution, deconvolution, and correlation.
- **Import/Export:** Import and export signals as CSV files.

## Technologies Used

- **Frontend:** HTML, CSS, JavaScript (modular, with ES6 modules)
- **Backend:** Python (Flask, NumPy, Matplotlib)
- **Plotting:** Custom Canvas-based plotting in JS

## Getting Started

1. **Clone the repository:**
    ```sh
    git clone https://github.com/yourusername/signal-processing-webapp.git
    cd signal-processing-webapp
    ```

2. **Install Python dependencies:**
    ```sh
    pip install flask numpy matplotlib
    ```

3. **Run the backend:**
    ```sh
    python backend.py
    ```

4. **Open your browser and go to:**
    ```
    http://localhost:5000
    ```

## File Structure

- `appp.py` — Flask backend for signal processing and API endpoints
- config.py
- file_utils.py
- signal_processing.py
- waveforms.py
- `templates/index.html` — Main HTML page
- `static/js/` — JavaScript modules for UI.js, plotting.js, signal.js,state.js,
- `static/css/styles.css` — App styling
- `README.md` — Project documentation

## License

Copyright (c) [2025] [Willy Ngendahayo]. All rights reserved.

This software is not licensed for any use, modification, distribution, or reproduction. No permissions are granted to use this software without explicit written consent from the copyright holder.
=======
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
>>>>>>> 4d8d0f8ceb76834501167c5aa2d5435c12af6a56
