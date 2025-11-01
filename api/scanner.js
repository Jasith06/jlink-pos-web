// api/scanner.js
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Scanner API called');
    console.log('📦 Request body:', req.body);

    const { qr_code, scanner_id, timestamp } = req.body;

    if (!qr_code) {
      return res.status(400).json({
        success: false,
        error: 'QR code is required'
      });
    }

    // Simple response
    const response = {
      success: true,
      message: 'QR code received successfully!',
      qr_code: qr_code,
      product_code: qr_code, // Use QR code as product code for now
      scanner_id: scanner_id || 'ESP32_SCANNER',
      timestamp: timestamp || Date.now(),
      received_at: new Date().toISOString(),
      status: 'processed'
    };

    console.log('✅ Scanner API - Success:', response);

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Scanner API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    });
  }
}
