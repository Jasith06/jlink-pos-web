// api/scanner.js
module.exports = (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('📱 Scanner API called - Method:', req.method);

  if (req.method === 'POST') {
    const { qr_code, scanner_id, timestamp } = req.body;

    if (!qr_code) {
      return res.status(400).json({
        success: false,
        error: 'QR code is required'
      });
    }

    // Extract product code from QR data
    const productCode = extractProductCode(qr_code);

    const response = {
      success: true,
      message: 'QR code received successfully!',
      qr_code: qr_code,
      product_code: productCode,
      scanner_id: scanner_id || 'ESP32_GM67',
      timestamp: timestamp || Date.now(),
      received_at: new Date().toISOString(),
      status: 'processed',
      instructions: 'Product should be added to cart in web app'
    };

    console.log('✅ Scanner API - Success:', response);

    return res.status(200).json(response);
  }

  // Handle GET requests
  return res.status(200).json({
    success: true,
    message: 'JLINK POS Scanner API is running!',
    method: 'GET',
    timestamp: new Date().toISOString(),
    version: '1.0'
  });
};

// Helper function to extract product code
function extractProductCode(qrData) {
  if (!qrData) return 'UNKNOWN';
  
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
  
  // Format 3: Pipe-delimited (ProductName|Price|Code)
  if (qrData.indexOf('|') !== -1) {
    const parts = qrData.split('|');
    if (parts.length >= 5) {
      return parts[4]; // Product code is the last part
    } else if (parts.length >= 1) {
      return parts[0]; // Use first part as product code
    }
  }
  
  return qrData;
}
