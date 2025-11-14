class JLinkPOS {
    constructor() {
        this.currentUser = null;
        this.isProcessing = false;
        this.scannerAPIUrl = '';
        this.pollingUrl = '';
        this.authStateChecked = false;
        this.lastScanId = 0;
        this.pollInterval = null;
        this.isListening = false;
        this.pollingAttempts = 0;
        this.successfulPolls = 0;

        this.initializeApp();
    }

    initializeApp() {
        console.log("🚀 JLINK POS App Starting...");
        this.addDebugLog("🚀 JLINK POS App Starting...", "info");

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initAfterDOMReady();
            });
        } else {
            this.initAfterDOMReady();
        }
    }

    initAfterDOMReady() {
        console.log("📋 DOM Ready - Initializing app...");
        this.addDebugLog("📋 DOM Ready - Initializing app...", "info");
        
        setTimeout(() => {
            this.setupEventListeners();
            this.checkAuthState();
            this.setScannerAPIUrl();
            
            // Initialize EmailJS if available
            if (typeof emailjs !== 'undefined') {
                try {
                    emailjs.init("G4dKsQOK9_vg9Mi2o");
                    console.log("✅ EmailJS initialized");
                    this.addDebugLog("✅ EmailJS initialized", "success");
                } catch (emailError) {
                    console.warn("EmailJS init warning:", emailError);
                    this.addDebugLog("⚠️ EmailJS init warning", "warning");
                }
            }
            
            // Setup global scanner handler
            this.setupGlobalScannerHandler();
            
        }, 500);
    }

    setScannerAPIUrl() {
        const baseUrl = window.location.origin;
        this.scannerAPIUrl = `${baseUrl}/api/scanner`;
        this.pollingUrl = `${baseUrl}/api/get-scans`;
        console.log("📡 API URLs:", {
            scanner: this.scannerAPIUrl,
            polling: this.pollingUrl
        });
        this.addDebugLog(`📡 API URLs set - Scanner: ${this.scannerAPIUrl}`, "info");
    }

    setupGlobalScannerHandler() {
        // Global function to handle scanner data from ESP32
        window.handleScannerData = async (scannerData) => {
            console.log("📱 Scanner data received via global handler:", scannerData);
            this.addDebugLog(`📱 Scanner data received: ${scannerData.qr_code}`, "success");
            await this.processScannerInput(scannerData);
        };

        // Test function for manual testing
        window.testScanner = (productCode = "RAPIDENE-001") => {
            console.log("🧪 Testing scanner with product:", productCode);
            this.addDebugLog(`🧪 Testing scanner: ${productCode}`, "info");
            const testData = {
                qr_code: productCode,
                product_code: productCode,
                scanner_id: "TEST_SCANNER",
                timestamp: Date.now()
            };
            window.handleScannerData(testData);
        };

        console.log("✅ Global scanner handler setup complete");
        this.addDebugLog("✅ Global scanner handler setup complete", "success");
    }

    setupEventListeners() {
        console.log("🔧 Setting up event listeners...");
        this.addDebugLog("🔧 Setting up event listeners...", "info");
        
        // Login events
        const loginBtn = document.getElementById('loginBtn');
        const loginEmail = document.getElementById('loginEmail');
        const loginPassword = document.getElementById('loginPassword');
        
        if (loginBtn) loginBtn.addEventListener('click', () => this.handleLogin());
        if (loginEmail) loginEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        if (loginPassword) loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });

        // Logout event
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.handleLogout());

        // QR Scanner events
        const qrInput = document.getElementById('qrInput');
        if (qrInput) {
            qrInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleQRScan();
            });
        }

        // Manual add events
        const manualAddBtn = document.getElementById('manualAddBtn');
        if (manualAddBtn) manualAddBtn.addEventListener('click', () => this.showManualAddModal());

        const confirmManualAdd = document.getElementById('confirmManualAdd');
        if (confirmManualAdd) confirmManualAdd.addEventListener('click', () => this.handleManualAdd());

        const cancelManualAdd = document.getElementById('cancelManualAdd');
        if (cancelManualAdd) cancelManualAdd.addEventListener('click', () => this.hideManualAddModal());

        // Cart actions
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) checkoutBtn.addEventListener('click', () => this.handleCheckout());

        const clearCartBtn = document.getElementById('clearCartBtn');
        if (clearCartBtn) clearCartBtn.addEventListener('click', () => this.handleClearCart());

        const cancelLastBtn = document.getElementById('cancelLastBtn');
        if (cancelLastBtn) cancelLastBtn.addEventListener('click', () => this.handleCancelLastItem());

        // Cart updates
        if (typeof cartManager !== 'undefined') {
            cartManager.onCartUpdate((items, totals) => this.updateCartDisplay(items, totals));
        }

        console.log("✅ Event listeners setup complete");
        this.addDebugLog("✅ Event listeners setup complete", "success");
    }

    startPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }

        this.isListening = true;
        this.pollingAttempts = 0;
        this.successfulPolls = 0;

        console.log("🔍 Starting to poll for scanner data...");
        this.addDebugLog("🔍 Starting to poll for scanner data...", "info");

        // Poll immediately first time
        this.checkForNewScans();

        // Then poll every 3 seconds
        this.pollInterval = setInterval(() => {
            this.checkForNewScans();
        }, 3000);

        this.updateScannerStatus('🔍 Polling for scanner data...', 'processing');
        this.updateDebugElement('debugPollingStatus', 'Active ✅');
        this.updateScannerConnection('🟡 Polling Active');
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        this.isListening = false;
        console.log("🔍 Stopped polling for scanner data");
        this.addDebugLog("🔍 Stopped polling for scanner data", "info");
        this.updateDebugElement('debugPollingStatus', 'Stopped ❌');
        this.updateScannerConnection('🔴 Polling Stopped');
    }

    async checkForNewScans() {
        if (!this.currentUser || !this.isListening) {
            console.log("⚠️ Not listening - user not authenticated or polling stopped");
            return;
        }

        this.pollingAttempts++;
        
        try {
            console.log(`🔍 Polling attempt ${this.pollingAttempts} for new scans...`);
            
            const url = `${this.pollingUrl}?last_id=${this.lastScanId}&t=${Date.now()}`;
            console.log("📡 Polling URL:", url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            
            console.log("📡 Polling response:", {
                success: data.success,
                new_scans: data.data ? data.data.length : 0,
                total_scans: data.total_scans,
                last_id: data.last_id
            });
            
            if (data.success) {
                this.successfulPolls++;
                
                if (data.data && data.data.length > 0) {
                    console.log(`📱 Received ${data.data.length} new scans from server`);
                    this.addDebugLog(`📱 Received ${data.data.length} new scans`, "success");
                    
                    // Process each new scan
                    for (const scanData of data.data) {
                        await this.processScanData(scanData);
                    }
                    
                    // Update last ID
                    this.lastScanId = data.last_id;
                    this.updateScannerStatus(`✅ Real-time: ${data.data.length} new scans processed`, 'ready');
                    
                    // Update debug panel
                    this.updateDebugPanel(data);
                    
                } else {
                    console.log("📡 No new scans found");
                    if (this.pollingAttempts % 10 === 0) { // Log every 10th empty poll
                        this.addDebugLog("📡 No new scans found", "info");
                    }
                }
                
                this.updateScannerConnection('🟢 Connected - Polling Active');
                
            } else {
                throw new Error(data.error || 'Unknown API error');
            }

        } catch (error) {
            console.log("❌ Polling error:", error.message);
            this.addDebugLog(`❌ Polling error: ${error.message}`, "error");
            this.updateScannerStatus(`❌ Polling error: ${error.message}`, 'error');
            this.updateScannerConnection('🔴 Polling Error');
            
            // If we have too many errors, stop polling
            if (this.pollingAttempts - this.successfulPolls > 5) {
                this.addDebugLog("🛑 Too many polling errors, stopping...", "error");
                this.stopPolling();
            }
        }
    }

    async processScanData(scanData) {
        console.log("🔄 Processing scan data:", scanData);
        this.addDebugLog(`🔄 Processing scan: ${scanData.data?.product_code}`, "info");

        if (scanData.type === 'SCANNER_DATA' && scanData.data) {
            const scannerData = scanData.data;
            
            console.log("📱 Scanner data received:", scannerData);

            try {
                // Extract product code
                const productCode = scannerData.product_code || scannerData.qr_code;
                
                if (typeof productService !== 'undefined') {
                    const product = await productService.findProductByCode(productCode);
                    console.log("✅ Product found via real-time scan:", product);
                    this.addDebugLog(`✅ Product found: ${product.name}`, "success");

                    if (product.quantity <= 0) {
                        this.showNotification(`${product.name} - Out of stock`, 'error');
                        this.addDebugLog(`❌ Product out of stock: ${product.name}`, "error");
                        return;
                    }

                    // Add to cart
                    cartManager.addItem(product, 1);
                    this.showNotification(`🔗 SCANNER: ${product.name} added to cart`, 'success');
                    this.addDebugLog(`🛒 Added to cart: ${product.name}`, "success");
                    
                    // Play success sound
                    this.playSuccessSound();

                    // Update scanner connection status
                    this.updateScannerConnection('🟢 Scanner Active - Data Received');

                } else {
                    throw new Error('Product service not available');
                }

            } catch (error) {
                console.error('❌ Scan processing error:', error);
                this.addDebugLog(`❌ Scan processing error: ${error.message}`, "error");
                this.showNotification(`Scanner error: ${error.message}`, 'error');
            }
        }
    }

    async processScannerInput(scannerData) {
        if (this.isProcessing) {
            console.log("⚠️ Scanner: System busy, please wait");
            this.addDebugLog("⚠️ Scanner: System busy", "warning");
            return;
        }

        this.setProcessingState(true);
        this.updateScannerStatus('Processing scanner input...', 'processing');
        this.addDebugLog("🔄 Processing scanner input...", "info");

        try {
            console.log("🔍 Processing scanner data:", scannerData);
            
            let productCode = scannerData.qr_code || scannerData.product_code;
            
            if (!productCode) {
                throw new Error('No product code in scanner data');
            }

            console.log("🔍 Looking up product:", productCode);
            this.addDebugLog(`🔍 Looking up product: ${productCode}`, "info");
            
            if (typeof productService !== 'undefined') {
                const product = await productService.findProductByCode(productCode);
                console.log("✅ Product found:", product);
                this.addDebugLog(`✅ Product found: ${product.name}`, "success");

                if (product.quantity <= 0) {
                    this.updateScannerStatus(`Scanner: ${product.name} - Out of stock`, 'error');
                    this.showScanErrorNotification(`${product.name} is out of stock`);
                    this.addDebugLog(`❌ Product out of stock: ${product.name}`, "error");
                    return;
                }

                // Add to cart
                cartManager.addItem(product, 1);
                this.updateScannerStatus(`Scanner: ${product.name} added to cart`, 'ready');
                this.addDebugLog(`🛒 Added to cart: ${product.name}`, "success");
                
                // Play success sound
                this.playSuccessSound();

                // Show success notification
                this.showScanSuccessNotification(product.name);

                // Update scanner connection
                this.updateScannerConnection('🟢 Scanner Active - Manual');

            } else {
                throw new Error('Product service not available');
            }

        } catch (error) {
            console.error('❌ Scanner processing error:', error);
            this.addDebugLog(`❌ Scanner processing error: ${error.message}`, "error");
            this.updateScannerStatus(`Scanner error: ${error.message}`, 'error');
            this.showScanErrorNotification(error.message);
        } finally {
            this.setProcessingState(false);
        }
    }

    showScanSuccessNotification(productName) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            font-weight: bold;
            animation: slideInRight 0.3s ease;
        `;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.2em;">✅</span>
                <div>
                    <div>Product Added to Cart!</div>
                    <div style="font-size: 0.9em; opacity: 0.9;">${this.escapeHtml(productName)}</div>
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
        }, 3000);
    }

    showScanErrorNotification(errorMessage) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            font-weight: bold;
            animation: slideInRight 0.3s ease;
        `;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.2em;">❌</span>
                <div>
                    <div>Scan Error</div>
                    <div style="font-size: 0.9em; opacity: 0.9;">${this.escapeHtml(errorMessage)}</div>
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

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? '#4CAF50' : 
                        type === 'error' ? '#f44336' : '#2196F3';
        const icon = type === 'success' ? '✅' : 
                    type === 'error' ? '❌' : '📱';

        notification.style.cssText = `
            position: fixed;
            top: 80px;
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

    // Manual QR scan simulation
    handleQRScanManual(productCode) {
        const qrInput = document.getElementById('qrInput');
        if (qrInput) {
            qrInput.value = productCode;
            this.handleQRScan();
        }
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

    checkAuthState() {
        console.log("🔐 Checking authentication state...");
        this.addDebugLog("🔐 Checking authentication state...", "info");
        
        if (!window.auth) {
            console.error("❌ Firebase auth not available");
            this.addDebugLog("❌ Firebase auth not available", "error");
            this.showScreen('loginScreen');
            return;
        }

        window.auth.onAuthStateChanged((user) => {
            console.log("🔄 Auth state changed:", user ? user.email : "No user");
            this.addDebugLog(`🔄 Auth state: ${user ? user.email : "No user"}`, "info");
            this.authStateChecked = true;
            
            if (user) {
                this.handleAuthSuccess(user);
            } else {
                this.handleAuthFailure();
            }
        }, (error) => {
            console.error("❌ Auth state listener error:", error);
            this.addDebugLog(`❌ Auth state error: ${error.message}`, "error");
            this.authStateChecked = true;
            this.handleAuthFailure();
        });

        // Fallback check
        setTimeout(() => {
            if (!this.authStateChecked) {
                console.log("⏰ Auth state timeout - checking current user");
                this.addDebugLog("⏰ Auth state timeout", "warning");
                const currentUser = window.auth.currentUser;
                if (currentUser) {
                    this.handleAuthSuccess(currentUser);
                } else {
                    this.handleAuthFailure();
                }
                this.authStateChecked = true;
            }
        }, 2000);
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.updateScannerStatus('Please enter email and password', 'error');
            this.addDebugLog("❌ Missing email or password", "error");
            return;
        }

        this.setLoadingState(true);
        this.updateScannerStatus('Logging in...', 'processing');
        this.addDebugLog(`🔐 Logging in as: ${email}`, "info");

        try {
            console.log("🔐 Attempting login for:", email);
            
            if (!window.auth) {
                throw new Error('Authentication service not available');
            }

            const userCredential = await window.auth.signInWithEmailAndPassword(email, password);
            console.log('✅ Login successful:', userCredential.user.email);
            this.addDebugLog(`✅ Login successful: ${userCredential.user.email}`, "success");
            
        } catch (error) {
            this.setLoadingState(false);
            console.error('❌ Login error:', error);
            this.addDebugLog(`❌ Login error: ${error.message}`, "error");
            
            let errorMessage = 'Login failed';
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address';
            } else {
                errorMessage = error.message;
            }
            
            this.updateScannerStatus(`Login failed: ${errorMessage}`, 'error');
            alert(`Login failed: ${errorMessage}`);
        }
    }

    async handleLogout() {
        this.stopPolling();
        this.addDebugLog("🚪 Logging out...", "info");
        try {
            await window.auth.signOut();
            this.updateScannerStatus('Logged out successfully', 'ready');
            this.addDebugLog("✅ Logged out successfully", "success");
        } catch (error) {
            console.error('Logout error:', error);
            this.addDebugLog(`❌ Logout error: ${error.message}`, "error");
            this.updateScannerStatus('Logout failed', 'error');
        }
    }

    handleAuthSuccess(user) {
        console.log("✅ Authentication successful:", user.email);
        this.addDebugLog(`✅ Authentication successful: ${user.email}`, "success");
        this.currentUser = user;
        
        // Set user for services
        if (typeof productService !== 'undefined') {
            productService.setUser(user);
            this.addDebugLog("✅ Product service initialized", "success");
        }
        if (typeof salesService !== 'undefined') {
            salesService.setUser(user);
            this.addDebugLog("✅ Sales service initialized", "success");
        }

        // Update UI
        const currentUserElement = document.getElementById('currentUser');
        if (currentUserElement) {
            currentUserElement.textContent = user.email;
        }

        this.showScreen('posScreen');
        this.setLoadingState(false);
        
        // ✅ START POLLING FOR SCANNER DATA
        this.startPolling();

        // Focus on QR input
        setTimeout(() => {
            const qrInput = document.getElementById('qrInput');
            if (qrInput) {
                qrInput.focus();
            }
        }, 100);
        
        // Test API connection
        this.testApiConnection();
    }

    handleAuthFailure() {
        console.log("❌ No user authenticated");
        this.addDebugLog("❌ No user authenticated", "error");
        this.currentUser = null;
        this.showScreen('loginScreen');
        this.setLoadingState(false);
        this.updateScannerStatus('Please login to continue', 'ready');
    }

    async handleQRScan() {
        const qrInput = document.getElementById('qrInput');
        const productCode = qrInput.value.trim();

        if (!productCode) {
            this.updateScannerStatus('Please enter a product code', 'error');
            this.addDebugLog("❌ No product code entered", "error");
            return;
        }

        if (this.isProcessing) {
            this.addDebugLog("⚠️ System busy, please wait", "warning");
            return;
        }

        this.setProcessingState(true);
        this.updateScannerStatus('Searching for product...', 'processing');
        this.addDebugLog(`🔍 Manual search: ${productCode}`, "info");

        try {
            if (typeof productService === 'undefined') {
                throw new Error('Product service not available');
            }

            const product = await productService.findProductByCode(productCode);
            console.log("✅ Product found via manual entry:", product);
            this.addDebugLog(`✅ Product found: ${product.name}`, "success");

            if (product.quantity <= 0) {
                this.updateScannerStatus(`Product out of stock: ${product.name}`, 'error');
                this.addDebugLog(`❌ Product out of stock: ${product.name}`, "error");
                return;
            }

            cartManager.addItem(product, 1);
            this.updateScannerStatus(`Added: ${product.name}`, 'ready');
            this.addDebugLog(`🛒 Added to cart: ${product.name}`, "success");
            this.playSuccessSound();

            qrInput.value = '';
            setTimeout(() => qrInput.focus(), 100);

        } catch (error) {
            this.updateScannerStatus(`Error: ${error.message}`, 'error');
            this.addDebugLog(`❌ Manual search error: ${error.message}`, "error");
            console.error('QR scan error:', error);
        } finally {
            this.setProcessingState(false);
        }
    }

    showManualAddModal() {
        document.getElementById('manualAddModal').classList.add('active');
        document.getElementById('manualProductCode').focus();
        this.addDebugLog("📱 Manual add modal opened", "info");
    }

    hideManualAddModal() {
        document.getElementById('manualAddModal').classList.remove('active');
        document.getElementById('manualProductCode').value = '';
        document.getElementById('manualQuantity').value = '1';

        setTimeout(() => {
            document.getElementById('qrInput').focus();
        }, 100);
        
        this.addDebugLog("📱 Manual add modal closed", "info");
    }

    async handleManualAdd() {
        const productCode = document.getElementById('manualProductCode').value.trim();
        const quantity = parseInt(document.getElementById('manualQuantity').value) || 1;

        if (!productCode) {
            alert('Please enter a product code');
            this.addDebugLog("❌ No product code in manual add", "error");
            return;
        }

        this.setProcessingState(true);
        this.addDebugLog(`📱 Manual add: ${productCode} x${quantity}`, "info");

        try {
            if (typeof productService === 'undefined') {
                throw new Error('Product service not available');
            }

            const product = await productService.findProductByCode(productCode);

            if (product.quantity <= 0) {
                alert(`Product out of stock: ${product.name}`);
                this.addDebugLog(`❌ Product out of stock: ${product.name}`, "error");
                return;
            }

            cartManager.addItem(product, quantity);
            this.updateScannerStatus(`Added: ${product.name} x${quantity}`, 'ready');
            this.addDebugLog(`🛒 Manual add successful: ${product.name} x${quantity}`, "success");
            this.playSuccessSound();
            this.hideManualAddModal();

        } catch (error) {
            alert(`Error: ${error.message}`);
            this.addDebugLog(`❌ Manual add error: ${error.message}`, "error");
            console.error('Manual add error:', error);
        } finally {
            this.setProcessingState(false);
        }
    }

    updateCartDisplay(items, totals) {
        const cartItemsContainer = document.getElementById('cartItems');
        const itemCountElement = document.getElementById('itemCount');
        const cartValueElement = document.getElementById('cartValue');
        const subtotalElement = document.getElementById('subtotalAmount');
        const totalElement = document.getElementById('totalAmount');
        const cartBadge = document.getElementById('cartBadge');

        if (itemCountElement) itemCountElement.textContent = totals.itemCount;
        if (cartValueElement) cartValueElement.textContent = `LKR ${totals.total.toFixed(2)}`;
        if (subtotalElement) subtotalElement.textContent = `LKR ${totals.subtotal.toFixed(2)}`;
        if (totalElement) totalElement.textContent = `LKR ${totals.total.toFixed(2)}`;
        
        if (cartBadge) {
            if (totals.itemCount > 0) {
                cartBadge.textContent = totals.itemCount;
                cartBadge.style.display = 'inline-block';
            } else {
                cartBadge.style.display = 'none';
            }
        }

        if (!cartItemsContainer) return;

        if (items.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="cart-empty">
                    <div class="icon">🛒</div>
                    <div>Your cart is empty</div>
                    <div style="font-size: 0.9rem; margin-top: 0.5rem; color: #999;">
                        Scan QR codes to add items
                    </div>
                </div>
            `;
            return;
        }

        cartItemsContainer.innerHTML = items.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${this.escapeHtml(item.name)}</div>
                    <div class="cart-item-details">
                        LKR ${item.price.toFixed(2)} each
                        ${item.productCode ? ` • Code: ${item.productCode}` : ''}
                    </div>
                </div>
                <div class="cart-item-actions">
                    <div class="quantity-controls">
                        <button class="quantity-btn minus-btn" onclick="app.decreaseQuantity('${item.productId}')">-</button>
                        <span class="quantity-display">${item.quantity}</span>
                        <button class="quantity-btn" onclick="app.increaseQuantity('${item.productId}')">+</button>
                    </div>
                    <div style="text-align: right; min-width: 80px;">
                        <div class="cart-item-price">LKR ${item.total.toFixed(2)}</div>
                        <button class="remove-btn" onclick="app.removeItem('${item.productId}')">Remove</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    removeItem(productId) {
        cartManager.removeItem(productId);
        this.addDebugLog(`🗑️ Removed item: ${productId}`, "info");
    }

    increaseQuantity(productId) {
        const items = cartManager.getItems();
        const item = items.find(i => i.productId === productId);
        if (item) {
            cartManager.updateQuantity(productId, item.quantity + 1);
            this.addDebugLog(`➕ Increased quantity: ${item.name}`, "info");
        }
    }

    decreaseQuantity(productId) {
        const items = cartManager.getItems();
        const item = items.find(i => i.productId === productId);
        if (item) {
            cartManager.updateQuantity(productId, item.quantity - 1);
            this.addDebugLog(`➖ Decreased quantity: ${item.name}`, "info");
        }
    }

    async handleCheckout() {
        if (cartManager.isEmpty()) {
            alert('Cart is empty!');
            this.addDebugLog("❌ Checkout failed: Cart empty", "error");
            return;
        }

        const customerEmail = document.getElementById('customerEmail').value.trim();
        if (!customerEmail) {
            alert('Please enter customer email');
            document.getElementById('customerEmail').focus();
            this.addDebugLog("❌ Checkout failed: No customer email", "error");
            return;
        }

        if (!this.validateEmail(customerEmail)) {
            alert('Please enter a valid email address');
            document.getElementById('customerEmail').focus();
            this.addDebugLog("❌ Checkout failed: Invalid email", "error");
            return;
        }

        const totals = cartManager.getTotals();
        const customerName = document.getElementById('customerName').value.trim();

        if (!confirm(`Complete sale for LKR ${totals.total.toFixed(2)} to ${customerEmail}?\n\nThis will:\n• Send email receipt to customer\n• Update inventory quantities\n• Record sale in mobile app`)) {
            this.addDebugLog("❌ Checkout cancelled by user", "info");
            return;
        }

        this.setProcessingState(true);
        this.updateScannerStatus('Processing sale...', 'processing');
        this.addDebugLog(`💰 Processing sale: LKR ${totals.total.toFixed(2)}`, "info");

        try {
            const saleData = {
                customerEmail: customerEmail,
                customerName: customerName,
                items: cartManager.getItems(),
                totals: totals,
                profit: cartManager.calculateProfit(),
                timestamp: new Date().toISOString()
            };

            let saleId = 'DEMO-' + Date.now();
            
            if (typeof salesService !== 'undefined') {
                saleId = await salesService.processSale(saleData);
                console.log("✅ Sale recorded in database:", saleId);
                this.addDebugLog(`✅ Sale recorded: ${saleId}`, "success");
            }
            
            saleData.saleId = saleId;

            // Send email receipt
            this.updateScannerStatus('Sending email receipt...', 'processing');
            this.addDebugLog("📧 Sending email receipt...", "info");
            let emailSent = false;
            
            if (typeof emailService !== 'undefined') {
                emailSent = await emailService.sendReceiptEmail(customerEmail, saleData);
                console.log("✅ Email sent:", emailSent);
                this.addDebugLog(`✅ Email sent: ${emailSent}`, "success");
            }

            let successMessage = `Sale #${saleId} completed successfully!\nTotal: LKR ${totals.total.toFixed(2)}`;
            if (emailSent) {
                successMessage += `\nReceipt sent to ${customerEmail}`;
            } else {
                successMessage += `\n(Email receipt failed to send)`;
            }

            this.showSuccessAnimation(successMessage);
            this.addDebugLog(`🎉 Sale completed: ${saleId}`, "success");
            console.log("🎉 Checkout completed successfully");

            // Reset for next customer
            setTimeout(() => {
                cartManager.clearCart();
                document.getElementById('customerEmail').value = '';
                document.getElementById('customerName').value = '';
                this.updateScannerStatus('Ready for next customer!', 'ready');
                this.addDebugLog("🔄 Reset for next customer", "info");
            }, 3000);

        } catch (error) {
            console.error('Checkout error:', error);
            this.addDebugLog(`❌ Checkout error: ${error.message}`, "error");
            this.updateScannerStatus(`Checkout failed: ${error.message}`, 'error');
            alert(`Checkout failed: ${error.message}`);
        } finally {
            this.setProcessingState(false);
        }
    }

    handleClearCart() {
        if (cartManager.isEmpty()) {
            this.addDebugLog("🛒 Clear cart: Already empty", "info");
            return;
        }

        if (confirm('Clear all items from cart?')) {
            cartManager.clearCart();
            this.updateScannerStatus('Cart cleared', 'ready');
            this.addDebugLog("🗑️ Cart cleared", "info");
        } else {
            this.addDebugLog("🗑️ Clear cart cancelled", "info");
        }
    }

    handleCancelLastItem() {
        const beforeCount = cartManager.getItems().length;
        cartManager.cancelLastItem();
        const afterCount = cartManager.getItems().length;
        
        if (afterCount < beforeCount) {
            this.updateScannerStatus('Last item removed', 'ready');
            this.addDebugLog("🗑️ Last item removed", "info");
        } else {
            this.addDebugLog("🗑️ No items to remove", "info");
        }
    }

    showSuccessAnimation(message) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(76, 201, 240, 0.95);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            color: white;
            font-size: 1.5rem;
            text-align: center;
            backdrop-filter: blur(10px);
        `;

        overlay.innerHTML = `
            <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
            <div style="font-weight: bold; margin-bottom: 1rem;">Sale Completed!</div>
            <div style="font-size: 1.2rem; max-width: 400px; line-height: 1.5; white-space: pre-line;">${message}</div>
            <div style="margin-top: 2rem; font-size: 1rem; opacity: 0.8;">Automatically continuing...</div>
        `;

        document.body.appendChild(overlay);

        setTimeout(() => {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        }, 4000);
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
        } else {
            console.error('Screen not found:', screenId);
            this.addDebugLog(`❌ Screen not found: ${screenId}`, "error");
        }
    }

    updateScannerStatus(message, type = 'ready') {
        const statusElement = document.getElementById('scannerStatus');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `scanner-status ${type}`;
        }
    }

    updateScannerConnection(status) {
        const connectionElement = document.getElementById('scannerConnection');
        if (connectionElement) {
            connectionElement.textContent = status;
        }
    }

    setLoadingState(loading) {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            if (loading) {
                loginBtn.innerHTML = '<div class="loading"></div> Logging in...';
                loginBtn.disabled = true;
            } else {
                loginBtn.innerHTML = 'Login to POS';
                loginBtn.disabled = false;
            }
        }
    }

    setProcessingState(processing) {
        this.isProcessing = processing;
        const qrInput = document.getElementById('qrInput');
        const manualBtn = document.getElementById('manualAddBtn');

        if (qrInput) {
            if (processing) {
                qrInput.disabled = true;
                qrInput.placeholder = 'Processing...';
            } else {
                qrInput.disabled = false;
                qrInput.placeholder = 'Scan QR Code or Enter Product Code';
            }
        }

        if (manualBtn) {
            manualBtn.disabled = processing;
        }
    }

    updateDebugPanel(data) {
        this.updateDebugElement('debugLastScanId', this.lastScanId);
        this.updateDebugElement('debugTotalScans', data.total_scans || 0);
        this.updateDebugElement('debugPollingStatus', 'Active ✅');
    }

    updateDebugElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    addDebugLog(message, type = 'info') {
        if (window.addDebugLog) {
            window.addDebugLog(message, type);
        }
    }

    testApiConnection() {
        this.addDebugLog('🔗 Testing API connection...', 'info');
        fetch(this.scannerAPIUrl)
            .then(response => response.json())
            .then(data => {
                this.addDebugLog(`✅ API Response: ${data.message}`, 'success');
                this.updateDebugElement('debugApiStatus', 'Connected ✅');
            })
            .catch(error => {
                this.addDebugLog(`❌ API Error: ${error.message}`, 'error');
                this.updateDebugElement('debugApiStatus', 'Failed ❌');
            });
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
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

    // Cleanup when app is destroyed
    destroy() {
        this.stopPolling();
        this.addDebugLog("🔴 App destroyed", "info");
    }
}

// Initialize the app when everything is ready
let app;

function initializeApp() {
    if (!app) {
        app = new JLinkPOS();
    }
}

// Start the app
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Global functions for testing
window.testScanner = (productCode = "RAPIDENE-001") => {
    if (app && typeof app.handleQRScanManual === 'function') {
        app.handleQRScanManual(productCode);
    } else {
        console.error('App not ready');
    }
};

window.testPolling = () => {
    if (app && typeof app.checkForNewScans === 'function') {
        console.log("🧪 Manual polling test...");
        app.checkForNewScans();
    }
};

window.quickTest = () => {
    console.log("🧪 Running quick test...");
    window.testScanner("RAPIDENE-001");
};

// Make app globally available for debugging
window.JLinkPOS = JLinkPOS;
