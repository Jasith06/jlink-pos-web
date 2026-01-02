// api/scanner.js - Vercel Serverless Function with Firebase Queue (FIXED)
import admin from 'firebase-admin';

// ===== FIREBASE CONFIGURATION =====
const FIREBASE_CONFIG = {
  projectId: process.env.FIREBASE_PROJECT_ID || "jlink-38a3d",
  databaseURL: "https://jlink-38a3d-default-rtdb.asia-southeast1.firebasedatabase.app",
};

// ===== INITIALIZE FIREBASE ADMIN =====
let firebaseApp;
try {
  if (!admin.apps.length) {
    // Check if environment variables are set
    if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      console.error('❌ CRITICAL: Firebase environment variables not set in Vercel!');
      console.error('Please add FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in Vercel dashboard');
      throw new Error('Firebase credentials not configured');
    }

    // Initialize with environment variables
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_CONFIG.projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      databaseURL: FIREBASE_CONFIG.databaseURL,
    });
    console.log('✅ Firebase Admin initialized successfully');
    console.log('📧 Client Email:', process.env.FIREBASE_CLIENT_EMAIL);
  } else {
    firebaseApp = admin.app();
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  console.error('Stack:', error.stack);
}

const db = admin.database();
const DEBUG_MODE = process.env.VERCEL_ENV !== 'production';

// ===== HELPER FUNCTIONS =====

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
 * Clean old processed scans from Firebase
 */
const cleanOldScans = async () => {
  try {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const scansRef = db.ref('scanner_queue');
    const snapshot = await scansRef.once('value');
    
    if (!snapshot.exists()) return;
    
    const scans = snapshot.val();
    const updates = {};
    
    Object.entries(scans).forEach(([key, scan]) => {
      // Remove processed scans older than 1 hour
      if (scan.processed && scan.timestamp < oneHourAgo) {
        updates[key] = null;
      }
    });
    
    if (Object.keys(updates).length > 0) {
      await scansRef.update(updates);
      if (DEBUG_MODE) {
        console.log(`🧹 Cleaned ${Object.keys(updates).length} old scans`);
      }
    }
  } catch (error) {
    console.error('❌ Error cleaning old scans:', error.message);
  }
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
    // Check Firebase connection
    if (!firebaseApp) {
      console.error('❌ Firebase not initialized - check environment variables');
      return res.status(500).json({
        success: false,
        error: 'Firebase not initialized',
        message: 'Server configuration error. Check Vercel environment variables.',
        hint: 'Add FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in Vercel dashboard'
      });
    }
    
    // ===== GET REQUEST - Poll for new scans =====
    if (req.method === 'GET') {
      if (DEBUG_MODE) {
        console.log('📥 GET request - Polling for scans');
      }
      
      // Clean old scans first
      await cleanOldScans();
      
      // Get all unprocessed scans from Firebase
      const scansRef = db.ref('scanner_queue');
      const snapshot = await scansRef.orderByChild('processed').equalTo(false).once('value');
      
      if (!snapshot.exists()) {
        return res.status(200).json({
          success: true,
          scans: [],
          count: 0,
          message: 'No new scans available',
          processingTime: Date.now() - startTime
        });
      }
      
      const scans = [];
      const updates = {};
      
      snapshot.forEach((childSnapshot) => {
        const scan = childSnapshot.val();
        scans.push({
          id: childSnapshot.key,
          ...scan
        });
        
        // Mark as processed
        updates[`${childSnapshot.key}/processed`] = true;
        updates[`${childSnapshot.key}/processed_at`] = new Date().toISOString();
      });
      
      // Update all scans as processed
      if (Object.keys(updates).length > 0) {
        await scansRef.update(updates);
      }
      
      if (DEBUG_MODE) {
        console.log(`✅ Returning ${scans.length} new scan(s)`);
      }
      
      return res.status(200).json({
        success: true,
        scans: scans,
        count: scans.length,
        message: `${scans.length} new scan(s) retrieved`,
        processingTime: Date.now() - startTime
      });
    }
    
    // ===== POST REQUEST =====
    if (req.method === 'POST') {
      // Handle different POST actions based on request body
      const { action, qr_code, scanner_id, timestamp, product_code, total } = req.body;
      
      // ===== ACTION: complete_sale =====
      if (action === 'complete_sale') {
        if (DEBUG_MODE) {
          console.log('💰 POST request - Sale completion');
          console.log('Total:', total);
        }
        
        // Validate required fields
        if (typeof total === 'undefined') {
          return res.status(400).json({
            success: false,
            error: 'Total amount is required for sale completion'
          });
        }
        
        const completionData = {
          action: 'sale_complete',
          total: total,
          timestamp: Date.now(),
          processed: false,
          server_time: Date.now()
        };
        
        // Save to Firebase
        const scansRef = db.ref('scanner_queue');
        const newScanRef = scansRef.push();
        await newScanRef.set(completionData);
        
        if (DEBUG_MODE) {
          console.log('✅ Sale completion saved to Firebase:', completionData);
        }
        
        return res.status(200).json({
          success: true,
          message: 'Sale completion sent to scanner',
          scan_id: newScanRef.key,
          total: total,
          timestamp: completionData.timestamp,
          processingTime: Date.now() - startTime
        });
      }
      
      // ===== ACTION: New QR scan (default behavior) =====
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
      const extractedCode = product_code || extractProductCode(qr_code);
      
      if (!extractedCode) {
        console.warn('⚠️ Could not extract product code from QR data');
        return res.status(400).json({
          success: false,
          error: 'Invalid QR code format - could not extract product code',
          qr_code_received: qr_code
        });
      }
      
      // Create scan data object
      const scanData = {
        qr_code: qr_code,
        product_code: extractedCode,
        scanner_id: scanner_id || 'UNKNOWN',
        timestamp: timestamp || Date.now(),
        received_at: new Date().toISOString(),
        processed: false,
        server_time: Date.now()
      };
      
      // Save to Firebase
      const scansRef = db.ref('scanner_queue');
      const newScanRef = scansRef.push();
      await newScanRef.set(scanData);
      
      const scanId = newScanRef.key;
      
      console.log('✅ Scan saved to Firebase:', {
        id: scanId,
        product_code: extractedCode,
        scanner_id: scanData.scanner_id
      });
      
      return res.status(200).json({
        success: true,
        message: 'QR code received and queued successfully',
        scan_id: scanId,
        qr_code: qr_code,
        product_code: extractedCode,
        scanner_id: scanData.scanner_id,
        received_at: scanData.received_at,
        instructions: 'Product will appear in shopping cart when POS polls for updates',
        processingTime: Date.now() - startTime
      });
    }
    
    // ===== DELETE REQUEST - Clear queue =====
    if (req.method === 'DELETE') {
      if (DEBUG_MODE) {
        console.log('🗑️ DELETE request - Clearing queue');
      }
      
      const scansRef = db.ref('scanner_queue');
      await scansRef.remove();
      
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
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      ...(DEBUG_MODE && { 
        stack: error.stack,
        hint: 'Check Vercel logs for details'
      })
    });
  }
}
