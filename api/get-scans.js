// api/get-scans.js - WEB APP POLLING API
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const { last_id = 0 } = req.query;
      
      // Get scanner data from global storage
      const scannerData = global.scannerData || [];
      
      // Filter only new data since last_id
      const newData = scannerData.filter(item => item.id > parseFloat(last_id));
      
      const response = {
        success: true,
        data: newData,
        last_id: scannerData.length > 0 ? Math.max(...scannerData.map(item => item.id)) : 0,
        total_scans: scannerData.length,
        timestamp: new Date().toISOString()
      };

      console.log('📡 Get Scans API - Returning:', newData.length, 'new scans');
      
      return res.status(200).json(response);

    } catch (error) {
      console.error('❌ Get Scans API Error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error: ' + error.message
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}
