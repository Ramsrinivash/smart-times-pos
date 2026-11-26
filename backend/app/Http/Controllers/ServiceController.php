<?php

namespace App\Http\Controllers;

use App\Models\ServiceJob;
use App\Models\Customer;
use App\Models\Sale;
use App\Models\LoyaltyLedger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ServiceController extends Controller
{
    public function index(Request $request)
    {
        $query = ServiceJob::with(['customer', 'watch']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
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
        $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'watch_id' => 'nullable|exists:watches,id',
            'watch_details' => 'nullable|array',
            'issue_reported' => 'required|string',
            'drop_off_condition' => 'nullable|string',
            'estimated_cost' => 'nullable|numeric|min:0',
            'expected_delivery_date' => 'nullable|date',
        ]);

        $user = $request->user();
        $now = Carbon::now();
        $dateStr = $now->format('Ym');

        $lastJob = ServiceJob::whereRaw('id REGEXP "^JC-[0-9]+$"')->orderByRaw('CAST(SUBSTRING(id, 4) AS UNSIGNED) DESC')->first();
        $nextNum = 1;
        if ($lastJob) {
            $nextNum = ((int) substr($lastJob->id, 3)) + 1;
        }
        $jobCardId = "JC-" . str_pad($nextNum, 4, '0', STR_PAD_LEFT);

        $job = ServiceJob::create([
            'id' => $jobCardId,
            'customer_id' => $request->customer_id,
            'watch_id' => $request->watch_id,
            'watch_details' => $request->watch_details,
            'issue_reported' => $request->issue_reported,
            'drop_off_condition' => $request->drop_off_condition,
            'estimated_cost' => $request->estimated_cost,
            'expected_delivery_date' => $request->expected_delivery_date,
            'status' => 'received',
            'created_by' => $user->id
        ]);

        return response()->json([
            'message' => 'Job Card registered successfully',
            'job' => $job->load(['customer', 'watch'])
        ], 201);
    }

    public function show($id)
    {
        $job = ServiceJob::with(['customer', 'watch', 'user'])->findOrFail($id);
        return response()->json($job);
    }

    public function updateStatus(Request $request, $id)
    {
        $job = ServiceJob::findOrFail($id);
        $request->validate([
            'status' => 'required|in:received,in_repair,ready,delivered',
            'actual_cost' => 'nullable|numeric|min:0',
            'billing_invoice_id' => 'nullable|string',
        ]);

        $job->status = $request->status;

        if ($request->status === 'delivered') {
            $job->actual_delivery_date = Carbon::now()->toDateString();
        }

        if ($request->has('actual_cost')) {
            $job->actual_cost = $request->actual_cost;
        }

        if ($request->has('billing_invoice_id')) {
            $job->billing_invoice_id = $request->billing_invoice_id;
        }

        $job->save();

        return response()->json([
            'message' => 'Job status updated successfully',
            'job' => $job
        ]);
    }

    public function addBill(Request $request)
    {
        $request->validate([
            'job_id' => 'required|exists:service_jobs,id',
            'actual_cost' => 'required|numeric|min:0',
            'payment_mode' => 'required|string',
            'invoice_type' => 'nullable|string|in:gst,non-gst', // Fix #11: Accept GST or non-GST
        ]);

        try {
            return DB::transaction(function () use ($request) {
                $job = ServiceJob::findOrFail($request->job_id);

                // If this job has already been delivered and billed, return existing invoice to avoid 500 error on duplicate delivery
                if ($job->status === 'delivered' && $job->billing_invoice_id) {
                    $existingSale = Sale::with(['customer', 'saleItems.watch'])->find($job->billing_invoice_id);
                    if ($existingSale) {
                        return response()->json([
                            'message' => 'Job already billed and delivered.',
                            'id' => $existingSale->id,
                            'sale' => $existingSale,
                            'job' => $job
                        ]);
                    }
                }

                $user = $request->user();

                // Determine prefix based on invoice_type (GST or Non-GST) and Setting
                $settings = \App\Models\Setting::first();
                $isGst = ($request->invoice_type === 'gst');
                $gstPrefix = $settings->gst_invoice_prefix ?? 'ST-GST';
                $nongstPrefix = $settings->nongst_invoice_prefix ?? 'ST-RETL';
                $prefix = $isGst ? "{$gstPrefix}-" : "{$nongstPrefix}-";

                // Generate unique sequential invoice number
                $rows = DB::select("SELECT MAX(CAST(SUBSTRING(id, LENGTH(?) + 1) AS UNSIGNED)) AS max_id FROM sales WHERE id LIKE ? FOR UPDATE", [$prefix, $prefix . '%']);
                $nextNum = 1;
                if ($rows && $rows[0]->max_id !== null) {
                    $nextNum = ((int) $rows[0]->max_id) + 1;
                }
                
                // Extra guard against duplicate primary keys: iterate until unused ID is found
                do {
                    $invoiceId = $prefix . str_pad($nextNum, 4, '0', STR_PAD_LEFT);
                    $exists = Sale::where('id', $invoiceId)->exists();
                    if ($exists) {
                        $nextNum++;
                    }
                } while ($exists);

                $netAmount = (double) $request->actual_cost;
                $gstAmount = 0.00;
                $subtotal = $netAmount;

                // If GST invoice is requested, calculate GST (18% standard service GST rate SAC 998729)
                // Note: Retail invoices are tax-inclusive where subtotal = netAmount, and gst_amount is extracted
                if ($isGst && $netAmount > 0) {
                    $taxableBase = round($netAmount / 1.18, 2);
                    $gstAmount = round($netAmount - $taxableBase, 2);
                    $subtotal = $netAmount;
                }

                $sale = Sale::create([
                    'id' => $invoiceId,
                    'customer_id' => $job->customer_id,
                    'user_id' => $user->id,
                    'invoice_type' => $isGst ? 'gst' : 'non-gst',
                    'invoice_date' => Carbon::now()->toDateString(),
                    'subtotal' => $subtotal,
                    'discount_amount' => 0.00,
                    'bill_discount_amount' => 0.00,
                    'gst_amount' => $gstAmount,
                    'points_redeemed' => 0,
                    'points_value' => 0.00,
                    'net_amount' => $netAmount,
                    'payment_mode' => strtolower($request->payment_mode),
                    'is_credit_sale' => false,
                    'notes' => 'Service & Repair delivery charges for Job Card ' . $job->id,
                ]);

                // Ensure a valid watch reference exists for SaleItem foreign key constraint
                $watchId = $job->watch_id;
                if (!$watchId) {
                    $watchId = 'SVC-' . $job->id;
                    $servicePurchase = \App\Models\Purchase::firstOrCreate(
                        ['invoice_number' => 'SERVICE-INTERNAL'],
                        [
                            'supplier_name' => 'Internal Service Department',
                            'purchase_date' => Carbon::now()->toDateString(),
                            'total_amount' => 0.00,
                            'payment_status' => 'paid',
                            'remarks' => 'Internal placeholder purchase for service delivery billing'
                        ]
                    );

                    $brandName = !empty($job->watch_details['brand']) ? $job->watch_details['brand'] : 'Watch Service';
                    $modelName = !empty($job->watch_details['model']) ? $job->watch_details['model'] : ('Repair (JC: ' . $job->id . ')');

                    // If watch already exists from previous billing attempt, update it; otherwise create it
                    \App\Models\Watch::updateOrCreate(
                        ['id' => $watchId],
                        [
                            'purchase_id' => $servicePurchase->id,
                            'brand' => $brandName,
                            'model' => $modelName,
                            'category' => 'Service',
                            'gender' => $job->watch_details['gender'] ?? 'Unisex',
                            'movement_type' => 'Service',
                            'mrp' => $netAmount,
                            'discount_percent' => 0.00,
                            'cost_price' => 0.00,
                            'selling_price' => $netAmount,
                            'gst_rate' => $isGst ? 18.00 : 0.00,
                            'status' => 'delivered',
                            'hsn_code' => $isGst ? '998729' : null
                        ]
                    );
                }

                \App\Models\SaleItem::create([
                    'sale_id' => $invoiceId,
                    'watch_id' => $watchId,
                    'price_sold' => $netAmount,
                    'discount_amount' => 0.00,
                    'cost_price' => 0.00,
                    'gst_rate' => $isGst ? 18.00 : 0.00,
                    'gst_amount' => $gstAmount,
                ]);

                // Update the Service Job Card
                $job->status = 'delivered';
                $job->actual_cost = $request->actual_cost;
                $job->actual_delivery_date = Carbon::now()->toDateString();
                $job->billing_invoice_id = $invoiceId;
                $job->save();

                // Credit Loyalty Points to Customer
                $customer = $job->customer;
                if ($customer) {
                    $earnRate = (int) ($settings->loyalty_earn_rate ?? 1);
                    $pointsEarned = floor($request->actual_cost / 100) * max(1, $earnRate);
                    if ($pointsEarned > 0) {
                        $customer->points_balance += $pointsEarned;
                        $customer->save();

                        LoyaltyLedger::create([
                            'customer_id' => $customer->id,
                            'points_earned' => $pointsEarned,
                            'points_redeemed' => 0,
                            'transaction_type' => 'purchase',
                            'reference_id' => $invoiceId,
                            'remarks' => 'Points earned on service invoice ' . $invoiceId,
                        ]);
                    }
                }

                return response()->json([
                    'message' => 'Service billed and delivered successfully',
                    'id' => $invoiceId,
                    'sale' => $sale->load(['customer', 'saleItems.watch']),
                    'job' => $job
                ]);
            });
        } catch (\Exception $e) {
            \Log::error('Service addBill delivery error: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            return response()->json([
                'message' => 'Delivery error: ' . $e->getMessage()
            ], 500);
        }
    }
}
