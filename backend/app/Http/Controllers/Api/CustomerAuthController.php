<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;

class CustomerAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'login' => ['nullable', 'string', 'max:150'],
            'email' => ['nullable', 'string', 'max:150'],
            'password' => ['required', 'string'],
        ]);

        $login = trim($validated['login'] ?? $validated['email'] ?? '');

        if ($login === '') {
            throw ValidationException::withMessages([
                'login' => ['Email or phone is required.'],
            ]);
        }

        $user = DB::table('users')
            ->where(function ($query) use ($login) {
                $query->where('email', $login)
                    ->orWhere('phone', $login);
            })
            ->where('user_type', 'customer')
            ->first();

        if (! $user || ! Hash::check($validated['password'], $user->password_hash)) {
            return response()->json([
                'message' => 'Invalid login credentials.',
            ], 401);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'message' => 'Your account is not active. Please contact admin.',
            ], 403);
        }

        $plainToken = Str::random(80);

        DB::table('users')
            ->where('id', $user->id)
            ->update([
                'api_token_hash' => hash('sha256', $plainToken),
                'updated_at' => now(),
            ]);

        $mustChangePassword = (int) ($user->must_change_password ?? 0) === 1;

        return response()->json([
            'message' => $mustChangePassword
                ? 'Password change required.'
                : 'Login successful.',
            'data' => [
                'token' => $plainToken,
                'must_change_password' => $mustChangePassword,
                'redirect_to' => $mustChangePassword ? 'change-password.html' : 'index.html',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'user_type' => $user->user_type,
                    'status' => $user->status,
                    'must_change_password' => $mustChangePassword,
                ],
            ],
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $user = $this->authenticatedCustomer($request);

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated customer.',
            ], 401);
        }

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8', 'max:100', 'confirmed'],
        ]);

        if (! Hash::check($validated['current_password'], $user->password_hash)) {
            return response()->json([
                'message' => 'Current password is incorrect.',
            ], 422);
        }

        if (Hash::check($validated['new_password'], $user->password_hash)) {
            return response()->json([
                'message' => 'New password must be different from current password.',
            ], 422);
        }

        $newToken = Str::random(80);

        DB::table('users')
            ->where('id', $user->id)
            ->update([
                'password_hash' => Hash::make($validated['new_password']),
                'must_change_password' => 0,
                'api_token_hash' => hash('sha256', $newToken),
                'updated_at' => now(),
            ]);

        return response()->json([
            'message' => 'Password changed successfully.',
            'data' => [
                'token' => $newToken,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'user_type' => $user->user_type,
                    'status' => $user->status,
                    'must_change_password' => false,
                ],
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $this->authenticatedCustomer($request);

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated customer.',
            ], 401);
        }

        return response()->json([
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'user_type' => $user->user_type,
                    'status' => $user->status,
                    'must_change_password' => (int) ($user->must_change_password ?? 0) === 1,
                ],
            ],
        ]);
    }

    public function panel(Request $request): JsonResponse
{
    $user = $this->authenticatedCustomer($request);

    if (! $user) {
        return response()->json([
            'message' => 'Unauthenticated customer.',
        ], 401);
    }

    $customer = DB::table('customers')
        ->where('user_id', $user->id)
        ->first();

    $bookings = collect();

    if ($customer) {
        $bookings = DB::table('bookings as b')
            ->leftJoin('booking_slots as bs', 'bs.id', '=', 'b.booking_slot_id')
            ->leftJoin('halls as h', 'h.id', '=', 'bs.hall_id')
            ->leftJoin('shifts as s', 's.id', '=', 'bs.shift_id')
            ->leftJoin('payments as p', 'p.booking_id', '=', 'b.id')
            ->where('b.customer_id', $customer->id)
            ->orderByDesc('b.created_at')
            ->select([
                'b.id',
                'b.booking_no',
                'b.booking_status',
                'b.booking_source',
                'b.event_title',
                'b.event_type',
                'b.event_details',
                'b.guest_count',
                'b.total_amount',
                'b.booked_at',
                'b.created_at',

                'bs.id as booking_slot_id',
                'bs.slot_date',
                'bs.slot_status',

                'h.name as hall_name',

                's.name as shift_name',
                's.start_time',
                's.end_time',

                'p.id as payment_id',
                'p.cardholder_name',
                'p.card_last_four',
                'p.billing_address',
                'p.payment_method',
                'p.payment_status',
                'p.amount',
                'p.transaction_reference',
                'p.paid_at',
            ])
            ->get();
    }

    return response()->json([
        'message' => 'Customer panel loaded successfully.',
        'data' => [
            'profile' => [
                'user_id' => $user->id,
                'customer_id' => $customer->id ?? null,
                'customer_code' => $customer->customer_code ?? null,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'address' => $customer->address ?? null,
                'status' => $user->status,
                'user_type' => $user->user_type,
            ],
            'bookings' => $bookings,
        ],
    ]);
}

