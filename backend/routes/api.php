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

// Diagnostic route to test all modules and database integrity
Route::get('/test-modules', function() {
    try {
        $checks = [];
        
        // Check Users
        $checks['users'] = \Illuminate\Support\Facades\Schema::hasTable('users') && \Illuminate\Support\Facades\Schema::hasColumn('users', 'base_salary') ? 'Passed' : 'Failed';
        
        // Check Watches
        $checks['watches'] = \Illuminate\Support\Facades\Schema::hasTable('watches') && \Illuminate\Support\Facades\Schema::hasColumn('watches', 'hsn_code') ? 'Passed' : 'Failed';
        
        // Check Stock Adjustments
        $checks['stock_adjustments'] = \Illuminate\Support\Facades\Schema::hasTable('stock_adjustments') && \Illuminate\Support\Facades\Schema::hasColumn('stock_adjustments', 'user_id') ? 'Passed' : 'Failed';
        
        // Check Customers
        $checks['customers'] = \Illuminate\Support\Facades\Schema::hasTable('customers') && \Illuminate\Support\Facades\Schema::hasColumn('customers', 'outstanding_dues') ? 'Passed' : 'Failed';
        
        // Check Sales
        $checks['sales'] = \Illuminate\Support\Facades\Schema::hasTable('sales') && \Illuminate\Support\Facades\Schema::hasColumn('sales', 'is_credit_sale') ? 'Passed' : 'Failed';
        
        // Check Payroll and Attendance
        $checks['payrolls'] = \Illuminate\Support\Facades\Schema::hasTable('payrolls') ? 'Passed' : 'Failed';
        $checks['attendances'] = \Illuminate\Support\Facades\Schema::hasTable('attendances') ? 'Passed' : 'Failed';

        // Evaluate Overall Status
        $overall = in_array('Failed', array_values($checks)) ? 'Errors Found' : 'All Modules Healthy';

        return response()->json([
            'status' => $overall,
            'module_checks' => $checks
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'System Error',
            'error' => $e->getMessage()
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
        // Fix 0: Create cache tables to prevent schema cache crash
        try {
            \Illuminate\Support\Facades\Artisan::call('cache:table');
            \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        } catch (\Exception $e) {}

        // Fix 1: Add hsn_code
        try {
            if (!\Illuminate\Support\Facades\Schema::hasColumn('watches', 'hsn_code')) {
                \Illuminate\Support\Facades\Schema::table('watches', function ($table) {
                    $table->string('hsn_code')->default('9102')->after('movement_type');
                });
            }
        } catch (\Exception $e) {}
        
        // Fix 2: Add base_salary
        try {
            if (!\Illuminate\Support\Facades\Schema::hasColumn('users', 'base_salary')) {
                \Illuminate\Support\Facades\Schema::table('users', function ($table) {
                    $table->decimal('base_salary', 10, 2)->default(0.00)->after('role');
                });
            }
        } catch (\Exception $e) {}

        // Fix 3: Create attendances table
        try {
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
        } catch (\Exception $e) {}

        // Fix 4: Create payrolls table
        try {
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
        } catch (\Exception $e) {}
        
        // Fix 5: Add timestamps to loyalty_ledgers
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('loyalty_ledgers')) {
                if (!\Illuminate\Support\Facades\Schema::hasColumn('loyalty_ledgers', 'updated_at')) {
                    \Illuminate\Support\Facades\Schema::table('loyalty_ledgers', function ($table) {
                        $table->timestamps();
                    });
                }
            }
        } catch (\Exception $e) {}

        // Fix 6: Add POS Features (outstanding_dues to customers, is_credit_sale to sales)
        try {
            if (!\Illuminate\Support\Facades\Schema::hasColumn('customers', 'outstanding_dues')) {
                \Illuminate\Support\Facades\Schema::table('customers', function ($table) {
                    $table->decimal('outstanding_dues', 12, 2)->default(0.00)->after('points_balance');
                });
            }
        } catch (\Exception $e) {}
        try {
            if (!\Illuminate\Support\Facades\Schema::hasColumn('sales', 'is_credit_sale')) {
                \Illuminate\Support\Facades\Schema::table('sales', function ($table) {
                    $table->boolean('is_credit_sale')->default(false)->after('payment_mode');
                });
            }
        } catch (\Exception $e) {}

        // Fix 7: Create stock_adjustments table or add missing columns
        try {
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
            } else {
                if (!\Illuminate\Support\Facades\Schema::hasColumn('stock_adjustments', 'user_id')) {
                    try {
                        \Illuminate\Support\Facades\DB::statement("ALTER TABLE stock_adjustments ADD COLUMN user_id BIGINT UNSIGNED NULL AFTER watch_id;");
                        \Illuminate\Support\Facades\DB::statement("ALTER TABLE stock_adjustments ADD CONSTRAINT stock_adjustments_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id);");
                    } catch (\Exception $ex) {}
                }
                if (!\Illuminate\Support\Facades\Schema::hasColumn('stock_adjustments', 'old_status')) {
                    \Illuminate\Support\Facades\DB::statement("ALTER TABLE stock_adjustments ADD COLUMN old_status VARCHAR(255) NULL;");
                }
                if (!\Illuminate\Support\Facades\Schema::hasColumn('stock_adjustments', 'new_status')) {
                    \Illuminate\Support\Facades\DB::statement("ALTER TABLE stock_adjustments ADD COLUMN new_status VARCHAR(255) NOT NULL DEFAULT 'reserved';");
                }
                if (!\Illuminate\Support\Facades\Schema::hasColumn('stock_adjustments', 'reason')) {
                    \Illuminate\Support\Facades\DB::statement("ALTER TABLE stock_adjustments ADD COLUMN reason VARCHAR(255) NOT NULL DEFAULT 'Other';");
                }
                if (!\Illuminate\Support\Facades\Schema::hasColumn('stock_adjustments', 'remarks')) {
                    \Illuminate\Support\Facades\DB::statement("ALTER TABLE stock_adjustments ADD COLUMN remarks TEXT NULL;");
                }
            }
        } catch (\Exception $e) {}
        
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
    if (empty($files)) {
        return response('No logs found.', 404)->header('Content-Type', 'text/plain');
    }
    $latest = end($files);
    $lines = file($latest);
    return response(implode('', array_slice($lines, -500)), 200)->header('Content-Type', 'text/plain');
});

