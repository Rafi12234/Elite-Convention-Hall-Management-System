<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class AdminManualBookingController extends Controller
{
    private string $timezone = 'Asia/Dhaka';

    public function store(Request $request): JsonResponse
    {
        $admin = $this->authenticatedAdmin($request);

        if (! $admin) {
            return response()->json([
                'message' => 'Unauthenticated admin.',
            ], 401);
        }

        $validated = $request->validate([
            'customer_name' => ['required', 'string', 'max:150'],
            'customer_email' => ['required', 'email', 'max:150'],
            'customer_phone' => ['required', 'string', 'max:30'],
            'customer_address' => ['nullable', 'string'],
            'password' => ['required', 'string', 'min:8', 'max:100'],

            'hall_id' => ['required', 'integer', 'exists:halls,id'],
            'booking_slot_id' => ['required', 'integer', 'exists:booking_slots,id'],

            'event_title' => ['required', 'string', 'max:150'],
            'event_type' => ['required', 'string', 'max:100'],
            'event_details' => ['nullable', 'string'],
            'guest_count' => ['required', 'integer', 'min:1'],

            'payment_method' => ['required', 'string', 'max:50'],
            'paid_amount' => ['required', 'numeric', 'min:0'],
            'payment_status' => ['nullable', 'string', 'max:50'],
            'payment_note' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $createdData = DB::transaction(function () use ($validated, $admin) {
                $now = Carbon::now($this->timezone);
                $today = Carbon::today($this->timezone)->toDateString();

                $existingUser = DB::table('users')
                    ->where(function ($query) use ($validated) {
                        $query->where('email', $validated['customer_email'])
                            ->orWhere('phone', $validated['customer_phone']);
                    })
                    ->lockForUpdate()
                    ->first();

                if ($existingUser) {
                    throw new \RuntimeException('A user already exists with this email or phone.');
                }

                $slot = DB::table('booking_slots as bs')
                    ->join('halls as h', 'h.id', '=', 'bs.hall_id')
                    ->join('shifts as s', 's.id', '=', 'bs.shift_id')
                    ->where('bs.id', $validated['booking_slot_id'])
                    ->where('bs.hall_id', $validated['hall_id'])
                    ->select([
                        'bs.id as slot_id',
                        'bs.slot_date',
                        'bs.slot_status',
                        'bs.hall_id',
                        'bs.shift_id',
                        'h.name as hall_name',
                        's.name as shift_name',
                        's.start_time',
                        's.end_time',
                        's.price as shift_price',
                    ])
                    ->lockForUpdate()
                    ->first();

                if (! $slot) {
                    throw new \RuntimeException('Selected slot was not found.');
                }

                if ($slot->slot_date < $today) {
                    throw new \RuntimeException('Past dates cannot be booked.');
                }

                if ($slot->slot_status !== 'available') {
                    throw new \RuntimeException('This slot is no longer available.');
                }

                if ($slot->shift_price === null || (float) $slot->shift_price <= 0) {
                    throw new \RuntimeException('Shift price is not configured in database.');
                }

                $totalAmount = (float) $slot->shift_price;
                $paidAmount = (float) $validated['paid_amount'];

                if ($paidAmount > $totalAmount) {
                    throw new \RuntimeException('Paid amount cannot be greater than total amount.');
                }

                $paymentStatus = $this->resolvePaymentStatus(
                    $validated['payment_status'] ?? null,
                    $paidAmount,
                    $totalAmount
                );

                $userId = DB::table('users')->insertGetId($this->buildUserData($validated, $now));

                $customerId = DB::table('customers')->insertGetId($this->buildCustomerData(
                    userId: $userId,
                    address: $validated['customer_address'] ?? null,
                    now: $now
                ));

                $bookingId = DB::table('bookings')->insertGetId($this->buildBookingData(
                    customerId: $customerId,
                    slotId: (int) $validated['booking_slot_id'],
                    validated: $validated,
                    totalAmount: $totalAmount,
                    adminId: (int) $admin->id,
                    now: $now
                ));

                $updatedSlot = DB::table('booking_slots')
                    ->where('id', $validated['booking_slot_id'])
                    ->where('slot_status', 'available')
                    ->update(array_merge([
                        'slot_status' => 'booked',
                    ], $this->timestampsForUpdate('booking_slots', $now), $this->clearHoldColumns()));

                if ($updatedSlot === 0) {
                    throw new \RuntimeException('This slot is no longer available.');
                }

                $paymentId = null;

                if (Schema::hasTable('payments')) {
                    $paymentId = DB::table('payments')->insertGetId($this->buildPaymentData(
                        bookingId: $bookingId,
                        paidAmount: $paidAmount,
                        paymentStatus: $paymentStatus,
                        validated: $validated,
                        now: $now
                    ));
                }

                $booking = $this->getBookingDetails($bookingId);

                return [
                    'booking' => $booking,
                    'payment_id' => $paymentId,
                    'due_amount' => max($totalAmount - $paidAmount, 0),
                    'temporary_password' => $validated['password'],
                ];
            });

            $emailSent = $this->sendCustomerLoginEmail(
                $createdData['booking'],
                $createdData['temporary_password']
            );

            return response()->json([
                'message' => $emailSent
                    ? 'Manual booking created successfully and login email sent.'
                    : 'Manual booking created successfully, but email could not be sent. Check mail configuration.',
                'data' => [
                    'booking' => $createdData['booking'],
                    'payment_id' => $createdData['payment_id'],
                    'due_amount' => $createdData['due_amount'],
                    'email_sent' => $emailSent,
                ],
            ], 201);

        } catch (\Throwable $exception) {
            return response()->json([
                'message' => 'Unable to create manual booking.',
                'error' => $exception->getMessage(),
            ], 422);
        }
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

    private function buildUserData(array $validated, Carbon $now): array
    {
        $data = [
            'name' => $validated['customer_name'],
            'email' => $validated['customer_email'],
            'phone' => $validated['customer_phone'],
            'password_hash' => Hash::make($validated['password']),
            'api_token_hash' => null,
            'user_type' => 'customer',
            'status' => 'active',
        ];

        if (Schema::hasColumn('users', 'must_change_password')) {
            $data['must_change_password'] = 1;
        }

        return array_merge($data, $this->timestampsForInsert('users', $now));
    }

    private function buildCustomerData(int $userId, ?string $address, Carbon $now): array
    {
        $data = [
            'user_id' => $userId,
            'customer_code' => $this->generateCustomerCode(),
            'address' => $address,
        ];

        return array_merge($data, $this->timestampsForInsert('customers', $now));
    }

    private function buildBookingData(
        int $customerId,
        int $slotId,
        array $validated,
        float $totalAmount,
        int $adminId,
        Carbon $now
    ): array {
        $data = [
            'booking_no' => $this->generateBookingNo($slotId),
            'customer_id' => $customerId,
            'booking_slot_id' => $slotId,
            'booking_status' => 'confirmed',
            'booking_source' => 'offline',
            'event_title' => $validated['event_title'],
            'event_type' => $validated['event_type'],
            'event_details' => $validated['event_details'] ?? null,
            'guest_count' => $validated['guest_count'],
            'total_amount' => $totalAmount,
            'booked_at' => $now,
        ];

        if (Schema::hasColumn('bookings', 'created_by_admin_id')) {
            $data['created_by_admin_id'] = $adminId;
        }

        return array_merge($data, $this->timestampsForInsert('bookings', $now));
    }

    private function buildPaymentData(
        int $bookingId,
        float $paidAmount,
        string $paymentStatus,
        array $validated,
        Carbon $now
    ): array {
        $data = [
            'booking_id' => $bookingId,
            'payment_method' => $validated['payment_method'],
            'payment_status' => $paymentStatus,
        ];

        if (Schema::hasColumn('payments', 'amount')) {
            $data['amount'] = $paidAmount;
        }

        if (Schema::hasColumn('payments', 'paid_amount')) {
            $data['paid_amount'] = $paidAmount;
        }

        if (Schema::hasColumn('payments', 'transaction_reference')) {
            $data['transaction_reference'] = 'MANUAL-' . $now->format('YmdHis') . '-' . Str::upper(Str::random(6));
        }

        if (Schema::hasColumn('payments', 'paid_at')) {
            $data['paid_at'] = in_array($paymentStatus, ['success', 'partial'], true) ? $now : null;
        }

        if (Schema::hasColumn('payments', 'payment_note')) {
            $data['payment_note'] = $validated['payment_note'] ?? null;
        }

        if (Schema::hasColumn('payments', 'cardholder_name')) {
            $data['cardholder_name'] = null;
        }

        if (Schema::hasColumn('payments', 'card_last_four')) {
            $data['card_last_four'] = null;
        }

        if (Schema::hasColumn('payments', 'card_last4')) {
            $data['card_last4'] = null;
        }

        if (Schema::hasColumn('payments', 'billing_address')) {
            $data['billing_address'] = null;
        }

        return array_merge($data, $this->timestampsForInsert('payments', $now));
    }

    private function getBookingDetails(int $bookingId): object
    {
        $query = DB::table('bookings as b')
            ->join('customers as c', 'c.id', '=', 'b.customer_id')
            ->join('users as u', 'u.id', '=', 'c.user_id')
            ->join('booking_slots as bs', 'bs.id', '=', 'b.booking_slot_id')
            ->join('halls as h', 'h.id', '=', 'bs.hall_id')
            ->join('shifts as s', 's.id', '=', 'bs.shift_id');

        $select = [
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

            'c.id as customer_id',
            'c.customer_code',
            'c.address as customer_address',

            'u.id as user_id',
            'u.name as customer_name',
            'u.email as customer_email',
            'u.phone as customer_phone',
            'u.user_type',
            'u.status as user_status',
            'u.must_change_password',

            'bs.id as slot_id',
            'bs.slot_date',
            'bs.slot_status',

            'h.name as hall_name',

            's.name as shift_name',
            's.start_time',
            's.end_time',
            's.price as shift_price',
        ];

        if (Schema::hasTable('payments')) {
            $query->leftJoin('payments as p', 'p.booking_id', '=', 'b.id');

            $select[] = 'p.payment_method';
            $select[] = 'p.payment_status';

            if (Schema::hasColumn('payments', 'amount')) {
                $select[] = 'p.amount as paid_amount';
            } elseif (Schema::hasColumn('payments', 'paid_amount')) {
                $select[] = 'p.paid_amount as paid_amount';
            } else {
                $select[] = DB::raw('0 as paid_amount');
            }
        } else {
            $select[] = DB::raw('null as payment_method');
            $select[] = DB::raw('null as payment_status');
            $select[] = DB::raw('0 as paid_amount');
        }

        return $query
            ->where('b.id', $bookingId)
            ->select($select)
            ->first();
    }

    private function resolvePaymentStatus(?string $requestedStatus, float $paidAmount, float $totalAmount): string
    {
        if ($requestedStatus && in_array($requestedStatus, ['pending', 'success', 'failed', 'partial'], true)) {
            return $requestedStatus;
        }

        if ($paidAmount <= 0) {
            return 'pending';
        }

        if ($paidAmount < $totalAmount) {
            return 'partial';
        }

        return 'success';
    }

    private function generateBookingNo(int $slotId): string
    {
        return 'BKG-' .
            now($this->timezone)->format('YmdHis') .
            '-S' .
            str_pad((string) $slotId, 5, '0', STR_PAD_LEFT) .
            '-' .
            Str::upper(Str::random(4));
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

    private function clearHoldColumns(): array
    {
        $data = [];

        if (Schema::hasColumn('booking_slots', 'hold_token')) {
            $data['hold_token'] = null;
        }

        if (Schema::hasColumn('booking_slots', 'hold_expires_at')) {
            $data['hold_expires_at'] = null;
        }

        if (Schema::hasColumn('booking_slots', 'hold_booking_id')) {
            $data['hold_booking_id'] = null;
        }

        return $data;
    }

    private function timestampsForInsert(string $table, Carbon $now): array
    {
        $data = [];

        if (Schema::hasColumn($table, 'created_at')) {
            $data['created_at'] = $now;
        }

        if (Schema::hasColumn($table, 'updated_at')) {
            $data['updated_at'] = $now;
        }

        return $data;
    }

    private function timestampsForUpdate(string $table, Carbon $now): array
    {
        return Schema::hasColumn($table, 'updated_at')
            ? ['updated_at' => $now]
            : [];
    }

    private function sendCustomerLoginEmail(object $booking, string $temporaryPassword): bool
    {
        if (empty($booking->customer_email)) {
            return false;
        }

        try {
            $html = $this->buildCustomerLoginEmailHtml($booking, $temporaryPassword);

            Mail::html($html, function ($message) use ($booking) {
                $message->to($booking->customer_email, $booking->customer_name)
                    ->subject('Your Elite Convention Hall Booking and Login Details');
            });

            return true;

        } catch (\Throwable $exception) {
            report($exception);
            return false;
        }
    }

    private function buildCustomerLoginEmailHtml(object $booking, string $temporaryPassword): string
    {
        $frontendUrl = rtrim(env('FRONTEND_URL', 'http://127.0.0.1:5500'), '/');
        $loginUrl = $frontendUrl . '/login.html';

        return '
            <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; background: #fffaf0; padding: 24px; border-radius: 14px; border: 1px solid #ead7a6;">
                <h2 style="color: #8f6908; margin-top: 0;">Elite Convention Hall Booking Confirmation</h2>

                <p>Dear ' . e($booking->customer_name ?? 'Customer') . ',</p>

                <p>Your Elite Convention Hall account and booking have been created successfully by our admin team.</p>

                <div style="background: #ffffff; padding: 16px; border-radius: 12px; border: 1px solid #ead7a6; margin: 18px 0;">
                    <h3 style="color: #8f6908; margin-top: 0;">Login Details</h3>
                    <p><strong>Login Email:</strong> ' . e($booking->customer_email ?? '') . '</p>
                    <p><strong>Temporary Password:</strong> ' . e($temporaryPassword) . '</p>
                    <p><strong>Login URL:</strong> <a href="' . e($loginUrl) . '">' . e($loginUrl) . '</a></p>
                </div>

                <div style="background: #ffffff; padding: 16px; border-radius: 12px; border: 1px solid #ead7a6; margin: 18px 0;">
                    <h3 style="color: #8f6908; margin-top: 0;">Booking Details</h3>
                    <p><strong>Booking No:</strong> ' . e($booking->booking_no ?? '') . '</p>
                    <p><strong>Event:</strong> ' . e($booking->event_title ?? '') . '</p>
                    <p><strong>Event Type:</strong> ' . e($booking->event_type ?? '') . '</p>
                    <p><strong>Hall:</strong> ' . e($booking->hall_name ?? '') . '</p>
                    <p><strong>Date:</strong> ' . e($booking->slot_date ?? '') . '</p>
                    <p><strong>Shift:</strong> ' . e($booking->shift_name ?? '') . ' (' . e($booking->start_time ?? '') . ' - ' . e($booking->end_time ?? '') . ')</p>
                    <p><strong>Total Amount:</strong> BDT ' . number_format((float) ($booking->total_amount ?? 0)) . '</p>
                    <p><strong>Paid Amount:</strong> BDT ' . number_format((float) ($booking->paid_amount ?? 0)) . '</p>
                    <p><strong>Payment Status:</strong> ' . e($booking->payment_status ?? 'pending') . '</p>
                </div>

                <p style="color: #6b7280;">
                    Please login using the email and temporary password above. For security, you must change your password after first login.
                </p>

                <p>Thank you,<br><strong>Elite Convention Hall</strong></p>
            </div>
        ';
    }
}