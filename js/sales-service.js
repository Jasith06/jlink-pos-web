// js/sales-service.js - FIXED VERSION
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

            // Get current date for proper aggregation
            const saleDate = new Date();
            const dateString = saleDate.toISOString();
            
            const saleRecord = {
                saleId: saleId,
                customerEmail: saleData.customerEmail,
                customerName: saleData.customerName || '',
                totalAmount: saleData.totals.total,
                profit: saleData.profit,
                taxAmount: 0,
                discountAmount: 0,
                items: saleData.items,
                paymentMethod: 'cash',
                saleDate: dateString, // ISO format for easy filtering
                status: 'completed',
                userId: this.currentUser.uid,
                createdAt: dateString
            };

            console.log("💾 Saving sale record to Firebase...");
            await newSaleRef.set(saleRecord);

            // ⚠️ CRITICAL FIX: Update product quantities in inventory
            console.log("📦 Updating inventory quantities...");
            for (const item of saleData.items) {
                try {
                    // Reduce quantity from inventory
                    await productService.updateProductQuantity(item.productId, -item.quantity);
                    console.log(`✅ Updated inventory for ${item.name}: -${item.quantity}`);
                } catch (error) {
                    console.warn(`⚠️ Could not update quantity for ${item.name}:`, error);
                }
            }

            // Send sale notification to mobile app
            await this.sendSaleToMobileApp(saleRecord);

            console.log("✅ Sale processed successfully:", saleId);
            return saleId;

        } catch (error) {
            console.error('❌ Sale processing error:', error);
            throw error;
        }
    }

    async sendSaleToMobileApp(saleRecord) {
        try {
            // Send to mobile app's sales collection
            const mobileSalesRef = window.database.ref(
                `users/${this.currentUser.uid}/mobile_sales/${saleRecord.saleId}`
            );
            await mobileSalesRef.set({
                ...saleRecord,
                syncedAt: new Date().toISOString()
            });
            console.log("✅ Sale synced to mobile app");
        } catch (error) {
            console.error("⚠️ Failed to sync to mobile app:", error);
        }
    }

    // ⚠️ CRITICAL FIX: Proper date-based aggregation
    async getSalesAnalytics(timeframe = 'today') {
        if (!this.currentUser) return null;

        try {
            const salesRef = window.database.ref(`users/${this.currentUser.uid}/sales`);
            const snapshot = await salesRef.once('value');

            if (!snapshot.exists()) {
                return {
                    totalSales: 0,
                    totalProfit: 0,
                    transactionCount: 0
                };
            }

            const sales = snapshot.val();
            const now = new Date();
            
            // Reset time to start of day for accurate comparison
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            
            let totalSales = 0;
            let totalProfit = 0;
            let transactionCount = 0;

            Object.values(sales).forEach(sale => {
                const saleDate = new Date(sale.saleDate);
                let includeInTotal = false;

                if (timeframe === 'today') {
                    includeInTotal = this.isSameDay(saleDate, now);
                } else if (timeframe === 'week') {
                    includeInTotal = this.isSameWeek(saleDate, now);
                } else if (timeframe === 'month') {
                    includeInTotal = this.isSameMonth(saleDate, now);
                } else if (timeframe === 'year') {
                    includeInTotal = this.isSameYear(saleDate, now);
                }

                if (includeInTotal) {
                    totalSales += sale.totalAmount || 0;
                    totalProfit += sale.profit || 0;
                    transactionCount++;
                }
            });

            return {
                totalSales: parseFloat(totalSales.toFixed(2)),
                totalProfit: parseFloat(totalProfit.toFixed(2)),
                transactionCount
            };

        } catch (error) {
            console.error('Sales analytics error:', error);
            return {
                totalSales: 0,
                totalProfit: 0,
                transactionCount: 0
            };
        }
    }

    isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
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

    isSameYear(date1, date2) {
        return date1.getFullYear() === date2.getFullYear();
    }

    // Get all sales for a specific timeframe
    async getSalesForPeriod(timeframe = 'today') {
        if (!this.currentUser) return [];

        try {
            const salesRef = window.database.ref(`users/${this.currentUser.uid}/sales`);
            const snapshot = await salesRef.orderByChild('saleDate').once('value');

            if (!snapshot.exists()) return [];

            const sales = [];
            const now = new Date();

            snapshot.forEach((childSnapshot) => {
                const sale = childSnapshot.val();
                const saleDate = new Date(sale.saleDate);
                let include = false;

                if (timeframe === 'today') {
                    include = this.isSameDay(saleDate, now);
                } else if (timeframe === 'week') {
                    include = this.isSameWeek(saleDate, now);
                } else if (timeframe === 'month') {
                    include = this.isSameMonth(saleDate, now);
                } else if (timeframe === 'year') {
                    include = this.isSameYear(saleDate, now);
                } else if (timeframe === 'all') {
                    include = true;
                }

                if (include) {
                    sales.push({
                        id: childSnapshot.key,
                        ...sale
                    });
                }
            });

            // Sort by date descending (newest first)
            sales.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));

            return sales;

        } catch (error) {
            console.error('Error fetching sales:', error);
            return [];
        }
    }
}

// Create global instance
const salesService = new SalesService();

