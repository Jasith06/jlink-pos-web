class ProductService {
    constructor() {
        this.currentUser = null;
    }

    setUser(user) {
        this.currentUser = user;
        console.log("✅ ProductService: User set", user?.email);
    }

    async findProductByCode(productCode) {
        console.log("🔍 ProductService: Searching for", productCode);

        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        if (!window.database) {
            throw new Error('Database not available');
        }

        try {
            // Clean the product code (remove any extra spaces or special characters)
            const cleanCode = productCode.trim().toUpperCase();

            console.log("🔍 Searching in Firebase for:", cleanCode);

            // Method 1: Direct lookup by productCode as key
            const directRef = window.database.ref(`users/${this.currentUser.uid}/products/${cleanCode}`);
            const directSnapshot = await directRef.once('value');

            if (directSnapshot.exists()) {
                const product = directSnapshot.val();
                console.log("✅ Product found via direct lookup:", product.name);

                if (product.quantity <= 0) {
                    throw new Error(`${product.name} is out of stock`);
                }

                return { id: cleanCode, ...product };
            }

            // Method 2: Search through all products
            console.log("🔍 Direct lookup failed, searching all products...");
            const allProductsRef = window.database.ref(`users/${this.currentUser.uid}/products`);
            const allSnapshot = await allProductsRef.once('value');

            if (allSnapshot.exists()) {
                const allProducts = allSnapshot.val();
                console.log("📦 Total products in database:", Object.keys(allProducts).length);

                // Search by productCode field
                for (const [id, product] of Object.entries(allProducts)) {
                    if (product.productCode && product.productCode.toUpperCase() === cleanCode) {
                        console.log("✅ Product found via productCode field:", product.name);

                        if (product.quantity <= 0) {
                            throw new Error(`${product.name} is out of stock`);
                        }

                        return { id, ...product };
                    }
                }

                // Search by name contains
                for (const [id, product] of Object.entries(allProducts)) {
                    if (product.name && product.name.toLowerCase().includes(cleanCode.toLowerCase())) {
                        console.log("✅ Product found via name search:", product.name);

                        if (product.quantity <= 0) {
                            throw new Error(`${product.name} is out of stock`);
                        }

                        return { id, ...product };
                    }
                }
            }

            console.log("❌ Product not found:", cleanCode);
            throw new Error(`Product not found: ${cleanCode}`);

        } catch (error) {
            console.error('❌ ProductService error:', error);
            throw error;
        }
    }

    async updateProductQuantity(productId, quantityChange) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        try {
            const productRef = window.database.ref(`users/${this.currentUser.uid}/products/${productId}`);
            const snapshot = await productRef.once('value');

            if (snapshot.exists()) {
                const product = snapshot.val();
                const newQuantity = Math.max(0, (product.quantity || 0) + quantityChange);

                await productRef.update({
                    quantity: newQuantity,
                    updatedAt: new Date().toISOString()
                });

                console.log(`📦 Updated ${product.name} quantity: ${product.quantity} → ${newQuantity}`);
                return newQuantity;
            } else {
                throw new Error('Product not found for quantity update');
            }
        } catch (error) {
            console.error('Product quantity update error:', error);
            throw error;
        }
    }

    // New method to handle QR code data directly
    async processQRCodeData(qrData) {
        try {
            console.log("📱 Processing QR data:", qrData);

            // Parse different QR code formats
            let productCode;

            if (qrData.includes('|')) {
                // Format: ProductName|Price|MFD|EXP|ProductCode
                const parts = qrData.split('|');
                productCode = parts[4]?.trim();
            } else if (qrData.includes('PROD:')) {
                // Format: PROD:CODE|NAME:Name|PRICE:Price
                const lines = qrData.split('\n');
                for (const line of lines) {
                    if (line.startsWith('PROD:')) {
                        productCode = line.replace('PROD:', '').trim();
                        break;
                    }
                }
            } else {
                // Assume it's just the product code
                productCode = qrData.trim();
            }

            if (!productCode) {
                throw new Error('Could not extract product code from QR data');
            }

            console.log("🔍 Extracted product code:", productCode);
            return await this.findProductByCode(productCode);

        } catch (error) {
            console.error('QR data processing error:', error);
            throw error;
        }
    }
}

// Create global instance
const productService = new ProductService();