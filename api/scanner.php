<?php
// scanner.php - Handle QR Scanner Data with Queue System

require_once 'config.php';

// Queue file to store scanned items
$queueFile = __DIR__ . '/../queue/scanner_queue.json';
$queueDir = dirname($queueFile);

// Create queue directory if it doesn't exist
if (!file_exists($queueDir)) {
    mkdir($queueDir, 0777, true);
}

// Log all incoming requests
logMessage('Scanner API Request', [
    'method' => $_SERVER['REQUEST_METHOD'],
    'remote_addr' => $_SERVER['REMOTE_ADDR'],
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'none'
]);

// Handle GET request - Poll for new scans
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    handlePollRequest($queueFile);
    exit();
}

// Only allow POST requests for adding scans
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    logMessage('Invalid request method', $_SERVER['REQUEST_METHOD']);
    sendJSON([
        'success' => false,
        'error' => 'Method Not Allowed'
    ], 405);
}

// Get raw POST data
$rawData = file_get_contents('php://input');
logMessage('Raw POST data received', $rawData);

// Try to decode JSON
$data = json_decode($rawData, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    logMessage('JSON decode error', json_last_error_msg());
    sendJSON([
        'success' => false,
        'error' => 'Invalid JSON: ' . json_last_error_msg()
    ], 400);
}

// Extract data from request
$qrCode = $data['qr_code'] ?? null;
$scannerId = $data['scanner_id'] ?? 'UNKNOWN';
$timestamp = $data['timestamp'] ?? time();

logMessage('Parsed data', [
    'qr_code' => $qrCode,
    'scanner_id' => $scannerId,
    'timestamp' => $timestamp
]);

// Validate required fields
if (empty($qrCode)) {
    logMessage('Missing qr_code field');
    sendJSON([
        'success' => false,
        'error' => 'QR code is required'
    ], 400);
}

// Extract product code from QR data
$productCode = extractProductCode($qrCode);

// Add to queue
$scanData = [
    'id' => uniqid('scan_', true),
    'qr_code' => $qrCode,
    'product_code' => $productCode,
    'scanner_id' => $scannerId,
    'timestamp' => time(),
    'received_at' => date('Y-m-d H:i:s'),
    'processed' => false
];

addToQueue($queueFile, $scanData);

// Create response
$response = [
    'success' => true,
    'message' => 'QR code received and queued successfully',
    'qr_code' => $qrCode,
    'product_code' => $productCode,
    'scanner_id' => $scannerId,
    'scan_id' => $scanData['id'],
    'received_at' => $scanData['received_at'],
    'instructions' => 'Product will appear in shopping cart when web POS polls for updates'
];

logMessage('Success response', $response);

// Send success response
sendJSON($response, 200);

/**
 * Handle polling request from web POS
 */
function handlePollRequest($queueFile) {
    // Read queue
    $queue = readQueue($queueFile);
    
    // Find unprocessed scans
    $newScans = array_filter($queue, function($scan) {
        return !$scan['processed'];
    });
    
    if (empty($newScans)) {
        sendJSON([
            'success' => true,
            'scans' => [],
            'message' => 'No new scans'
        ], 200);
    }
    
    // Mark scans as processed
    $scanIds = array_column($newScans, 'id');
    markAsProcessed($queueFile, $scanIds);
    
    // Return new scans
    sendJSON([
        'success' => true,
        'scans' => array_values($newScans),
        'count' => count($newScans),
        'message' => 'New scans retrieved'
    ], 200);
}

/**
 * Add scan to queue
 */
function addToQueue($queueFile, $scanData) {
    $queue = readQueue($queueFile);
    $queue[] = $scanData;
    
    // Keep only last 100 scans to prevent file from growing too large
    if (count($queue) > 100) {
        $queue = array_slice($queue, -100);
    }
    
    writeQueue($queueFile, $queue);
    logMessage('Added to queue', $scanData);
}

/**
 * Read queue from file
 */
function readQueue($queueFile) {
    if (!file_exists($queueFile)) {
        return [];
    }
    
    $content = file_get_contents($queueFile);
    if (empty($content)) {
        return [];
    }
    
    $queue = json_decode($content, true);
    return is_array($queue) ? $queue : [];
}

/**
 * Write queue to file
 */
function writeQueue($queueFile, $queue) {
    $json = json_encode($queue, JSON_PRETTY_PRINT);
    file_put_contents($queueFile, $json, LOCK_EX);
}

/**
 * Mark scans as processed
 */
function markAsProcessed($queueFile, $scanIds) {
    $queue = readQueue($queueFile);
    
    foreach ($queue as &$scan) {
        if (in_array($scan['id'], $scanIds)) {
            $scan['processed'] = true;
            $scan['processed_at'] = date('Y-m-d H:i:s');
        }
    }
    
    writeQueue($queueFile, $queue);
    logMessage('Marked as processed', $scanIds);
}

/**
 * Extract product code from QR data
 * Handles multiple QR code formats
 */
function extractProductCode($qrData) {
    // Format 1: Just product code (e.g., "RAPIDENE-001")
    if (strpos($qrData, '|') === false && strpos($qrData, ':') === false) {
        return trim($qrData);
    }
    
    // Format 2: PROD:CODE format
    if (strpos($qrData, 'PROD:') !== false) {
        $start = strpos($qrData, 'PROD:') + 5;
        $end = strpos($qrData, '|', $start);
        if ($end === false) {
            return substr($qrData, $start);
        }
        return substr($qrData, $start, $end - $start);
    }
    
    // Format 3: Pipe-delimited (ProductName|Price|MFD|EXP|ProductCode)
    if (strpos($qrData, '|') !== false) {
        $parts = explode('|', $qrData);
        if (count($parts) >= 5) {
            return trim($parts[4]); // Product code is the last part
        }
    }
    
    // If no specific format detected, return original
    return trim($qrData);
}

?>