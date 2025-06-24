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
