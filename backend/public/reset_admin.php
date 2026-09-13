<?php
$envPath = __DIR__ . '/../.env';
if (!file_exists($envPath)) {
    die("No .env file found");
}

$lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
$env = [];
foreach ($lines as $line) {
    if (strpos(trim($line), '#') === 0) continue;
    list($name, $value) = explode('=', $line, 2);
    $env[trim($name)] = trim($value);
}

try {
    $pdo = new PDO("mysql:host={$env['DB_HOST']};port={$env['DB_PORT']};dbname={$env['DB_DATABASE']}", $env['DB_USERNAME'], $env['DB_PASSWORD']);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $password = password_hash('password', PASSWORD_BCRYPT);
    $email = 'admin@smarttimes.in';
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->rowCount() > 0) {
        $update = $pdo->prepare("UPDATE users SET password = ? WHERE email = ?");
        $update->execute([$password, $email]);
        echo "Admin password updated to 'password'.";
    } else {
        $insert = $pdo->prepare("INSERT INTO users (name, email, password, role) VALUES ('Admin', ?, ?, 'admin')");
        $insert->execute([$email, $password]);
        echo "Admin user created with password 'password'.";
    }
} catch (PDOException $e) {
    echo "DB Error: " . $e->getMessage();
}
?>
