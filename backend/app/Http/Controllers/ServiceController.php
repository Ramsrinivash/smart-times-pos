<?php

namespace App\Http\Controllers;

use App\Models\ServiceJob;
use App\Models\Customer;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ServiceController extends Controller
{
    public function index(Request $request)
    {
        $query = ServiceJob::with(['customer', 'watch']);

        if ($request->has('status')) {
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

        $prefix = "JC-{$dateStr}-";
        $lastJob = ServiceJob::where('id', 'like', "{$prefix}%")->orderBy('id', 'desc')->first();
        $nextNum = 1;
        if ($lastJob) {
            $parts = explode('-', $lastJob->id);
            $nextNum = ((int) end($parts)) + 1;
        }
        $jobCardId = $prefix . str_pad($nextNum, 4, '0', STR_PAD_LEFT);

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
}
