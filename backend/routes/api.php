<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\SalesController;
use App\Http\Controllers\ExchangeController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\WarrantyCardController;
use App\Http\Controllers\ReturnController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\AttendancePayrollController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Health check — used by Railway to verify the API is running
Route::get('/health', fn() => response()->json([
    'status' => 'ok',
    'service' => 'Smart Times POS API',
    'timestamp' => now()->toISOString()
]));

// Diagnostic route to debug database connection and seeders
Route::get('/debug-db', function() {
    $logPath = storage_path('logs/laravel.log');
    $logs = file_exists($logPath) ? file_get_contents($logPath) : 'Log file does not exist.';
    if (strlen($logs) > 5000) {
        $logs = substr($logs, -5000);
    }
    try {
        \DB::connection()->getPdo();
        $tables = \DB::select('SHOW TABLES');
        $userCount = \DB::table('users')->count();
        $users = \DB::table('users')->select('name', 'email', 'role')->get();
        return response()->json([
            'status' => 'connected',
            'tables' => $tables,
            'user_count' => $userCount,
            'users' => $users,
            'logs' => $logs
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage(),
            'logs' => $logs
        ], 500);
    }
});

// Diagnostic route to test login action and dump exceptions
Route::get('/test-login-action', function() {
    try {
        $email = 'admin@smarttimes.in';
        $password = 'admin123';
        
        $user = \App\Models\User::where('email', $email)->first();
        if (!$user) {
            return response()->json(['error' => 'User not found in database.']);
        }
        
        if (!\Illuminate\Support\Facades\Hash::check($password, $user->password)) {
            return response()->json(['error' => 'Password check failed.']);
        }
        
        $token = $user->createToken('auth_token')->plainTextToken;
        
        return response()->json([
            'status' => 'success',
            'token' => $token,
            'user' => $user
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'status' => 'exception_caught',
            'error_class' => get_class($e),
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// Public Authentication route (Wrapped in try/catch for live debugging)
Route::post('/login', function(\Illuminate\Http\Request $request) {
    try {
        $controller = new \App\Http\Controllers\AuthController();
        return $controller->login($request);
    } catch (\Throwable $e) {
        return response()->json([
            'status' => 'exception_caught_on_login',
            'error_class' => get_class($e),
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// Authenticated Routes (Requires Sanctum auth)
Route::middleware('auth:sanctum')->group(function () {
    
    // User routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/users', [AuthController::class, 'getUsers'])->middleware('role:admin');
    Route::post('/users', [AuthController::class, 'addUser'])->middleware('role:admin');
    Route::put('/users/{id}', [AuthController::class, 'updateUser']);

    // Dashboard Overview Route (Accessible by all roles)
    Route::get('/dashboard', [ReportController::class, 'dashboardOverview']);

    // Customer / CRM Routes
    Route::get('/customers', [CustomerController::class, 'index']);
    Route::post('/customers', [CustomerController::class, 'store']);
    Route::get('/customers/{id}', [CustomerController::class, 'show']);
    Route::get('/customers/{id}/history', [CustomerController::class, 'purchaseHistory']);

    // Inventory Routes
    Route::get('/inventory', [InventoryController::class, 'index']);
    Route::get('/inventory/adjustments', [InventoryController::class, 'getAdjustmentLogs'])
         ->middleware('role:admin,manager');
    Route::post('/inventory/adjust', [InventoryController::class, 'adjustStock'])
         ->middleware('role:admin,manager');
    Route::post('/inventory/images', [InventoryController::class, 'uploadImages']);
    Route::delete('/inventory/{id}/images/{index}', [InventoryController::class, 'removeImage']);
         
    // Purchase Management (Role Restricted)
    Route::middleware('role:admin,manager')->group(function () {
        Route::get('/purchase/ledger', [PurchaseController::class, 'index']);
        Route::post('/purchase', [PurchaseController::class, 'store']);
        Route::put('/purchase/{id}/payment', [PurchaseController::class, 'updatePayment']);
        Route::get('/activity-logs', [ActivityLogController::class, 'index'])->middleware('role:admin');
    });

    // Sales Routes
    Route::get('/sales', [SalesController::class, 'index']);
    Route::post('/sales', [SalesController::class, 'store']);
    Route::get('/sales/{id}', [SalesController::class, 'show']);

    // Sales Returns Routes
    Route::get('/returns', [ReturnController::class, 'index']);
    Route::post('/returns', [ReturnController::class, 'store']);

    // Exchange Routes
    Route::get('/exchanges', [ExchangeController::class, 'index']);
    Route::post('/exchanges', [ExchangeController::class, 'store']);
    Route::post('/exchanges/{id}/approve', [ExchangeController::class, 'approve'])
         ->middleware('role:admin,manager');

    // Service & Repair Routes
    Route::get('/services', [ServiceController::class, 'index']);
    Route::post('/services', [ServiceController::class, 'store']);
    Route::get('/services/{id}', [ServiceController::class, 'show']);
    Route::put('/services/{id}/status', [ServiceController::class, 'updateStatus']);
    Route::post('/services/bill', [ServiceController::class, 'addBill']);

    // Settings Routes
    Route::get('/settings', [SettingsController::class, 'show']);
    Route::put('/settings', [SettingsController::class, 'update']);

    // Warranty Card routes
    Route::get('/warranty', [WarrantyCardController::class, 'index']);

    // Reports Route (Role Restricted)
    Route::middleware('role:admin,manager')->group(function () {
        Route::get('/reports/sales', [ReportController::class, 'salesReport']);
        Route::get('/reports/stock-valuation', [ReportController::class, 'stockValuation']);
        Route::get('/reports/gst', [ReportController::class, 'gstReport']);
        Route::get('/reports/profit', [ReportController::class, 'profitReport']);
        Route::get('/reports/exchanges', [ReportController::class, 'exchangeReport']);
        Route::get('/reports/loyalty', [ReportController::class, 'loyaltyReport']);
        Route::get('/reports/services-pending', [ReportController::class, 'pendingServiceReport']);
        Route::get('/reports/supplier-dues', [ReportController::class, 'supplierDuesReport']);
        Route::get('/reports/purchase-ledger', [ReportController::class, 'purchaseLedger']);
    });

    // Attendance & Payroll Routes (Admin/Manager only)
    Route::middleware('role:admin,manager')->group(function () {
        Route::get('/attendance', [AttendancePayrollController::class, 'getAttendance']);
        Route::post('/attendance', [AttendancePayrollController::class, 'saveAttendance']);
        Route::get('/payroll', [AttendancePayrollController::class, 'getPayroll']);
        Route::post('/payroll/pay', [AttendancePayrollController::class, 'paySalary']);
    });
});
