// api/scanner.js - Simple API endpoint
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
  console.log('📦 Request body:', req.body);

  if (req.method === 'POST') {
    const { qr_code, scanner_id, timestamp } = req.body;

    if (!qr_code) {
      return res.status(400).json({
        success: false,
        error: 'QR code is required'
      });
    }

    const response = {
      success: true,
      message: 'QR code received successfully!',
      qr_code: qr_code,
      product_code: qr_code,
      scanner_id: scanner_id || 'ESP32_SCANNER',
      timestamp: timestamp || Date.now(),
      received_at: new Date().toISOString(),
      status: 'processed',
      api_version: '1.0'
    };

    console.log('✅ Scanner API - Success:', response);

    return res.status(200).json(response);
  }

  // Handle GET requests
  return res.status(200).json({
    success: true,
    message: 'Scanner API is running!',
    method: 'GET',
    timestamp: new Date().toISOString()
  });
};
