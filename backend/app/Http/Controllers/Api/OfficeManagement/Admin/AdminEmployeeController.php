<?php

namespace App\Http\Controllers\Api\OfficeManagement\Admin;

use App\Http\Controllers\Controller;
use App\Support\Office\OfficeAuth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Admin employee management. Ported from MME's adminController
 * (list / create / activate-deactivate / reset password).
 */
class AdminEmployeeController extends Controller
{
    /** Fixed calendar-legend palette assigned round-robin to new employees. */
    private const COLOR_PALETTE = [
        '#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea',
        '#0891b2', '#ea580c', '#4f46e5', '#db2777', '#059669',
    ];

    public function index(Request $request): JsonResponse
    {
        $includeAdmins = filter_var($request->query('includeAdmins'), FILTER_VALIDATE_BOOLEAN);

        $query = DB::table('employees as e')
            ->leftJoin('roles as r', 'r.id', '=', 'e.role_id')
            ->leftJoin('employees as c', 'c.id', '=', 'e.created_by')
            ->orderByDesc('e.created_at');

        if (! $includeAdmins) {
            $query->where(function ($q) {
                $q->whereNull('r.name')->orWhere('r.name', '!=', 'Admin');
            });
        }

        $employees = $query
            ->get([
                'e.id', 'e.full_name', 'e.email', 'e.is_active', 'e.color_hex',
                'e.created_at', 'r.name as role_name', 'c.full_name as created_by_name',
            ])
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'fullName' => $row->full_name,
                'email' => $row->email,
                'isActive' => (bool) $row->is_active,
                'role' => $row->role_name,
                'colorHex' => $row->color_hex,
                'createdAt' => $row->created_at,
                'createdByName' => $row->created_by_name,
            ]);

        return response()->json(['data' => $employees]);
    }

    public function store(Request $request): JsonResponse
    {
        $fullName = trim((string) $request->input('fullName'));
        $email = strtolower(trim((string) $request->input('email')));
        $password = (string) $request->input('password');
        $role = $request->input('role') === 'Admin' ? 'Admin' : 'Employee';

        if ($fullName === '') {
            return response()->json(['message' => 'Full name is required.'], 422);
        }

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return response()->json(['message' => 'Enter a valid email address.'], 422);
        }

        if (mb_strlen($password) < 6) {
            return response()->json(['message' => 'Password must be at least 6 characters.'], 422);
        }

        if (DB::table('employees')->where('email', $email)->exists()) {
            return response()->json([
                'message' => 'An employee with this email already exists.',
            ], 409);
        }

        $roleId = DB::table('roles')->where('name', $role)->value('id');

        $employeeId = DB::table('employees')->insertGetId([
            'full_name' => $fullName,
            'email' => $email,
            'role_id' => $roleId,
            'password_hash' => Hash::make($password),
            'must_change_password' => 1,
            'created_by' => OfficeAuth::currentId($request),
            'is_active' => 1,
            'color_hex' => $this->nextColor(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $created = OfficeAuth::findById($employeeId);

        return response()->json([
            'data' => [
                'id' => (int) $created->id,
                'fullName' => $created->full_name,
                'email' => $created->email,
                'isActive' => true,
                'role' => $created->role_name,
                'colorHex' => $created->color_hex,
            ],
        ], 201);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        if ($id === OfficeAuth::currentId($request)) {
            return response()->json([
                'message' => 'You cannot deactivate your own account.',
            ], 400);
        }

        if (! DB::table('employees')->where('id', $id)->exists()) {
            return response()->json([
                'message' => 'The record you tried to update or delete was not found.',
            ], 404);
        }

        $isActive = filter_var($request->input('isActive'), FILTER_VALIDATE_BOOLEAN);

        $update = ['is_active' => $isActive ? 1 : 0, 'updated_at' => now()];

        // Deactivating must also cut the employee's live session.
        if (! $isActive) {
            $update['api_token_hash'] = null;
        }

        DB::table('employees')->where('id', $id)->update($update);

        return response()->json(['success' => true]);
    }

    public function resetPassword(Request $request, int $id): JsonResponse
    {
        $password = (string) $request->input('password');

        if (mb_strlen($password) < 6) {
            return response()->json(['message' => 'Password must be at least 6 characters.'], 422);
        }

        if (! DB::table('employees')->where('id', $id)->exists()) {
            return response()->json([
                'message' => 'The record you tried to update or delete was not found.',
            ], 404);
        }

        DB::table('employees')->where('id', $id)->update([
            'password_hash' => Hash::make($password),
            'must_change_password' => 1,
            'api_token_hash' => null,
            'updated_at' => now(),
        ]);

        return response()->json(['success' => true]);
    }

    private function nextColor(): string
    {
        $used = DB::table('employees')->count();

        return self::COLOR_PALETTE[$used % count(self::COLOR_PALETTE)];
    }
}
