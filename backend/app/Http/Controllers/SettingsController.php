<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function show()
    {
        $setting = Setting::first();
        if (!$setting) {
            // Return empty default settings if not seeded
            return response()->json([
                'store_name' => 'Smart Times',
                'tagline' => 'Time is Precious',
                'gst_invoice_prefix' => 'ST-GST',
                'nongst_invoice_prefix' => 'ST-RETL',
                'job_card_prefix' => 'JC',
                'exchange_window_days' => 7,
                'warranty_period_months' => 12,
                'loyalty_earn_rate' => 1,
                'loyalty_redeem_rate' => 1,
                'loyalty_expiry_months' => 12,
            ]);
        }
        return response()->json($setting);
    }

    public function update(Request $request)
    {
        $request->validate([
            'store_name' => 'required|string',
            'tagline' => 'nullable|string',
            'gstin' => 'nullable|string',
            'address' => 'nullable|string',
            'phone' => 'nullable|string',
            'email' => 'nullable|string',
            'gst_invoice_prefix' => 'nullable|string',
            'nongst_invoice_prefix' => 'nullable|string',
            'job_card_prefix' => 'nullable|string',
            'exchange_window_days' => 'nullable|integer',
            'warranty_period_months' => 'nullable|integer',
            'loyalty_earn_rate' => 'nullable|integer',
            'loyalty_redeem_rate' => 'nullable|integer',
            'loyalty_expiry_months' => 'nullable|integer',
            'job_card_terms' => 'nullable|string',
        ]);

        $setting = Setting::firstOrCreate([], [
            'store_name' => 'Smart Times'
        ]);

        $setting->update($request->all());

        return response()->json([
            'message' => 'Settings updated successfully',
            'settings' => $setting
        ]);
    }

    public function resetDatabase(Request $request)
    {
        if ($request->user() && $request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        try {
            \DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            
            // Truncate all transaction and data tables
            \DB::table('sale_items')->truncate();
            \DB::table('sales')->truncate();
            \DB::table('sales_returns')->truncate();
            \DB::table('exchanges')->truncate();
            \DB::table('service_jobs')->truncate();
            \DB::table('purchases')->truncate();
            \DB::table('watches')->truncate();
            \DB::table('stock_adjustments')->truncate();
            \DB::table('warranty_cards')->truncate();
            \DB::table('customers')->truncate();
            \DB::table('loyalty_ledgers')->truncate();
            \DB::table('activity_logs')->truncate();
            \DB::table('attendance')->truncate();
            \DB::table('payrolls')->truncate();

            // Delete non-admin staff users
            \DB::table('users')->where('role', '!=', 'admin')->delete();

            // Ensure primary admin account exists
            $adminExists = \DB::table('users')->where('role', 'admin')->exists();
            if (!$adminExists) {
                \DB::table('users')->insert([
                    'name' => 'Ram Srinivash (Admin)',
                    'email' => 'admin@smarttimes.in',
                    'password' => \Hash::make('admin123'),
                    'role' => 'admin',
                    'base_salary' => 30000,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }

            \DB::statement('SET FOREIGN_KEY_CHECKS=1;');

            return response()->json([
                'status' => 'success',
                'message' => 'Database successfully wiped clean! Only primary Admin account remains.'
            ]);
        } catch (\Exception $e) {
            \DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            return response()->json([
                'status' => 'error',
                'message' => 'Database reset failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function exportDatabase(Request $request)
    {
        if ($request->user() && $request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        return response()->json([
            'settings' => Setting::first(),
            'users' => \App\Models\User::all(['id', 'name', 'email', 'role', 'base_salary', 'created_at']),
            'customers' => \App\Models\Customer::all(),
            'watches' => \App\Models\Watch::all(),
            'purchases' => \App\Models\Purchase::all(),
            'sales' => \App\Models\Sale::with('items')->get(),
            'service_jobs' => \App\Models\ServiceJob::all(),
            'exchanges' => \App\Models\Exchange::all(),
            'sales_returns' => \App\Models\SalesReturn::all(),
            'stock_adjustments' => \App\Models\StockAdjustment::all(),
            'exported_at' => now()->toISOString()
        ]);
    }

    public function importDatabase(Request $request)
    {
        if ($request->user() && $request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $data = $request->all();
        if (!$data || !is_array($data)) {
            return response()->json(['message' => 'Invalid JSON backup data.'], 400);
        }

        try {
            \DB::transaction(function() use ($data) {
                if (isset($data['settings']) && is_array($data['settings'])) {
                    $setting = Setting::firstOrCreate([]);
                    $setting->update($data['settings']);
                }

                if (isset($data['customers']) && is_array($data['customers'])) {
                    foreach ($data['customers'] as $c) {
                        if (isset($c['name']) || isset($c['phone'])) {
                            \App\Models\Customer::updateOrCreate(
                                ['phone' => $c['phone'] ?? null],
                                [
                                    'name' => $c['name'] ?? 'Customer',
                                    'email' => $c['email'] ?? null,
                                    'points_balance' => $c['points_balance'] ?? 0
                                ]
                            );
                        }
                    }
                }

                if (isset($data['watches']) && is_array($data['watches'])) {
                    foreach ($data['watches'] as $w) {
                        if (isset($w['id']) || isset($w['brand'])) {
                            \App\Models\Watch::updateOrCreate(
                                ['id' => $w['id'] ?? null],
                                [
                                    'brand' => $w['brand'] ?? 'Watch',
                                    'model' => $w['model'] ?? '',
                                    'gender' => $w['gender'] ?? 'Unisex',
                                    'mrp' => $w['mrp'] ?? 0,
                                    'selling_price' => $w['selling_price'] ?? 0,
                                    'cost_price' => $w['cost_price'] ?? 0,
                                    'stock_quantity' => $w['stock_quantity'] ?? 1,
                                    'status' => $w['status'] ?? 'in_stock'
                                ]
                            );
                        }
                    }
                }
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Database backup imported successfully!'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Import failed: ' . $e->getMessage()
            ], 500);
        }
    }
}
