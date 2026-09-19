<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\Watch;
use App\Models\Customer;
use App\Models\ServiceJob;
use App\Models\Purchase;
use App\Models\Exchange;
use App\Models\LoyaltyLedger;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function dashboardOverview(Request $request)
    {
        $user = $request->user();
        $today = Carbon::now()->toDateString();
        $month = Carbon::now()->format('Y-m');

        $todaySalesQuery = Sale::whereDate('invoice_date', $today)->whereNotIn('id', function($q){$q->select('original_sale_id')->from('sales_returns');});
        $todaySalesCount = (int) $todaySalesQuery->count();
        $todaySalesSum = (double) $todaySalesQuery->sum('net_amount');

        $monthSalesQuery = Sale::where('invoice_date', 'like', "{$month}%")->whereNotIn('id', function($q){$q->select('original_sale_id')->from('sales_returns');});
        $monthSalesCount = (int) $monthSalesQuery->count();
        $monthSalesSum = (double) $monthSalesQuery->sum('net_amount');

        $totalSalesQuery = Sale::whereNotIn('id', function($q){$q->select('original_sale_id')->from('sales_returns');});
        $totalSalesCount = (int) $totalSalesQuery->count();
        $totalSalesSum = (double) $totalSalesQuery->sum('net_amount');

        // Low stock: grouping by model where count in stock < 3
        $lowStockAlerts = Watch::select('brand', 'model', DB::raw('count(*) as count'))
            ->where('status', 'in_stock')
            ->groupBy('brand', 'model')
            ->having('count', '<', 3)
            ->get();

        $activeStatuses = ['received', 'in_repair', 'ready'];
        $jobsDueToday = ServiceJob::whereDate('expected_delivery_date', $today)
            ->whereIn('status', $activeStatuses)
            ->count();
        $jobsOverdue = ServiceJob::whereDate('expected_delivery_date', '<', $today)
            ->whereIn('status', $activeStatuses)
            ->count();
        $jobsReady = ServiceJob::where('status', 'ready')->count();
        $jobsActive = ServiceJob::whereIn('status', $activeStatuses)->count();

        $pendingPaymentsCount = Purchase::where('payment_status', 'pending')->count();
        $pendingPaymentsSum = (double) Purchase::where('payment_status', 'pending')->sum('total_amount');

        $profitSnap = null;
        $monthProfitSnap = null;
        $totalProfitSnap = null;
        if ($user->role === 'admin' || $user->role === 'manager') {
            $todayGstTax = (double) Sale::whereDate('invoice_date', $today)->where('invoice_type', 'gst')->whereNotIn('id', function($q){$q->select('original_sale_id')->from('sales_returns');})->sum('gst_amount');
            $totalCostToday = (double) DB::table('sale_items')
                ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
                ->whereDate('sales.invoice_date', $today)
                ->where('sale_items.is_returned', 0)
                ->sum('sale_items.cost_price');
            $profitSnap = round(($todaySalesSum - $todayGstTax) - $totalCostToday, 2);

            $monthGstTax = (double) Sale::where('invoice_date', 'like', "{$month}%")->where('invoice_type', 'gst')->whereNotIn('id', function($q){$q->select('original_sale_id')->from('sales_returns');})->sum('gst_amount');
            $totalCostMonth = (double) DB::table('sale_items')
                ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
                ->where('sales.invoice_date', 'like', "{$month}%")
                ->where('sale_items.is_returned', 0)
                ->sum('sale_items.cost_price');
            $monthProfitSnap = round(($monthSalesSum - $monthGstTax) - $totalCostMonth, 2);

            $totalGstTax = (double) Sale::where('invoice_type', 'gst')->whereNotIn('id', function($q){$q->select('original_sale_id')->from('sales_returns');})->sum('gst_amount');
            $totalCostAll = (double) DB::table('sale_items')
                ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
                ->where('sale_items.is_returned', 0)
                ->sum('sale_items.cost_price');
            $totalProfitSnap = round(($totalSalesSum - $totalGstTax) - $totalCostAll, 2);
        }

        // Outstanding customer dues
        $outstandingDuesTotal = (double) Customer::where('outstanding_dues', '>', 0)->sum('outstanding_dues');
        $outstandingDuesCount = Customer::where('outstanding_dues', '>', 0)->count();

        // Upcoming Birthdays (Next 30 Days)
        $customersWithDob = Customer::whereNotNull('dob')->get(['id', 'name', 'phone', 'dob']);
        $upcomingBirthdays = [];
        
        foreach ($customersWithDob as $c) {
            $dob = Carbon::parse($c->dob);
            $birthdayThisYear = $dob->copy()->year(Carbon::now()->year);
            
            if ($birthdayThisYear->isPast() && !$birthdayThisYear->isToday()) {
                $birthdayThisYear->addYear();
            }
            
            $daysAway = (int) Carbon::today()->diffInDays($birthdayThisYear, false);
            
            if ($daysAway >= 0 && $daysAway <= 30) {
                // Dynamically add properties to the model instance
                $c->daysAway = $daysAway;
                if ($daysAway === 0) {
                    $c->badgeText = "Today! 🎉";
                    $c->isToday = true;
                } elseif ($daysAway === 1) {
                    $c->badgeText = "Tomorrow";
                    $c->isToday = false;
                } else {
                    $c->badgeText = "In {$daysAway} days";
                    $c->isToday = false;
                }
                $upcomingBirthdays[] = $c;
            }
        }
        
        // Sort by closest birthday
        usort($upcomingBirthdays, function($a, $b) {
            return $a->daysAway <=> $b->daysAway;
        });

        return response()->json([
            'today_sales_count' => $todaySalesCount,
            'today_sales_sum' => $todaySalesSum,
            'month_sales_count' => $monthSalesCount,
            'month_sales_sum' => $monthSalesSum,
            'total_sales_count' => $totalSalesCount,
            'total_sales_sum' => $totalSalesSum,
            'low_stock_alerts' => $lowStockAlerts,
            'jobs_due_today' => $jobsDueToday,
            'jobs_overdue' => $jobsOverdue,
            'jobs_ready' => $jobsReady,
            'jobs_active' => $jobsActive,
            'pending_supplier_payments_count' => $pendingPaymentsCount,
            'pending_supplier_payments_sum' => $pendingPaymentsSum,
            'outstanding_dues_total' => $outstandingDuesTotal,
            'outstanding_dues_count' => $outstandingDuesCount,
            'upcoming_birthdays' => $upcomingBirthdays,
            'birthdays_today' => [], // Fallback for older frontend
            'profit_snapshot' => $profitSnap,
            'month_profit_snapshot' => $monthProfitSnap,
            'total_profit_snapshot' => $totalProfitSnap
        ]);
    }

    public function salesReport(Request $request)
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        $query = Sale::with(['customer', 'items.watch']);

        if ($request->has('start_date') && !empty($request->start_date)) {
            $query->where('invoice_date', '>=', $request->start_date);
        }
        if ($request->has('end_date') && !empty($request->end_date)) {
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
        $totalMrpValuation = (double) Watch::where('status', 'in_stock')->sum('mrp');
        $itemCount = Watch::where('status', 'in_stock')->count();

        $valuationByBrand = Watch::select('brand', DB::raw('count(*) as count'), DB::raw('SUM(cost_price) as cost_value'), DB::raw('SUM(mrp) as mrp_value'))
            ->where('status', 'in_stock')
            ->groupBy('brand')
            ->get();

        return response()->json([
            'total_in_stock_count' => $itemCount,
            'total_cost_valuation' => $totalValuation,
            'total_mrp_valuation' => $totalMrpValuation,
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
            ->with(['items.watch', 'customer'])
            ->get();

        $purchases = Purchase::whereMonth('purchase_date', $request->month)
            ->whereYear('purchase_date', $request->year)
            ->with(['watches'])
            ->get();

        return response()->json([
            'sales' => $sales,
            'purchases' => $purchases
        ]);
    }

    public function profitReport(Request $request)
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        $query = Sale::with(['customer', 'items']);

        if ($request->has('start_date') && $request->start_date) {
            $query->where('invoice_date', '>=', $request->start_date);
        }
        if ($request->has('end_date') && $request->end_date) {
            $query->where('invoice_date', '<=', $request->end_date);
        }

        $sales = $query->latest()->get();

        $sales->map(function ($s) {
            $totalCost = (double) $s->items->sum('cost_price');
            $s->total_profit = (double) $s->net_amount - $totalCost;
            return $s;
        });

        return response()->json($sales);
    }

    public function exchangeReport()
    {
        $exchanges = Exchange::with('originalSale.customer')->latest()->get();
        return response()->json($exchanges);
    }

    public function loyaltyReport()
    {
        $ledger = LoyaltyLedger::with('customer')->latest()->get();
        return response()->json($ledger);
    }

    public function pendingServiceReport()
    {
        $today = Carbon::now()->toDateString();
        $jobs = ServiceJob::with('customer')
            ->whereIn('status', ['received', 'in_repair', 'ready'])
            ->latest()
            ->get();

        $jobs->map(function ($j) use ($today) {
            $j->is_overdue = ($j->expected_delivery_date < $today) && in_array($j->status, ['received', 'in_repair', 'ready']);
            return $j;
        });

        return response()->json($jobs);
    }

    public function supplierDuesReport()
    {
        $dues = Purchase::where('payment_status', 'pending')
            ->with('watches')
            ->latest()
            ->get();
        return response()->json($dues);
    }

    public function purchaseLedger()
    {
        $watches = Watch::with('purchase')->latest()->get();
        $data = $watches->map(function ($w) {
            return [
                'watch_id' => $w->id,
                'brand' => $w->brand,
                'model' => $w->model,
                'supplier_name' => $w->purchase ? $w->purchase->supplier_name : 'N/A',
                'purchase_date' => $w->purchase ? $w->purchase->purchase_date : 'N/A',
                'invoice_number' => $w->purchase ? $w->purchase->invoice_number : 'N/A',
                'mrp' => $w->mrp,
                'discount_percent' => $w->discount_percent,
                'cost_price' => $w->cost_price,
                'selling_price' => $w->selling_price,
                'gst_rate' => $w->gst_rate,
                'watch_status' => $w->status,
            ];
        });
        return response()->json($data);
    }
}
