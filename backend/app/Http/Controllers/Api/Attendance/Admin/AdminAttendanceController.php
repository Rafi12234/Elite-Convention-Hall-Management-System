<?php

namespace App\Http\Controllers\Api\Attendance\Admin;

use App\Http\Controllers\Api\Attendance\AttendanceController;
use App\Http\Controllers\Controller;
use App\Support\Office\DbDates;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Admin oversight of GPS attendance records.
 * Ported from MME's adminAttendanceController.js.
 */
class AdminAttendanceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $employeeId = (int) $request->query('employeeId') ?: null;
        $date = DbDates::parseDateOnly($request->query('date'));
        $from = DbDates::parseDateOnly($request->query('from'));
        $to = DbDates::parseDateOnly($request->query('to'));

        $limit = (int) $request->query('limit');
        $limit = $limit > 0 ? min($limit, 500) : 100;

        $rows = DB::table('attendances as a')
            ->leftJoin('employees as e', 'e.id', '=', 'a.employee_id')
            ->when($employeeId, fn ($q) => $q->where('a.employee_id', $employeeId))
            // An exact date wins over the range, matching the upstream filter.
            ->when($date, fn ($q) => $q->where('a.attendance_date', $date))
            ->when(! $date && $from, fn ($q) => $q->where('a.attendance_date', '>=', $from))
            ->when(! $date && $to, fn ($q) => $q->where('a.attendance_date', '<=', $to))
            ->orderByDesc('a.attendance_date')
            ->orderByDesc('a.sign_in_at')
            ->limit($limit)
            ->get(['a.*', 'e.full_name as employee_name']);

        return response()->json([
            'data' => $rows->map(
                fn ($row) => AttendanceController::serializeRow($row, $row->employee_name)
            )->values(),
        ]);
    }
}
