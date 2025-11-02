// api/test.js - TEST API
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('🧪 Test API called');

  if (req.method === 'POST') {
    return res.status(200).json({
      success: true,
      message: 'Test API is working perfectly!',
      method: 'POST',
      timestamp: new Date().toISOString(),
      received_data: req.body
    });
  }

  // Handle GET requests
  return res.status(200).json({
    success: true,
    message: 'JLINK POS Test API is running!',
    method: 'GET',
    timestamp: new Date().toISOString(),
    version: '2.0'
  });
}
