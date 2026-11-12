<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\Watch;
use App\Models\Customer;
use App\Models\ServiceJob;
use App\Models\Purchase;
use App\Models\Exchange;
use App\Models\LoyaltyLedger;
use App\Models\ActivityLog;
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
            // Helper to calculate Option B True Audited GST Net Profit
            $calculateAuditedNetProfit = function($salesQuery) {
                $sales = $salesQuery->with(['items.watch'])->get();
                $totalNetProfit = 0.0;

                foreach ($sales as $s) {
                    $isGst = ($s->invoice_type === 'gst');
                    $saleGst = $isGst ? (double) $s->gst_amount : 0.0;
                    $taxableSalesRevenue = (double) $s->net_amount - $saleGst;

                    $taxableCostTotal = 0.0;
                    foreach ($s->items as $item) {
                        if ($item->is_returned) continue;
                        $cost = (double) $item->cost_price;
                        $rate = (double) ($item->gst_rate ?? ($item->watch ? $item->watch->gst_rate : 0));
                        if ($isGst && $rate > 0) {
                            // Reverse extract purchase base cost (ITC credited)
                            $taxableCostTotal += ($cost / (1 + ($rate / 100)));
                        } else {
                            $taxableCostTotal += $cost;
                        }
                    }

                    $totalNetProfit += ($taxableSalesRevenue - $taxableCostTotal);
                }

                return round($totalNetProfit, 2);
            };

            $profitSnap = $calculateAuditedNetProfit(
                Sale::whereDate('invoice_date', $today)
                    ->whereNotIn('id', function($q){$q->select('original_sale_id')->from('sales_returns');})
            );

            $monthProfitSnap = $calculateAuditedNetProfit(
                Sale::where('invoice_date', 'like', "{$month}%")
                    ->whereNotIn('id', function($q){$q->select('original_sale_id')->from('sales_returns');})
            );

            $totalProfitSnap = $calculateAuditedNetProfit(
                Sale::whereNotIn('id', function($q){$q->select('original_sale_id')->from('sales_returns');})
            );
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

        // Hierarchy Notifications: Fetch recent activities by OTHER users
        $recentActivities = ActivityLog::with('user:id,name,role')
            ->where('user_id', '!=', $user->id)
            ->where('created_at', '>=', Carbon::now()->subDays(3))
            ->orderBy('created_at', 'desc')
            ->take(15)
            ->get();

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
            'total_profit_snapshot' => $totalProfitSnap,
            'recent_activities' => $recentActivities
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
        $month = (int) ($request->month ?? now()->month);
        $year  = (int) ($request->year  ?? now()->year);

        $sales = Sale::where('invoice_type', 'gst')
            ->whereMonth('invoice_date', $month)
            ->whereYear('invoice_date', $year)
            ->with(['items.watch.purchase', 'customer'])
            ->get();

        $purchases = Purchase::whereMonth('purchase_date', $month)
            ->whereYear('purchase_date', $year)
            ->with(['watches.saleItems.sale'])
            ->get();

        // Calculate Supplier Bill-wise GST Recovery & Balance Tracker
        // Gives showroom owner exact insight into:
        // 1. How much GST was paid to each supplier bill
        // 2. How many watches were sold vs unsold
        // 3. How much GST has been recovered through sales
        // 4. How much GST balance remains trapped in unsold stock
        $recoveryLedger = [];
        foreach ($purchases as $p) {
            $totalUnits = $p->watches->count();
            $soldUnits = 0;
            $unsoldUnits = 0;
            $totalGstPaid = 0.0;
            $gstRecovered = 0.0;
            $linkedSalesInvoices = [];

            foreach ($p->watches as $w) {
                $cost = (double) $w->cost_price;
                $rate = (double) ($w->gst_rate ?? 18);
                $unitTaxableCost = ($rate > 0) ? ($cost / (1 + ($rate / 100))) : $cost;
                $unitGstPaid = $cost - $unitTaxableCost;
                $totalGstPaid += $unitGstPaid;

                // Check if this watch is sold
                $soldItem = $w->saleItems->first(function($si) {
                    return $si->is_returned == 0 && $si->sale;
                });

                if ($soldItem && $soldItem->sale) {
                    $soldUnits++;
                    $saleGst = ($soldItem->sale->invoice_type === 'gst') 
                        ? (double) ($soldItem->gst_amount ?? (($soldItem->price_sold - $soldItem->discount_amount) - (($soldItem->price_sold - $soldItem->discount_amount)/(1+($rate/100)))))
                        : 0.0;
                    $gstRecovered += $unitGstPaid; // Base input GST recovered against this sold unit
                    if (!in_array($soldItem->sale->id, $linkedSalesInvoices)) {
                        $linkedSalesInvoices[] = $soldItem->sale->id;
                    }
                } else {
                    $unsoldUnits++;
                }
            }

            $pendingGstTrapped = max(0.0, round($totalGstPaid - $gstRecovered, 2));

            $recoveryLedger[] = [
                'purchase_id' => $p->id,
                'supplier_name' => $p->supplier_name,
                'invoice_number' => $p->invoice_number,
                'bill_file' => $p->bill_file,
                'purchase_date' => $p->purchase_date,
                'total_units' => $totalUnits,
                'sold_units' => $soldUnits,
                'unsold_units' => $unsoldUnits,
                'total_gst_paid' => round($totalGstPaid, 2),
                'gst_recovered' => round($gstRecovered, 2),
                'pending_gst_balance' => $pendingGstTrapped,
                'sales_invoices' => $linkedSalesInvoices,
            ];
        }

        return response()->json([
            'sales'     => $sales,
            'purchases' => $purchases,
            'recovery_ledger' => $recoveryLedger,
        ]);
    }

    public function profitReport(Request $request)
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        $query = Sale::with(['customer', 'items.watch']);

        if ($request->has('start_date') && $request->start_date) {
            $query->where('invoice_date', '>=', $request->start_date);
        }
        if ($request->has('end_date') && $request->end_date) {
            $query->where('invoice_date', '<=', $request->end_date);
        }

        $sales = $query->latest()->get();

        $sales->map(function ($s) {
            $isGst = ($s->invoice_type === 'gst');
            $saleGst = $isGst ? (double) $s->gst_amount : 0.0;
            $taxableSalesRevenue = (double) $s->net_amount - $saleGst;

            $totalGrossCost = 0.0;
            $totalTaxableCost = 0.0;

            foreach ($s->items as $item) {
                if ($item->is_returned) continue;
                $cost = (double) $item->cost_price;
                $totalGrossCost += $cost;

                $rate = (double) ($item->gst_rate ?? ($item->watch ? $item->watch->gst_rate : 0));
                if ($isGst && $rate > 0) {
                    // Extract base purchase cost before GST (credited by Input Tax Credit)
                    $totalTaxableCost += ($cost / (1 + ($rate / 100)));
                } else {
                    $totalTaxableCost += $cost;
                }
            }

            // Option B: True Audited Net Profit (Taxable Revenue - Base Cost)
            // Equals (Gross Revenue - Gross Cost - Net GST Payable to Govt)
            $s->total_profit = round($taxableSalesRevenue - $totalTaxableCost, 2);
            $s->total_cost = round($totalGrossCost, 2);
            $s->taxable_cost = round($totalTaxableCost, 2);
            $s->output_gst = round($saleGst, 2);
            $s->input_gst = round($totalGrossCost - $totalTaxableCost, 2);
            $s->net_tax_payable = round($s->output_gst - $s->input_gst, 2);

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
                'bill_file' => $w->purchase ? $w->purchase->bill_file : null,
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
