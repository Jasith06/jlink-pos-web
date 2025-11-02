// js/scanner-listener.js - NEW FILE
class ScannerListener {
    constructor() {
        this.isListening = false;
        this.lastScanTime = 0;
        this.scanCheckInterval = null;
        this.currentUser = null;
    }

    setUser(user) {
        this.currentUser = user;
        console.log("✅ ScannerListener: User set", user?.email);
    }

    startListening() {
        if (this.isListening) return;

        console.log("🔍 Starting scanner listener...");
        this.isListening = true;

        // Check for new scans every 2 seconds
        this.scanCheckInterval = setInterval(() => {
            this.checkForNewScans();
        }, 2000);

        // Also listen for manual scanner triggers
        this.setupManualScannerHandler();
    }

    stopListening() {
        if (this.scanCheckInterval) {
            clearInterval(this.scanCheckInterval);
            this.scanCheckInterval = null;
        }
        this.isListening = false;
        console.log("🔍 Scanner listener stopped");
    }

    async checkForNewScans() {
        if (!this.currentUser || !window.database) return;

        try {
            // In a real implementation, you would check Firebase for new scans
            // For now, we'll simulate this with a global variable
            if (window.pendingScannerData && window.pendingScannerData.length > 0) {
                const scanData = window.pendingScannerData.shift();
                await this.processScannerData(scanData);
            }
        } catch (error) {
            console.log("Scanner check error:", error.message);
        }
    }

    async processScannerData(scanData) {
        console.log("📱 Processing scanner data:", scanData);

        if (!scanData.qr_code) {
            console.error("❌ No QR code in scanner data");
            return;
        }

        try {
            // Extract product code
            const productCode = this.extractProductCode(scanData.qr_code);
            console.log("🔍 Looking up product:", productCode);

            if (typeof productService !== 'undefined') {
                const product = await productService.findProductByCode(productCode);
                console.log("✅ Product found via scanner:", product);

                if (product.quantity <= 0) {
                    this.showScannerNotification(`${product.name} - Out of stock`, 'error');
                    return;
                }

                // Add to cart
                cartManager.addItem(product, 1);
                this.showScannerNotification(`Scanner: ${product.name} added to cart`, 'success');
                
                // Play success sound
                this.playSuccessSound();

            } else {
                throw new Error('Product service not available');
            }

        } catch (error) {
            console.error('❌ Scanner processing error:', error);
            this.showScannerNotification(`Scanner error: ${error.message}`, 'error');
        }
    }

    extractProductCode(qrData) {
        if (!qrData) return 'UNKNOWN';
        
        if (qrData.indexOf('|') === -1 && qrData.indexOf(':') === -1) {
            return qrData;
        }
        
        if (qrData.indexOf("PROD:") !== -1) {
            const start = qrData.indexOf("PROD:") + 5;
            const end = qrData.indexOf('|', start);
            return qrData.substring(start, end === -1 ? qrData.length : end);
        }
        
        if (qrData.indexOf('|') !== -1) {
            const parts = qrData.split('|');
            if (parts.length >= 5) {
                return parts[4];
            } else if (parts.length >= 1) {
                return parts[0];
            }
        }
        
        return qrData;
    }

    setupManualScannerHandler() {
        // Global function to receive scanner data from API
        window.handleScannerData = async (scannerData) => {
            console.log("📱 Scanner data received via API:", scannerData);
            await this.processScannerData(scannerData);
        };

        // Test function
        window.testScanner = (productCode = "RAPIDENE-001") => {
            console.log("🧪 Testing scanner with product:", productCode);
            const testData = {
                qr_code: productCode,
                product_code: productCode,
                scanner_id: "TEST_SCANNER",
                timestamp: Date.now()
            };
            window.handleScannerData(testData);
        };
    }

    showScannerNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? '#4CAF50' : 
                        type === 'error' ? '#f44336' : '#2196F3';
        const icon = type === 'success' ? '✅' : 
                    type === 'error' ? '❌' : '📱';

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            font-weight: bold;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
        `;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.2em;">${icon}</span>
                <div style="flex: 1;">
                    <div>${this.escapeHtml(message)}</div>
                    <div style="font-size: 0.8em; opacity: 0.9; margin-top: 4px;">
                        ${new Date().toLocaleTimeString()}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, 4000);
    }

    playSuccessSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (e) {
            console.log("Audio not supported");
        }
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Create global instance
const scannerListener = new ScannerListener();
