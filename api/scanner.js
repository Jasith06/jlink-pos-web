export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method Not Allowed'
        });
    }

    try {
        // Parse the incoming data from ESP32
        const { qr_code, product_code, scanner_id, timestamp } = req.body;

        console.log('📱 Scanner API - Received:', {
            qr_code,
            product_code,
            scanner_id,
            timestamp: new Date().toISOString()
        });

        // Validate required fields
        if (!qr_code) {
            return res.status(400).json({
                success: false,
                error: 'QR code is required'
            });
        }

        // Extract product code
        const productCode = product_code || extractProductCode(qr_code);

        // Success response
        const response = {
            success: true,
            message: 'QR code received successfully - product should be added to cart',
            qr_code: qr_code,
            product_code: productCode,
            scanner_id: scanner_id,
            received_at: new Date().toISOString(),
            instructions: 'The product should now appear in the shopping cart'
        };

        console.log('✅ Scanner API - Success:', response);

        // Return success response
        return res.status(200).json(response);

    } catch (error) {
        console.error('❌ Scanner API - Error:', error);

        return res.status(500).json({
            success: false,
            error: 'Internal server error: ' + error.message
        });
    }
}

// Helper function to extract product code from QR data
function extractProductCode(qrData) {
    // Handle different QR code formats
    
    // Format 1: Just product code (e.g., "RAPIDENE-001")
    if (qrData.indexOf('|') === -1 && qrData.indexOf(':') === -1) {
        return qrData;
    }
    
    // Format 2: PROD:CODE format
    if (qrData.indexOf("PROD:") !== -1) {
        const start = qrData.indexOf("PROD:") + 5;
        const end = qrData.indexOf('|', start);
        return qrData.substring(start, end === -1 ? qrData.length : end);
    }
    
    // Format 3: Pipe-delimited (ProductName|Price|MFD|EXP|ProductCode)
    if (qrData.indexOf('|') !== -1) {
        const parts = qrData.split('|');
        if (parts.length >= 5) {
            return parts[4]; // Product code is the last part
        }
    }
    
    // If no specific format detected, return original
    return qrData;
}