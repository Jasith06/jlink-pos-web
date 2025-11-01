class EmailService {
    constructor() {
        // Using EmailJS for email sending (free tier available)
        this.emailjsConfig = {
            serviceId: 'service_5vh8pnq', // From Email Services tab
            templateId: 'template_4ouqdry', // From Templates tab (copy from URL)
            publicKey: 'G4dKsQOK9_vg9Mi2o' // From Account > API Keys
        };

        this.isEmailJSReady = false;
        this.initializeEmailJS();
    }

    initializeEmailJS() {
        // Check if EmailJS is available
        if (typeof emailjs !== 'undefined') {
            try {
                emailjs.init(this.emailjsConfig.publicKey);
                this.isEmailJSReady = true;
                console.log('EmailJS initialized successfully');
            } catch (error) {
                console.warn('EmailJS initialization failed:', error);
            }
        } else {
            console.warn('EmailJS not loaded - email receipts will be simulated');
        }
    }

    // Send receipt email to customer
    async sendReceiptEmail(customerEmail, saleData) {
        try {
            // Method 1: Using EmailJS (Recommended - Free)
            if (this.isEmailJSReady) {
                await this.sendWithEmailJS(customerEmail, saleData);
                console.log('Receipt email sent successfully to:', customerEmail);
                return true;
            } else {
                // Fallback: Simulate email sending for demo
                console.log('Simulating email receipt to:', customerEmail);
                await this.simulateEmail(customerEmail, saleData);
                return true;
            }

        } catch (error) {
            console.error('Email sending failed:', error);

            // Even if email fails, we don't want to fail the sale
            return false;
        }
    }

    // Send email using EmailJS
    async sendWithEmailJS(customerEmail, saleData) {
        if (!this.isEmailJSReady) {
            throw new Error('EmailJS not ready');
        }

        const templateParams = {
            to_email: customerEmail,
            customer_name: saleData.customerName || 'Valued Customer',
            customer_email: customerEmail, // Added this for the template
            sale_id: saleData.saleId,
            sale_date: new Date(saleData.timestamp).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            items: this.formatItemsForEmail(saleData.items),
            subtotal: `LKR ${saleData.totals.subtotal.toFixed(2)}`,
            tax: `LKR ${saleData.totals.tax.toFixed(2)}`, // Will show LKR 0.00
            total: `LKR ${saleData.totals.total.toFixed(2)}`,
            store_name: 'JLINK Store',
            thank_you_message: 'Thank you for choosing JLINK Store! We appreciate your business.'
        };

        await emailjs.send(
            this.emailjsConfig.serviceId,
            this.emailjsConfig.templateId,
            templateParams,
            this.emailjsConfig.publicKey
        );
    }

    // Simulate email for demo purposes
    async simulateEmail(customerEmail, saleData) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('Simulated email details:', {
            to: customerEmail,
            saleId: saleData.saleId,
            total: saleData.totals.total,
            items: saleData.items.length
        });

        return true;
    }

    // Format items for email template - UPDATED for table format
    formatItemsForEmail(items) {
        if (typeof items === 'string') {
            // If items is already a string (from template), return as is
            return items;
        }

        // Convert items array to HTML table rows for the new template
        return items.map(item =>
            `<tr>
                <td class="item-name">${this.escapeHtml(item.name)}${item.productCode ? `<br><small style="color: #666; font-size: 12px;">Code: ${item.productCode}</small>` : ''}</td>
                <td class="item-qty">${item.quantity}</td>
                <td class="item-price">LKR ${item.price.toFixed(2)}</td>
                <td class="item-total">LKR ${(item.price * item.quantity).toFixed(2)}</td>
            </tr>`
        ).join('');
    }

    // Helper function to escape HTML for safety
    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Test method for email functionality
    async testEmail() {
        const testData = {
            customerEmail: 'test@example.com',
            saleData: {
                saleId: 'TEST-001',
                customerName: 'Test Customer',
                items: [
                    {
                        name: 'Test Product 1',
                        productCode: 'TEST-001',
                        quantity: 2,
                        price: 100.00,
                        total: 200.00
                    },
                    {
                        name: 'Test Product 2',
                        productCode: 'TEST-002',
                        quantity: 1,
                        price: 50.00,
                        total: 50.00
                    }
                ],
                totals: {
                    subtotal: 250.00,
                    tax: 0.00, // Tax is 0 now
                    total: 250.00
                },
                timestamp: new Date().toISOString()
            }
        };

        try {
            console.log('Testing email service...');
            const result = await this.sendReceiptEmail(testData.customerEmail, testData.saleData);
            console.log('Email test result:', result);
            return result;
        } catch (error) {
            console.error('Email test failed:', error);
            return false;
        }
    }
}

// Create global instance
const emailService = new EmailService();