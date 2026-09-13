<?php
echo "<h3>Storage Directory Status</h3>";
$path = __DIR__ . '/../storage';
if (!file_exists($path)) {
    echo "storage directory DOES NOT EXIST.<br>";
} else {
    echo "storage directory EXISTS.<br>";
    echo "<pre>";
    system("ls -la " . escapeshellarg($path));
    echo "</pre>";
    
    echo "<h3>Views Directory Status</h3>";
    $views = $path . '/framework/views';
    if (!file_exists($views)) {
        echo "views directory DOES NOT EXIST.<br>";
    } else {
        echo "views directory EXISTS.<br>";
        echo "Permissions: " . substr(sprintf('%o', fileperms($views)), -4) . "<br>";
    }
}
?>
