// email-service.js - Complete Email Service

class EmailService {
    constructor() {
        console.log('📧 EmailService initializing...');

        // EmailJS Configuration
        this.emailjsConfig = {
            serviceId: 'service_ymc99a9',     // Your Gmail service
            templateId: 'template_3gq6ogk',    // Your template
            publicKey: 'jFdqZeEaQHrsT3Dpz'    // Your public key
        };

        this.isEmailJSReady = false;

        // Wait for EmailJS to be available
        if (typeof emailjs !== 'undefined') {
            this.initializeEmailJS();
        } else {
            console.warn('⚠️ EmailJS not loaded yet, will retry...');
            setTimeout(() => this.initializeEmailJS(), 1000);
        }
    }

    initializeEmailJS() {
        if (typeof emailjs === 'undefined') {
            console.error('❌ EmailJS library not found');
            return;
        }

        try {
            emailjs.init(this.emailjsConfig.publicKey);
            this.isEmailJSReady = true;
            console.log('✅ EmailJS initialized successfully');
            console.log('📧 Service ID:', this.emailjsConfig.serviceId);
            console.log('📧 Template ID:', this.emailjsConfig.templateId);
        } catch (error) {
            console.error('❌ EmailJS initialization failed:', error);
        }
    }

    async sendReceiptEmail(customerEmail, saleData) {
        console.log('📧 Starting email send process...');
        console.log('📧 Customer email:', customerEmail);
        console.log('📧 Sale data:', saleData);

        if (!this.isEmailJSReady) {
            console.error('❌ EmailJS not ready');
            alert('Email service is not initialized. Receipt not sent.\n\nPlease refresh the page and try again.');
            return false;
        }

        try {
            // Format items for email
            const itemsHTML = this.formatItemsForEmailHTML(saleData.items);
            const itemsText = this.formatItemsForEmailText(saleData.items);

            // Prepare template parameters
            const templateParams = {
                to_email: customerEmail,
                customer_email: customerEmail,
                customer_name: saleData.customerName || 'Valued Customer',
                sale_id: saleData.saleId,
                sale_date: this.formatDate(saleData.timestamp),
                items_html: itemsHTML,
                items_text: itemsText,
                subtotal: `LKR ${saleData.totals.subtotal.toFixed(2)}`,
                tax: `LKR ${saleData.totals.tax.toFixed(2)}`,
                total: `LKR ${saleData.totals.total.toFixed(2)}`,
                store_name: 'JLINK Store',
                store_address: 'Colombo, Sri Lanka',
                store_phone: '+94759620983',
                store_email: 'balorjasithbalor2017@gmail.com',
                thank_you_message: 'Thank you for shopping with us! We appreciate your business and look forward to serving you again.'
            };

            console.log('📦 Sending email with params:', {
                to: customerEmail,
                sale_id: saleData.saleId,
                items_count: saleData.items.length,
                total: templateParams.total
            });

            // METHOD 1: Try with emailjs.send (recommended)
            console.log('Attempting Method 1: emailjs.send()');
            try {
                const response = await emailjs.send(
                    this.emailjsConfig.serviceId,
                    this.emailjsConfig.templateId,
                    templateParams
                );

                console.log('✅ EmailJS Response:', response);

                if (response.status === 200) {
                    console.log('✅ Email sent successfully to:', customerEmail);
                    return true;
                }
            } catch (sendError) {
                console.warn('Method 1 failed, trying Method 2...', sendError);

                // METHOD 2: Try with direct API call (fallback)
                console.log('Attempting Method 2: Direct API');
                const directResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        service_id: this.emailjsConfig.serviceId,
                        template_id: this.emailjsConfig.templateId,
                        user_id: this.emailjsConfig.publicKey,
                        template_params: templateParams
                    })
                });

                if (directResponse.ok) {
                    console.log('✅ Email sent via direct API');
                    return true;
                } else {
                    const errorData = await directResponse.json();
                    throw new Error(errorData.message || 'Direct API failed');
                }
            }

            return false;

        } catch (error) {
            console.error('❌ Email sending error:', error);
            console.error('Error details:', error);

            // Check specific error types
            if (error.status === 404) {
                alert(`❌ EmailJS Account Error\n\nThe public key or account is not found.\n\nPlease verify:\n1. Public Key: ${this.emailjsConfig.publicKey}\n2. Account is active at emailjs.com\n3. Service is connected`);
            } else if (error.status === 400) {
                alert(`❌ Email Configuration Error\n\nService or Template not found.\n\nPlease verify:\n1. Service ID: ${this.emailjsConfig.serviceId}\n2. Template ID: ${this.emailjsConfig.templateId}\n3. Both exist in EmailJS dashboard`);
            } else {
                alert(`Email send failed: ${error.text || error.message}\n\nCheck browser console for details.`);
            }

            return false;
        }
    }

    formatItemsForEmailHTML(items) {
        if (!items || items.length === 0) {
            return '<tr><td colspan="4">No items</td></tr>';
        }

        return items.map(item => {
            const itemName = this.escapeHtml(item.name);
            const productCode = item.productCode ? `<br><small style="color: #666;">${this.escapeHtml(item.productCode)}</small>` : '';

            return `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">
                        ${itemName}${productCode}
                    </td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
                        ${item.quantity}
                    </td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                        LKR ${item.price.toFixed(2)}
                    </td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">
                        LKR ${(item.price * item.quantity).toFixed(2)}
                    </td>
                </tr>
            `;
        }).join('');
    }

    formatItemsForEmailText(items) {
        if (!items || items.length === 0) {
            return 'No items in this order';
        }

        let text = '\n';
        items.forEach(item => {
            const itemName = item.name;
            const productCode = item.productCode ? ` (${item.productCode})` : '';
            const qty = item.quantity;
            const price = item.price.toFixed(2);
            const total = (item.price * item.quantity).toFixed(2);

            text += `${itemName}${productCode}\n`;
            text += `  Qty: ${qty} x LKR ${price} = LKR ${total}\n\n`;
        });

        return text;
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        };
        return date.toLocaleDateString('en-US', options);
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async testEmail() {
        console.log('🧪 Testing email service...');

        if (!this.isEmailJSReady) {
            console.error('❌ EmailJS not initialized');
            alert('EmailJS is not initialized. Please check:\n1. EmailJS library is loaded\n2. Public key is correct\n3. Internet connection is active');
            return false;
        }

        const testEmail = prompt('Enter your email address to test:', 'your-email@example.com');

        if (!testEmail) {
            console.log('Test cancelled');
            return false;
        }

        const testData = {
            customerEmail: testEmail,
            customerName: 'Test Customer',
            saleId: 'TEST-' + Date.now(),
            items: [
                {
                    name: 'Rapidene 500mg',
                    productCode: 'RAPIDENE-001',
                    quantity: 2,
                    price: 150.00
                },
                {
                    name: 'Bisoprolol 2.5mg',
                    productCode: 'BISOPROLOL-001',
                    quantity: 1,
                    price: 350.00
                }
            ],
            totals: {
                subtotal: 650.00,
                tax: 0.00,
                total: 650.00
            },
            timestamp: new Date().toISOString()
        };

        console.log('📧 Sending test email to:', testEmail);

        try {
            const result = await this.sendReceiptEmail(testEmail, testData);

            if (result) {
                console.log('✅ Test email sent successfully!');
                alert(`✅ Test email sent to: ${testEmail}\n\nCheck your inbox (and spam folder)!`);
            } else {
                console.error('❌ Test email failed');
                alert('❌ Test email failed. Check console for details.');
            }

            return result;
        } catch (error) {
            console.error('❌ Test email error:', error);
            alert('❌ Test email error: ' + error.message);
            return false;
        }
    }

    checkConfiguration() {
        console.log('🔍 Checking EmailJS configuration...');

        const checks = {
            'EmailJS Library Loaded': typeof emailjs !== 'undefined',
            'Service ID Set': !!this.emailjsConfig.serviceId,
            'Template ID Set': !!this.emailjsConfig.templateId,
            'Public Key Set': !!this.emailjsConfig.publicKey,
            'EmailJS Initialized': this.isEmailJSReady
        };

        console.table(checks);

        const allPassed = Object.values(checks).every(v => v === true);

        if (allPassed) {
            console.log('✅ All configuration checks passed!');
            alert('✅ Email service is properly configured!\n\nYou can now test with: testEmailService()');
        } else {
            console.error('❌ Some configuration checks failed');
            const failedChecks = Object.entries(checks)
                .filter(([k, v]) => !v)
                .map(([k]) => k);

            console.log('Failed checks:', failedChecks);
            alert('❌ Configuration issues:\n\n' + failedChecks.join('\n'));
        }

        return allPassed;
    }
}

// Create global instance
console.log('📧 Creating emailService instance...');
const emailService = new EmailService();

// Export test functions to window
window.testEmailService = function () {
    return emailService.testEmail();
};

window.checkEmailConfig = function () {
    return emailService.checkConfiguration();
};

console.log('✅ EmailService loaded successfully');
console.log('💡 Test with: testEmailService()');
console.log('💡 Check config with: checkEmailConfig()');
