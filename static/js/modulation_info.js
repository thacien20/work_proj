/**
 * Modulation Information Module
 * Contains educational content about AM, FM, and PM modulation
 */

const ModulationInfo = {
    AM: {
        name: 'Amplitude Modulation (AM)',
        description: 'A modulation technique where the amplitude of the carrier signal is varied in proportion to the modulating signal.',
        formula: 'y(t) = (1 + m·cos(2πf_m·t)) · cos(2πf_c·t)',
        modulationIndex: {
            definition: 'The modulation index (m) is the ratio of the amplitude of the modulating signal (A_m) to the amplitude of the carrier signal (A_c)',
            formula: 'm = A_m / A_c',
            range: '0 to 1 for proper AM without overmodulation',
            interpretation: [
                'A value of 1 (100%) means the carrier amplitude varies fully with the modulating signal',
                'Values > 1 cause distortion (overmodulation)',
                'Higher values produce deeper modulation but risk signal distortion'
            ]
        },
        characteristics: [
            'Simple to implement and demodulate',
            'Susceptible to noise and interference',
            'Used in AM radio broadcasting',
            'Requires less bandwidth than FM'
        ],
        applications: [
            'AM radio broadcasting (530-1700 kHz)',
            'Aviation communication',
            'Citizens band (CB) radio',
            'Some shortwave broadcasting'
        ],
        advantages: [
            'Simple receiver design',
            'Lower cost implementation',
            'Better range in some conditions',
            'Established infrastructure'
        ],
        disadvantages: [
            'Poor noise performance',
            'Susceptible to atmospheric interference',
            'Limited audio quality',
            'Inefficient power usage'
        ]
    },

    FM: {
        name: 'Frequency Modulation (FM)',
        description: 'A modulation technique where the frequency of the carrier signal is varied in proportion to the modulating signal.',
        formula: 'y(t) = cos(2πf_c·t + β·sin(2πf_m·t))',
        modulationIndex: {
            definition: 'The modulation index (β) is the ratio of the frequency deviation (Δf) caused by the modulating signal to the frequency of the modulating signal (f_m)',
            formula: 'β = Δf / f_m',
            range: 'Typically 0.5 to 5 for narrowband FM, >1 for wideband FM',
            interpretation: [
                'Δf is the maximum shift in the carrier frequency due to modulation',
                'A higher β indicates a wider bandwidth and more significant frequency variation',
                'β > 1 provides better signal-to-noise ratio but requires more bandwidth'
            ]
        },
        characteristics: [
            'Excellent noise immunity',
            'Constant amplitude carrier',
            'Requires more bandwidth than AM',
            'Better audio quality than AM'
        ],
        applications: [
            'FM radio broadcasting (88-108 MHz)',
            'Television audio',
            'Two-way radio communications',
            'Satellite communications'
        ],
        advantages: [
            'Excellent noise rejection',
            'High-quality audio reproduction',
            'Efficient power usage',
            'Less susceptible to interference'
        ],
        disadvantages: [
            'Requires more bandwidth',
            'More complex receiver design',
            'Limited range compared to AM',
            'Higher implementation cost'
        ]
    },

    PM: {
        name: 'Phase Modulation (PM)',
        description: 'A modulation technique where the phase of the carrier signal is varied in proportion to the modulating signal.',
        formula: 'y(t) = cos(2πf_c·t + β·cos(2πf_m·t))',
        modulationIndex: {
            definition: 'The modulation index is the phase deviation (in radians) caused by the modulating signal',
            formula: 'β = maximum phase deviation (radians)',
            range: 'Typically 0.5 to 5 radians',
            interpretation: [
                'Similar to FM but relates to phase changes rather than frequency',
                'Phase deviation is directly proportional to the modulating signal amplitude',
                'Higher β provides better signal-to-noise ratio'
            ]
        },
        characteristics: [
            'Similar noise performance to FM',
            'Constant amplitude carrier',
            'Phase changes proportional to modulating signal',
            'Often used in digital communications'
        ],
        applications: [
            'Digital communication systems',
            'Satellite communications',
            'Microwave links',
            'Some radio telemetry systems'
        ],
        advantages: [
            'Good noise immunity',
            'Efficient bandwidth usage',
            'Suitable for digital data transmission',
            'Constant envelope'
        ],
        disadvantages: [
            'Complex demodulation',
            'Requires phase-locked loops',
            'Sensitive to phase noise',
            'More expensive implementation'
        ]
    }
};

