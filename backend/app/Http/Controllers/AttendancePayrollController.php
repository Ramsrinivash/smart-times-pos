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
            'records.*.status' => 'required|in:present,absent,half_day,leave,cl,ml',
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

    public function saveSingleAttendance(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'date' => 'required|date',
            'status' => 'required|in:present,absent,half_day,leave,cl,ml',
            'notes' => 'nullable|string',
        ]);

        $actor = $request->user();
        $emp = User::findOrFail($request->user_id);
        if ($emp->role === 'admin') {
            return response()->json(['message' => 'Admin accounts are excluded from attendance.'], 422);
        }

        $att = Attendance::updateOrCreate(
            ['user_id' => $request->user_id, 'date' => $request->date],
            ['status' => $request->status, 'notes' => $request->notes ?? '']
        );

        ActivityLog::log($actor->id, 'UPDATE', 'Attendance', "Updated attendance for {$emp->name} on {$request->date} to status: {$request->status}");

        return response()->json([
            'message' => 'Attendance record updated successfully',
            'attendance' => $att
        ]);
    }

    public function getMonthlyMatrix(Request $request)
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

        $employees = User::where('role', '!=', 'admin')->get();
        $attendances = Attendance::whereBetween('date', [$startDate, $endDate])->get();

        $matrix = [];
        foreach ($employees as $emp) {
            $matrix[$emp->id] = [];
        }

        foreach ($attendances as $att) {
            if (isset($matrix[$att->user_id])) {
                $day = (int) Carbon::parse($att->date)->format('j');
                $matrix[$att->user_id][$day] = [
                    'status' => $att->status,
                    'notes' => $att->notes ?? '',
                    'date' => $att->date
                ];
            }
        }

        $formattedEmployees = $employees->map(function ($emp) use ($matrix, $daysInMonth) {
            $empMatrix = $matrix[$emp->id] ?? [];
            $present = 0;
            $cl = 0;
            $ml = 0;
            $halfDay = 0;
            $absent = 0;
            $leave = 0;
            $recordedCount = count($empMatrix);

            foreach ($empMatrix as $dayData) {
                $st = $dayData['status'] ?? '';
                if ($st === 'present') $present++;
                elseif ($st === 'cl') $cl++;
                elseif ($st === 'ml') $ml++;
                elseif ($st === 'half_day') $halfDay++;
                elseif ($st === 'absent') $absent++;
                elseif ($st === 'leave') $leave++;
            }

            $unrecorded = max(0, $daysInMonth - $recordedCount);
            $payableDays = $present + $cl + $ml + ($halfDay * 0.5);

            return [
                'user_id' => $emp->id,
                'user_name' => $emp->name,
                'user_role' => $emp->role,
                'days' => $empMatrix,
                'summary' => [
                    'present' => $present,
                    'cl' => $cl,
                    'ml' => $ml,
                    'half_day' => $halfDay,
                    'absent' => $absent,
                    'leave' => $leave,
                    'unrecorded' => $unrecorded,
                    'payable_days' => $payableDays
                ]
            ];
        });

        return response()->json([
            'month' => $month,
            'year' => $year,
            'days_in_month' => $daysInMonth,
            'employees' => $formattedEmployees
        ]);
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
            $cl = $empAtts->where('status', 'cl')->count();
            $ml = $empAtts->where('status', 'ml')->count();
            $leave = $empAtts->where('status', 'leave')->count();
            $halfDay = $empAtts->where('status', 'half_day')->count();
            $absent = $empAtts->where('status', 'absent')->count();

            $recordedCount = $empAtts->count();
            $unrecorded = max(0, $daysInMonth - $recordedCount);
            $attendanceIncomplete = $recordedCount < $daysInMonth;
            
            // Paid days = Present + Casual Leave (CL) + Medical Leave (ML) + (Half Day * 0.5)
            $payableDays = $present + $cl + $ml + ($halfDay * 0.5);

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
                'cl_days' => $cl,
                'ml_days' => $ml,
                'leave_days' => $leave,
                'half_days' => $halfDay,
                'absent_days' => $absent,
                'unrecorded_days' => $unrecorded,
                'attendance_incomplete' => $attendanceIncomplete,
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
