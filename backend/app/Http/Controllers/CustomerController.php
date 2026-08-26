<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\LoyaltyLedger;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $query = Customer::query();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return response()->json($query->latest()->get());
    }

    public function store(Request $request)
    {
        if ($request->filled('phone')) {
            $existing = Customer::where('phone', trim($request->phone))->first();
            if ($existing) {
                $changed = false;
                // Fix #14: Update name, email, dob, alt_phone, address if provided and different
                foreach (['name', 'email', 'alt_phone', 'address', 'dob', 'anniversary', 'tags', 'notes'] as $field) {
                    if ($request->filled($field) && $existing->$field !== $request->$field) {
                        $existing->$field = $request->$field;
                        $changed = true;
                    }
                }
                if ($changed) {
                    $existing->save();
                    ActivityLog::log($request->user()->id, 'UPDATE', 'Customers', "Updated customer profile for {$existing->name} (Phone: {$existing->phone})");
                }
                return response()->json([
                    'message' => 'Customer profile already exists, returned existing profile',
                    'customer' => $existing
                ], 200);
            }
        }

        if ($request->has('dob') && $request->dob === '') {
            $request->merge(['dob' => null]);
        }
        if ($request->has('anniversary') && $request->anniversary === '') {
            $request->merge(['anniversary' => null]);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|unique:customers,phone',
            'alt_phone' => 'nullable|string',
            'email' => 'nullable|email',
            'address' => 'nullable|string',
            'dob' => 'nullable|date',
            'anniversary' => 'nullable|date',
            'tags' => 'nullable|string',
            'notes' => 'nullable|string'
        ]);

        $customer = Customer::create($request->all());

        ActivityLog::log($request->user()->id, 'CREATE', 'Customers', "Created profile for customer {$customer->name} (Phone: {$customer->phone})");

        return response()->json([
            'message' => 'Customer profile created successfully',
            'customer' => $customer
        ], 201);
    }

    public function show($id)
    {
        $customer = Customer::with(['loyaltyLedgers'])->findOrFail($id);
        return response()->json($customer);
    }

    public function purchaseHistory($id)
    {
        $customer = Customer::findOrFail($id);
        $history = $customer->sales()->with(['items.watch'])->latest()->get();
        return response()->json($history);
    }

    public function update(Request $request, $id)
    {
        $customer = Customer::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'phone' => 'sometimes|required|string|unique:customers,phone,' . $id,
            'alt_phone' => 'nullable|string',
            'email' => 'nullable|email',
            'address' => 'nullable|string',
            'dob' => 'nullable|date',
            'anniversary' => 'nullable|date',
            'tags' => 'nullable|string',
            'notes' => 'nullable|string'
        ]);

        $customer->update($request->all());

        ActivityLog::log($request->user()->id, 'UPDATE', 'Customers', "Updated customer details for {$customer->name}");

        return response()->json([
            'message' => 'Customer profile updated successfully',
            'customer' => $customer
        ]);
    }
}
