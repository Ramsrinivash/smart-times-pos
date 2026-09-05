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
}
