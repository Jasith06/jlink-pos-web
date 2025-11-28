// api/test.js - Vercel Serverless Function for Testing
// This replaces your PHP test.php

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const testData = {
    status: 'online',
    message: 'JLINK POS API is working on Vercel! 🚀',
    timestamp: new Date().toISOString(),
    server: 'Vercel Serverless Functions',
    node_version: process.version,
    region: process.env.VERCEL_REGION || 'unknown',
    environment: process.env.VERCEL_ENV || 'development',
    endpoints: {
      test: '/api/test',
      scanner: '/api/scanner'
    },
    firebase: {
      database_url: process.env.FIREBASE_DATABASE_URL || 'https://jlink-38a3d-default-rtdb.asia-southeast1.firebasedatabase.app',
      configured: true
    },
    system: {
      platform: process.platform,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    }
  };

  console.log('Test endpoint accessed:', testData);

  return res.status(200).json(testData);
}