public function updateProfile(Request $request): JsonResponse
{
    $user = $this->authenticatedCustomer($request);

    if (! $user) {
        return response()->json([
            'message' => 'Unauthenticated customer.',
        ], 401);
    }

    $validated = $request->validate([
        'name' => ['required', 'string', 'max:150'],
        'email' => [
            'required',
            'email',
            'max:150',
            Rule::unique('users', 'email')->ignore($user->id),
        ],
        'phone' => [
            'required',
            'string',
            'max:30',
            Rule::unique('users', 'phone')->ignore($user->id),
        ],
        'address' => ['nullable', 'string'],
    ]);

    DB::transaction(function () use ($user, $validated) {
        DB::table('users')
            ->where('id', $user->id)
            ->update([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'updated_at' => now(),
            ]);

        $customer = DB::table('customers')
            ->where('user_id', $user->id)
            ->first();

        if ($customer) {
            DB::table('customers')
                ->where('id', $customer->id)
                ->update([
                    'address' => $validated['address'] ?? null,
                    'updated_at' => now(),
                ]);
        } else {
            DB::table('customers')->insert([
                'user_id' => $user->id,
                'customer_code' => 'CUS-' . str_pad((string) $user->id, 6, '0', STR_PAD_LEFT),
                'address' => $validated['address'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    });

    return response()->json([
        'message' => 'Profile updated successfully.',
    ]);
}

public function updateBooking(Request $request, int $bookingId): JsonResponse
{
    $user = $this->authenticatedCustomer($request);

    if (! $user) {
        return response()->json([
            'message' => 'Unauthenticated customer.',
        ], 401);
    }

    $validated = $request->validate([
        'event_title' => ['required', 'string', 'max:150'],
        'event_type' => ['required', 'string', 'max:100'],
        'event_details' => ['nullable', 'string'],
        'guest_count' => ['required', 'integer', 'min:1'],
    ]);

    $booking = DB::table('bookings as b')
        ->join('customers as c', 'c.id', '=', 'b.customer_id')
        ->where('b.id', $bookingId)
        ->where('c.user_id', $user->id)
        ->select('b.*')
        ->first();

    if (! $booking) {
        return response()->json([
            'message' => 'Booking not found.',
        ], 404);
    }

    if ($booking->booking_source !== 'online') {
        return response()->json([
            'message' => 'Only online customer bookings can be edited by customer.',
        ], 422);
    }

    if ($booking->booking_status !== 'pending') {
        return response()->json([
            'message' => 'Only pending bookings can be edited.',
        ], 422);
    }

    DB::table('bookings')
        ->where('id', $bookingId)
        ->update([
            'event_title' => $validated['event_title'],
            'event_type' => $validated['event_type'],
            'event_details' => $validated['event_details'] ?? null,
            'guest_count' => $validated['guest_count'],
            'updated_at' => now(),
        ]);

    return response()->json([
        'message' => 'Booking information updated successfully.',
    ]);
}
    public function logout(Request $request): JsonResponse
    {
        $user = $this->authenticatedCustomer($request);

        if ($user) {
            DB::table('users')
                ->where('id', $user->id)
                ->update([
                    'api_token_hash' => null,
                    'updated_at' => now(),
                ]);
        }

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    private function authenticatedCustomer(Request $request): ?object
    {
        $token = $request->bearerToken();

        if (! $token) {
            return null;
        }

        return DB::table('users')
            ->where('api_token_hash', hash('sha256', $token))
            ->where('user_type', 'customer')
            ->where('status', 'active')
            ->first();
    }
}