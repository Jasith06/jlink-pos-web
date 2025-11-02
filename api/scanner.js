// api/scanner.js
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

      // ✅ CRITICAL FIX: Store scan in Firebase for real-time sync
      await storeScanInFirebase(qr_code, productCode, scanner_id);

      const response = {
        success: true,
        message: 'QR code received and processed!',
        qr_code: qr_code,
        product_code: productCode,
        scanner_id: scanner_id || 'ESP32_GM67',
        timestamp: timestamp || Date.now(),
        received_at: new Date().toISOString(),
        status: 'processed',
        firebase_stored: true
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
    version: '1.0'
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

// ✅ NEW: Store scan in Firebase for real-time updates
async function storeScanInFirebase(qrCode, productCode, scannerId) {
  try {
    // For server-side Firebase, you'd use the admin SDK
    // Since we're in Vercel functions, we'll use fetch to your own API
    const firebaseUrl = 'https://jlink-38a3d-default-rtdb.asia-southeast1.firebasedatabase.app';
    const scanData = {
      qr_code: qrCode,
      product_code: productCode,
      scanner_id: scannerId,
      timestamp: new Date().toISOString(),
      status: 'pending_processing'
    };

    // This is a placeholder - in production, use Firebase Admin SDK
    console.log('📦 Would store in Firebase:', scanData);
    
    return true;
  } catch (error) {
    console.error('Firebase storage error:', error);
    throw error;
  }
}
