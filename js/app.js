// Custom JLINK Dialog System
class JLinkDialog {
    constructor() {
        this.createDialogContainer();
    }

    createDialogContainer() {
        const overlay = document.createElement('div');
        overlay.id = 'jlink-dialog-overlay';
        overlay.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(5px);
            z-index: 9999;
            justify-content: center;
            align-items: center;
        `;
        document.body.appendChild(overlay);

        const dialogBox = document.createElement('div');
        dialogBox.id = 'jlink-dialog-box';
        dialogBox.style.cssText = `
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 450px;
            width: 90%;
            overflow: hidden;
            animation: dialogSlideIn 0.3s ease;
        `;
        overlay.appendChild(dialogBox);

        const style = document.createElement('style');
        style.textContent = `
            @keyframes dialogSlideIn {
                from {
                    transform: translateY(-50px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }

    show(title, message, type = 'alert', inputType = null) {
        return new Promise((resolve) => {
            const overlay = document.getElementById('jlink-dialog-overlay');
            const dialogBox = document.getElementById('jlink-dialog-box');

            let icon = '💬';
            let headerColor = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

            if (type === 'confirm') {
                icon = '❓';
                headerColor = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
            } else if (type === 'success') {
                icon = '✅';
                headerColor = 'linear-gradient(90deg, #11998e 0%, #38ef7d 100%)';
            } else if (type === 'error') {
                icon = '❌';
                headerColor = 'linear-gradient(90deg, #eb3349 0%, #f45c43 100%)';
            } else if (type === 'prompt') {
                icon = '✏️';
                headerColor = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            }

            let dialogHTML = `
                <div style="background: ${headerColor}; padding: 1.5rem; text-align: center;">
                    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">${icon}</div>
                    <h3 style="color: white; margin: 0; font-size: 1.3rem; font-weight: 700;">
                        ${title}
                    </h3>
                </div>
                <div style="padding: 2rem;">
                    <p style="color: #343a40; font-size: 1.05rem; line-height: 1.6; margin: 0 0 1.5rem 0; text-align: center;">
                        ${message}
                    </p>
            `;

            if (type === 'prompt') {
                const inputTypeAttr = inputType === 'email' ? 'email' : 'text';
                const placeholder = inputType === 'email' ? 'Enter email address' : 'Enter value';
                dialogHTML += `
                    <input 
                        type="${inputTypeAttr}" 
                        id="jlink-dialog-input" 
                        placeholder="${placeholder}"
                        style="
                            width: 100%;
                            padding: 0.9rem;
                            border: 2px solid #e0e0e0;
                            border-radius: 10px;
                            font-size: 1rem;
                            margin-bottom: 1.5rem;
                            box-sizing: border-box;
                        "
                    />
                `;
            }

            dialogHTML += `<div style="display: flex; gap: 0.8rem; justify-content: center;">`;

            if (type === 'confirm') {
                dialogHTML += `
                    <button id="jlink-dialog-cancel" style="
                        flex: 1;
                        padding: 0.9rem 1.5rem;
                        background: #6c757d;
                        color: white;
                        border: none;
                        border-radius: 10px;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">Cancel</button>
                    <button id="jlink-dialog-ok" style="
                        flex: 1;
                        padding: 0.9rem 1.5rem;
                        background: linear-gradient(90deg, #11998e 0%, #38ef7d 100%);
                        color: white;
                        border: none;
                        border-radius: 10px;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(17, 153, 142, 0.3);
                    ">Confirm</button>
                `;
            } else if (type === 'prompt') {
                dialogHTML += `
                    <button id="jlink-dialog-cancel" style="
                        flex: 1;
                        padding: 0.9rem 1.5rem;
                        background: #6c757d;
                        color: white;
                        border: none;
                        border-radius: 10px;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">Cancel</button>
                    <button id="jlink-dialog-ok" style="
                        flex: 1;
                        padding: 0.9rem 1.5rem;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        border-radius: 10px;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                    ">OK</button>
                `;
            } else {
                dialogHTML += `
                    <button id="jlink-dialog-ok" style="
                        flex: 1;
                        max-width: 200px;
                        padding: 0.9rem 1.5rem;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        border-radius: 10px;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                    ">OK</button>
                `;
            }

            dialogHTML += `</div></div>`;

            dialogBox.innerHTML = dialogHTML;
            overlay.style.display = 'flex';

            const okBtn = document.getElementById('jlink-dialog-ok');
            const cancelBtn = document.getElementById('jlink-dialog-cancel');

            okBtn.addEventListener('mouseenter', () => {
                okBtn.style.transform = 'translateY(-2px)';
            });
            okBtn.addEventListener('mouseleave', () => {
                okBtn.style.transform = 'translateY(0)';
            });

            if (cancelBtn) {
                cancelBtn.addEventListener('mouseenter', () => {
                    cancelBtn.style.transform = 'translateY(-2px)';
                    cancelBtn.style.background = '#5a6268';
                });
                cancelBtn.addEventListener('mouseleave', () => {
                    cancelBtn.style.transform = 'translateY(0)';
                    cancelBtn.style.background = '#6c757d';
                });
            }

            okBtn.onclick = () => {
                if (type === 'prompt') {
                    const input = document.getElementById('jlink-dialog-input');
                    const value = input.value.trim();
                    overlay.style.display = 'none';
                    resolve(value || null);
                } else if (type === 'confirm') {
                    overlay.style.display = 'none';
                    resolve(true);
                } else {
                    overlay.style.display = 'none';
                    resolve(true);
                }
            };

            if (cancelBtn) {
                cancelBtn.onclick = () => {
                    overlay.style.display = 'none';
                    resolve(false);
                };
            }

            if (type === 'prompt') {
                const input = document.getElementById('jlink-dialog-input');
                input.focus();
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        okBtn.click();
                    }
                });
            }

            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    overlay.style.display = 'none';
                    resolve(false);
                }
            };
        });
    }

    alert(message, title = 'JLINK SAYS') {
        return this.show(title, message, 'alert');
    }

    confirm(message, title = 'JLINK SAYS') {
        return this.show(title, message, 'confirm');
    }

    prompt(message, title = 'JLINK SAYS', inputType = 'text') {
        return this.show(title, message, 'prompt', inputType);
    }

    success(message, title = 'JLINK SAYS') {
        return this.show(title, message, 'success');
    }

    error(message, title = 'JLINK SAYS') {
        return this.show(title, message, 'error');
    }
}

