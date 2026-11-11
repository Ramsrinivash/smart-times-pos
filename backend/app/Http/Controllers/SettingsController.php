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
            'two_factor_secret' => 'nullable|string',
            'two_factor_enabled' => 'nullable|boolean',
            'default_gst_type' => 'nullable|string|in:intra-state,inter-state,dynamic',
            'smtp_host' => 'nullable|string',
            'smtp_port' => 'nullable|string',
            'smtp_username' => 'nullable|string',
            'smtp_password' => 'nullable|string',
            'smtp_encryption' => 'nullable|string|in:tls,ssl',
            'smtp_from_address' => 'nullable|email',
            'smtp_from_name' => 'nullable|string',
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

        $setting = Setting::first();
        if ($setting && $setting->two_factor_enabled && !empty($setting->two_factor_secret)) {
            $otp = trim($request->otp ?? '');
            if (empty($otp)) {
                return response()->json([
                    'status' => 'error',
                    'message' => '2FA OTP is required to reset the database. Please provide 6-digit code from Google Authenticator.'
                ], 422);
            }

            // Verify TOTP in PHP
            if (!$this->verifyTotpCode($otp, $setting->two_factor_secret)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Invalid or expired 2FA code. Please check your Google Authenticator app.'
                ], 422);
            }
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
            
            // Handle attendances table safely (schema uses attendances)
            if (\Illuminate\Support\Facades\Schema::hasTable('attendances')) {
                \DB::table('attendances')->truncate();
            } elseif (\Illuminate\Support\Facades\Schema::hasTable('attendance')) {
                \DB::table('attendance')->truncate();
            }
            if (\Illuminate\Support\Facades\Schema::hasTable('payrolls')) {
                \DB::table('payrolls')->truncate();
            }

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

    /**
     * Helper to verify 6-digit TOTP code against Base32 secret (Google Authenticator)
     */
    private function verifyTotpCode($code, $secret)
    {
        $code = trim($code);
        if (strlen($code) !== 6) return false;

        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $clean = strtoupper(preg_replace('/[^A-Z2-7]/', '', $secret));
        $bits = '';
        for ($i = 0; $i < strlen($clean); $i++) {
            $val = strpos($alphabet, $clean[$i]);
            if ($val === false) continue;
            $bits .= sprintf('%05b', $val);
        }
        $key = '';
        for ($i = 0; $i + 8 <= strlen($bits); $i += 8) {
            $key .= chr(bindec(substr($bits, $i, 8)));
        }

        $time = floor(time() / 30);
        for ($offset = -1; $offset <= 1; $offset++) {
            $counter = $time + $offset;
            $binCounter = pack('N*', 0) . pack('N*', $counter);
            $hash = hash_hmac('sha1', $binCounter, $key, true);
            $offsetPos = ord($hash[19]) & 0xf;
            $binary = (
                ((ord($hash[$offsetPos]) & 0x7f) << 24) |
                ((ord($hash[$offsetPos + 1]) & 0xff) << 16) |
                ((ord($hash[$offsetPos + 2]) & 0xff) << 8) |
                (ord($hash[$offsetPos + 3]) & 0xff)
            );
            $expectedOtp = str_pad($binary % 1000000, 6, '0', STR_PAD_LEFT);
            if ($expectedOtp === $code) {
                return true;
            }
        }
        return false;
    }
}
