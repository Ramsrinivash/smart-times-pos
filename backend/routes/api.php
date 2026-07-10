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

// Public Authentication route
Route::post('/login', [AuthController::class, 'login']);

// Authenticated Routes (Requires Sanctum auth)
Route::middleware('auth:sanctum')->group(function () {
    
    // User routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Dashboard Overview Route (Accessible by all roles)
    Route::get('/dashboard', [ReportController::class, 'dashboardOverview']);

    // Customer / CRM Routes
    Route::get('/customers', [CustomerController::class, 'index']);
    Route::post('/customers', [CustomerController::class, 'store']);
    Route::get('/customers/{id}', [CustomerController::class, 'show']);
    Route::get('/customers/{id}/history', [CustomerController::class, 'purchaseHistory']);

    // Inventory Routes
    Route::get('/inventory', [InventoryController::class, 'index']);
    Route::post('/inventory/adjust', [InventoryController::class, 'adjustStock'])
         ->middleware('role:admin,manager');
         
    // Purchase Management (Role Restricted)
    Route::middleware('role:admin,manager')->group(function () {
        Route::get('/purchase/ledger', [PurchaseController::class, 'index']);
        Route::post('/purchase', [PurchaseController::class, 'store']);
    });

    // Sales Routes
    Route::get('/sales', [SalesController::class, 'index']);
    Route::post('/sales', [SalesController::class, 'store']);
    Route::get('/sales/{id}', [SalesController::class, 'show']);

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

    // Reports Route (Role Restricted)
    Route::middleware('role:admin,manager')->group(function () {
        Route::get('/reports/sales', [ReportController::class, 'salesReport']);
        Route::get('/reports/stock-valuation', [ReportController::class, 'stockValuation']);
        Route::get('/reports/gst', [ReportController::class, 'gstReport']);
    });
});
