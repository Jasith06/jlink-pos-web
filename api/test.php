<?php
// test.php - Test API endpoint

require_once 'config.php';

$testData = [
    'status' => 'online',
    'message' => 'JLINK POS API is working!',
    'timestamp' => date('Y-m-d H:i:s'),
    'server' => 'XAMPP Local',
    'php_version' => phpversion(),
    'endpoints' => [
        'test' => '/api/test.php',
        'scanner' => '/api/scanner.php'
    ],
    'firebase' => [
        'database_url' => FIREBASE_DATABASE_URL,
        'configured' => true
    ]
];

logMessage('Test endpoint accessed');

sendJSON($testData, 200);

?>