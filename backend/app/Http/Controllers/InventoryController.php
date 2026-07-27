<?php

namespace App\Http\Controllers;

use App\Models\Watch;
use App\Models\StockAdjustment;
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
            'status' => 'required|in:in_stock,sold,exchanged_returned,refurbishing,damaged,display,reserved',
            'reason' => 'required|string',
            'remarks' => 'nullable|string'
        ]);

        $watch = Watch::findOrFail($request->watch_id);
        $oldStatus = $watch->status;
        $watch->status = $request->status;
        $watch->save();

        // Log the stock adjustment
        StockAdjustment::create([
            'watch_id' => $watch->id,
            'user_id' => $request->user()->id,
            'old_status' => $oldStatus,
            'new_status' => $request->status,
            'reason' => $request->reason,
            'remarks' => $request->remarks,
        ]);

        return response()->json([
            'message' => 'Stock status adjusted successfully',
            'watch' => $watch
        ]);
    }

    public function getAdjustmentLogs(Request $request)
    {
        $logs = StockAdjustment::with(['watch', 'user'])->latest()->get();
        return response()->json($logs);
    }

    public function uploadImages(Request $request)
    {
        $request->validate([
            'watch_id' => 'required|exists:watches,id',
            'images' => 'required|array',
            'images.*' => 'required|string'
        ]);

        $watch = Watch::findOrFail($request->watch_id);
        $currentImages = $watch->image_urls ?? [];
        
        // Merge the new base64 images into the existing array
        $mergedImages = array_merge($currentImages, $request->images);
        
        $watch->image_urls = $mergedImages;
        $watch->save();

        return response()->json($watch);
    }

    public function removeImage(Request $request, $id, $index)
    {
        $watch = Watch::findOrFail($id);
        $images = $watch->image_urls ?? [];
        
        $index = (int)$index;
        if (isset($images[$index])) {
            unset($images[$index]);
            $images = array_values($images);
        }

        $watch->image_urls = $images;
        $watch->save();

        return response()->json($watch);
    }
}
