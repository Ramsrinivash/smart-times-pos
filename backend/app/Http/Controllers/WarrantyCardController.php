<?php

namespace App\Http\Controllers;

use App\Models\WarrantyCard;
use Illuminate\Http\Request;
use Carbon\Carbon;

class WarrantyCardController extends Controller
{
    public function index(Request $request)
    {
        $query = WarrantyCard::with(['watch', 'customer', 'sale']);

        if ($request->has('search') && $request->search != '') {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('watch_id', 'like', "%{$search}%")
                  ->orWhere('sale_id', 'like', "%{$search}%")
                  ->orWhereHas('customer', function($cq) use ($search) {
                      $cq->where('name', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->has('status') && $request->status != 'all') {
            $status = $request->status;
            $today = Carbon::today()->toDateString();
            if ($status === 'active') {
                $query->where('is_active', 1)->where('expiry_date', '>=', $today);
            } elseif ($status === 'expiring') {
                $query->where('is_active', 1)
                      ->where('expiry_date', '>=', $today)
                      ->where('expiry_date', '<=', Carbon::today()->addDays(30)->toDateString());
            } elseif ($status === 'expired') {
                $query->where(function($q) use ($today) {
                    $q->where('is_active', 0)->orWhere('expiry_date', '<', $today);
                });
            }
        }

        return response()->json($query->latest()->get());
    }
}