/**
 * Get modulation information by type
 * @param {string} type - Modulation type (AM, FM, PM)
 * @returns {Object} Modulation information object
 */
function getModulationInfo(type) {
    return ModulationInfo[type.toUpperCase()] || null;
}

/**
 * Get all modulation types
 * @returns {Array} Array of modulation type names
 */
function getModulationTypes() {
    return Object.keys(ModulationInfo);
}

/**
 * Format modulation information for display
 * @param {string} type - Modulation type
 * @returns {string} Formatted HTML string
 */
function formatModulationInfo(info) {
    if (!info) return '<p>Information not available</p>';

    return `
        <div class="modulation-content">
            <div class="close-button">×</div>
            <div class="modulation-info">
                <h3>${info.name}</h3>
                <p><strong>Description:</strong> ${info.description}</p>
                
                <div class="formula-section">
                    <h4>Mathematical Formula</h4>
                    <div class="formula-box">
                        <code>${info.formula}</code>
                    </div>
                </div>
                
                <div class="modulation-index-section">
                    <h4>Modulation Index</h4>
                    <p><strong>Definition:</strong> ${info.modulationIndex.definition}</p>
                    <div class="formula-box">
                        <code>${info.modulationIndex.formula}</code>
                    </div>
                    <p><strong>Range:</strong> ${info.modulationIndex.range}</p>
                    <ul>
                        ${info.modulationIndex.interpretation.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="characteristics-section">
                    <h4>Key Characteristics</h4>
                    <ul>
                        ${info.characteristics.map(char => `<li>${char}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="applications-section">
                    <h4>Applications</h4>
                    <ul>
                        ${info.applications.map(app => `<li>${app}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="pros-cons-section">
                    <div class="advantages">
                        <h4>Advantages</h4>
                        <ul>
                            ${info.advantages.map(adv => `<li>${adv}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="disadvantages">
                        <h4>Disadvantages</h4>
                        <ul>
                            ${info.disadvantages.map(dis => `<li>${dis}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ModulationInfo,
        getModulationInfo,
        getModulationTypes,
        formatModulationInfo
    };
}

// Make available globally
window.ModulationInfo = ModulationInfo;
window.getModulationInfo = getModulationInfo;
window.getModulationTypes = getModulationTypes;
window.formatModulationInfo = formatModulationInfo;

/**
 * Shows modulation information in a modal dialog
 * @param {string} modulationType - Type of modulation (AM, FM, PM)
 */
function showModulationInfo(modulationType) {
    // Get the info for this modulation type
    const info = ModulationInfo[modulationType];
    if (!info) {
        console.error(`No information available for modulation type: ${modulationType}`);
        return;
    }
    
    // Create modal container if it doesn't exist
    let modalContainer = document.getElementById('modulation-modal');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'modulation-modal';
        modalContainer.className = 'modulation-modal';
        document.body.appendChild(modalContainer);
    }
    
    // Set content and show modal
    modalContainer.innerHTML = formatModulationInfo(info);
    modalContainer.style.display = 'flex';
    
    // Add close button functionality
    const closeBtn = modalContainer.querySelector('.close-button');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modalContainer.style.display = 'none';
        });
    }
    
    // Close when clicking outside the content
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
            modalContainer.style.display = 'none';
        }
    });
    
    // Close on Escape key
    document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape') {
            modalContainer.style.display = 'none';
            document.removeEventListener('keydown', escapeHandler);
        }
    });
}

window.showModulationInfo = showModulationInfo;
