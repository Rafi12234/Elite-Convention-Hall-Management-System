<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class BookingHoldController extends Controller
{
    private string $timezone = 'Asia/Dhaka';

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_name' => ['required', 'string', 'max:150'],
            'customer_email' => ['required', 'email', 'max:150'],
            'customer_phone' => ['required', 'string', 'max:30'],
            'customer_address' => ['required', 'string'],

            'hall_id' => ['required', 'integer', 'exists:halls,id'],
            'booking_slot_id' => ['required', 'integer', 'exists:booking_slots,id'],

            'event_title' => ['required', 'string', 'max:150'],
            'event_type' => ['required', 'string', 'max:100'],
            'event_details' => ['required', 'string'],
            'guest_count' => ['required', 'integer', 'min:1'],

            /*
             * Frontend sends total_amount for display compatibility.
             * Backend does NOT trust it. Final amount comes from shifts.price.
             */
            'total_amount' => ['required', 'numeric', 'min:1'],
        ]);

        $authUser = $this->authenticatedUser($request);

        if (! $authUser) {
            return response()->json([
                'message' => 'Unauthenticated.',
                'error' => 'Please login before booking.',
            ], 401);
        }

        /*
         * Logged-in user is source of truth for name/email/phone.
         * Frontend fields can be auto-filled, but backend should trust DB user data.
         */
        $validated['customer_name'] = $authUser->name;
        $validated['customer_email'] = $authUser->email;
        $validated['customer_phone'] = $authUser->phone;

        try {
            $this->releaseExpiredHolds();

            return DB::transaction(function () use ($validated, $authUser): JsonResponse {
                $now = Carbon::now($this->timezone);
                $today = Carbon::today($this->timezone)->toDateString();

                $slot = DB::table('booking_slots as bs')
                    ->join('shifts as s', 's.id', '=', 'bs.shift_id')
                    ->where('bs.id', $validated['booking_slot_id'])
                    ->where('bs.hall_id', $validated['hall_id'])
                    ->select([
                        'bs.*',
                        's.name as shift_name',
                        's.price as shift_price',
                    ])
                    ->lockForUpdate()
                    ->first();

                if (! $slot) {
                    return response()->json([
                        'message' => 'Booking failed.',
                        'error' => 'Selected slot was not found.',
                    ], 404);
                }

                if ($slot->slot_date < $today) {
                    return response()->json([
                        'message' => 'Booking failed.',
                        'error' => 'Past dates cannot be booked.',
                    ], 422);
                }

                if ($slot->slot_status !== 'available') {
                    return response()->json([
                        'message' => 'Booking failed.',
                        'error' => 'This slot is not available. Please choose another slot.',
                    ], 422);
                }

                /*
                 * Final amount is calculated from database.
                 * Fallback 250000 is only safety; correct source is shifts.price.
                 */
                $totalAmount = (float) ($slot->shift_price ?: 250000);

                if ($totalAmount <= 0) {
                    $totalAmount = 250000;
                }

                $customerId = $this->upsertCustomer($validated, $authUser);

                $bookingNo = $this->generateBookingNo((int) $slot->id);
                $holdToken = Str::random(64);
                $holdExpiresAt = $now->copy()->addMinutes(10);

                $bookingData = [
                    'booking_no' => $bookingNo,
                    'customer_id' => $customerId,
                    'booking_slot_id' => $slot->id,
                    'booking_status' => 'pending',
                    'booking_source' => 'online',
                    'event_title' => $validated['event_title'],
                    'event_type' => $validated['event_type'],
                    'guest_count' => $validated['guest_count'],
                    'total_amount' => $totalAmount,
                    'booked_at' => null,
                ];

                if (Schema::hasColumn('bookings', 'event_details')) {
                    $bookingData['event_details'] = $validated['event_details'];
                }

                $bookingData = array_merge(
                    $bookingData,
                    $this->timestampColumns('bookings', $now)
                );

                $bookingId = DB::table('bookings')->insertGetId($bookingData);

                $updated = DB::table('booking_slots')
                    ->where('id', $slot->id)
                    ->where('slot_status', 'available')
                    ->update(array_merge([
                        'slot_status' => 'payment_in_progress',
                        'hold_token' => $holdToken,
                        'hold_expires_at' => $holdExpiresAt,
                        'hold_booking_id' => $bookingId,
                    ], $this->timestampColumns('booking_slots', $now, false)));

                if ($updated !== 1) {
                    throw new \RuntimeException('Unable to hold this slot. Please try again.');
                }

                return response()->json([
                    'message' => 'Slot held successfully. Please complete payment within 10 minutes.',
                    'data' => [
                        'booking_id' => $bookingId,
                        'booking_no' => $bookingNo,
                        'hold_token' => $holdToken,
                        'hold_expires_at' => $holdExpiresAt->toIso8601String(),
                        'total_amount' => $totalAmount,
                        'slot_status' => 'payment_in_progress',
                    ],
                ], 201);
            });
        } catch (QueryException $exception) {
            return response()->json([
                'message' => 'Booking failed.',
                'error' => $exception->getPrevious()?->getMessage() ?? $exception->getMessage(),
            ], 422);
        } catch (\Throwable $exception) {
            return response()->json([
                'message' => 'Booking failed.',
                'error' => $exception->getMessage(),
            ], 422);
        }
    }

    public function release(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'booking_id' => ['required', 'integer', 'exists:bookings,id'],
            'hold_token' => ['required', 'string', 'max:100'],
        ]);

        try {
            $this->releaseExpiredHolds();

            return DB::transaction(function () use ($validated): JsonResponse {
                $now = Carbon::now($this->timezone);

                $slot = DB::table('booking_slots')
                    ->where('slot_status', 'payment_in_progress')
                    ->where('hold_booking_id', $validated['booking_id'])
                    ->where('hold_token', $validated['hold_token'])
                    ->lockForUpdate()
                    ->first();

                if (! $slot) {
                    return response()->json([
                        'message' => 'No active hold found.',
                    ]);
                }

                DB::table('booking_slots')
                    ->where('id', $slot->id)
                    ->update(array_merge([
                        'slot_status' => 'available',
                        'hold_token' => null,
                        'hold_expires_at' => null,
                        'hold_booking_id' => null,
                    ], $this->timestampColumns('booking_slots', $now, false)));

                DB::table('bookings')
                    ->where('id', $validated['booking_id'])
                    ->where('booking_status', 'pending')
                    ->update(array_merge([
                        'booking_status' => 'cancelled',
                    ], $this->timestampColumns('bookings', $now, false)));

                return response()->json([
                    'message' => 'Booking hold released successfully.',
                ]);
            });
        } catch (\Throwable $exception) {
            return response()->json([
                'message' => 'Unable to release booking hold.',
                'error' => $exception->getMessage(),
            ], 422);
        }
    }