const jlinkDialog = new JLinkDialog();

window.jlinkAlert = (msg) => jlinkDialog.alert(msg);
window.jlinkConfirm = (msg) => jlinkDialog.confirm(msg);
window.jlinkPrompt = (msg, type) => jlinkDialog.prompt(msg, 'JLINK SAYS', type);

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
        console.log("🚀 JLINK POS App Starting on Vercel...");

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

            if (typeof emailjs !== 'undefined') {
                try {
                    emailjs.init("G4dKsQOK9_vg9Mi2o");
                    console.log("✅ EmailJS initialized");
                } catch (emailError) {
                    console.warn("EmailJS init warning:", emailError);
                }
            }

            this.testVercelConnection();
        }, 500);
    }

    setScannerAPIUrl() {
        if (window.location.hostname === 'localhost') {
            this.scannerAPIUrl = 'http://localhost:3000/api/scanner';
        } else {
            this.scannerAPIUrl = `${window.location.origin}/api/scanner`;
        }
        
        console.log("📡 Scanner API URL:", this.scannerAPIUrl);
    }

    async testVercelConnection() {
        try {
            const testUrl = this.scannerAPIUrl.replace('/scanner', '/test');
            const response = await fetch(testUrl);
            const data = await response.json();
            console.log("✅ Vercel Connection Test:", data);
            this.updateScannerStatus('Connected to JLINK - Ready for scanning', 'ready');
        } catch (error) {
            console.error("❌ JLINK Connection Failed:", error);
            this.updateScannerStatus('Vercel Connection Failed - Check deployment', 'error');
        }
    }

    startPolling() {
        if (this.pollingInterval) {
            console.log("⚠️ Polling already active");
            return;
        }

        console.log("🔄 Starting scanner polling...");
        this.isPolling = true;

        this.pollingInterval = setInterval(() => {
            this.pollForScans();
        }, 1000);

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

                for (const scan of data.scans) {
                    await this.processScannerInput(scan);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

        } catch (error) {
            console.error('❌ Polling error:', error);
        }
    }

    setupEventListeners() {
        console.log("🔧 Setting up event listeners...");

        const loginBtn = document.getElementById('loginBtn');
        const loginPassword = document.getElementById('loginPassword');

        if (loginBtn) loginBtn.addEventListener('click', () => this.handleLogin());
        if (loginPassword) loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.handleLogout());

        const qrInput = document.getElementById('qrInput');
        if (qrInput) {
            qrInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleQRScan();
            });
        }

        const manualAddBtn = document.getElementById('manualAddBtn');
        if (manualAddBtn) manualAddBtn.addEventListener('click', () => this.showManualAddModal());

        const confirmManualAdd = document.getElementById('confirmManualAdd');
        if (confirmManualAdd) confirmManualAdd.addEventListener('click', () => this.handleManualAdd());

        const cancelManualAdd = document.getElementById('cancelManualAdd');
        if (cancelManualAdd) cancelManualAdd.addEventListener('click', () => this.hideManualAddModal());

        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) checkoutBtn.addEventListener('click', () => this.handleCheckout());

        const clearCartBtn = document.getElementById('clearCartBtn');
        if (clearCartBtn) clearCartBtn.addEventListener('click', () => this.handleClearCart());

        const cancelLastBtn = document.getElementById('cancelLastBtn');
        if (cancelLastBtn) cancelLastBtn.addEventListener('click', () => this.handleCancelLastItem());

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

                cartManager.addItem(product, 1);
                this.updateScannerStatus(`✅ ${product.name} added to cart!`, 'ready');

                this.playSuccessSound();

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
            console.error("❌ Auth not available");
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
            await jlinkDialog.alert('Please enter email and password');
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

            // CORRECTION 2: Replace "Firebase" with "JLINK" in error messages
            let errorMessage = 'Login failed';
            if (error.code === 'user-not-found') {
                errorMessage = 'No account found with this email';
            } else if (error.code === 'wrong-password') {
                errorMessage = 'Incorrect password';
            } else if (error.code === 'invalid-email') {
                errorMessage = 'Invalid email address';
            } else if (error.code === 'invalid-login-credentials') {
                errorMessage = 'JLINK: Error (invalid-login-credentials)';
            } else {
                // Replace "Firebase" with "JLINK" in any error message
                errorMessage = error.message.replace(/Firebase/g, 'JLINK');
            }

            await jlinkDialog.error(`Login failed: ${errorMessage}`);
        }
    }

    async handleLogout() {
        try {
            this.stopPolling();
            await window.auth.signOut();
            this.updateScannerStatus('Logged out successfully', 'ready');
        } catch (error) {
            console.error('Logout error:', error);
            await jlinkDialog.error('Logout failed');
        }
    }

    handleAuthSuccess(user) {
        console.log("✅ Authentication successful:", user.email);
        this.currentUser = user;

        if (typeof productService !== 'undefined') {
            productService.setUser(user);
        }
        if (typeof salesService !== 'undefined') {
            salesService.setUser(user);
        }

        const currentUserElement = document.getElementById('currentUser');
        if (currentUserElement) {
            currentUserElement.textContent = user.email;
        }

        this.showScreen('posScreen');
        this.setLoadingState(false);

        this.startPolling();
        this.updateScannerStatus('🔴 LIVE - Listening', 'ready');

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
        this.stopPolling();
        this.showScreen('loginScreen');
        this.setLoadingState(false);
    }

    async handleQRScan() {
        const qrInput = document.getElementById('qrInput');
        const productCode = qrInput.value.trim();

        if (!productCode) {
            await jlinkDialog.alert('Please enter a product code');
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
            await jlinkDialog.alert('Please enter a product code');
            return;
        }

        try {
            if (typeof productService === 'undefined') {
                throw new Error('Product service not available');
            }

            const product = await productService.findProductByCode(productCode);

            if (product.quantity <= 0) {
                await jlinkDialog.error(`Product out of stock: ${product.name}`);
                return;
            }

            cartManager.addItem(product, quantity);
            this.updateScannerStatus(`Added: ${product.name} x${quantity}`, 'ready');
            this.playSuccessSound();
            this.hideManualAddModal();

        } catch (error) {
            await jlinkDialog.error(`Error: ${error.message}`);
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
            await jlinkDialog.alert('Cart is empty!');
            return;
        }

        const customerEmail = document.getElementById('customerEmail').value.trim();
        if (!customerEmail) {
            await jlinkDialog.alert('Please enter customer email');
            document.getElementById('customerEmail').focus();
            return;
        }

        if (!this.validateEmail(customerEmail)) {
            await jlinkDialog.error('Please enter a valid email address');
            document.getElementById('customerEmail').focus();
            return;
        }

        const totals = cartManager.getTotals();
        const customerName = document.getElementById('customerName').value.trim();

        if (!await jlinkDialog.confirm(`Complete sale for LKR ${totals.total.toFixed(2)} to ${customerEmail}?`)) {
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
            await jlinkDialog.error(`Checkout failed: ${error.message}`);
        }
    }

    async handleClearCart() {
        if (cartManager.isEmpty()) {
            return;
        }

        if (await jlinkDialog.confirm('Clear all items from cart?')) {
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




