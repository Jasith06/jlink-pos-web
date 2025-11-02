// api/scanner.js - MAIN SCANNER API
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('📱 Scanner API called - Method:', req.method);

  if (req.method === 'POST') {
    try {
      const { qr_code, scanner_id, timestamp } = req.body;

      if (!qr_code) {
        return res.status(400).json({
          success: false,
          error: 'QR code is required'
        });
      }

      // Extract product code
      const productCode = extractProductCode(qr_code);

      // ✅ Store scan data globally (for web app to poll)
      if (!global.scannerData) {
        global.scannerData = [];
      }

      const scanData = {
        id: Date.now() + Math.random(),
        type: 'SCANNER_DATA',
        data: {
          qr_code: qr_code,
          product_code: productCode,
          scanner_id: scanner_id || 'ESP32_GM67',
          timestamp: timestamp || Date.now(),
          received_at: new Date().toISOString()
        }
      };

      global.scannerData.push(scanData);
      
      // Keep only last 20 scans
      if (global.scannerData.length > 20) {
        global.scannerData = global.scannerData.slice(-20);
      }

      console.log('✅ Scan stored. Total scans:', global.scannerData.length);

      const response = {
        success: true,
        message: 'QR code received and stored!',
        qr_code: qr_code,
        product_code: productCode,
        scanner_id: scanner_id || 'ESP32_GM67',
        timestamp: timestamp || Date.now(),
        received_at: new Date().toISOString(),
        stored_scans: global.scannerData.length,
        status: 'stored'
      };

      console.log('✅ Scanner API - Success:', response);

      return res.status(200).json(response);

    } catch (error) {
      console.error('❌ Scanner API Error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error: ' + error.message
      });
    }
  }

  // Handle GET requests
  return res.status(200).json({
    success: true,
    message: 'JLINK POS Scanner API is running!',
    method: 'GET',
    timestamp: new Date().toISOString(),
    stored_scans: global.scannerData ? global.scannerData.length : 0
  });
}

// Helper function to extract product code
function extractProductCode(qrData) {
  if (!qrData) return 'UNKNOWN';
  
  if (qrData.indexOf('|') === -1 && qrData.indexOf(':') === -1) {
    return qrData;
  }
  
  if (qrData.indexOf("PROD:") !== -1) {
    const start = qrData.indexOf("PROD:") + 5;
    const end = qrData.indexOf('|', start);
    return qrData.substring(start, end === -1 ? qrData.length : end);
  }
  
  if (qrData.indexOf('|') !== -1) {
    const parts = qrData.split('|');
    if (parts.length >= 5) {
      return parts[4];
    } else if (parts.length >= 1) {
      return parts[0];
    }
  }
  
  return qrData;
}
