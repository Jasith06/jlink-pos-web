class CartManager {
    constructor() {
        this.items = [];
        this.onCartUpdateCallbacks = [];
    }

    // Add item to cart
    addItem(product, quantity = 1) {
        const existingItemIndex = this.items.findIndex(item => item.productId === product.id);

        if (existingItemIndex > -1) {
            // Update existing item quantity
            this.items[existingItemIndex].quantity += quantity;
            this.items[existingItemIndex].total = this.items[existingItemIndex].quantity * this.items[existingItemIndex].price;
        } else {
            // Add new item
            const cartItem = {
                productId: product.id,
                name: product.name,
                price: parseFloat(product.price),
                wholesalePrice: parseFloat(product.wholesalePrice) || 0,
                quantity: quantity,
                total: parseFloat(product.price) * quantity,
                productCode: product.productCode || '',
                category: product.category || '',
                scannedAt: new Date().toISOString()
            };
            this.items.push(cartItem);
        }

        this.notifyCartUpdate();
        return this.items;
    }

    // Remove item from cart
    removeItem(productId) {
        this.items = this.items.filter(item => item.productId !== productId);
        this.notifyCartUpdate();
        return this.items;
    }

    // Update item quantity
    updateQuantity(productId, newQuantity) {
        if (newQuantity <= 0) {
            return this.removeItem(productId);
        }

        const item = this.items.find(item => item.productId === productId);
        if (item) {
            item.quantity = newQuantity;
            item.total = item.price * newQuantity;
            this.notifyCartUpdate();
        }

        return this.items;
    }

    // Get cart totals (REMOVED TAX)
    getTotals() {
        const subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
        const total = subtotal; // No tax calculation

        return {
            subtotal: parseFloat(subtotal.toFixed(2)),
            tax: 0, // Tax is now 0
            total: parseFloat(total.toFixed(2)),
            itemCount: this.items.reduce((sum, item) => sum + item.quantity, 0)
        };
    }

    // Calculate profit for cart
    calculateProfit() {
        return this.items.reduce((sum, item) => {
            const cost = item.wholesalePrice * item.quantity;
            const revenue = item.total;
            return sum + (revenue - cost);
        }, 0);
    }

    // Clear cart
    clearCart() {
        this.items = [];
        this.notifyCartUpdate();
    }

    // Cancel last item
    cancelLastItem() {
        if (this.items.length > 0) {
            this.items.pop();
            this.notifyCartUpdate();
        }
    }

    // Get cart items
    getItems() {
        return [...this.items]; // Return copy to prevent direct mutation
    }

    // Check if cart is empty
    isEmpty() {
        return this.items.length === 0;
    }

    // Register callback for cart updates
    onCartUpdate(callback) {
        this.onCartUpdateCallbacks.push(callback);
    }

    // Notify all callbacks of cart update
    notifyCartUpdate() {
        this.onCartUpdateCallbacks.forEach(callback => {
            callback(this.getItems(), this.getTotals());
        });
    }

    // Get cart summary for receipt
    getCartSummary() {
        return {
            items: this.getItems(),
            totals: this.getTotals(),
            profit: this.calculateProfit(),
            timestamp: new Date().toISOString()
        };
    }
}

// Create global instance
const cartManager = new CartManager();