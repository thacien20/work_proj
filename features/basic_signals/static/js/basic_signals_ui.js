// Utility: clamp value between min and max
function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

document.addEventListener('DOMContentLoaded', function () {
    const phaseSpin = document.getElementById('phaseSpin');
    const generateBtn = document.getElementById('generateComparisonBtn');

    // Set the step to 0.5 degree for finer control
    if (phaseSpin) {
        phaseSpin.step = "0.5";
    }

    // Utility: convert degrees to radians
    function deg2rad(deg) {
        return deg * Math.PI / 180;
    }

    function triggerGenerateComparison() {
        const comparisonSection = document.getElementById('comparisonSection');
        if (generateBtn && comparisonSection && comparisonSection.style.display !== "none") {
            // Only trigger if not already loading
            if (!generateBtn.disabled) {
                generateBtn.click();
            }
        }
    }

    if (phaseSpin) {
        phaseSpin.addEventListener('input', function () {
            let val = parseFloat(phaseSpin.value);
            if (isNaN(val)) val = 0;
            val = clamp(val, -180, 180);
            phaseSpin.value = val;
            // Optionally, convert to radians and store/display if needed:
            // let radians = deg2rad(val);
            triggerGenerateComparison();
        });

        phaseSpin.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                setTimeout(triggerGenerateComparison, 0);
            }
        });
    }

    // Dropdown logic for FFT and Modulation
    function setupDropdown(dropdownBtnId, dropdownContentId) {
        const btn = document.getElementById(dropdownBtnId);
        const content = document.getElementById(dropdownContentId);

        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            // Hide all dropdowns first
            document.querySelectorAll('.dropdown-content').forEach(el => el.classList.remove('show'));
            // Toggle this one
            content.classList.toggle('show');
        });

        // Hide dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!btn.contains(e.target) && !content.contains(e.target)) {
                content.classList.remove('show');
            }
        });

        // Hide dropdown after making a selection
        content.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function() {
                content.classList.remove('show');
            });
        });
    }

    setupDropdown('fftDropdownBtn', 'fftDropdownContent');
    setupDropdown('modDropdownBtn', 'modDropdownContent');

    // Analyze dropdown logic
    const analyzeBtn = document.getElementById('analyzeComparisonBtn');
    const analyzeDropdown = document.getElementById('analyzeDropdownContent');
    const fftDropdownBtn = document.getElementById('fftDropdownBtn');
    const fftDropdown = document.getElementById('fftDropdownContent');
    const modDropdownBtn = document.getElementById('modDropdownBtn');
    const modDropdown = document.getElementById('modDropdownContent');

    analyzeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        // Hide other dropdowns
        fftDropdown.style.display = 'none';
        modDropdown.style.display = 'none';
        // Toggle analyze dropdown
        analyzeDropdown.style.display = (analyzeDropdown.style.display === 'block') ? 'none' : 'block';
    });

    // Show submenu on hover or click
    fftDropdownBtn.addEventListener('mouseenter', function() {
        fftDropdown.style.display = 'block';
        modDropdown.style.display = 'none';
    });
    fftDropdownBtn.addEventListener('click', function(e) {
        e.preventDefault();
        fftDropdown.style.display = (fftDropdown.style.display === 'block') ? 'none' : 'block';
        modDropdown.style.display = 'none';
    });

    modDropdownBtn.addEventListener('mouseenter', function() {
        modDropdown.style.display = 'block';
        fftDropdown.style.display = 'none';
    });
    modDropdownBtn.addEventListener('click', function(e) {
        e.preventDefault();
        modDropdown.style.display = (modDropdown.style.display === 'block') ? 'none' : 'block';
        fftDropdown.style.display = 'none';
    });

    // Hide all dropdowns when clicking outside
    document.addEventListener('click', function() {
        analyzeDropdown.style.display = 'none';
        fftDropdown.style.display = 'none';
        modDropdown.style.display = 'none';
    });

    // Hide dropdown after making a selection
    document.querySelectorAll('.dropdown-content a').forEach(link => {
        link.addEventListener('click', function() {
            analyzeDropdown.style.display = 'none';
            fftDropdown.style.display = 'none';
            modDropdown.style.display = 'none';
        });
    });
});