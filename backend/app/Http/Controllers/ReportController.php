<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\Watch;
use App\Models\ServiceJob;
use App\Models\Purchase;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function dashboardOverview(Request $request)
    {
        $user = $request->user();
        $today = Carbon::now()->toDateString();

        $todaySalesCount = Sale::where('invoice_date', $today)->count();
        $todaySalesSum = (double) Sale::where('invoice_date', $today)->sum('net_amount');

        // Low stock: grouping by model where count in stock < 3
        $lowStockAlerts = Watch::select('brand', 'model', DB::raw('count(*) as count'))
            ->where('status', 'in_stock')
            ->groupBy('brand', 'model')
            ->having('count', '<', 3)
            ->get();

        $jobsDueToday = ServiceJob::where('expected_delivery_date', $today)
            ->whereIn('status', ['received', 'in_repair', 'ready'])
            ->count();
        $jobsOverdue = ServiceJob::where('expected_delivery_date', '<', $today)
            ->whereIn('status', ['received', 'in_repair', 'ready'])
            ->count();
        $jobsReady = ServiceJob::where('status', 'ready')->count();

        $pendingPaymentsCount = Purchase::where('payment_status', 'pending')->count();
        $pendingPaymentsSum = (double) Purchase::where('payment_status', 'pending')->sum('total_amount');

        $profitSnap = null;
        if ($user->role === 'admin' || $user->role === 'manager') {
            $profitResult = DB::table('sale_items')
                ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
                ->where('sales.invoice_date', $today)
                ->select(DB::raw('SUM(sale_items.price_sold - sale_items.discount_amount - sale_items.cost_price) as profit'))
                ->first();
            $profitSnap = $profitResult ? (double) $profitResult->profit : 0.00;
        }

        return response()->json([
            'today_sales_count' => $todaySalesCount,
            'today_sales_sum' => $todaySalesSum,
            'low_stock_alerts' => $lowStockAlerts,
            'jobs_due_today' => $jobsDueToday,
            'jobs_overdue' => $jobsOverdue,
            'jobs_ready' => $jobsReady,
            'pending_supplier_payments_count' => $pendingPaymentsCount,
            'pending_supplier_payments_sum' => $pendingPaymentsSum,
            'profit_snapshot' => $profitSnap
        ]);
    }

    public function salesReport(Request $request)
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        $query = Sale::with(['customer', 'items.watch']);

        if ($request->has('start_date')) {
            $query->where('invoice_date', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->where('invoice_date', '<=', $request->end_date);
        }

        $sales = $query->latest()->get();

        if ($request->user()->role === 'sales') {
            foreach ($sales as $sale) {
                foreach ($sale->items as $item) {
                    $item->makeHidden(['cost_price']);
                }
            }
        }

        return response()->json($sales);
    }

    public function stockValuation(Request $request)
    {
        $totalValuation = (double) Watch::where('status', 'in_stock')->sum('cost_price');
        $itemCount = Watch::where('status', 'in_stock')->count();

        $valuationByBrand = Watch::select('brand', DB::raw('count(*) as count'), DB::raw('SUM(cost_price) as cost_value'), DB::raw('SUM(mrp) as mrp_value'))
            ->where('status', 'in_stock')
            ->groupBy('brand')
            ->get();

        return response()->json([
            'total_in_stock_count' => $itemCount,
            'total_cost_valuation' => $totalValuation,
            'breakdown_by_brand' => $valuationByBrand
        ]);
    }

    public function gstReport(Request $request)
    {
        $request->validate([
            'month' => 'required|integer|min:1|max:12',
            'year' => 'required|integer',
        ]);

        $sales = Sale::where('invoice_type', 'gst')
            ->whereMonth('invoice_date', $request->month)
            ->whereYear('invoice_date', $request->year)
            ->with(['items.watch'])
            ->get();

        return response()->json($sales);
    }
}
