<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Watch;
use App\Models\Customer;
use App\Models\LoyaltyLedger;
use App\Models\ActivityLog;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SalesController extends Controller
{
    public function index(Request $request)
    {
        $query = Sale::with(['customer', 'user', 'items.watch']);
        
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                  ->orWhereHas('customer', function($cq) use ($search) {
                      $cq->where('name', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                  });
            });
        }
        
        return response()->json($query->latest()->get());
    }

    public function store(Request $request)
    {
        try {
            $request->validate([
                'customer_id' => 'required|exists:customers,id',
                'invoice_type' => 'required|in:gst,non-gst',
                'payment_mode' => 'required|string',
                'notes' => 'nullable|string',
                'items' => 'required|array|min:1',
                'items.*.watch_id' => 'required|exists:watches,id',
                'items.*.discount_amount' => 'nullable|numeric|min:0',
                'redeem_points' => 'nullable|integer|min:0',
                'bill_discount_amount' => 'nullable|numeric|min:0',
                'bill_discount_percent' => 'nullable|numeric|min:0',
                'round_off_amount' => 'nullable|numeric',
                'is_credit_sale' => 'nullable|boolean',
            ]);

        return DB::transaction(function () use ($request) {
            $customer = Customer::findOrFail($request->customer_id);
            $user = $request->user();
            
            $settings = Setting::first();
            $gstPrefix = $settings->gst_invoice_prefix ?? 'GST';
            $nongstPrefix = $settings->nongst_invoice_prefix ?? 'INV';
            
            // Split Invoice Series: configured prefix
            $prefix = $request->invoice_type === 'gst' ? "{$gstPrefix}-" : "{$nongstPrefix}-";
            $rows = DB::select("SELECT MAX(CAST(SUBSTRING(id, LENGTH(?) + 1) AS UNSIGNED)) AS max_id FROM sales WHERE id LIKE ? FOR UPDATE", [$prefix, $prefix . '%']);
            $nextNum = 1;
            if ($rows && $rows[0]->max_id !== null) {
                $nextNum = ((int) $rows[0]->max_id) + 1;
            }
            $invoiceId = $prefix . str_pad($nextNum, 4, '0', STR_PAD_LEFT);

            $subtotal = 0;
            $totalItemDiscounts = 0;
            $totalGst = 0;
            
            $preparedItems = [];
            
            foreach ($request->items as $itemInput) {
                $watch = Watch::findOrFail($itemInput['watch_id']);
                if ($watch->status !== 'in_stock') {
                    return response()->json(['message' => "Watch with Serial {$watch->id} is not in stock."], 422);
                }

                $sellingPrice = (double) $watch->selling_price;
                $itemDiscount = (double) ($itemInput['discount_amount'] ?? 0.00);

                $subtotal += $sellingPrice;
                $totalItemDiscounts += $itemDiscount;

                $preparedItems[] = [
                    'watch' => $watch,
                    'selling_price' => $sellingPrice,
                    'discount_amount' => $itemDiscount,
                ];
            }

            // Calculate bill discount
            $totalDiscount = $totalItemDiscounts;
            $billDiscFlat = (double) ($request->bill_discount_amount ?? 0.00);
            $billDiscPercent = (double) ($request->bill_discount_percent ?? 0.00);
            $billDiscAmount = $billDiscFlat;
            if ($billDiscPercent > 0) {
                $billDiscAmount = ($subtotal - $totalItemDiscounts) * ($billDiscPercent / 100);
            }
            $totalDiscount += $billDiscAmount;

            // Reward Points conversion
            $pointsRedeemed = (int) ($request->redeem_points ?? 0);
            $pointsValue = 0.00;
            if ($pointsRedeemed > 0) {
                if ($customer->points_balance < $pointsRedeemed) {
                    return response()->json(['message' => 'Insufficient reward points.'], 422);
                }
                $pointsValue = (double) $pointsRedeemed; // Configurable redemption rate (1 point = Rs 1)
                $totalDiscount += $pointsValue;
            }

            $roundOffAmount = (double) ($request->round_off_amount ?? 0.00);
            
            // Inclusive GST: Net amount is final bill payable by customer (MRP after discounts + roundoff)
            $netAmount = max(0, $subtotal - $totalDiscount + $roundOffAmount);

            $totalInitialItemNet = 0;
            foreach ($preparedItems as $pi) {
                $totalInitialItemNet += ($pi['selling_price'] - $pi['discount_amount']);
            }

            $itemsData = [];
            foreach ($preparedItems as $pi) {
                $watch = $pi['watch'];
                $sellingPrice = $pi['selling_price'];
                $itemDiscount = $pi['discount_amount'];
                $itemInitialNet = $sellingPrice - $itemDiscount;

                $allocatedItemNet = ($totalInitialItemNet > 0)
                    ? ($itemInitialNet * ($netAmount / $totalInitialItemNet))
                    : ($netAmount / count($preparedItems));

                $gstRate = (double) $watch->gst_rate;
                if ($request->invoice_type === 'gst') {
                    $itemGstAmount = $allocatedItemNet * ($gstRate / 100);
                } else {
                    $itemGstAmount = 0.00;
                }

                $itemsData[] = [
                    'watch' => $watch,
                    'price_sold' => $sellingPrice,
                    'discount_amount' => $itemDiscount,
                    'cost_price' => $watch->cost_price, // Save unit cost to prevent changes
                    'gst_rate' => $gstRate,
                    'gst_amount' => $itemGstAmount,
                ];

                $totalGst += $itemGstAmount;
            }

            $taxableBase = ($request->invoice_type === 'gst') ? ($netAmount - $totalGst) : $netAmount;

            $isCreditSale = ($request->payment_mode === 'credit') || filter_var($request->is_credit_sale ?? false, FILTER_VALIDATE_BOOLEAN);

            $sale = Sale::create([
                'id' => $invoiceId,
                'customer_id' => $customer->id,
                'user_id' => $user->id,
                'invoice_type' => $request->invoice_type,
                'invoice_date' => now()->toDateString(),
                'subtotal' => $subtotal,
                'discount_amount' => $totalDiscount,
                'gst_amount' => ($request->invoice_type === 'gst') ? $totalGst : 0.00,
                'points_redeemed' => $pointsRedeemed,
                'points_value' => $pointsValue,
                'net_amount' => $netAmount,
                'payment_mode' => $request->payment_mode,
                'is_credit_sale' => $isCreditSale,
                'notes' => $request->notes,
            ]);

            // Save credit to customer outstanding dues
            if ($isCreditSale && $netAmount > 0) {
                $customer->outstanding_dues = ($customer->outstanding_dues ?? 0.00) + $netAmount;
            }

            // Fetch settings to get default warranty period
            $settingsRecord = \App\Models\Setting::first();
            $warrantyMonths = $settingsRecord ? (int) $settingsRecord->warranty_period_months : 12;

            foreach ($itemsData as $item) {
                $watch = $item['watch'];
                
                SaleItem::create([
                    'sale_id' => $sale->id,
                    'watch_id' => $watch->id,
                    'price_sold' => $item['price_sold'],
                    'discount_amount' => $item['discount_amount'],
                    'cost_price' => $item['cost_price'],
                    'gst_rate' => $item['gst_rate'],
                    'gst_amount' => $item['gst_amount'],
                ]);

                // Create associated Warranty Card automatically
                $expiryDate = Carbon::parse($sale->invoice_date)->addMonths($warrantyMonths)->toDateString();
                \App\Models\WarrantyCard::create([
                    'watch_id' => $watch->id,
                    'sale_id' => $sale->id,
                    'customer_id' => $customer->id,
                    'sale_date' => $sale->invoice_date,
                    'warranty_months' => $warrantyMonths,
                    'expiry_date' => $expiryDate,
                    'is_active' => true,
                    'notes' => 'Generated automatically upon purchase'
                ]);

                $watch->status = 'sold';
                $watch->save();
            }

            // Adjust Customer reward points ledger
            if ($pointsRedeemed > 0) {
                $customer->points_balance -= $pointsRedeemed;
                LoyaltyLedger::create([
                    'customer_id' => $customer->id,
                    'points_earned' => 0,
                    'points_redeemed' => $pointsRedeemed,
                    'transaction_type' => 'redemption',
                    'reference_id' => $sale->id,
                    'remarks' => 'Points redeemed for invoice ' . $sale->id
                ]);
            }

            // Points earned calculation
            $pointsEarned = floor($netAmount / 100); // 1 point per 100 spent
            if ($pointsEarned > 0) {
                $customer->points_balance += $pointsEarned;
                LoyaltyLedger::create([
                    'customer_id' => $customer->id,
                    'points_earned' => $pointsEarned,
                    'points_redeemed' => 0,
                    'transaction_type' => 'purchase',
                    'reference_id' => $sale->id,
                    'remarks' => 'Points earned on invoice ' . $sale->id
                ]);
            }

            $customer->save();

            ActivityLog::log($user->id, 'CREATE', 'Sales', "Created invoice {$sale->id} for customer {$customer->name} of amount ₹" . number_format($netAmount, 2));

            return response()->json([
                'message' => 'Sale invoiced successfully',
                'sale' => $sale->load(['items.watch', 'customer'])
            ], 201);
        });
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Exception: ' . $e->getMessage() . ' at ' . $e->getFile() . ':' . $e->getLine(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    }

    public function show($id)
    {
        $sale = Sale::with(['customer', 'user', 'items.watch.purchase'])->findOrFail($id);
        return response()->json($sale);
    }

    public function settleDebt(Request $request, $id)
    {
        $request->validate([
            'payment_mode' => 'required|string'
        ]);

        return DB::transaction(function () use ($request, $id) {
            $sale = Sale::findOrFail($id);
            $user = $request->user();

            if (!$sale->is_credit_sale) {
                return response()->json(['message' => 'This invoice is not a credit sale.'], 400);
            }

            $customer = Customer::findOrFail($sale->customer_id);

            // Update Sale
            $sale->is_credit_sale = false;
            $sale->payment_mode = $request->payment_mode;
            $sale->save();

            // Reduce Customer Outstanding Dues
            if ($customer->outstanding_dues >= $sale->net_amount) {
                $customer->outstanding_dues -= $sale->net_amount;
            } else {
                $customer->outstanding_dues = 0;
            }
            $customer->save();

            // Log activity
            ActivityLog::log($user->id, 'UPDATE', 'Sales', "Settled debt for invoice {$sale->id} (Amount: ₹" . number_format($sale->net_amount, 2) . ") via {$request->payment_mode}");

            return response()->json([
                'message' => 'Debt settled successfully.',
                'sale' => $sale->load(['customer'])
            ]);
        });
    }
}
