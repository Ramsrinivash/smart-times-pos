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
        ]);

        return DB::transaction(function () use ($request) {
            $job = ServiceJob::findOrFail($request->job_id);
            $user = $request->user();

            // Generate sequential unique invoice ID for service bill (e.g. 0001, 0002...)
            $lastInvoice = Sale::whereRaw('id REGEXP "^[0-9]+$"')->orderByRaw('CAST(id AS UNSIGNED) DESC')->first();
            $nextNum = 1;
            if ($lastInvoice) {
                $nextNum = ((int) $lastInvoice->id) + 1;
            }
            $invoiceId = str_pad($nextNum, 4, '0', STR_PAD_LEFT);

            $sale = Sale::create([
                'id' => $invoiceId,
                'customer_id' => $job->customer_id,
                'user_id' => $user->id,
                'invoice_type' => 'non-gst',
                'invoice_date' => Carbon::now()->toDateString(),
                'subtotal' => $request->actual_cost,
                'discount_amount' => 0.00,
                'gst_amount' => 0.00,
                'points_redeemed' => 0,
                'points_value' => 0.00,
                'net_amount' => $request->actual_cost,
                'payment_mode' => $request->payment_mode,
                'notes' => 'Service & Repair delivery charges for Job Card ' . $job->id,
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
                $pointsEarned = floor($request->actual_cost / 100);
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
                'sale' => $sale,
                'job' => $job
            ]);
        });
    }
}