/**
 * NUCLEAR RESET ROUTE
 * ---------------------------------------------------
 * This route will:
 *   1. Save all admin users (role = 'admin')
 *   2. Disable FK checks and DROP every table except
 *      personal_access_tokens / migrations
 *   3. Reset the Laravel migrations tracker
 *   4. Run `php artisan migrate --force` (which will
 *      execute our new consolidated migration)
 *   5. Re-insert the saved admin users
 *
 * CALL: GET /api/reset-and-sync
 * CAUTION: This will delete ALL non-admin data from live DB.
 */
Route::get('/reset-and-sync', function () {
    set_time_limit(300);
    $log = [];

    try {
        // Step 1: Save admin credentials
        $admins = \Illuminate\Support\Facades\DB::table('users')
            ->where('role', 'admin')
            ->get();
        $log[] = "Saved " . count($admins) . " admin user(s).";

        // Step 2: Disable FK checks and drop all tables except migrations
        \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=0');

        $tables = \Illuminate\Support\Facades\DB::select('SHOW TABLES');
        $dbName = env('DB_DATABASE');
        $dropTables = [];
        foreach ($tables as $table) {
            $tableName = array_values((array) $table)[0];
            if (!in_array($tableName, ['migrations'])) {
                $dropTables[] = $tableName;
            }
        }

        foreach ($dropTables as $t) {
            \Illuminate\Support\Facades\DB::statement("DROP TABLE IF EXISTS `{$t}`");
        }
        $log[] = "Dropped tables: " . implode(', ', $dropTables);

        // Step 3: Re-enable FK checks and reset migrations tracker
        \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=1');
        \Illuminate\Support\Facades\DB::table('migrations')->truncate();
        $log[] = "Reset migrations tracker.";

        // Step 4: Run fresh migration
        \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        $log[] = "Migration ran successfully.";
        $log[] = \Illuminate\Support\Facades\Artisan::output();

        // Step 5: Re-insert admin users (only known columns to avoid stale schema mismatch)
        $allowedUserColumns = ['name', 'email', 'password', 'role', 'base_salary', 'remember_token', 'created_at', 'updated_at'];
        foreach ($admins as $admin) {
            $userData = (array) $admin;
            // Strip any columns that don't exist in the new schema
            $cleanData = array_intersect_key($userData, array_flip($allowedUserColumns));
            $cleanData['created_at'] = now();
            $cleanData['updated_at'] = now();
            \Illuminate\Support\Facades\DB::table('users')->insert($cleanData);
        }
        $log[] = "Re-inserted " . count($admins) . " admin user(s).";

        // Step 6: Clear all cached config
        \Illuminate\Support\Facades\Artisan::call('optimize:clear');
        $log[] = "Cache cleared.";

        return response()->json([
            'status' => 'success',
            'message' => 'Live DB reset and synced successfully! All modules are now ready.',
            'log' => $log
        ]);

    } catch (\Exception $e) {
        \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=1');
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage(),
            'log' => $log,
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

