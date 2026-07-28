<?php

namespace App\Http\Controllers;

use App\Models\Watch;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReturnController extends Controller
{
    public function index()
    {
        $returns = DB::table('sales_returns')
            ->join('customers', 'sales_returns.customer_id', '=', 'customers.id')
            ->join('watches', 'sales_returns.watch_id', '=', 'watches.id')
            ->join('sales', 'sales_returns.original_sale_id', '=', 'sales.id')
            ->select('sales_returns.*', 'customers.name as customer_name', 'customers.phone as customer_phone', 'watches.brand as watch_brand', 'watches.model as watch_model', 'sales.invoice_date as original_sale_date')
            ->latest('sales_returns.created_at')
            ->get();

        $formatted = $returns->map(function ($r) {
            return [
                'id' => $r->id,
                'original_sale_id' => $r->original_sale_id,
                'watch_id' => $r->watch_id,
                'customer_id' => $r->customer_id,
                'refund_amount' => $r->refund_amount,
                'refund_mode' => $r->refund_mode,
                'reason' => $r->reason,
                'created_at' => $r->created_at,
                'customer' => [
                    'name' => $r->customer_name,
                    'phone' => $r->customer_phone,
                ],
                'watch' => [
                    'id' => $r->watch_id,
                    'brand' => $r->watch_brand,
                    'model' => $r->watch_model,
                ],
                'original_sale' => [
                    'id' => $r->original_sale_id,
                    'invoice_date' => $r->original_sale_date,
                ]
            ];
        });

        return response()->json($formatted);
    }

    public function store(Request $request)
    {
        $request->validate([
            'original_sale_id' => 'required|exists:sales,id',
            'watch_id' => 'required|exists:watches,id',
            'customer_id' => 'required|exists:customers,id',
            'refund_amount' => 'required|numeric|min:0',
            'refund_mode' => 'required|string',
            'reason' => 'required|string'
        ]);

        // Fix #12: Prevent duplicate return for same watch + sale
        $alreadyReturned = DB::table('sales_returns')
            ->where('original_sale_id', $request->original_sale_id)
            ->where('watch_id', $request->watch_id)
            ->exists();
        if ($alreadyReturned) {
            return response()->json(['message' => 'This watch has already been returned from this invoice.'], 422);
        }

        return DB::transaction(function () use ($request) {
            $ret = DB::table('sales_returns')->insertGetId([
                'original_sale_id' => $request->original_sale_id,
                'watch_id' => $request->watch_id,
                'customer_id' => $request->customer_id,
                'refund_amount' => $request->refund_amount,
                'refund_mode' => $request->refund_mode,
                'reason' => $request->reason,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            DB::table('sale_items')
                ->where('sale_id', $request->original_sale_id)
                ->where('watch_id', $request->watch_id)
                ->update(['is_returned' => true]);

            $watch = Watch::findOrFail($request->watch_id);
            $watch->status = 'exchanged_returned';
            $watch->save();

            $customer = Customer::findOrFail($request->customer_id);
            $saleItem = DB::table('sale_items')
                ->where('sale_id', $request->original_sale_id)
                ->where('watch_id', $request->watch_id)
                ->first();
            
            if ($saleItem) {
                $netItemSpent = $saleItem->price_sold - $saleItem->discount_amount;
                $pointsEarnedToDeduct = floor($netItemSpent / 100);
                if ($pointsEarnedToDeduct > 0) {
                    $customer->points_balance = max(0, $customer->points_balance - $pointsEarnedToDeduct);

                    DB::table('loyalty_ledgers')->insert([
                        'customer_id' => $customer->id,
                        'points_earned' => 0,
                        'points_redeemed' => $pointsEarnedToDeduct,
                        'transaction_type' => 'refund',
                        'reference_id' => $request->original_sale_id,
                        'remarks' => 'Points deducted due to watch return: ' . $request->watch_id,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                }
            }

            // Fix #4: Reduce outstanding_dues if the original sale was a credit sale
            $originalSale = DB::table('sales')->where('id', $request->original_sale_id)->first();
            if ($originalSale && $originalSale->is_credit_sale) {
                $customer->outstanding_dues = max(0, ($customer->outstanding_dues ?? 0) - (double) $request->refund_amount);
            }

            $customer->save();

            return response()->json([
                'message' => 'Return processed successfully',
                'id' => $ret
            ], 201);
        });
    }
}
