<?php
// ============================================================
// SMART TIMES - Full Health Check (Bypasses Laravel)
// Visit: https://api.smarttimes.in/health.php
// DELETE THIS FILE after fixing the issue!
// ============================================================

header('Content-Type: application/json');

$result = [
    'project'   => 'Smart Times POS',
    'timestamp' => date('Y-m-d H:i:s'),
    'checks'    => []
];

// ----------------------------------------------------------
// 1. ENV FILE CHECK
// ----------------------------------------------------------
$envPath = __DIR__ . '/../.env';
$env = [];
if (file_exists($envPath)) {
    foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
        [$key, $val] = explode('=', $line, 2);
        $env[trim($key)] = trim($val, " \t\n\r\0\x0B\"'");
    }
    $result['checks']['env_file'] = [
        'status'          => 'OK',
        'APP_ENV'         => $env['APP_ENV']         ?? 'NOT SET',
        'APP_URL'         => $env['APP_URL']          ?? 'NOT SET',
        'DB_HOST'         => $env['DB_HOST']          ?? 'NOT SET',
        'DB_PORT'         => $env['DB_PORT']          ?? 'NOT SET',
        'DB_DATABASE'     => $env['DB_DATABASE']      ?? 'NOT SET',
        'DB_USERNAME'     => $env['DB_USERNAME']      ?? 'NOT SET',
        'DB_PASSWORD_SET' => isset($env['DB_PASSWORD']) && $env['DB_PASSWORD'] !== '' ? 'YES' : 'NO',
        'SESSION_DRIVER'  => $env['SESSION_DRIVER']   ?? 'NOT SET (defaults to database)',
        'CACHE_DRIVER'    => $env['CACHE_DRIVER']     ?? 'NOT SET',
    ];
} else {
    $result['checks']['env_file'] = ['status' => 'FAIL', 'error' => '.env file NOT FOUND at ' . $envPath];
}

// ----------------------------------------------------------
// 2. DATABASE CONNECTION CHECK
// ----------------------------------------------------------
$dbHost = $env['DB_HOST']     ?? '127.0.0.1';
$dbPort = $env['DB_PORT']     ?? '3306';
$dbName = $env['DB_DATABASE'] ?? '';
$dbUser = $env['DB_USERNAME'] ?? '';
$dbPass = $env['DB_PASSWORD'] ?? '';

try {
    $pdo = new PDO("mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4", $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 5,
    ]);

    // Count tables
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);

    $result['checks']['database'] = [
        'status'     => 'OK',
        'host_used'  => $dbHost,
        'database'   => $dbName,
        'tables_found' => count($tables),
        'tables'     => $tables,
    ];

    // ----------------------------------------------------------
    // 3. USERS TABLE + PASSWORD CHECK
    // ----------------------------------------------------------
    if (in_array('users', $tables)) {
        $stmt = $pdo->prepare("SELECT id, name, email, password, role, is_active FROM users WHERE email = ?");
        $stmt->execute(['admin@smarttimes.in']);
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($admin) {
            $passwordOk     = password_verify('admin123', $admin['password']);
            $passwordOldOk  = password_verify('password', $admin['password']);

            $result['checks']['admin_user'] = [
                'status'            => 'OK',
                'found'             => true,
                'name'              => $admin['name'],
                'email'             => $admin['email'],
                'role'              => $admin['role'],
                'is_active'         => $admin['is_active'],
                'password_hash'     => substr($admin['password'], 0, 20) . '...',
                'password_admin123' => $passwordOk     ? 'MATCHES ✅' : 'NO MATCH ❌',
                'password_password' => $passwordOldOk  ? 'MATCHES ✅' : 'NO MATCH ❌',
            ];
        } else {
            $result['checks']['admin_user'] = ['status' => 'FAIL', 'found' => false, 'error' => 'No user found with email admin@smarttimes.in'];
        }
    } else {
        $result['checks']['admin_user'] = ['status' => 'FAIL', 'error' => 'users table does not exist!'];
    }

    // ----------------------------------------------------------
    // 4. SESSIONS TABLE CHECK
    // ----------------------------------------------------------
    $result['checks']['sessions_table'] = in_array('sessions', $tables)
        ? ['status' => 'OK',   'exists' => true]
        : ['status' => 'WARN', 'exists' => false, 'note' => 'Not needed if SESSION_DRIVER=file'];

} catch (PDOException $e) {
    $result['checks']['database'] = [
        'status' => 'FAIL',
        'host_used' => $dbHost,
        'error'  => $e->getMessage(),
    ];
}

// ----------------------------------------------------------
// 5. STORAGE / CACHE DIRECTORIES WRITABLE CHECK
// ----------------------------------------------------------
$dirs = [
    'storage/logs'                => __DIR__ . '/../storage/logs',
    'storage/framework/sessions'  => __DIR__ . '/../storage/framework/sessions',
    'storage/framework/cache'     => __DIR__ . '/../storage/framework/cache',
    'storage/framework/views'     => __DIR__ . '/../storage/framework/views',
    'bootstrap/cache'             => __DIR__ . '/../bootstrap/cache',
];
foreach ($dirs as $label => $path) {
    $result['checks']['directories'][$label] = [
        'exists'   => is_dir($path)    ? 'YES' : 'NO',
        'writable' => is_writable($path) ? 'YES' : 'NO',
    ];
}

// ----------------------------------------------------------
// 6. API ENDPOINT SELF-CHECK
// ----------------------------------------------------------
$apiUrl = ($env['APP_URL'] ?? 'https://api.smarttimes.in') . '/api/login';
$result['checks']['api_endpoint'] = ['login_url' => $apiUrl, 'status' => 'INFO'];

// ----------------------------------------------------------
// FINAL RESULT
// ----------------------------------------------------------
$allOk = !array_filter($result['checks'], fn($c) => is_array($c) && ($c['status'] ?? '') === 'FAIL');
$result['overall'] = $allOk ? '✅ ALL CHECKS PASSED' : '❌ SOME CHECKS FAILED - See details above';

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
