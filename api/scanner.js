// api/scanner.js - Vercel Serverless Function (Fixed)
import fs from 'fs';
import path from 'path';

// ===== CONFIGURATION =====
const QUEUE_FILE = '/tmp/scanner_queue.json';
const MAX_QUEUE_SIZE = 100;
const DEBUG_MODE = process.env.VERCEL_ENV !== 'production';

// ===== HELPER FUNCTIONS =====

/**
 * Read scanner queue from temporary storage
 */
const readQueue = () => {
  try {
    if (fs.existsSync(QUEUE_FILE)) {
      const content = fs.readFileSync(QUEUE_FILE, 'utf8');
      const queue = JSON.parse(content);
      
      if (DEBUG_MODE) {
        console.log(`📖 Read ${queue.length} items from queue`);
      }
      
      return Array.isArray(queue) ? queue : [];
    }
  } catch (error) {
    console.error('❌ Error reading queue:', error.message);
  }
  return [];
};

/**
 * Write scanner queue to temporary storage
 */
const writeQueue = (queue) => {
  try {
    // Ensure /tmp directory exists
    const tmpDir = path.dirname(QUEUE_FILE);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf8');
    
    if (DEBUG_MODE) {
      console.log(`💾 Wrote ${queue.length} items to queue`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error writing queue:', error.message);
    return false;
  }
};

/**
 * Extract product code from various QR code formats
 */
const extractProductCode = (qrData) => {
  if (!qrData || typeof qrData !== 'string') {
    return '';
  }
  
  const data = qrData.trim();
  
  // Format 1: Plain product code (no special characters)
  if (!data.includes('|') && !data.includes(':') && !data.includes('\n')) {
    return data;
  }
  
  // Format 2: PROD:CODE format
  if (data.includes('PROD:')) {
    const match = data.match(/PROD:([^|\n]+)/);
    if (match) {
      return match[1].trim();
    }
  }
  
  // Format 3: Pipe-delimited (ProductName|Price|MFD|EXP|ProductCode)
  if (data.includes('|')) {
    const parts = data.split('|');
    if (parts.length >= 5) {
      return parts[4].trim();
    }
    // Fallback: last part is product code
    if (parts.length > 0) {
      return parts[parts.length - 1].trim();
    }
  }
  
  // Format 4: Multi-line format
  if (data.includes('\n')) {
    const lines = data.split('\n');
    for (const line of lines) {
      if (line.includes('CODE:') || line.includes('PROD:')) {
        return line.split(':')[1]?.trim() || '';
      }
    }
  }
  
  // Default: return as-is
  return data;
};

/**
 * Generate unique scan ID
 */
const generateScanId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `scan_${timestamp}_${random}`;
};

/**
 * Clean old processed scans from queue
 */
const cleanOldScans = (queue) => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  return queue.filter(scan => {
    // Keep unprocessed scans
    if (!scan.processed) return true;
    
    // Keep processed scans less than 1 hour old
    if (scan.timestamp > oneHourAgo) return true;
    
    return false;
  });
};

// ===== MAIN HANDLER =====

export default async function handler(req, res) {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const startTime = Date.now();
  
  try {
    // ===== GET REQUEST - Poll for new scans =====
    if (req.method === 'GET') {
      if (DEBUG_MODE) {
        console.log('📥 GET request - Polling for scans');
      }
      
      let queue = readQueue();
      
      // Clean old scans
      queue = cleanOldScans(queue);
      
      // Find new unprocessed scans
      const newScans = queue.filter(scan => !scan.processed);
      
      if (newScans.length === 0) {
        return res.status(200).json({
          success: true,
          scans: [],
          count: 0,
          message: 'No new scans available',
          processingTime: Date.now() - startTime
        });
      }
      
      // Mark scans as processed
      const scanIds = newScans.map(scan => scan.id);
      const updatedQueue = queue.map(scan => {
        if (scanIds.includes(scan.id)) {
          return {
            ...scan,
            processed: true,
            processed_at: new Date().toISOString()
          };
        }
        return scan;
      });
      
      writeQueue(updatedQueue);
      
      if (DEBUG_MODE) {
        console.log(`✅ Returning ${newScans.length} new scan(s)`);
      }
      
      return res.status(200).json({
        success: true,
        scans: newScans,
        count: newScans.length,
        message: `${newScans.length} new scan(s) retrieved`,
        processingTime: Date.now() - startTime
      });
    }
    
    // ===== POST REQUEST - Add new scan from ESP32 =====
    if (req.method === 'POST') {
      const { qr_code, scanner_id, timestamp } = req.body;
      
      // Validate required fields
      if (!qr_code) {
        console.warn('⚠️ POST request missing qr_code');
        return res.status(400).json({
          success: false,
          error: 'QR code is required',
          field: 'qr_code'
        });
      }
      
      if (DEBUG_MODE) {
        console.log('📤 POST request - New scan received');
        console.log('QR Data:', qr_code);
        console.log('Scanner ID:', scanner_id || 'UNKNOWN');
      }
      
      // Extract product code
      const productCode = extractProductCode(qr_code);
      
      if (!productCode) {
        console.warn('⚠️ Could not extract product code from QR data');
        return res.status(400).json({
          success: false,
          error: 'Invalid QR code format - could not extract product code',
          qr_code_received: qr_code
        });
      }
      
      // Create scan data object
      const scanData = {
        id: generateScanId(),
        qr_code: qr_code,
        product_code: productCode,
        scanner_id: scanner_id || 'UNKNOWN',
        timestamp: timestamp || Date.now(),
        received_at: new Date().toISOString(),
        processed: false,
        server_time: Date.now()
      };
      
      // Read current queue
      let queue = readQueue();
      
      // Clean old scans before adding new one
      queue = cleanOldScans(queue);
      
      // Add new scan to queue
      queue.push(scanData);
      
      // Limit queue size
      if (queue.length > MAX_QUEUE_SIZE) {
        queue = queue.slice(-MAX_QUEUE_SIZE);
      }
      
      // Write updated queue
      const writeSuccess = writeQueue(queue);
      
      if (!writeSuccess) {
        console.error('❌ Failed to write queue');
        return res.status(500).json({
          success: false,
          error: 'Failed to save scan data',
          scan_id: scanData.id
        });
      }
      
      console.log('✅ Scan added to queue:', {
        id: scanData.id,
        product_code: productCode,
        scanner_id: scanData.scanner_id
      });
      
      return res.status(200).json({
        success: true,
        message: 'QR code received and queued successfully',
        scan_id: scanData.id,
        qr_code: qr_code,
        product_code: productCode,
        scanner_id: scanData.scanner_id,
        received_at: scanData.received_at,
        queue_position: queue.length,
        instructions: 'Product will appear in shopping cart when POS polls for updates',
        processingTime: Date.now() - startTime
      });
    }
    
    // ===== DELETE REQUEST - Clear queue (optional) =====
    if (req.method === 'DELETE') {
      if (DEBUG_MODE) {
        console.log('🗑️ DELETE request - Clearing queue');
      }
      
      writeQueue([]);
      
      return res.status(200).json({
        success: true,
        message: 'Scanner queue cleared',
        processingTime: Date.now() - startTime
      });
    }
    
    // ===== METHOD NOT ALLOWED =====
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
      allowed_methods: ['GET', 'POST', 'DELETE', 'OPTIONS']
    });
    
  } catch (error) {
    console.error('❌ Scanner API Error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      ...(DEBUG_MODE && { stack: error.stack })
    });
  }
}
