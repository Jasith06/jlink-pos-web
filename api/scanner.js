// api/scanner.js - ENHANCED WITH DEBUGGING
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
  console.log('📦 Request headers:', req.headers);
  console.log('📦 Request body:', req.body);

  if (req.method === 'POST') {
    try {
      const { qr_code, scanner_id, timestamp } = req.body;

      console.log('🔍 Parsed data:', { qr_code, scanner_id, timestamp });

      if (!qr_code) {
        console.log('❌ Missing QR code');
        return res.status(400).json({
          success: false,
          error: 'QR code is required'
        });
      }

      // Extract product code
      const productCode = extractProductCode(qr_code);
      console.log('🔍 Extracted product code:', productCode);

      // ✅ Initialize global storage if not exists
      if (!global.scannerData) {
        global.scannerData = [];
        console.log('📦 Initialized global scannerData');
      }

      const scanData = {
        id: Date.now() + Math.random(),
        type: 'SCANNER_DATA',
        data: {
          qr_code: qr_code,
          product_code: productCode,
          scanner_id: scanner_id || 'ESP32_GM67',
          timestamp: timestamp || Date.now(),
          received_at: new Date().toISOString(),
          server_time: new Date().toISOString()
        }
      };

      global.scannerData.push(scanData);
      
      // Keep only last 20 scans
      if (global.scannerData.length > 20) {
        global.scannerData = global.scannerData.slice(-20);
      }

      console.log('✅ Scan stored. Total scans:', global.scannerData.length);
      console.log('📊 Current scans:', global.scannerData.map(s => ({ 
        id: s.id, 
        code: s.data.product_code,
        time: s.data.server_time 
      })));

      const response = {
        success: true,
        message: 'QR code received and stored!',
        qr_code: qr_code,
        product_code: productCode,
        scanner_id: scanner_id || 'ESP32_GM67',
        timestamp: timestamp || Date.now(),
        received_at: new Date().toISOString(),
        stored_scans: global.scannerData.length,
        status: 'stored',
        debug: {
          total_scans: global.scannerData.length,
          recent_scans: global.scannerData.slice(-3).map(s => s.data.product_code)
        }
      };

      console.log('✅ Scanner API - Success response:', response);

      return res.status(200).json(response);

    } catch (error) {
      console.error('❌ Scanner API Error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error: ' + error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  // Handle GET requests - return current state
  const currentScans = global.scannerData || [];
  return res.status(200).json({
    success: true,
    message: 'JLINK POS Scanner API is running!',
    method: 'GET',
    timestamp: new Date().toISOString(),
    stored_scans: currentScans.length,
    recent_scans: currentScans.slice(-5).map(s => ({
      id: s.id,
      product_code: s.data.product_code,
      time: s.data.server_time
    }))
  });
}

// Helper function to extract product code
function extractProductCode(qrData) {
  if (!qrData) return 'UNKNOWN';
  
  console.log('🔍 Extracting from QR data:', qrData);
  
  // Remove any carriage returns or newlines
  qrData = qrData.replace(/\r\n/g, '').replace(/\n/g, '').trim();
  
  if (qrData.indexOf('|') === -1 && qrData.indexOf(':') === -1) {
    console.log('📦 Simple QR code format');
    return qrData;
  }
  
  if (qrData.indexOf("PROD:") !== -1) {
    console.log('📦 PROD: format detected');
    const start = qrData.indexOf("PROD:") + 5;
    const end = qrData.indexOf('|', start);
    return qrData.substring(start, end === -1 ? qrData.length : end);
  }
  
  if (qrData.indexOf('|') !== -1) {
    console.log('📦 Pipe-delimited format detected');
    const parts = qrData.split('|');
    console.log('📦 Parts:', parts);
    if (parts.length >= 5) {
      return parts[4];
    } else if (parts.length >= 1) {
      return parts[0];
    }
  }
  
  console.log('📦 Default format - returning original');
  return qrData;
}
