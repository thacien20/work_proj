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
});