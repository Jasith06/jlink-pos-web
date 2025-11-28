// api/scanner.js - Vercel Serverless Function
// This replaces scanner.php

import fs from 'fs';
import path from 'path';

// Helper function to get queue file path
const getQueuePath = () => {
  // Vercel uses /tmp for temporary storage
  return '/tmp/scanner_queue.json';
};

// Read queue from file
const readQueue = () => {
  try {
    const queuePath = getQueuePath();
    if (fs.existsSync(queuePath)) {
      const content = fs.readFileSync(queuePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error reading queue:', error);
  }
  return [];
};

// Write queue to file
const writeQueue = (queue) => {
  try {
    const queuePath = getQueuePath();
    fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));
  } catch (error) {
    console.error('Error writing queue:', error);
  }
};

// Extract product code from QR data
const extractProductCode = (qrData) => {
  // Format 1: Just product code
  if (!qrData.includes('|') && !qrData.includes(':')) {
    return qrData.trim();
  }
  
  // Format 2: PROD:CODE format
  if (qrData.includes('PROD:')) {
    const start = qrData.indexOf('PROD:') + 5;
    const end = qrData.indexOf('|', start);
    if (end === -1) {
      return qrData.substring(start);
    }
    return qrData.substring(start, end);
  }
  
  // Format 3: Pipe-delimited (ProductName|Price|MFD|EXP|ProductCode)
  if (qrData.includes('|')) {
    const parts = qrData.split('|');
    if (parts.length >= 5) {
      return parts[4].trim();
    }
  }
  
  return qrData.trim();
};

// Main handler
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Handle GET request - Poll for new scans
    if (req.method === 'GET') {
      const queue = readQueue();
      const newScans = queue.filter(scan => !scan.processed);
      
      if (newScans.length === 0) {
        return res.status(200).json({
          success: true,
          scans: [],
          message: 'No new scans'
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
      
      return res.status(200).json({
        success: true,
        scans: newScans,
        count: newScans.length,
        message: 'New scans retrieved'
      });
    }
    
    // Handle POST request - Add new scan
    if (req.method === 'POST') {
      const { qr_code, scanner_id, timestamp } = req.body;
      
      if (!qr_code) {
        return res.status(400).json({
          success: false,
          error: 'QR code is required'
        });
      }
      
      const productCode = extractProductCode(qr_code);
      
      const scanData = {
        id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        qr_code,
        product_code: productCode,
        scanner_id: scanner_id || 'UNKNOWN',
        timestamp: Date.now(),
        received_at: new Date().toISOString(),
        processed: false
      };
      
      // Add to queue
      const queue = readQueue();
      queue.push(scanData);
      
      // Keep only last 100 scans
      if (queue.length > 100) {
        queue.splice(0, queue.length - 100);
      }
      
      writeQueue(queue);
      
      console.log('✅ Scan added to queue:', scanData);
      
      return res.status(200).json({
        success: true,
        message: 'QR code received and queued successfully',
        qr_code,
        product_code: productCode,
        scanner_id: scanData.scanner_id,
        scan_id: scanData.id,
        received_at: scanData.received_at,
        instructions: 'Product will appear in shopping cart when web POS polls for updates'
      });
    }
    
    // Method not allowed
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed'
    });
    
  } catch (error) {
    console.error('❌ Scanner API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
