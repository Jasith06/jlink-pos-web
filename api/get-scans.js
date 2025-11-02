// api/get-scans.js - ENHANCED WITH DEBUGGING
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('📡 Get Scans API called - Method:', req.method);
  console.log('🔍 Query parameters:', req.query);

  if (req.method === 'GET') {
    try {
      const { last_id = 0 } = req.query;
      
      // Get scanner data from global storage
      const scannerData = global.scannerData || [];
      
      console.log('📊 Total scans in memory:', scannerData.length);
      console.log('🔍 Looking for scans after ID:', last_id);
      
      // Filter only new data since last_id
      const newData = scannerData.filter(item => item.id > parseFloat(last_id));
      
      console.log('📦 New scans found:', newData.length);
      if (newData.length > 0) {
        console.log('📦 New scan IDs:', newData.map(item => item.id));
      }

      const response = {
        success: true,
        data: newData,
        last_id: scannerData.length > 0 ? Math.max(...scannerData.map(item => item.id)) : 0,
        total_scans: scannerData.length,
        new_scans: newData.length,
        timestamp: new Date().toISOString(),
        debug: {
          memory_usage: process.memoryUsage(),
          recent_scans: scannerData.slice(-3).map(s => ({
            id: s.id,
            code: s.data.product_code
          }))
        }
      };

      console.log('📡 Get Scans API - Response:', {
        new_scans: newData.length,
        total_scans: scannerData.length,
        last_id: response.last_id
      });
      
      return res.status(200).json(response);

    } catch (error) {
      console.error('❌ Get Scans API Error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error: ' + error.message,
        debug_info: {
          scanner_data_exists: !!global.scannerData,
          scanner_data_length: global.scannerData ? global.scannerData.length : 0
        }
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}
