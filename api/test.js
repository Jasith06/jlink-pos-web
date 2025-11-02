// api/test.js
export default function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method === 'POST') {
    console.log('✅ Test API - POST received:', request.body);
    
    return response.status(200).json({
      success: true,
      message: 'Test API is working perfectly!',
      method: 'POST',
      timestamp: new Date().toISOString(),
      received_data: request.body
    });
  }

  // Handle GET requests
  return response.status(200).json({
    success: true,
    message: 'Test API is running!',
    method: 'GET',
    timestamp: new Date().toISOString()
  });
}