private function authenticatedUser(Request $request): ?object
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

    private function upsertCustomer(array $validated, object $authUser): int
    {
        $now = Carbon::now($this->timezone);
        $userId = (int) $authUser->id;

        $userUpdateData = [
            'name' => $authUser->name,
            'phone' => $authUser->phone,
        ];

        $userUpdateData = array_merge(
            $userUpdateData,
            $this->timestampColumns('users', $now, false)
        );

        DB::table('users')
            ->where('id', $userId)
            ->update($userUpdateData);

        $customer = DB::table('customers')
            ->where('user_id', $userId)
            ->first();

        if ($customer) {
            DB::table('customers')
                ->where('id', $customer->id)
                ->update(array_merge([
                    'address' => $validated['customer_address'],
                ], $this->timestampColumns('customers', $now, false)));

            return (int) $customer->id;
        }

        $customerData = [
            'user_id' => $userId,
            'customer_code' => $this->generateCustomerCode(),
            'address' => $validated['customer_address'],
        ];

        if (Schema::hasColumn('customers', 'nid_or_passport')) {
            $customerData['nid_or_passport'] = null;
        }

        $customerData = array_merge(
            $customerData,
            $this->timestampColumns('customers', $now)
        );

        return (int) DB::table('customers')->insertGetId($customerData);
    }

    private function generateBookingNo(int $slotId): string
    {
        do {
            $bookingNo = 'DLC-' . now($this->timezone)->format('Ymd') . '-' . $slotId . '-' . Str::upper(Str::random(5));

            $exists = DB::table('bookings')
                ->where('booking_no', $bookingNo)
                ->exists();
        } while ($exists);

        return $bookingNo;
    }

    private function generateCustomerCode(): string
    {
        do {
            $code = 'CUST-' . Str::upper(Str::random(8));

            $exists = DB::table('customers')
                ->where('customer_code', $code)
                ->exists();
        } while ($exists);

        return $code;
    }

    private function releaseExpiredHolds(): void
    {
        DB::transaction(function (): void {
            $now = Carbon::now($this->timezone);

            $expiredSlots = DB::table('booking_slots')
                ->where('slot_status', 'payment_in_progress')
                ->whereNotNull('hold_expires_at')
                ->where('hold_expires_at', '<=', $now)
                ->lockForUpdate()
                ->get();

            if ($expiredSlots->isEmpty()) {
                return;
            }

            $expiredBookingIds = $expiredSlots
                ->pluck('hold_booking_id')
                ->filter()
                ->values();

            DB::table('booking_slots')
                ->whereIn('id', $expiredSlots->pluck('id'))
                ->update(array_merge([
                    'slot_status' => 'available',
                    'hold_token' => null,
                    'hold_expires_at' => null,
                    'hold_booking_id' => null,
                ], $this->timestampColumns('booking_slots', $now, false)));

            if ($expiredBookingIds->isNotEmpty()) {
                DB::table('bookings')
                    ->whereIn('id', $expiredBookingIds)
                    ->where('booking_status', 'pending')
                    ->update(array_merge([
                        'booking_status' => 'cancelled',
                    ], $this->timestampColumns('bookings', $now, false)));
            }
        });
    }

    private function timestampColumns(string $table, Carbon $now, bool $includeCreated = true): array
    {
        $data = [];

        if ($includeCreated && Schema::hasColumn($table, 'created_at')) {
            $data['created_at'] = $now;
        }

        if (Schema::hasColumn($table, 'updated_at')) {
            $data['updated_at'] = $now;
        }

        return $data;
    }
}