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
        $query = Watch::with(['purchase:id,invoice_number,bill_file,supplier_name', 'saleItems.sale:id,invoice_type,invoice_date']);

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

    public function update(Request $request, $id)
    {
        $watch = Watch::findOrFail($id);

        $request->validate([
            'brand' => 'sometimes|required|string',
            'model' => 'sometimes|required|string',
            'category' => 'nullable|string',
            'gender' => 'nullable|string',
            'strap_type' => 'nullable|string',
            'dial_color' => 'nullable|string',
            'movement_type' => 'nullable|string',
            'mrp' => 'sometimes|required|numeric|min:0',
            'discount_percent' => 'nullable|numeric|min:0|max:100',
            'selling_price' => 'sometimes|required|numeric|min:0',
            'cost_price' => 'sometimes|required|numeric|min:0',
            'gst_rate' => 'nullable|numeric|min:0',
            'hsn_code' => 'nullable|string',
            'status' => 'nullable|string'
        ]);

        $oldCost = (double) $watch->cost_price;
        $watch->update($request->all());

        // If cost_price changed and this watch has a parent purchase, update purchase total_amount
        if ($request->has('cost_price') && $watch->purchase_id) {
            $purchase = $watch->purchase;
            if ($purchase) {
                $newTotal = (double) Watch::where('purchase_id', $purchase->id)->sum('cost_price');
                $purchase->total_amount = $newTotal;
                $purchase->save();
            }
        }

        return response()->json([
            'message' => 'Watch details updated successfully',
            'watch' => $watch->load('purchase')
        ]);
    }

    public function updateGroup(Request $request)
    {
        $request->validate([
            'watch_ids' => 'required|array|min:1',
            'watch_ids.*' => 'required|string|exists:watches,id',
            'brand' => 'sometimes|required|string',
            'model' => 'sometimes|required|string',
            'category' => 'nullable|string',
            'gender' => 'nullable|string',
            'movement_type' => 'nullable|string',
            'mrp' => 'sometimes|required|numeric|min:0',
            'discount_percent' => 'nullable|numeric|min:0|max:100',
            'selling_price' => 'sometimes|required|numeric|min:0',
            'cost_price' => 'sometimes|required|numeric|min:0',
            'gst_rate' => 'nullable|numeric|min:0',
            'hsn_code' => 'nullable|string',
        ]);

        $updateData = $request->only([
            'brand', 'model', 'category', 'gender', 'movement_type',
            'mrp', 'discount_percent', 'selling_price', 'cost_price',
            'gst_rate', 'hsn_code'
        ]);

        $watchIds = $request->watch_ids;
        $watches = Watch::whereIn('id', $watchIds)->get();

        $affectedPurchaseIds = [];
        foreach ($watches as $w) {
            $w->update($updateData);
            if ($w->purchase_id && !in_array($w->purchase_id, $affectedPurchaseIds)) {
                $affectedPurchaseIds[] = $w->purchase_id;
            }
        }

        // Recalculate total_amount for any affected purchase bills
        if ($request->has('cost_price') && !empty($affectedPurchaseIds)) {
            foreach ($affectedPurchaseIds as $pId) {
                $purchase = \App\Models\Purchase::find($pId);
                if ($purchase) {
                    $purchase->total_amount = (double) Watch::where('purchase_id', $pId)->sum('cost_price');
                    $purchase->save();
                }
            }
        }

        return response()->json([
            'message' => 'All watches in group updated successfully',
            'updated_count' => count($watches)
        ]);
    }
}
