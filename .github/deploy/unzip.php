<?php
/**
 * Smart Times POS - Server Deployment Extractor
 * This file is uploaded separately from deploy.zip and persists between deployments.
 * It extracts deploy.zip and ensures all required Laravel directories exist.
 */

$basePath = dirname(__DIR__) . '/';
$zipFile  = $basePath . 'deploy.zip';

if (!file_exists($zipFile)) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'deploy.zip not found at ' . $zipFile]);
    exit;
}

$zip    = new ZipArchive;
$opened = $zip->open($zipFile);

if ($opened !== TRUE) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Failed to open zip. ZipArchive error code: ' . $opened]);
    exit;
}

$zip->extractTo($basePath);
$zip->close();

// Ensure all required Laravel directories exist with correct permissions
$directories = [
    'storage/app/public',
    'storage/framework/cache/data',
    'storage/framework/sessions',
    'storage/framework/testing',
    'storage/framework/views',
    'storage/logs',
    'bootstrap/cache'
];

$created = [];
foreach ($directories as $dir) {
    $dirPath = $basePath . $dir;
    if (!is_dir($dirPath)) {
        mkdir($dirPath, 0775, true);
        $created[] = $dir;
    }
}

// Delete the zip to save space — but keep THIS file for next deployment
unlink($zipFile);

http_response_code(200);
echo json_encode([
    'status'           => 'success',
    'message'          => 'Deployment extracted successfully',
    'timestamp'        => date('Y-m-d H:i:s'),
    'dirs_created'     => $created,
]);
