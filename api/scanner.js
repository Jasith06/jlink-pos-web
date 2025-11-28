// api/scanner.js - Vercel Serverless Function for QR Scanner
// This replaces your PHP scanner.php

// In-memory queue (resets on cold start - use Firebase for persistence)
let scannerQueue = [];

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Log request
  console.log('Scanner API Request:', {
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  try {
    // GET - Poll for new scans
    if (req.method === 'GET') {
      return handlePollRequest(req, res);
    }

    // POST - Add new scan
    if (req.method === 'POST') {
      return handlePostRequest(req, res);
    }

    // Other methods not allowed
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed'
    });

  } catch (error) {
    console.error('Scanner API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error'
    });
  }
}

// Handle POST - Add scan to queue
function handlePostRequest(req, res) {
  const { qr_code, scanner_id, timestamp } = req.body || {};

  console.log('POST data received:', { qr_code, scanner_id, timestamp });

  // Validate required fields
  if (!qr_code) {
    console.log('Missing qr_code field');
    return res.status(400).json({
      success: false,
      error: 'QR code is required'
    });
  }

  // Extract product code from QR data
  const productCode = extractProductCode(qr_code);

  // Create scan data
  const scanData = {
    id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    qr_code: qr_code,
    product_code: productCode,
    scanner_id: scanner_id || 'UNKNOWN',
    timestamp: Date.now(),
    received_at: new Date().toISOString(),
    processed: false
  };

  // Add to queue
  scannerQueue.push(scanData);

  // Keep only last 100 scans to prevent memory issues
  if (scannerQueue.length > 100) {
    scannerQueue = scannerQueue.slice(-100);
  }

  console.log('Scan added to queue:', scanData);
  console.log('Current queue size:', scannerQueue.length);

  // Send response
  return res.status(200).json({
    success: true,
    message: 'QR code received and queued successfully',
    qr_code: qr_code,
    product_code: productCode,
    scanner_id: scanData.scanner_id,
    scan_id: scanData.id,
    received_at: scanData.received_at,
    instructions: 'Product will appear in shopping cart when web POS polls for updates'
  });
}

// Handle GET - Poll for new scans
function handlePollRequest(req, res) {
  // Find unprocessed scans
  const newScans = scannerQueue.filter(scan => !scan.processed);

  if (newScans.length === 0) {
    return res.status(200).json({
      success: true,
      scans: [],
      message: 'No new scans'
    });
  }

  console.log('Returning new scans:', newScans.length);

  // Mark scans as processed
  const scanIds = newScans.map(scan => scan.id);
  scannerQueue = scannerQueue.map(scan => {
    if (scanIds.includes(scan.id)) {
      return {
        ...scan,
        processed: true,
        processed_at: new Date().toISOString()
      };
    }
    return scan;
  });

  // Return new scans
  return res.status(200).json({
    success: true,
    scans: newScans,
    count: newScans.length,
    message: 'New scans retrieved'
  });
}

// Extract product code from QR data
function extractProductCode(qrData) {
  if (!qrData) return '';

  // Format 1: Just product code (e.g., "RAPIDENE-001")
  if (qrData.indexOf('|') === -1 && qrData.indexOf(':') === -1) {
    return qrData.trim();
  }

  // Format 2: PROD:CODE format
  if (qrData.indexOf('PROD:') !== -1) {
    const start = qrData.indexOf('PROD:') + 5;
    const end = qrData.indexOf('|', start);
    if (end === -1) {
      return qrData.substring(start).trim();
    }
    return qrData.substring(start, end).trim();
  }

  // Format 3: Pipe-delimited (ProductName|Price|MFD|EXP|ProductCode)
  if (qrData.indexOf('|') !== -1) {
    const parts = qrData.split('|');
    if (parts.length >= 5) {
      return parts[4].trim(); // Product code is the last part
    }
  }

  // If no specific format detected, return original
  return qrData.trim();
}
