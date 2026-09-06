<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    private string $timezone = 'Asia/Dhaka';

    public function process(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'booking_id' => ['required', 'integer', 'exists:bookings,id'],
            'hold_token' => ['required', 'string', 'max:100'],

            'cardholder_name' => ['required', 'string', 'max:150'],
            'card_number' => ['required', 'string', 'max:25'],
            'expiry_date' => ['required', 'string', 'regex:/^\d{2}\/\d{2}$/'],
            'cvv' => ['required', 'string', 'regex:/^\d{3,4}$/'],
            'billing_address' => ['nullable', 'string', 'max:255'],

            /*
             * Frontend may send amount for display compatibility.
             * Backend does NOT trust frontend amount.
             * Real amount comes from bookings.total_amount.
             */
            'amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $cardNumber = preg_replace('/\D/', '', $validated['card_number']);

        if (! preg_match('/^\d{13,19}$/', $cardNumber)) {
            return response()->json([
                'message' => 'Payment failed.',
                'error' => 'Invalid card number.',
            ], 422);
        }

        try {
            [$month, $year] = explode('/', $validated['expiry_date']);

            $month = (int) $month;
            $year = (int) $year + 2000;

            if ($month < 1 || $month > 12) {
                return response()->json([
                    'message' => 'Payment failed.',
                    'error' => 'Invalid expiry month.',
                ], 422);
            }

            $expiryDate = Carbon::createFromDate($year, $month, 1, $this->timezone)->endOfMonth();

            if ($expiryDate->isPast()) {
                return response()->json([
                    'message' => 'Payment failed.',
                    'error' => 'Card has expired.',
                ], 422);
            }

            return DB::transaction(function () use ($validated, $cardNumber): JsonResponse {
                $now = Carbon::now($this->timezone);

                $slot = DB::table('booking_slots')
                    ->where('slot_status', 'payment_in_progress')
                    ->where('hold_booking_id', $validated['booking_id'])
                    ->where('hold_token', $validated['hold_token'])
                    ->lockForUpdate()
                    ->first();

                if (! $slot) {
                    return response()->json([
                        'message' => 'Payment failed.',
                        'error' => 'Invalid or expired payment session.',
                    ], 422);
                }

                $expiresAt = $slot->hold_expires_at
                    ? Carbon::parse($slot->hold_expires_at, $this->timezone)
                    : null;

                if (! $expiresAt || $expiresAt->lte($now)) {
                    DB::table('booking_slots')
                        ->where('id', $slot->id)
                        ->update([
                            'slot_status' => 'available',
                            'hold_token' => null,
                            'hold_expires_at' => null,
                            'hold_booking_id' => null,
                            'updated_at' => $now,
                        ]);

                    DB::table('bookings')
                        ->where('id', $validated['booking_id'])
                        ->where('booking_status', 'pending')
                        ->update([
                            'booking_status' => 'cancelled',
                            'updated_at' => $now,
                        ]);

                    return response()->json([
                        'message' => 'Session Expired',
                        'error' => 'Your 10-minute payment session expired. Please select the slot again.',
                    ], 422);
                }

                $booking = DB::table('bookings')
                    ->where('id', $validated['booking_id'])
                    ->where('booking_status', 'pending')
                    ->lockForUpdate()
                    ->first();

                if (! $booking) {
                    return response()->json([
                        'message' => 'Payment failed.',
                        'error' => 'Invalid booking selected.',
                    ], 422);
                }

                /*
                 * Important:
                 * Amount is taken from bookings.total_amount.
                 * Never trust frontend amount because user can modify JS.
                 */
                $amount = (float) $booking->total_amount;

                if ($amount <= 0) {
                    return response()->json([
                        'message' => 'Payment failed.',
                        'error' => 'Invalid booking amount.',
                    ], 422);
                }

                $transactionId = 'TXN-' . Str::upper(Str::random(16));

                $paymentData = [
                    'booking_id' => $validated['booking_id'],
                    'cardholder_name' => $validated['cardholder_name'],
                    'card_last_four' => substr($cardNumber, -4),
                    'amount' => $amount,
                    'billing_address' => $validated['billing_address'] ?? null,
                    'payment_method' => 'dummy',
                    'payment_status' => 'success',
                    'transaction_reference' => $transactionId,
                    'paid_at' => $now,
                    'updated_at' => $now,
                ];

                $existingPaymentId = DB::table('payments')
                    ->where('booking_id', $validated['booking_id'])
                    ->orderByDesc('id')
                    ->value('id');

                if ($existingPaymentId) {
                    DB::table('payments')
                        ->where('id', $existingPaymentId)
                        ->update($paymentData);
                } else {
                    DB::table('payments')->insert(array_merge($paymentData, [
                        'created_at' => $now,
                    ]));
                }

                DB::table('bookings')
                ->where('id', $validated['booking_id'])
                ->update([
                'booking_status' => 'pending',
                'booked_at' => null,
                'updated_at' => $now,
    ]);

DB::table('booking_slots')
    ->where('id', $slot->id)
    ->where('hold_token', $validated['hold_token'])
    ->update([
        'slot_status' => 'pending_approval',
        'hold_token' => null,
        'hold_expires_at' => null,
        'hold_booking_id' => null,
        'updated_at' => $now,
    ]);

                return response()->json([
    'message' => 'Your booking request has been submitted and is pending admin approval.',
    'data' => [
        'status' => 'pending',
    ],
], 201);
            });
        } catch (QueryException $exception) {
            return response()->json([
                'message' => 'Payment processing failed.',
                'error' => $exception->getPrevious()?->getMessage() ?? $exception->getMessage(),
            ], 422);
        } catch (\Throwable $exception) {
            return response()->json([
                'message' => 'Payment processing failed.',
                'error' => $exception->getMessage(),
            ], 422);
        }
    }
}