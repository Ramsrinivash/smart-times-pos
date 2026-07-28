<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Attendance;
use App\Models\Payroll;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AttendancePayrollController extends Controller
{
    public function getAttendance(Request $request)
    {
        $date = $request->query('date', Carbon::now()->toDateString());
        
        $attendances = Attendance::where('date', $date)->get()->keyBy('user_id');
        
        // Fetch all employees (excluding admin)
        $employees = User::where('role', '!=', 'admin')->get();

        $formatted = $employees->map(function ($emp) use ($attendances) {
            $att = $attendances->get($emp->id);
            return [
                'user_id' => $emp->id,
                'user_name' => $emp->name,
                'user_email' => $emp->email,
                'user_role' => $emp->role,
                'status' => $att ? $att->status : 'present',
                'notes' => $att ? $att->notes : '',
            ];
        });

        return response()->json($formatted);
    }

    public function saveAttendance(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
            'records' => 'required|array',
            'records.*.user_id' => 'required|exists:users,id',
            'records.*.status' => 'required|in:present,absent,half_day,leave',
            'records.*.notes' => 'nullable|string',
        ]);

        $date = $request->date;

        return DB::transaction(function () use ($request, $date) {
            $actor = $request->user();
            foreach ($request->records as $rec) {
                $emp = User::findOrFail($rec['user_id']);
                if ($emp->role === 'admin') continue;

                Attendance::updateOrCreate(
                    ['user_id' => $rec['user_id'], 'date' => $date],
                    ['status' => $rec['status'], 'notes' => $rec['notes'] ?? '']
                );
            }

            ActivityLog::log($actor->id, 'UPDATE', 'Attendance', "Saved staff attendance registry for date: " . $date);

            return response()->json(['message' => 'Attendance saved successfully']);
        });
    }

    public function getPayroll(Request $request)
    {
        $request->validate([
            'month' => 'required|integer|min:1|max:12',
            'year' => 'required|integer|min:2020|max:2050',
        ]);

        $month = (int) $request->month;
        $year = (int) $request->year;

        $startDate = Carbon::createFromDate($year, $month, 1)->startOfMonth()->toDateString();
        $endDate = Carbon::createFromDate($year, $month, 1)->endOfMonth()->toDateString();
        $daysInMonth = Carbon::createFromDate($year, $month, 1)->daysInMonth;

        // Fetch all employees (excluding admin)
        $employees = User::where('role', '!=', 'admin')->get();

        // Fetch saved payroll details
        $savedPayrolls = Payroll::where('month', $month)->where('year', $year)->get()->keyBy('user_id');

        // Fetch all attendances for the month
        $attendances = Attendance::whereBetween('date', [$startDate, $endDate])->get()->groupBy('user_id');

        $formatted = $employees->map(function ($emp) use ($attendances, $savedPayrolls, $month, $year, $daysInMonth) {
            $empAtts = $attendances->get($emp->id) ?? collect([]);
            
            $present = $empAtts->where('status', 'present')->count();
            $leave = $empAtts->where('status', 'leave')->count();
            $halfDay = $empAtts->where('status', 'half_day')->count();
            $absent = $empAtts->where('status', 'absent')->count();

            $recordedCount = $empAtts->count();
            // Fix #7: Unrecorded days treated as ABSENT (not present) — admin must fill attendance
            $unrecorded = max(0, $daysInMonth - $recordedCount);
            $attendanceIncomplete = $recordedCount < $daysInMonth;
            
            // Only counted paid days: present + approved leave + half_days
            $payableDays = $present + $leave + ($halfDay * 0.5);

            $baseSalary = (double) $emp->base_salary;
            $netSalary = round(($baseSalary / $daysInMonth) * $payableDays, 2);

            $saved = $savedPayrolls->get($emp->id);

            return [
                'user_id' => $emp->id,
                'user_name' => $emp->name,
                'user_role' => $emp->role,
                'base_salary' => $baseSalary,
                'net_salary' => $saved ? (double) $saved->net_salary : $netSalary,
                'total_days' => $daysInMonth,
                'present_days' => $present,
                'leave_days' => $leave,
                'half_days' => $halfDay,
                'absent_days' => $absent,
                'unrecorded_days' => $unrecorded,
                'attendance_incomplete' => $attendanceIncomplete, // UI can warn admin
                'status' => $saved ? $saved->status : 'unpaid',
                'payment_date' => $saved ? $saved->payment_date : null
            ];
        });

        return response()->json($formatted);
    }

    public function paySalary(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'month' => 'required|integer|min:1|max:12',
            'year' => 'required|integer|min:2020|max:2050',
            'base_salary' => 'required|numeric',
            'net_salary' => 'required|numeric',
        ]);

        $actor = $request->user();

        $emp = User::findOrFail($request->user_id);
        if ($emp->role === 'admin') {
            return response()->json(['message' => 'Cannot pay salary to admin accounts.'], 422);
        }

        $payroll = Payroll::updateOrCreate(
            [
                'user_id' => $request->user_id,
                'month' => $request->month,
                'year' => $request->year,
            ],
            [
                'base_salary' => $request->base_salary,
                'net_salary' => $request->net_salary,
                'status' => 'paid',
                'payment_date' => Carbon::now()->toDateString()
            ]
        );

        ActivityLog::log($actor->id, 'CREATE', 'Payroll', "Paid salary of ₹" . number_format($request->net_salary, 2) . " to {$emp->name} for {$request->month}/{$request->year}");

        return response()->json([
            'message' => 'Salary payment registered successfully',
            'payroll' => $payroll
        ]);
    }
}
