<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class AdminAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $admin = DB::table('users')
            ->where('email', $validated['email'])
            ->where('user_type', 'Super Admin')
            ->first();

        if (! $admin || ! Hash::check($validated['password'], $admin->password_hash)) {
            return response()->json([
                'message' => 'Admin login failed.',
                'error' => 'Invalid admin email or password.',
            ], 422);
        }

        if (($admin->status ?? 'active') !== 'active') {
            return response()->json([
                'message' => 'Admin login failed.',
                'error' => 'This admin account is not active.',
            ], 403);
        }

        $token = Str::random(80);

        $updateData = [
            'api_token_hash' => hash('sha256', $token),
        ];

        if (Schema::hasColumn('users', 'updated_at')) {
            $updateData['updated_at'] = now();
        }

        DB::table('users')
            ->where('id', $admin->id)
            ->update($updateData);

        $freshAdmin = DB::table('users')->where('id', $admin->id)->first();

        return response()->json([
            'message' => 'Admin login successful.',
            'data' => [
                'token' => $token,
                'admin' => $this->publicAdmin($freshAdmin),
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $admin = $this->authenticatedAdmin($request);

        if (! $admin) {
            return response()->json([
                'message' => 'Unauthenticated admin.',
            ], 401);
        }

        return response()->json([
            'message' => 'Admin loaded successfully.',
            'data' => [
                'admin' => $this->publicAdmin($admin),
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $admin = $this->authenticatedAdmin($request);

        if ($admin) {
            $updateData = [
                'api_token_hash' => null,
            ];

            if (Schema::hasColumn('users', 'updated_at')) {
                $updateData['updated_at'] = now();
            }

            DB::table('users')
                ->where('id', $admin->id)
                ->update($updateData);
        }

        return response()->json([
            'message' => 'Admin logged out successfully.',
        ]);
    }

    private function authenticatedAdmin(Request $request): ?object
    {
        $token = $request->bearerToken();

        if (! $token) {
            return null;
        }

        return DB::table('users')
            ->where('api_token_hash', hash('sha256', $token))
            ->where('user_type', 'Super Admin')
            ->where('status', 'active')
            ->first();
    }

    private function publicAdmin(object $admin): array
    {
        return [
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'phone' => $admin->phone,
            'user_type' => $admin->user_type,
            'status' => $admin->status,
        ];
    }
}