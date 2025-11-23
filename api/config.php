<?php
// config.php - XAMPP Configuration

// Enable error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS Headers - Allow all origins for development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Firebase configuration (keep using Firebase for database)
define('FIREBASE_DATABASE_URL', 'https://jlink-38a3d-default-rtdb.asia-southeast1.firebasedatabase.app');
define('FIREBASE_API_KEY', 'AIzaSyC9LacuzRJxswEETpZR2B0UUGSFWjIy540');

// Session configuration
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_secure', 0); // Set to 1 if using HTTPS

// Utility function to send JSON response
function sendJSON($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit();
}

// Utility function to log messages
function logMessage($message, $data = null) {
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message";
    if ($data !== null) {
        $logEntry .= " | Data: " . json_encode($data);
    }
    error_log($logEntry . PHP_EOL, 3, __DIR__ . '/../logs/scanner.log');
}

// Create logs directory if it doesn't exist
$logsDir = __DIR__ . '/../logs';
if (!file_exists($logsDir)) {
    mkdir($logsDir, 0777, true);
}

?>