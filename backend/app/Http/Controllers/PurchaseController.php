<?php

namespace App\Http\Controllers;

use App\Models\Purchase;
use App\Models\Watch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseController extends Controller
{
    public function index()
    {
        // Full purchase list with detailed itemized watch costings
        $purchases = Purchase::with('watches')->latest()->get();
        return response()->json($purchases);
    }

    public function store(Request $request)
    {
        $request->validate([
            'supplier_name' => 'required|string',
            'purchase_date' => 'required|date',
            'invoice_number' => 'nullable|string',
            'remarks' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|string', // We will validate uniqueness manually in the loop
            'items.*.brand' => 'required|string',
            'items.*.model' => 'required|string',
            'items.*.category' => 'nullable|string',
            'items.*.gender' => 'nullable|string',
            'items.*.strap_type' => 'nullable|string',
            'items.*.dial_color' => 'nullable|string',
            'items.*.movement_type' => 'nullable|string',
            'items.*.mrp' => 'required|numeric|min:0',
            'items.*.discount_percent' => 'nullable|numeric|min:0|max:100',
            'items.*.cost_price' => 'required|numeric|min:0', // Store unit cost
            'items.*.selling_price' => 'required|numeric|min:0',
            'items.*.gst_rate' => 'required|numeric|min:0', // Dynamic GST rate from invoice
            'items.*.quantity' => 'nullable|integer|min:1',
            'items.*.image_urls' => 'nullable|array',
        ]);

        return DB::transaction(function () use ($request) {
            $purchase = Purchase::create([
                'supplier_name' => $request->supplier_name,
                'purchase_date' => $request->purchase_date,
                'invoice_number' => $request->invoice_number,
                'remarks' => $request->remarks,
                'total_amount' => 0.00
            ]);

            $totalAmount = 0;

            foreach ($request->items as $item) {
                $qty = isset($item['quantity']) ? (int) $item['quantity'] : 1;
                
                for ($q = 0; $q < $qty; $q++) {
                    $watchId = ($q === 0) ? $item['id'] : $item['id'] . '-' . $q;
                    
                    // Check for duplicate watch ID to prevent constraint violation
                    if (Watch::where('id', $watchId)->exists()) {
                        throw new \Exception("A watch piece with Serial ID '{$watchId}' already exists in inventory.");
                    }

                    Watch::create([
                        'id' => $watchId,
                        'purchase_id' => $purchase->id,
                        'brand' => $item['brand'],
                        'model' => $item['model'],
                        'category' => $item['category'] ?? null,
                        'gender' => $item['gender'] ?? null,
                        'strap_type' => $item['strap_type'] ?? null,
                        'dial_color' => $item['dial_color'] ?? null,
                        'movement_type' => $item['movement_type'] ?? null,
                        'mrp' => $item['mrp'],
                        'discount_percent' => $item['discount_percent'] ?? 0.00,
                        'cost_price' => $item['cost_price'],
                        'selling_price' => $item['selling_price'],
                        'gst_rate' => $item['gst_rate'],
                        'status' => 'in_stock',
                        'image_urls' => $item['image_urls'] ?? null,
                    ]);

                    $totalAmount += $item['cost_price'];
                }
            }

            $purchase->total_amount = $totalAmount;
            $purchase->save();

            return response()->json([
                'message' => 'Purchase recorded and stock added successfully',
                'purchase' => $purchase->load('watches')
            ], 201);
        });
    }
}
