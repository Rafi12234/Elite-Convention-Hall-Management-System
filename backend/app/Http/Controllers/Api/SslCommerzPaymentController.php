<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class SslCommerzPaymentController extends Controller
{
    private function gatewayBaseUrl(): string
    {
        return env('SSLCOMMERZ_ENV', 'sandbox') === 'live'
            ? 'https://securepay.sslcommerz.com'
            : 'https://sandbox.sslcommerz.com';
    }

    private function frontendUrl(): string
    {
        return rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/');
    }

    private function storeId(): string
    {
        return (string) env('SSLCOMMERZ_STORE_ID');
    }

    private function storePassword(): string
    {
        return (string) env('SSLCOMMERZ_STORE_PASSWORD');
    }

    private function currency(): string
    {
        return (string) env('SSLCOMMERZ_CURRENCY', 'BDT');
    }

    private function customer(Request $request): ?object
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

    private function unauthorizedResponse(): JsonResponse
    {
        return response()->json([
            'message' => 'Unauthenticated customer.',
        ], 401);
    }

    private function generateTranId(int $bookingId): string
    {
        return 'DLC-' . $bookingId . '-' . now()->format('ymdHis') . '-' . strtoupper(Str::random(5));
    }

    private function paymentResultRedirect(string $status, ?int $bookingId = null, ?string $tranId = null): RedirectResponse
    {
        $query = http_build_query([
            'status' => $status,
            'booking_id' => $bookingId,
            'tran_id' => $tranId,
        ]);

        return redirect()->away($this->frontendUrl() . '/payment-result?' . $query);
    }

    private function lastFourFromCard(?string $cardNo): ?string
    {
        if (! $cardNo) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $cardNo);

        if (! $digits || strlen($digits) < 4) {
            return null;
        }

        return substr($digits, -4);
    }

    public function initiate(Request $request, int $bookingId): JsonResponse
    {
        $customer = $this->customer($request);

        if (! $customer) {
            return $this->unauthorizedResponse();
        }

        if (! $this->storeId() || ! $this->storePassword()) {
            return response()->json([
                'message' => 'SSLCommerz sandbox credentials are missing in backend .env.',
            ], 500);
        }

        $booking = DB::table('bookings as b')
            ->join('customers as c', 'c.id', '=', 'b.customer_id')
            ->join('users as u', 'u.id', '=', 'c.user_id')
            ->leftJoin('booking_slots as bs', 'bs.id', '=', 'b.booking_slot_id')
            ->leftJoin('halls as h', 'h.id', '=', 'bs.hall_id')
            ->leftJoin('shifts as s', 's.id', '=', 'bs.shift_id')
            ->where('b.id', $bookingId)
            ->where('c.user_id', $customer->id)
            ->select([
                'b.id',
                'b.booking_no',
                'b.customer_id',
                'b.booking_slot_id',
                'b.event_title',
                'b.event_type',
                'b.total_amount',
                'b.booking_status',
                'b.created_at',
                'c.address',
                'c.customer_code',
                'u.name as customer_name',
                'u.email as customer_email',
                'u.phone as customer_phone',
                'bs.slot_date',
                'h.name as hall_name',
                's.name as shift_name',
            ])
            ->first();

        if (! $booking) {
            return response()->json([
                'message' => 'Booking not found for this customer.',
            ], 404);
        }

        $validated = $request->validate([
    'hold_token' => ['required', 'string', 'max:100'],
]);

$slot = DB::table('booking_slots')
    ->where('id', $booking->booking_slot_id)
    ->where('slot_status', 'payment_in_progress')
    ->where('hold_booking_id', $booking->id)
    ->where('hold_token', $validated['hold_token'])
    ->first();

if (! $slot) {
    return response()->json([
        'message' => 'Invalid or expired payment session.',
    ], 422);
}

if (! $slot->hold_expires_at || strtotime($slot->hold_expires_at) <= time()) {
    DB::table('booking_slots')
        ->where('id', $booking->booking_slot_id)
        ->update([
            'slot_status' => 'available',
            'hold_token' => null,
            'hold_expires_at' => null,
            'hold_booking_id' => null,
            'updated_at' => now(),
        ]);

    DB::table('bookings')
        ->where('id', $booking->id)
        ->whereIn('booking_status', ['pending', 'payment_in_progress'])
        ->update([
            'booking_status' => 'cancelled',
            'updated_at' => now(),
        ]);

    return response()->json([
        'message' => 'Session expired. Please select the slot again.',
    ], 422);
}

        if (in_array($booking->booking_status, ['confirmed', 'cancelled', 'rejected'], true)) {
            return response()->json([
                'message' => 'This booking cannot be paid because it is already ' . $booking->booking_status . '.',
            ], 422);
        }

        $amount = (float) $booking->total_amount;

        if ($amount < 10 || $amount > 500000) {
            return response()->json([
                'message' => 'SSLCommerz amount must be between 10 and 500000 BDT.',
            ], 422);
        }

        $alreadyPaid = DB::table('payments')
            ->where('booking_id', $booking->id)
            ->whereIn('payment_status', ['success', 'paid'])
            ->exists();

        if ($alreadyPaid) {
            return response()->json([
                'message' => 'This booking is already paid.',
            ], 422);
        }

        $tranId = $this->generateTranId((int) $booking->id);

        $existingPayment = DB::table('payments')
            ->where('booking_id', $booking->id)
            ->first();

        if ($existingPayment) {
            DB::table('payments')
                ->where('id', $existingPayment->id)
                ->update([
                    'cardholder_name' => $booking->customer_name,
                    'card_last_four' => null,
                    'billing_address' => $booking->address,
                    'payment_method' => 'sslcommerz',
                    'gateway_name' => 'sslcommerz',
                    'payment_status' => 'pending',
                    'amount' => $amount,
                    'transaction_reference' => $tranId,
                    'gateway_session_id' => null,
                    'gateway_validation_id' => null,
                    'gateway_bank_tran_id' => null,
                    'gateway_card_type' => null,
                    'gateway_card_issuer' => null,
                    'failed_reason' => null,
                    'gateway_response_json' => null,
                    'paid_at' => null,
                    'updated_at' => now(),
                ]);

            $paymentId = $existingPayment->id;
        } else {
            $paymentId = DB::table('payments')->insertGetId([
                'booking_id' => $booking->id,
                'cardholder_name' => $booking->customer_name,
                'card_last_four' => null,
                'billing_address' => $booking->address,
                'payment_method' => 'sslcommerz',
                'gateway_name' => 'sslcommerz',
                'payment_status' => 'pending',
                'amount' => $amount,
                'transaction_reference' => $tranId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $payload = [
            'store_id' => $this->storeId(),
            'store_passwd' => $this->storePassword(),
            'total_amount' => number_format($amount, 2, '.', ''),
            'currency' => $this->currency(),
            'tran_id' => $tranId,

            'success_url' => route('api.sslcommerz.success'),
            'fail_url' => route('api.sslcommerz.fail'),
            'cancel_url' => route('api.sslcommerz.cancel'),
            'ipn_url' => route('api.sslcommerz.ipn'),

            'cus_name' => $booking->customer_name ?: 'Customer',
            'cus_email' => $booking->customer_email ?: 'customer@example.com',
            'cus_add1' => $booking->address ?: 'Dhaka',
            'cus_add2' => 'Dhaka',
            'cus_city' => 'Dhaka',
            'cus_state' => 'Dhaka',
            'cus_postcode' => '1000',
            'cus_country' => 'Bangladesh',
            'cus_phone' => $booking->customer_phone ?: '01700000000',
            'cus_fax' => $booking->customer_phone ?: '01700000000',

            'shipping_method' => 'NO',
            'product_name' => $booking->event_title ?: 'Elite Convention Hall Booking',
            'product_category' => $booking->event_type ?: 'Event Booking',
            'product_profile' => 'service',

            'value_a' => (string) $booking->id,
            'value_b' => $booking->booking_no ?: '',
            'value_c' => (string) $paymentId,
            'value_d' => 'booking_payment',
        ];

        $response = Http::asForm()
            ->timeout(30)
            ->post($this->gatewayBaseUrl() . '/gwprocess/v4/api.php', $payload);

        if (! $response->ok()) {
            DB::table('payments')
                ->where('id', $paymentId)
                ->update([
                    'payment_status' => 'failed',
                    'failed_reason' => 'Failed to connect with SSLCommerz.',
                    'gateway_response_json' => $response->body(),
                    'updated_at' => now(),
                ]);

            return response()->json([
                'message' => 'Failed to connect with SSLCommerz sandbox.',
            ], 502);
        }

        $sslResponse = $response->json();

        if (($sslResponse['status'] ?? null) !== 'SUCCESS' || empty($sslResponse['GatewayPageURL'])) {
            DB::table('payments')
                ->where('id', $paymentId)
                ->update([
                    'payment_status' => 'failed',
                    'failed_reason' => $sslResponse['failedreason'] ?? 'SSLCommerz session creation failed.',
                    'gateway_response_json' => json_encode($sslResponse),
                    'updated_at' => now(),
                ]);

            return response()->json([
                'message' => $sslResponse['failedreason'] ?? 'SSLCommerz session creation failed.',
                'sslcommerz_response' => $sslResponse,
            ], 422);
        }

        DB::table('payments')
            ->where('id', $paymentId)
            ->update([
                'gateway_session_id' => $sslResponse['sessionkey'] ?? null,
                'gateway_response_json' => json_encode($sslResponse),
                'updated_at' => now(),
            ]);

        DB::table('bookings')
            ->where('id', $booking->id)
            ->update([
                'booking_status' => 'payment_in_progress',
                'updated_at' => now(),
            ]);

        DB::table('booking_slots')
            ->where('id', $booking->booking_slot_id)
            ->update([
                'slot_status' => 'payment_in_progress',
                'hold_booking_id' => $booking->id,
                'updated_at' => now(),
            ]);

        return response()->json([
            'message' => 'SSLCommerz payment session created successfully.',
            'data' => [
                'payment_id' => $paymentId,
                'booking_id' => $booking->id,
                'tran_id' => $tranId,
                'gateway_url' => $sslResponse['GatewayPageURL'],
                'session_key' => $sslResponse['sessionkey'] ?? null,
            ],
        ]);
    }

    public function success(Request $request)
    {
        return $this->handleGatewayReturn($request, 'success');
    }

    public function fail(Request $request)
    {
        return $this->handleGatewayReturn($request, 'failed');
    }

    public function cancel(Request $request)
    {
        return $this->handleGatewayReturn($request, 'cancelled');
    }

    public function ipn(Request $request): JsonResponse
    {
        $result = $this->processGatewayPayload($request, true);

        return response()->json([
            'message' => $result['message'],
            'status' => $result['status'],
        ], $result['http_status']);
    }

    private function handleGatewayReturn(Request $request, string $fallbackStatus): RedirectResponse
    {
        $result = $this->processGatewayPayload($request, false, $fallbackStatus);

        return $this->paymentResultRedirect(
            $result['status'],
            $result['booking_id'],
            $result['tran_id']
        );
    }

    private function processGatewayPayload(Request $request, bool $isIpn = false, string $fallbackStatus = 'failed'): array
    {
        $payload = $request->all();
        $tranId = $payload['tran_id'] ?? null;

        if (! $tranId) {
            return [
                'status' => 'failed',
                'booking_id' => null,
                'tran_id' => null,
                'message' => 'Missing transaction ID.',
                'http_status' => 422,
            ];
        }

        $payment = DB::table('payments')
            ->where('transaction_reference', $tranId)
            ->first();

        if (! $payment) {
            return [
                'status' => 'failed',
                'booking_id' => null,
                'tran_id' => $tranId,
                'message' => 'Payment transaction not found.',
                'http_status' => 404,
            ];
        }

        $booking = DB::table('bookings')
            ->where('id', $payment->booking_id)
            ->first();

        if (! $booking) {
            return [
                'status' => 'failed',
                'booking_id' => null,
                'tran_id' => $tranId,
                'message' => 'Booking not found.',
                'http_status' => 404,
            ];
        }

        $incomingStatus = strtoupper((string) ($payload['status'] ?? $fallbackStatus));

        if (! in_array($incomingStatus, ['VALID', 'VALIDATED'], true)) {
            $nextPaymentStatus = 'failed';
            $nextBookingStatus = 'payment_failed';
            $nextSlotStatus = 'available';

            if ($incomingStatus === 'CANCELLED' || strtolower($fallbackStatus) === 'cancelled') {
                $nextPaymentStatus = 'failed';
                $nextBookingStatus = 'cancelled';
                $nextSlotStatus = 'available';
            }

            DB::table('payments')
                ->where('id', $payment->id)
                ->update([
                    'payment_status' => $nextPaymentStatus,
                    'failed_reason' => $payload['error'] ?? $payload['failedreason'] ?? $incomingStatus,
                    'gateway_response_json' => json_encode($payload),
                    'updated_at' => now(),
                ]);

            DB::table('bookings')
                ->where('id', $booking->id)
                ->update([
                    'booking_status' => $nextBookingStatus,
                    'updated_at' => now(),
                ]);

            DB::table('booking_slots')
                ->where('id', $booking->booking_slot_id)
                ->update([
                    'slot_status' => $nextSlotStatus,
                    'hold_token' => null,
                    'hold_expires_at' => null,
                    'hold_booking_id' => null,
                    'updated_at' => now(),
                ]);

            return [
                'status' => strtolower($fallbackStatus),
                'booking_id' => $booking->id,
                'tran_id' => $tranId,
                'message' => 'Payment was not successful.',
                'http_status' => 200,
            ];
        }

        $valId = $payload['val_id'] ?? null;

        if (! $valId) {
            return [
                'status' => 'failed',
                'booking_id' => $booking->id,
                'tran_id' => $tranId,
                'message' => 'Missing validation ID.',
                'http_status' => 422,
            ];
        }

        $validation = $this->validateTransaction($valId);

        $validationStatus = strtoupper((string) ($validation['status'] ?? ''));
        $validatedTranId = $validation['tran_id'] ?? null;
        $validatedAmount = (float) ($validation['amount'] ?? 0);
        $expectedAmount = (float) $payment->amount;
        $validatedCurrency = strtoupper((string) ($validation['currency'] ?? ''));

        $isValid = in_array($validationStatus, ['VALID', 'VALIDATED'], true)
            && $validatedTranId === $tranId
            && abs($validatedAmount - $expectedAmount) < 0.01
            && $validatedCurrency === strtoupper($this->currency());

        if (! $isValid) {
            DB::table('payments')
                ->where('id', $payment->id)
                ->update([
                    'payment_status' => 'failed',
                    'gateway_validation_id' => $valId,
                    'failed_reason' => 'SSLCommerz validation failed.',
                    'gateway_response_json' => json_encode([
                        'return_payload' => $payload,
                        'validation_response' => $validation,
                    ]),
                    'updated_at' => now(),
                ]);

            DB::table('bookings')
                ->where('id', $booking->id)
                ->update([
                    'booking_status' => 'payment_failed',
                    'updated_at' => now(),
                ]);

            DB::table('booking_slots')
                ->where('id', $booking->booking_slot_id)
                ->update([
                    'slot_status' => 'available',
                    'hold_token' => null,
                    'hold_expires_at' => null,
                    'hold_booking_id' => null,
                    'updated_at' => now(),
                ]);

            return [
                'status' => 'failed',
                'booking_id' => $booking->id,
                'tran_id' => $tranId,
                'message' => 'Payment validation failed.',
                'http_status' => 422,
            ];
        }

        DB::transaction(function () use ($payment, $booking, $payload, $validation, $valId) {
            DB::table('payments')
                ->where('id', $payment->id)
                ->update([
                    'payment_status' => 'success',
                    'payment_method' => 'sslcommerz',
                    'gateway_name' => 'sslcommerz',
                    'gateway_validation_id' => $valId,
                    'gateway_bank_tran_id' => $validation['bank_tran_id'] ?? $payload['bank_tran_id'] ?? null,
                    'gateway_card_type' => $validation['card_type'] ?? $payload['card_type'] ?? null,
                    'gateway_card_issuer' => $validation['card_issuer'] ?? $payload['card_issuer'] ?? null,
                    'card_last_four' => $this->lastFourFromCard($validation['card_no'] ?? $payload['card_no'] ?? null),
                    'paid_at' => now(),
                    'gateway_response_json' => json_encode([
                        'return_payload' => $payload,
                        'validation_response' => $validation,
                    ]),
                    'failed_reason' => null,
                    'updated_at' => now(),
                ]);

            $successBookingStatus = env('SSLCOMMERZ_SUCCESS_BOOKING_STATUS', 'pending');

$successSlotStatus = $successBookingStatus === 'confirmed'
    ? 'booked'
    : 'pending_approval';

$bookedAt = $successBookingStatus === 'confirmed'
    ? now()
    : null;

DB::table('bookings')
    ->where('id', $booking->id)
    ->update([
        'booking_status' => $successBookingStatus,
        'booked_at' => $bookedAt,
        'updated_at' => now(),
    ]);

DB::table('booking_slots')
    ->where('id', $booking->booking_slot_id)
    ->update([
        'slot_status' => $successSlotStatus,
        'hold_token' => null,
        'hold_expires_at' => null,
        'hold_booking_id' => null,
        'updated_at' => now(),
    ]);
        });

        return [
            'status' => 'success',
            'booking_id' => $booking->id,
            'tran_id' => $tranId,
            'message' => 'Payment successful.',
            'http_status' => 200,
        ];
    }

    private function validateTransaction(string $valId): array
    {
        $response = Http::timeout(30)
            ->get($this->gatewayBaseUrl() . '/validator/api/validationserverAPI.php', [
                'val_id' => $valId,
                'store_id' => $this->storeId(),
                'store_passwd' => $this->storePassword(),
                'format' => 'json',
                'v' => 1,
            ]);

        if (! $response->ok()) {
            return [
                'status' => 'INVALID_TRANSACTION',
                'error' => 'Could not connect to SSLCommerz validation API.',
            ];
        }

        return $response->json() ?: [];
    }
}