class SalesService {
    constructor() {
        this.currentUser = null;
    }

    setUser(user) {
        this.currentUser = user;
        console.log("✅ SalesService: User set", user?.email);
    }

    async processSale(saleData) {
        console.log("💰 Processing sale:", saleData);

        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        if (!window.database) {
            throw new Error('Database not available');
        }

        try {
            const salesRef = window.database.ref(`users/${this.currentUser.uid}/sales`);
            const newSaleRef = salesRef.push();
            const saleId = newSaleRef.key;

            const saleRecord = {
                saleId: saleId,
                customerEmail: saleData.customerEmail,
                customerName: saleData.customerName || '',
                totalAmount: saleData.totals.total,
                profit: saleData.profit,
                taxAmount: 0, // Tax is now 0
                discountAmount: 0,
                items: saleData.items,
                paymentMethod: 'cash',
                saleDate: new Date().toISOString(),
                status: 'completed',
                userId: this.currentUser.uid,
                createdAt: new Date().toISOString()
            };

            console.log("💾 Saving sale record to Firebase...");
            await newSaleRef.set(saleRecord);

            // Update product quantities in inventory
            console.log("📦 Updating inventory quantities...");
            for (const item of saleData.items) {
                try {
                    await productService.updateProductQuantity(item.productId, -item.quantity);
                    console.log(`✅ Updated inventory for ${item.name}`);
                } catch (error) {
                    console.warn(`⚠️ Could not update quantity for ${item.name}:`, error);
                    // Continue with other products even if one fails
                }
            }

            console.log("✅ Sale processed successfully:", saleId);
            return saleId;

        } catch (error) {
            console.error('❌ Sale processing error:', error);
            throw error;
        }
    }

    async getSalesAnalytics(timeframe = 'today') {
        if (!this.currentUser) return null;

        try {
            const salesRef = window.database.ref(`users/${this.currentUser.uid}/sales`);
            const snapshot = await salesRef.once('value');

            if (!snapshot.exists()) return null;

            const sales = snapshot.val();
            const now = new Date();
            let totalSales = 0;
            let totalProfit = 0;

            Object.values(sales).forEach(sale => {
                const saleDate = new Date(sale.saleDate);

                if (timeframe === 'today' && this.isSameDay(saleDate, now)) {
                    totalSales += sale.totalAmount;
                    totalProfit += sale.profit || 0;
                } else if (timeframe === 'week' && this.isSameWeek(saleDate, now)) {
                    totalSales += sale.totalAmount;
                    totalProfit += sale.profit || 0;
                } else if (timeframe === 'month' && this.isSameMonth(saleDate, now)) {
                    totalSales += sale.totalAmount;
                    totalProfit += sale.profit || 0;
                }
            });

            return {
                totalSales,
                totalProfit,
                transactionCount: Object.keys(sales).length
            };

        } catch (error) {
            console.error('Sales analytics error:', error);
            return null;
        }
    }

    isSameDay(date1, date2) {
        return date1.toDateString() === date2.toDateString();
    }

    isSameWeek(date1, date2) {
        const startOfWeek = new Date(date2);
        startOfWeek.setDate(date2.getDate() - date2.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        return date1 >= startOfWeek && date1 <= endOfWeek;
    }

    isSameMonth(date1, date2) {
        return date1.getMonth() === date2.getMonth() &&
            date1.getFullYear() === date2.getFullYear();
    }
}

// Create global instance
const salesService = new SalesService();