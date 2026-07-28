<?php

namespace App\Http\Controllers;

use App\Models\Exchange;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Watch;
use App\Models\Customer;
use App\Models\LoyaltyLedger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ExchangeController extends Controller
{
    public function index()
    {
        $exchanges = Exchange::with(['originalSale', 'returnedWatch', 'replacementWatch', 'user'])->latest()->get();
        return response()->json($exchanges);
    }

    public function store(Request $request)
    {
        $request->validate([
            'original_sale_id' => 'required|exists:sales,id',
            'returned_watch_id' => 'required|exists:watches,id',
            'replacement_watch_id' => 'required|exists:watches,id',
            'remarks' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($request) {
            $user = $request->user();
            
            $originalSale = Sale::findOrFail($request->original_sale_id);
            $saleItem = SaleItem::where('sale_id', $originalSale->id)
                                ->where('watch_id', $request->returned_watch_id)
                                ->first();

            if (!$saleItem) {
                return response()->json(['message' => 'The returned watch was not found on this invoice.'], 422);
            }

            // Fix #5: Block exchange if watch was already returned/exchanged
            if ($saleItem->is_returned) {
                return response()->json(['message' => 'This watch has already been returned or exchanged. Cannot process again.'], 422);
            }

            $returnedWatchCheck = Watch::findOrFail($request->returned_watch_id);
            if ($returnedWatchCheck->status === 'exchanged_returned') {
                return response()->json(['message' => 'This watch has already been marked as returned/exchanged in inventory.'], 422);
            }

            $replacementWatch = Watch::findOrFail($request->replacement_watch_id);
            if ($replacementWatch->status !== 'in_stock') {
                return response()->json(['message' => 'The replacement watch is not in stock.'], 422);
            }

            $returnedCredit = $saleItem->price_sold - $saleItem->discount_amount;
            $replacementCost = $replacementWatch->selling_price;
            $difference = $replacementCost - $returnedCredit;
            
            $now = Carbon::now();
            $fy = ($now->month >= 4) ? substr($now->year, 2) . substr($now->year + 1, 2) : substr($now->year - 1, 2) . substr($now->year, 2);

            $replacementSale = null;
            $exchangeType = 'exchange_note';

            if ($difference > 0) {
                $exchangeType = $originalSale->invoice_type === 'gst' ? 'tax_invoice' : 'exchange_note';
                
                $prefix = $originalSale->invoice_type === 'gst' ? "WS-GST-{$fy}-" : "WS-RETL-{$fy}-";
                $lastInvoice = Sale::where('id', 'like', "{$prefix}%")->orderBy('id', 'desc')->first();
                $nextNum = 1;
                if ($lastInvoice) {
                    $parts = explode('-', $lastInvoice->id);
                    $nextNum = ((int) end($parts)) + 1;
                }
                $invoiceId = $prefix . str_pad($nextNum, 4, '0', STR_PAD_LEFT);

                $gstRate = $replacementWatch->gst_rate;
                $priceBeforeGst = $difference / (1 + ($gstRate / 100));
                $gstAmount = $difference - $priceBeforeGst;

                $replacementSale = Sale::create([
                    'id' => $invoiceId,
                    'customer_id' => $originalSale->customer_id,
                    'user_id' => $user->id,
                    'invoice_type' => $originalSale->invoice_type,
                    'invoice_date' => $now->toDateString(),
                    'subtotal' => $replacementCost,
                    'discount_amount' => $returnedCredit,
                    'gst_amount' => ($originalSale->invoice_type === 'gst') ? $gstAmount : 0.00,
                    'points_redeemed' => 0,
                    'points_value' => 0.00,
                    'net_amount' => $difference,
                    'payment_mode' => 'split',
                    'notes' => 'Exchange adjustment invoice: ' . $originalSale->id
                ]);

                SaleItem::create([
                    'sale_id' => $replacementSale->id,
                    'watch_id' => $replacementWatch->id,
                    'price_sold' => $replacementCost,
                    'discount_amount' => $returnedCredit,
                    'cost_price' => $replacementWatch->cost_price,
                    'gst_rate' => $gstRate,
                    'gst_amount' => $gstAmount
                ]);
            } else if ($difference < 0) {
                $exchangeType = 'credit_note';
            }

            // Update watch inventory statuses
            $returnedWatch = Watch::findOrFail($request->returned_watch_id);
            $returnedWatch->status = 'exchanged_returned';
            $returnedWatch->save();

            $replacementWatch->status = 'sold';
            $replacementWatch->save();

            // Record exchange
            $exchange = Exchange::create([
                'original_sale_id' => $originalSale->id,
                'returned_watch_id' => $returnedWatch->id,
                'replacement_sale_id' => $replacementSale ? $replacementSale->id : null,
                'replacement_watch_id' => $replacementWatch->id,
                'difference_amount' => $difference,
                'exchange_type' => $exchangeType,
                'exchange_date' => $now->toDateString(),
                'created_by' => $user->id,
                'status' => 'pending_review',
                'remarks' => $request->remarks
            ]);

            // Loyalty Points Reversals
            $customer = Customer::findOrFail($originalSale->customer_id);
            $reversedPoints = floor($returnedCredit / 100);
            if ($reversedPoints > 0) {
                // Fix #6: Always deduct, never silently skip — clamp to 0 minimum
                $customer->points_balance = max(0, $customer->points_balance - $reversedPoints);
                LoyaltyLedger::create([
                    'customer_id' => $customer->id,
                    'points_earned' => 0,
                    'points_redeemed' => $reversedPoints,
                    'transaction_type' => 'refund',
                    'reference_id' => $originalSale->id,
                    'remarks' => 'Points reversed from exchange return'
                ]);
            }

            if ($difference > 0) {
                $newPoints = floor($difference / 100);
                if ($newPoints > 0) {
                    $customer->points_balance += $newPoints;
                    LoyaltyLedger::create([
                        'customer_id' => $customer->id,
                        'points_earned' => $newPoints,
                        'points_redeemed' => 0,
                        'transaction_type' => 'purchase',
                        'reference_id' => $replacementSale->id,
                        'remarks' => 'Points earned on exchange pay difference'
                    ]);
                }
            }

            $customer->save();

            return response()->json([
                'message' => 'Exchange processed successfully',
                'exchange' => $exchange->load(['returnedWatch', 'replacementWatch']),
                'replacement_sale' => $replacementSale
            ], 201);
        });
    }

    public function approve(Request $request, $id)
    {
        $exchange = Exchange::findOrFail($id);
        $request->validate([
            'status' => 'required|in:resellable,refurbish',
        ]);

        $exchange->status = $request->status;
        $exchange->save();

        $watch = Watch::findOrFail($exchange->returned_watch_id);
        if ($request->status === 'resellable') {
            $watch->status = 'in_stock';
        } else {
            $watch->status = 'refurbishing';
        }
        $watch->save();

        return response()->json([
            'message' => 'Exchange return review completed successfully',
            'exchange' => $exchange
        ]);
    }
}
