<?php

namespace App\Http\Controllers\Api\OfficeManagement\Admin;

use App\Http\Controllers\Controller;
use App\Support\Office\OfficeAuth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

/**
 * Office-module admin authentication. Ported from MME's authController
 * (admin-login / admin-me / admin-logout).
 */
class OfficeAdminAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $email = strtolower(trim((string) $request->input('email')));
        $password = (string) $request->input('password');

        if ($email === '' || $password === '') {
            return response()->json(['message' => 'Email and password are required.'], 422);
        }

        $admin = OfficeAuth::findByEmail($email);

        if (! $admin || ($admin->role_name ?? null) !== 'Admin' || ! $admin->is_active) {
            return response()->json([
                'message' => 'Invalid credentials or insufficient access.',
            ], 401);
        }

        if (! $admin->password_hash) {
            return response()->json([
                'message' => 'Admin password not set. Contact your system administrator.',
            ], 401);
        }

        if (! Hash::check($password, $admin->password_hash)) {
            return response()->json(['message' => 'Incorrect password.'], 401);
        }

        $token = OfficeAuth::issueToken((int) $admin->id);

        return response()->json([
            'data' => [
                'id' => (int) $admin->id,
                'fullName' => $admin->full_name,
                'email' => $admin->email,
                'role' => 'Admin',
                'token' => $token,
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $admin = OfficeAuth::current($request);

        return response()->json([
            'data' => [
                'id' => (int) $admin->id,
                'fullName' => $admin->full_name,
                'email' => $admin->email,
                'role' => 'Admin',
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $admin = OfficeAuth::resolve($request);

        if ($admin) {
            OfficeAuth::revokeToken((int) $admin->id);
        }

        return response()->json(['data' => ['success' => true]]);
    }
}
