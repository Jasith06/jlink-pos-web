// api/test.js
export default function handler(req, res) {
  console.log('✅ Test API called');
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    console.log('📦 Request body:', req.body);
    
    return res.json({
      success: true,
      message: 'Test API is working!',
      timestamp: new Date().toISOString(),
      your_data: req.body
    });
  }

  return res.json({ 
    message: 'Test API is running!',
    method: req.method 
  });
}
