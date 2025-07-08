/**
 * memory_monitor.js
 * 
 * Standalone script to monitor JavaScript memory usage in the browser.
 * Can be easily included or removed from the project.
 * 
 * How to use:
 * 1. Include this script in your HTML: <script src="/static/js/memory_monitor.js"></script>
 * 2. The memory monitor will automatically initialize when loaded
 * 3. To remove monitoring, simply remove the script tag from your HTML
 */

(function() {
    // Configuration
    const MONITOR_CONFIG = {
        updateInterval: 2000,       // Update interval in milliseconds
        showDisplay: true,          // Show visual display in corner
        logToConsole: true,         // Log to console
        alertThreshold: 0.8,        // Alert when memory usage is above 80%
        position: 'bottom-right',   // Position of display: 'bottom-right', 'bottom-left', 'top-right', 'top-left'
        cleanupButton: true         // Add cleanup button to display
    };

    // References
    let memoryDisplay = null;
    let cleanupBtn = null;
    let updateTimer = null;
    
    // Initialize on load
    document.addEventListener('DOMContentLoaded', initialize);
    
    // Main initialization function
    function initialize() {
        console.log('Memory Monitor: Initializing');
        
        if (MONITOR_CONFIG.showDisplay) {
            createMemoryDisplay();
        }
        
        // Start monitoring
        updateMemoryInfo();
        updateTimer = setInterval(updateMemoryInfo, MONITOR_CONFIG.updateInterval);
        
        // Add event handler for the main cleanup button if it exists
        const mainCleanupBtn = document.getElementById('cleanupBtn');
        if (mainCleanupBtn) {
            console.log('Memory Monitor: Found existing cleanup button, connecting event handler');
            mainCleanupBtn.addEventListener('click', performCleanup);
        }
    }
    
    // Create visual memory display
    function createMemoryDisplay() {
        memoryDisplay = document.createElement('div');
        memoryDisplay.id = 'memory-monitor-display';
        
        // Apply styling based on position
        const posStyle = getPositionStyles(MONITOR_CONFIG.position);
        
        // Apply styles
        Object.assign(memoryDisplay.style, {
            position: 'fixed',
            background: 'rgba(0,0,0,0.75)',
            color: '#ffffff',
            padding: '8px 12px',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '12px',
            zIndex: '9999',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease',
            border: '1px solid rgba(255,255,255,0.2)',
            ...posStyle
        });
        
        // Add cleanup button if configured
        if (MONITOR_CONFIG.cleanupButton) {
            cleanupBtn = document.createElement('button');
            cleanupBtn.innerText = '🧹 Free Memory';
            cleanupBtn.title = 'Clear application state and free memory';
            
            Object.assign(cleanupBtn.style, {
                display: 'block',
                background: '#3498db',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                marginTop: '5px',
                fontSize: '11px',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'center',
                transition: 'background 0.2s'
            });
            
            cleanupBtn.addEventListener('mouseenter', () => {
                cleanupBtn.style.background = '#2980b9';
            });
            
            cleanupBtn.addEventListener('mouseleave', () => {
                cleanupBtn.style.background = '#3498db';
            });
            
            cleanupBtn.addEventListener('click', performCleanup);
            memoryDisplay.appendChild(cleanupBtn);
        }
        
        document.body.appendChild(memoryDisplay);
    }
    
    // Get position styles based on selected position
    function getPositionStyles(position) {
        switch (position) {
            case 'top-left':
                return { top: '10px', left: '10px' };
            case 'top-right':
                return { top: '10px', right: '10px' };
            case 'bottom-left':
                return { bottom: '10px', left: '10px' };
            case 'bottom-right':
            default:
                return { bottom: '10px', right: '10px' };
        }
    }
    
    // Update memory information
    function updateMemoryInfo() {
        const memoryStats = checkMemoryUsage();
        
        if (!memoryStats) {
            if (memoryDisplay) {
                memoryDisplay.innerHTML = 'Memory API not supported in this browser';
                if (cleanupBtn) memoryDisplay.appendChild(cleanupBtn);
            }
            return;
        }
        
        // Generate memory info HTML
        let memoryHTML = `
            <div>Memory: <span style="color:#${getColorForPercentage(memoryStats.percentUsed/100)}">${memoryStats.percentUsed}%</span></div>
            <div>${memoryStats.used} / ${memoryStats.limit} MB</div>
        `;
        
        // Update display if it exists
        if (memoryDisplay) {
            memoryDisplay.innerHTML = memoryHTML;
            if (cleanupBtn) memoryDisplay.appendChild(cleanupBtn);
            
            // Set warning border for high usage
            if (parseFloat(memoryStats.percentUsed) > MONITOR_CONFIG.alertThreshold * 100) {
                memoryDisplay.style.border = '1px solid rgba(255,0,0,0.5)';
                memoryDisplay.style.background = 'rgba(255,0,0,0.25)';
            } else {
                memoryDisplay.style.border = '1px solid rgba(255,255,255,0.2)';
                memoryDisplay.style.background = 'rgba(0,0,0,0.75)';
            }
        }
        
        // Log to console if configured
        if (MONITOR_CONFIG.logToConsole) {
            console.log(`Memory: ${memoryStats.used}/${memoryStats.limit} MB (${memoryStats.percentUsed}%)`);
        }
        
        // Alert if above threshold
        if (parseFloat(memoryStats.percentUsed) > MONITOR_CONFIG.alertThreshold * 100) {
            console.warn('Memory usage is high! Consider cleaning up unused data.');
        }
    }
    
    // Check memory usage
    function checkMemoryUsage() {
        if (performance && performance.memory) {
            const memory = performance.memory;
            
            // Total heap size limit in MB
            const memoryLimit = (memory.jsHeapSizeLimit / 1048576).toFixed(2);
            
            // Currently allocated heap size in MB
            const totalAllocated = (memory.totalJSHeapSize / 1048576).toFixed(2);
            
            // Currently used heap size in MB
            const usedMemory = (memory.usedJSHeapSize / 1048576).toFixed(2);
            
            return {
                limit: memoryLimit,
                allocated: totalAllocated,
                used: usedMemory,
                percentUsed: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(1)
            };
        } else {
            return null;
        }
    }
    
    // Get color based on percentage (green to red)
    function getColorForPercentage(pct) {
        const percentColors = [
            { pct: 0.0, color: { r: 0, g: 255, b: 0 } },
            { pct: 0.5, color: { r: 255, g: 255, b: 0 } },
            { pct: 1.0, color: { r: 255, g: 0, b: 0 } }
        ];
        
        for (let i = 1; i < percentColors.length - 1; i++) {
            if (pct < percentColors[i].pct) {
                let lower = percentColors[i - 1];
                let upper = percentColors[i];
                let range = upper.pct - lower.pct;
                let rangePct = (pct - lower.pct) / range;
                let pctLower = 1 - rangePct;
                let pctUpper = rangePct;
                
                let r = Math.floor(lower.color.r * pctLower + upper.color.r * pctUpper);
                let g = Math.floor(lower.color.g * pctLower + upper.color.g * pctUpper);
                let b = Math.floor(lower.color.b * pctLower + upper.color.b * pctUpper);
                
                return componentToHex(r) + componentToHex(g) + componentToHex(b);
            }
        }
        
        return "ff0000";
    }
    
    function componentToHex(c) {
        let hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }
    
    // Perform application cleanup
    function performCleanup() {
        console.log('Memory Monitor: Performing cleanup');
        
        // Try to clean up using state.js if available
        try {
            import('./state.js').then(stateModule => {
                if (typeof stateModule.clearState === 'function') {
                    stateModule.clearState();
                    console.log('Memory Monitor: State cleared successfully');
                    
                    // Purge plots if Plotly is available
                    if (window.Plotly && document.getElementById('plot')) {
                        Plotly.purge('plot');
                        console.log('Memory Monitor: Plotly plot purged');
                    }
                    
                    // Force garbage collection hint
                    setTimeout(() => {
                        updateMemoryInfo();
                    }, 500);
                } else {
                    console.warn('Memory Monitor: clearState function not found in state.js');
                }
            }).catch(err => {
                console.error('Memory Monitor: Error importing state.js:', err);
            });
        } catch (e) {
            console.error('Memory Monitor: Failed to perform cleanup:', e);
        }
        
        // Display cleanup notification
        const cleanupMsg = document.createElement('div');
        cleanupMsg.textContent = 'Memory Cleaned!';
        cleanupMsg.style.position = 'fixed';
        cleanupMsg.style.bottom = '50px';
        cleanupMsg.style.right = '10px';
        cleanupMsg.style.background = '#27ae60';
        cleanupMsg.style.color = 'white';
        cleanupMsg.style.padding = '10px';
        cleanupMsg.style.borderRadius = '5px';
        cleanupMsg.style.zIndex = '10000';
        cleanupMsg.style.animation = 'fadeInOut 2s forwards';
        
        // Add animation style
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translateY(20px); }
                20% { opacity: 1; transform: translateY(0); }
                80% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-20px); }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(cleanupMsg);
        
        // Remove notification after animation
        setTimeout(() => {
            document.body.removeChild(cleanupMsg);
        }, 2000);
    }
    
    // Clean up when the page unloads
    window.addEventListener('beforeunload', () => {
        if (updateTimer) {
            clearInterval(updateTimer);
        }
    });
})();
