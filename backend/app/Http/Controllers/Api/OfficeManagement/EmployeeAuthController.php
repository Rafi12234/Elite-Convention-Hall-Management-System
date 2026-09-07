<?php

namespace App\Http\Controllers\Api\OfficeManagement;

use App\Http\Controllers\Controller;
use App\Support\Office\OfficeAuth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Employee portal authentication. Ported from MME's employeesController
 * (identify / me / change-password / logout / directory / today-summary).
 */
class EmployeeAuthController extends Controller
{
    /** Employee directory used by assignment dropdowns (admins excluded). */
    public function directory(): JsonResponse
    {
        $employees = DB::table('employees as e')
            ->leftJoin('roles as r', 'r.id', '=', 'e.role_id')
            ->where('e.is_active', 1)
            ->where(function ($query) {
                $query->whereNull('r.name')->orWhere('r.name', '!=', 'Admin');
            })
            ->orderBy('e.full_name')
            ->get(['e.id', 'e.full_name', 'e.email', 'e.color_hex', 'e.last_used_at'])
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'fullName' => $row->full_name,
                'email' => $row->email,
                'colorHex' => $row->color_hex,
                'lastUsedAt' => $row->last_used_at,
            ]);

        return response()->json(['data' => $employees]);
    }

    public function identify(Request $request): JsonResponse
    {
        $email = strtolower(trim((string) $request->input('email')));
        $password = (string) $request->input('password');

        if ($email === '' || $password === '') {
            return response()->json(['message' => 'Email and password are required.'], 422);
        }

        $employee = OfficeAuth::findByEmail($email);

        if (! $employee) {
            return response()->json([
                'message' => 'No account found with this email. Contact your admin.',
            ], 401);
        }

        if (! $employee->is_active) {
            return response()->json([
                'message' => 'Your account has been deactivated. Contact your admin.',
            ], 403);
        }

        if (($employee->role_name ?? 'Employee') === 'Admin') {
            return response()->json([
                'message' => 'Admin accounts must log in through the Admin Panel, not the Employee Portal.',
            ], 403);
        }

        if (! $employee->password_hash) {
            return response()->json([
                'message' => 'Password not set for this account. Contact your admin.',
            ], 401);
        }

        if (! Hash::check($password, $employee->password_hash)) {
            return response()->json(['message' => 'Incorrect password.'], 401);
        }

        $token = OfficeAuth::issueToken((int) $employee->id);
        $fresh = OfficeAuth::findById((int) $employee->id);

        return response()->json([
            'data' => OfficeAuth::publicEmployee($fresh) + ['token' => $token],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $employee = OfficeAuth::current($request);

        return response()->json([
            'data' => OfficeAuth::publicEmployee($employee),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $employee = OfficeAuth::current($request);

        $currentPassword = (string) $request->input('currentPassword');
        $newPassword = (string) $request->input('newPassword');

        if ($currentPassword === '' || $newPassword === '') {
            return response()->json(['message' => 'Current and new password are required.'], 422);
        }

        if (mb_strlen($newPassword) < 6) {
            return response()->json(['message' => 'New password must be at least 6 characters.'], 422);
        }

        if ($currentPassword === $newPassword) {
            return response()->json([
                'message' => 'New password must be different from the current password.',
            ], 422);
        }

        if (! $employee->password_hash) {
            return response()->json([
                'message' => 'Password not set for this account. Contact your admin.',
            ], 401);
        }

        if (! Hash::check($currentPassword, $employee->password_hash)) {
            return response()->json(['message' => 'Current password is incorrect.'], 401);
        }

        DB::table('employees')
            ->where('id', $employee->id)
            ->update([
                'password_hash' => Hash::make($newPassword),
                'must_change_password' => 0,
                'updated_at' => now(),
            ]);

        $fresh = OfficeAuth::findById((int) $employee->id);

        return response()->json(['data' => OfficeAuth::publicEmployee($fresh)]);
    }

    public function logout(Request $request): JsonResponse
    {
        $employee = OfficeAuth::resolve($request);

        if ($employee) {
            OfficeAuth::revokeToken((int) $employee->id);
        }

        return response()->json(['data' => ['success' => true]]);
    }

    /** Counters for the employee dashboard header. */
    public function todaySummary(Request $request): JsonResponse
    {
        $employeeId = OfficeAuth::currentId($request);
        $today = now()->toDateString();

        $dueMeetings = DB::table('client_next_meetings')
            ->where('assigned_employee_id', $employeeId)
            ->whereDate('next_meeting_datetime', $today)
            ->count();

        $dueCalls = DB::table('client_next_calls')
            ->where('assigned_employee_id', $employeeId)
            ->whereDate('next_call_datetime', $today)
            ->count();

        // A meeting counts as done once it carries notes or at least one item.
        $completedMeetings = DB::table('client_meetings as m')
            ->where('m.created_by', $employeeId)
            ->whereDate('m.meeting_datetime', $today)
            ->where(function ($query) {
                $query->whereRaw("COALESCE(TRIM(m.discussion_notes), '') <> ''")
                    ->orWhereExists(function ($sub) {
                        $sub->select(DB::raw(1))
                            ->from('meeting_items as mi')
                            ->whereColumn('mi.meeting_id', 'm.id');
                    });
            })
            ->count();

        $completedCalls = DB::table('client_calls')
            ->where('created_by', $employeeId)
            ->whereDate('call_datetime', $today)
            ->whereRaw("COALESCE(TRIM(call_discussion), '') <> ''")
            ->count();

        return response()->json([
            'data' => [
                'dueToday' => $dueMeetings + $dueCalls,
                'completedToday' => $completedMeetings + $completedCalls,
                'dueMeetings' => $dueMeetings,
                'dueCalls' => $dueCalls,
                'completedMeetings' => $completedMeetings,
                'completedCalls' => $completedCalls,
            ],
        ]);
    }
}
