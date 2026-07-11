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
}
