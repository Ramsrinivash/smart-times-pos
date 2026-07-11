<?php

namespace App\Http\Controllers;

use App\Models\Watch;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Watch::query();

        // Filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Search brand/model/Watch ID
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                  ->orWhere('brand', 'like', "%{$search}%")
                  ->orWhere('model', 'like', "%{$search}%")
                  ->orWhere('category', 'like', "%{$search}%");
            });
        }

        $watches = $query->latest()->get();

        // Role-based sanitization
        // Sales staff must not see cost_price or discount_percent (which contains purchase discount rate)
        if ($user->role === 'sales') {
            $watches->makeHidden(['cost_price', 'discount_percent']);
        }

        return response()->json($watches);
    }

    public function adjustStock(Request $request)
    {
        $request->validate([
            'watch_id' => 'required|exists:watches,id',
            'status' => 'required|in:in_stock,sold,exchanged_returned,refurbishing',
            'remarks' => 'nullable|string'
        ]);

        $watch = Watch::findOrFail($request->watch_id);
        $watch->status = $request->status;
        
        // Audit log or remarks logic can be added here
        
        $watch->save();

        return response()->json([
            'message' => 'Stock status adjusted successfully',
            'watch' => $watch
        ]);
    }
}
