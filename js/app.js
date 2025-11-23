class JLinkPOS {
    constructor() {
        this.currentUser = null;
        this.isProcessing = false;
        this.scannerAPIUrl = '';
        this.authStateChecked = false;
        this.pollingInterval = null;
        this.isPolling = false;

        this.initializeApp();
    }

    initializeApp() {
        console.log("🚀 JLINK POS App Starting on XAMPP Local Server...");

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

        setTimeout(() => {
            this.setupEventListeners();
            this.checkAuthState();
            this.setScannerAPIUrl();

            // Initialize EmailJS
            if (typeof emailjs !== 'undefined') {
                try {
                    emailjs.init("G4dKsQOK9_vg9Mi2o");
                    console.log("✅ EmailJS initialized");
                } catch (emailError) {
                    console.warn("EmailJS init warning:", emailError);
                }
            }

            // Test XAMPP connection
            this.testXAMPPConnection();
        }, 500);
    }

    setScannerAPIUrl() {
        // XAMPP Local Server URL
        this.scannerAPIUrl = 'http://localhost/jlink-pos-web/api/scanner.php';
        console.log("📡 Scanner API URL:", this.scannerAPIUrl);
    }

    async testXAMPPConnection() {
        try {
            const testUrl = 'http://localhost/jlink-pos-web/api/test.php';
            const response = await fetch(testUrl);
            const data = await response.json();
            console.log("✅ XAMPP Connection Test:", data);
            this.updateScannerStatus('Connected to XAMPP - Ready for scanning', 'ready');
        } catch (error) {
            console.error("❌ XAMPP Connection Failed:", error);
            this.updateScannerStatus('XAMPP Connection Failed - Check Apache', 'error');
        }
    }

    // Start polling for scanner input
    startPolling() {
        if (this.pollingInterval) {
            console.log("⚠️ Polling already active");
            return;
        }

        console.log("🔄 Starting scanner polling...");
        this.isPolling = true;

        // Poll every 1 second for new scans
        this.pollingInterval = setInterval(() => {
            this.pollForScans();
        }, 1000);

        // Do initial poll immediately
        this.pollForScans();
    }

    stopPolling() {
        if (this.pollingInterval) {
            console.log("⏹️ Stopping scanner polling...");
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            this.isPolling = false;
        }
    }

    async pollForScans() {
        if (!this.currentUser || this.isProcessing) {
            return;
        }

        try {
            const response = await fetch(this.scannerAPIUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.scans && data.scans.length > 0) {
                console.log(`📥 Received ${data.scans.length} new scan(s):`, data.scans);

                // Process each scan
                for (const scan of data.scans) {
                    await this.processScannerInput(scan);
                    // Small delay between processing multiple scans
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

        } catch (error) {
            console.error('❌ Polling error:', error);
            // Don't show error on UI for polling failures - just log them
        }
    }

    setupEventListeners() {
        console.log("🔧 Setting up event listeners...");

        // Login events
        const loginBtn = document.getElementById('loginBtn');
        const loginPassword = document.getElementById('loginPassword');

        if (loginBtn) loginBtn.addEventListener('click', () => this.handleLogin());
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
    }

    async processScannerInput(scannerData) {
        if (this.isProcessing) {
            console.log("⚠️ Scanner: System busy, please wait");
            return;
        }

        this.isProcessing = true;
        this.updateScannerStatus('Processing scan', 'processing');

        try {
            console.log("🔍 Processing scanner data:", scannerData);

            let productCode = scannerData.product_code || scannerData.qr_code;

            if (!productCode) {
                throw new Error('No product code in scanner data');
            }

            console.log("🔍 Looking up product:", productCode);

            if (typeof productService !== 'undefined') {
                const product = await productService.findProductByCode(productCode);
                console.log("✅ Product found:", product);

                if (product.quantity <= 0) {
                    this.updateScannerStatus(`${product.name} - Out of stock!`, 'error');
                    this.playErrorSound();
                    setTimeout(() => {
                        this.updateScannerStatus('Ready to scan - Listening', 'ready');
                    }, 3000);
                    return;
                }

                // Add to cart
                cartManager.addItem(product, 1);
                this.updateScannerStatus(`✅ ${product.name} added to cart!`, 'ready');

                // Play success sound
                this.playSuccessSound();

                // Reset status after 2 seconds
                setTimeout(() => {
                    this.updateScannerStatus('Ready to scan - Listening', 'ready');
                }, 2000);

            } else {
                throw new Error('Product service not available');
            }

        } catch (error) {
            console.error('❌ Scanner processing error:', error);
            this.updateScannerStatus(`Error: ${error.message}`, 'error');
            this.playErrorSound();

            setTimeout(() => {
                this.updateScannerStatus('Ready to scan - Listening', 'ready');
            }, 3000);
        } finally {
            this.isProcessing = false;
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

    playErrorSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 400;
            oscillator.type = 'square';

            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            console.log("Audio not supported");
        }
    }

    checkAuthState() {
        console.log("🔐 Checking authentication state...");

        if (!window.auth) {
            console.error("❌  Auth not available");
            this.showScreen('loginScreen');
            return;
        }

        window.auth.onAuthStateChanged((user) => {
            console.log("🔄 Auth state changed:", user ? user.email : "No user");
            this.authStateChecked = true;

            if (user) {
                this.handleAuthSuccess(user);
            } else {
                this.handleAuthFailure();
            }
        }, (error) => {
            console.error("❌ Auth state listener error:", error);
            this.authStateChecked = true;
            this.handleAuthFailure();
        });

        setTimeout(() => {
            if (!this.authStateChecked) {
                console.log("⏰ Auth state timeout - checking current user");
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
            alert('Please enter email and password');
            return;
        }

        this.setLoadingState(true);

        try {
            console.log("🔐 Attempting login for:", email);

            if (!window.auth) {
                throw new Error('Authentication service not available');
            }

            const userCredential = await window.auth.signInWithEmailAndPassword(email, password);
            console.log('✅ Login successful:', userCredential.user.email);

        } catch (error) {
            this.setLoadingState(false);
            console.error('❌ Login error:', error);

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

            alert(`Login failed: ${errorMessage}`);
        }
    }

    async handleLogout() {
        try {
            this.stopPolling(); // Stop polling when logging out
            await window.auth.signOut();
            this.updateScannerStatus('Logged out successfully', 'ready');
        } catch (error) {
            console.error('Logout error:', error);
            alert('Logout failed');
        }
    }

    handleAuthSuccess(user) {
        console.log("✅ Authentication successful:", user.email);
        this.currentUser = user;

        // Set user for services
        if (typeof productService !== 'undefined') {
            productService.setUser(user);
        }
        if (typeof salesService !== 'undefined') {
            salesService.setUser(user);
        }

        // Update UI
        const currentUserElement = document.getElementById('currentUser');
        if (currentUserElement) {
            currentUserElement.textContent = user.email;
        }

        this.showScreen('posScreen');
        this.setLoadingState(false);

        // Start polling for ESP32 scans
        this.startPolling();
        this.updateScannerStatus('🔴 LIVE - Listening', 'ready');

        // Focus on QR input
        setTimeout(() => {
            const qrInput = document.getElementById('qrInput');
            if (qrInput) {
                qrInput.focus();
            }
        }, 100);
    }

    handleAuthFailure() {
        console.log("❌ No user authenticated");
        this.currentUser = null;
        this.stopPolling(); // Stop polling when not authenticated
        this.showScreen('loginScreen');
        this.setLoadingState(false);
    }

    async handleQRScan() {
        const qrInput = document.getElementById('qrInput');
        const productCode = qrInput.value.trim();

        if (!productCode) {
            this.updateScannerStatus('Please enter a product code', 'error');
            return;
        }

        this.updateScannerStatus('Searching for product...', 'processing');

        try {
            if (typeof productService === 'undefined') {
                throw new Error('Product service not available');
            }

            const product = await productService.findProductByCode(productCode);
            console.log("✅ Product found via manual entry:", product);

            if (product.quantity <= 0) {
                this.updateScannerStatus(`Product out of stock: ${product.name}`, 'error');
                return;
            }

            cartManager.addItem(product, 1);
            this.updateScannerStatus(`Added: ${product.name}`, 'ready');
            this.playSuccessSound();

            qrInput.value = '';
            setTimeout(() => {
                qrInput.focus();
                this.updateScannerStatus('🔴 LIVE - Listening', 'ready');
            }, 2000);

        } catch (error) {
            this.updateScannerStatus(`Error: ${error.message}`, 'error');
            console.error('QR scan error:', error);
            setTimeout(() => {
                this.updateScannerStatus('🔴 LIVE - Listening', 'ready');
            }, 3000);
        }
    }

    showManualAddModal() {
        document.getElementById('manualAddModal').classList.add('active');
        document.getElementById('manualProductCode').focus();
    }

    hideManualAddModal() {
        document.getElementById('manualAddModal').classList.remove('active');
        document.getElementById('manualProductCode').value = '';
        document.getElementById('manualQuantity').value = '1';

        setTimeout(() => {
            document.getElementById('qrInput').focus();
        }, 100);
    }

    async handleManualAdd() {
        const productCode = document.getElementById('manualProductCode').value.trim();
        const quantity = parseInt(document.getElementById('manualQuantity').value) || 1;

        if (!productCode) {
            alert('Please enter a product code');
            return;
        }

        try {
            if (typeof productService === 'undefined') {
                throw new Error('Product service not available');
            }

            const product = await productService.findProductByCode(productCode);

            if (product.quantity <= 0) {
                alert(`Product out of stock: ${product.name}`);
                return;
            }

            cartManager.addItem(product, quantity);
            this.updateScannerStatus(`Added: ${product.name} x${quantity}`, 'ready');
            this.playSuccessSound();
            this.hideManualAddModal();

        } catch (error) {
            alert(`Error: ${error.message}`);
            console.error('Manual add error:', error);
        }
    }

    updateCartDisplay(items, totals) {
        const cartItemsContainer = document.getElementById('cartItems');
        const itemCountElement = document.getElementById('itemCount');
        const cartValueElement = document.getElementById('cartValue');
        const subtotalElement = document.getElementById('subtotalAmount');
        const taxElement = document.getElementById('taxAmount');
        const totalElement = document.getElementById('totalAmount');

        if (itemCountElement) itemCountElement.textContent = totals.itemCount;
        if (cartValueElement) cartValueElement.textContent = `LKR ${totals.total.toFixed(2)}`;
        if (subtotalElement) subtotalElement.textContent = `LKR ${totals.subtotal.toFixed(2)}`;
        if (taxElement) taxElement.textContent = `LKR ${totals.tax.toFixed(2)}`;
        if (totalElement) totalElement.textContent = `LKR ${totals.total.toFixed(2)}`;

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
                        <button class="quantity-btn" onclick="app.decreaseQuantity('${item.productId}')">-</button>
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
    }

    increaseQuantity(productId) {
        const items = cartManager.getItems();
        const item = items.find(i => i.productId === productId);
        if (item) {
            cartManager.updateQuantity(productId, item.quantity + 1);
        }
    }

    decreaseQuantity(productId) {
        const items = cartManager.getItems();
        const item = items.find(i => i.productId === productId);
        if (item) {
            cartManager.updateQuantity(productId, item.quantity - 1);
        }
    }

    async handleCheckout() {
        if (cartManager.isEmpty()) {
            alert('Cart is empty!');
            return;
        }

        const customerEmail = document.getElementById('customerEmail').value.trim();
        if (!customerEmail) {
            alert('Please enter customer email');
            document.getElementById('customerEmail').focus();
            return;
        }

        if (!this.validateEmail(customerEmail)) {
            alert('Please enter a valid email address');
            document.getElementById('customerEmail').focus();
            return;
        }

        const totals = cartManager.getTotals();
        const customerName = document.getElementById('customerName').value.trim();

        if (!confirm(`Complete sale for LKR ${totals.total.toFixed(2)} to ${customerEmail}?`)) {
            return;
        }

        this.updateScannerStatus('Processing sale...', 'processing');

        try {
            const saleData = {
                customerEmail: customerEmail,
                customerName: customerName,
                items: cartManager.getItems(),
                totals: totals,
                profit: cartManager.calculateProfit(),
                timestamp: new Date().toISOString()
            };

            let saleId = 'SALE-' + Date.now();

            if (typeof salesService !== 'undefined') {
                saleId = await salesService.processSale(saleData);
                console.log("✅ Sale recorded:", saleId);
            }

            saleData.saleId = saleId;

            // Send email receipt
            this.updateScannerStatus('Sending receipt...', 'processing');
            let emailSent = false;

            if (typeof emailService !== 'undefined') {
                emailSent = await emailService.sendReceiptEmail(customerEmail, saleData);
            }

            let successMessage = `Sale #${saleId} completed!\nTotal: LKR ${totals.total.toFixed(2)}`;
            if (emailSent) {
                successMessage += `\nReceipt sent to ${customerEmail}`;
            }

            this.showSuccessAnimation(successMessage);

            // Reset for next customer
            setTimeout(() => {
                cartManager.clearCart();
                document.getElementById('customerEmail').value = '';
                document.getElementById('customerName').value = '';
                this.updateScannerStatus('🔴 LIVE - Ready for next customer', 'ready');
            }, 3000);

        } catch (error) {
            console.error('Checkout error:', error);
            this.updateScannerStatus(`Checkout failed: ${error.message}`, 'error');
            alert(`Checkout failed: ${error.message}`);
        }
    }

    handleClearCart() {
        if (cartManager.isEmpty()) {
            return;
        }

        if (confirm('Clear all items from cart?')) {
            cartManager.clearCart();
            this.updateScannerStatus('Cart cleared', 'ready');
        }
    }

    handleCancelLastItem() {
        cartManager.cancelLastItem();
        this.updateScannerStatus('Last item removed', 'ready');
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
        }
    }

    updateScannerStatus(message, type = 'ready') {
        const statusElement = document.getElementById('scannerStatus');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `scanner-status ${type}`;
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
}

// Initialize the app
let app;

function initializeApp() {
    if (!app) {
        app = new JLinkPOS();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
