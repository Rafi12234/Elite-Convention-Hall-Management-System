<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class BookingController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_name' => ['required', 'string', 'max:150'],
            'customer_email' => ['required', 'email', 'max:150'],
            'customer_phone' => ['nullable', 'string', 'max:30'],
            'customer_address' => ['nullable', 'string'],
            'hall_id' => ['required', 'integer', 'exists:halls,id'],
            'booking_slot_id' => ['required', 'integer', 'exists:booking_slots,id'],
            'event_title' => ['nullable', 'string', 'max:150'],
            'event_type' => ['nullable', 'string', 'max:100'],
            'guest_count' => ['nullable', 'integer', 'min:1'],
            'total_amount' => ['required', 'numeric', 'min:0'],
        ]);

        try {
            $user = DB::table('users')->where('email', $validated['customer_email'])->first();

            if (! $user) {
                $userId = DB::table('users')->insertGetId([
                    'name' => $validated['customer_name'],
                    'email' => $validated['customer_email'],
                    'phone' => $validated['customer_phone'] ?? null,
                    'password_hash' => Hash::make(Str::random(40)),
                    'user_type' => 'customer',
                    'status' => 'active',
                    'email_verified_at' => now(),
                    'phone_verified_at' => ! empty($validated['customer_phone']) ? now() : null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else {
                $userId = $user->id;

                DB::table('users')
                    ->where('id', $userId)
                    ->update([
                        'name' => $validated['customer_name'],
                        'phone' => $validated['customer_phone'] ?? $user->phone,
                        'updated_at' => now(),
                    ]);
            }

            $customer = DB::table('customers')->where('user_id', $userId)->first();

            if (! $customer) {
                DB::table('customers')->insert([
                    'user_id' => $userId,
                    'customer_code' => 'CUST-' . Str::upper(Str::random(8)),
                    'address' => $validated['customer_address'] ?? null,
                    'nid_or_passport' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else {
                DB::table('customers')
                    ->where('id', $customer->id)
                    ->update([
                        'address' => $validated['customer_address'] ?? $customer->address,
                        'updated_at' => now(),
                    ]);
            }

            $rows = DB::select(
                'CALL sp_create_dummy_booking(?, ?, ?, ?, ?, ?)',
                [
                    $userId,
                    $validated['booking_slot_id'],
                    $validated['event_title'] ?? null,
                    $validated['event_type'] ?? null,
                    $validated['guest_count'] ?? null,
                    $validated['total_amount'],
                ]
            );

            $bookingData = $rows[0] ?? null;
            
            // If the booking data doesn't have an ID, try to fetch the most recent booking for this user
            if ($bookingData && !isset($bookingData->id)) {
                $recentBooking = DB::table('bookings')
                    ->where('user_id', $userId)
                    ->orderBy('id', 'desc')
                    ->first();
                    
                if ($recentBooking) {
                    $bookingData->id = $recentBooking->id;
                }
            }
            
            // Set status to payment_in_progress
            if ($bookingData && isset($bookingData->id)) {
                DB::table('bookings')
                    ->where('id', $bookingData->id)
                    ->update([
                        'booking_status' => 'payment_in_progress',
                        'updated_at' => now(),
                    ]);
            }

            return response()->json([
                'message' => 'Booking created. Please proceed to payment.',
                'data' => $bookingData,
            ], 201);
        } catch (QueryException $exception) {
            return response()->json([
                'message' => 'Unable to create booking.',
                'error' => $exception->getPrevious()?->getMessage() ?? $exception->getMessage(),
            ], 422);
        }
    }
}