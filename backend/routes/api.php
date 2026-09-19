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

// Route to run migrations (Added to fix missing columns on live server like base_salary and hsn_code)
Route::get('/migrate-db', function() {
    try {
        // Fix 1: Add hsn_code
        if (!\Illuminate\Support\Facades\Schema::hasColumn('watches', 'hsn_code')) {
            \Illuminate\Support\Facades\Schema::table('watches', function ($table) {
                $table->string('hsn_code')->default('9102')->after('movement_type');
            });
        }
        
        // Fix 2: Add base_salary
        if (!\Illuminate\Support\Facades\Schema::hasColumn('users', 'base_salary')) {
            \Illuminate\Support\Facades\Schema::table('users', function ($table) {
                $table->decimal('base_salary', 10, 2)->default(0.00)->after('role');
            });
        }

        // Fix 3: Create attendances table
        if (!\Illuminate\Support\Facades\Schema::hasTable('attendances')) {
            \Illuminate\Support\Facades\Schema::create('attendances', function ($table) {
                $table->id();
                $table->integer('user_id');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->date('date');
                $table->string('status')->default('present');
                $table->string('notes')->nullable();
                $table->timestamps();
                $table->unique(['user_id', 'date']);
            });
        }

        // Fix 4: Create payrolls table
        if (!\Illuminate\Support\Facades\Schema::hasTable('payrolls')) {
            \Illuminate\Support\Facades\Schema::create('payrolls', function ($table) {
                $table->id();
                $table->integer('user_id');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->integer('month');
                $table->integer('year');
                $table->decimal('base_salary', 10, 2);
                $table->decimal('net_salary', 10, 2);
                $table->enum('status', ['unpaid', 'paid'])->default('unpaid');
                $table->date('payment_date')->nullable();
                $table->timestamps();
                $table->unique(['user_id', 'month', 'year']);
            });
        }
        
        // Fix 5: Add timestamps to loyalty_ledgers
        if (!\Illuminate\Support\Facades\Schema::hasColumn('loyalty_ledgers', 'updated_at')) {
            \Illuminate\Support\Facades\Schema::table('loyalty_ledgers', function ($table) {
                $table->timestamps();
            });
        }

        // Fix 6: Add POS Features (outstanding_dues to customers, is_credit_sale to sales)
        if (!\Illuminate\Support\Facades\Schema::hasColumn('customers', 'outstanding_dues')) {
            \Illuminate\Support\Facades\Schema::table('customers', function ($table) {
                $table->decimal('outstanding_dues', 12, 2)->default(0.00)->after('points_balance');
            });
        }
        if (!\Illuminate\Support\Facades\Schema::hasColumn('sales', 'is_credit_sale')) {
            \Illuminate\Support\Facades\Schema::table('sales', function ($table) {
                $table->boolean('is_credit_sale')->default(false)->after('payment_mode');
            });
        }

        // Fix 7: Create stock_adjustments table
        if (!\Illuminate\Support\Facades\Schema::hasTable('stock_adjustments')) {
            \Illuminate\Support\Facades\Schema::create('stock_adjustments', function ($table) {
                $table->id();
                $table->string('watch_id');
                $table->foreign('watch_id')->references('id')->on('watches')->onDelete('cascade');
                $table->foreignId('user_id')->nullable()->constrained('users');
                $table->string('old_status')->nullable();
                $table->string('new_status');
                $table->string('reason');
                $table->text('remarks')->nullable();
                $table->timestamps();
            });
        }
        
        // Seed the migrations table so `artisan migrate` works in the future
        if (\Illuminate\Support\Facades\Schema::hasTable('migrations')) {
            \Illuminate\Support\Facades\DB::table('migrations')->insertOrIgnore([
                ['migration' => '2026_07_09_000000_create_watch_showroom_tables', 'batch' => 1],
                ['migration' => '2026_07_10_000000_create_personal_access_tokens_table', 'batch' => 1],
                ['migration' => '2026_07_11_000000_create_settings_table', 'batch' => 1],
                ['migration' => '2026_07_11_000001_add_hsn_code_to_watches_table', 'batch' => 1],
                ['migration' => '2026_07_15_000000_update_showroom_address_settings', 'batch' => 1],
                ['migration' => '2026_07_24_000000_update_showroom_pos_features', 'batch' => 1],
                ['migration' => '2026_07_27_000000_change_watches_status_to_string', 'batch' => 1],
                ['migration' => '2026_07_27_000001_update_tagline_in_settings', 'batch' => 1],
                ['migration' => '2026_07_27_000002_create_warranty_cards_table', 'batch' => 1],
                ['migration' => '2026_07_27_000003_clear_database_data', 'batch' => 1],
                ['migration' => '2026_07_27_000004_create_sales_returns_table', 'batch' => 1],
                ['migration' => '2026_07_27_000005_create_activity_logs_table', 'batch' => 1],
                ['migration' => '2026_07_27_000006_create_attendance_payroll_tables', 'batch' => 1],
                ['migration' => '2026_07_28_000007_update_attendance_status_column', 'batch' => 1],
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Database tables, columns, and migration tracker fixed manually!'
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
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
    Route::delete('/users/{id}', [AuthController::class, 'deleteUser'])->middleware('role:admin');

    // Dashboard Overview Route (Accessible by all roles)
    Route::get('/dashboard', [ReportController::class, 'dashboardOverview']);

    // Customer / CRM Routes
    Route::get('/customers', [CustomerController::class, 'index']);
    Route::post('/customers', [CustomerController::class, 'store']);
    Route::get('/customers/{id}', [CustomerController::class, 'show']);
    Route::put('/customers/{id}', [CustomerController::class, 'update']);
    Route::get('/customers/{id}/history', [CustomerController::class, 'purchaseHistory']);

    // Inventory Routes
    Route::get('/inventory', [InventoryController::class, 'index']);
    Route::put('/inventory/{id}', [InventoryController::class, 'update']);
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
    Route::post('/settings/reset-database', [SettingsController::class, 'resetDatabase'])->middleware('role:admin');
    Route::get('/settings/export-database', [SettingsController::class, 'exportDatabase'])->middleware('role:admin');
    Route::post('/settings/import-database', [SettingsController::class, 'importDatabase'])->middleware('role:admin');

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
        Route::get('/attendance/matrix', [AttendancePayrollController::class, 'getMonthlyMatrix']);
        Route::post('/attendance/single', [AttendancePayrollController::class, 'saveSingleAttendance']);
        Route::get('/payroll', [AttendancePayrollController::class, 'getPayroll']);
        Route::post('/payroll/pay', [AttendancePayrollController::class, 'paySalary']);
    });
});
Route::get('/force-admin', function() { return \App\Models\User::updateOrCreate(['email' => 'admin@smarttimes.in'], ['name' => 'Admin', 'password' => \Illuminate\Support\Facades\Hash::make('password'), 'role' => 'admin', 'base_salary' => 30000]); });

Route::get('/get-error-log', function () {
    $logPath = storage_path('logs/laravel.log');
    if (!file_exists($logPath)) { return response()->json(['error' => 'Log file not found']); }
    $lines = file($logPath);
    return response()->json(['log' => implode('', array_slice($lines, -150))]);
});

Route::get('/get-error-logs-dir', function () {
    $files = glob(storage_path('logs/*.log'));
    if (empty($files)) return response()->json(['error' => 'No logs']);
    $latest = end($files);
    $lines = file($latest);
    return response()->json(['file' => $latest, 'log' => implode('', array_slice($lines, -150))]);
});
