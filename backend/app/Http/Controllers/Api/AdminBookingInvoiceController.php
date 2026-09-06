<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class AdminBookingInvoiceController extends Controller
{
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

    private function unauthenticatedAdminResponse(): JsonResponse
    {
        return response()->json([
            'message' => 'Unauthenticated admin.',
        ], 401);
    }

    public function details(Request $request, int $id): JsonResponse
    {
        $admin = $this->authenticatedAdmin($request);

        if (! $admin) {
            return $this->unauthenticatedAdminResponse();
        }

        $booking = DB::table('bookings as b')
            ->join('customers as c', 'c.id', '=', 'b.customer_id')
            ->join('users as u', 'u.id', '=', 'c.user_id')
            ->join('booking_slots as bs', 'bs.id', '=', 'b.booking_slot_id')
            ->leftJoin('halls as h', 'h.id', '=', 'bs.hall_id')
            ->leftJoin('shifts as s', 's.id', '=', 'bs.shift_id')
            ->leftJoin('payments as p', 'p.booking_id', '=', 'b.id')
            ->where('b.id', $id)
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
                'b.updated_at',

                'u.id as user_id',
                'u.name as customer_name',
                'u.email as customer_email',
                'u.phone as customer_phone',
                'u.status as user_status',

                'c.id as customer_id',
                'c.address as customer_address',

                'bs.id as booking_slot_id',
                'bs.slot_date',
                'bs.slot_status',

                'h.name as hall_name',
                's.name as shift_name',
                's.start_time',
                's.end_time',

                'p.id as payment_id',
                'p.payment_method',
                'p.payment_status',
                'p.amount as payment_amount',
                'p.transaction_reference',
                'p.cardholder_name',
                'p.card_last_four',
                'p.billing_address',
                'p.paid_at',
            ])
            ->first();

        if (! $booking) {
            return response()->json([
                'success' => false,
                'message' => 'Booking not found.',
            ], 404);
        }

        $charges = $this->getBookingExtraCharges($id);
        $categories = $this->getCategories();

        $extraTotal = $charges->sum(fn ($row) => (float) $row->amount);
        $extraPaid = $charges
            ->where('payment_status', 'paid')
            ->sum(fn ($row) => (float) $row->amount);
        $extraDue = $charges
            ->where('payment_status', 'due')
            ->sum(fn ($row) => (float) $row->amount);

        $mainAmount = (float) ($booking->total_amount ?? 0);

        return response()->json([
            'success' => true,
            'message' => 'Booking invoice details loaded successfully.',
            'data' => [
                'booking' => $booking,
                'extra_charges' => $charges,
                'extra_charge_categories' => $categories,
                'totals' => [
                    'main_booking_amount' => $mainAmount,
                    'extra_total' => $extraTotal,
                    'extra_paid' => $extraPaid,
                    'extra_due' => $extraDue,
                    'grand_total' => $mainAmount + $extraTotal,
                    'grand_paid' => $mainAmount + $extraPaid,
                    'grand_due' => $extraDue,
                ],
            ],
        ]);
    }

    public function categories(Request $request): JsonResponse
    {
        $admin = $this->authenticatedAdmin($request);

        if (! $admin) {
            return $this->unauthenticatedAdminResponse();
        }

        return response()->json([
            'success' => true,
            'message' => 'Extra charge categories loaded successfully.',
            'data' => $this->getCategories(),
        ]);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $admin = $this->authenticatedAdmin($request);

        if (! $admin) {
            return $this->unauthenticatedAdminResponse();
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
        ]);

        $category = $this->findOrCreateCategory($validated['name']);

        return response()->json([
            'success' => true,
            'message' => 'Extra charge category saved successfully.',
            'data' => [
                'category' => $category,
            ],
        ]);
    }

    public function storeCharge(Request $request, int $id): JsonResponse
    {
        $admin = $this->authenticatedAdmin($request);

        if (! $admin) {
            return $this->unauthenticatedAdminResponse();
        }

        $bookingExists = DB::table('bookings')->where('id', $id)->exists();

        if (! $bookingExists) {
            return response()->json([
                'success' => false,
                'message' => 'Booking not found.',
            ], 404);
        }

        $validated = $request->validate([
            'extra_charge_category_id' => ['nullable', 'integer', 'exists:extra_charge_categories,id'],
            'new_category_name' => ['nullable', 'string', 'max:150'],
            'title' => ['nullable', 'string', 'max:180'],
            'amount' => ['required', 'numeric', 'min:1', 'max:99999999'],
            'payment_status' => ['required', 'string', 'in:due,paid'],
            'payment_method' => ['nullable', 'string', 'in:cash,bank,mobile_banking,other'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $category = null;

            if (! empty($validated['new_category_name'])) {
                $category = $this->findOrCreateCategory($validated['new_category_name']);
            } elseif (! empty($validated['extra_charge_category_id'])) {
                $category = DB::table('extra_charge_categories')
                    ->where('id', $validated['extra_charge_category_id'])
                    ->first();
            }

            $title = $validated['title'] ?? null;

            if (! $title && $category) {
                $title = $category->name;
            }

            if (! $title) {
                return response()->json([
                    'success' => false,
                    'message' => 'Please select an extra charge category or enter a new charge name.',
                ], 422);
            }

            DB::table('booking_extra_charges')->insert([
                'booking_id' => $id,
                'extra_charge_category_id' => $category->id ?? null,
                'title' => $title,
                'amount' => $validated['amount'],
                'payment_status' => $validated['payment_status'],
                'payment_method' => $validated['payment_method'] ?? 'cash',
                'notes' => $validated['notes'] ?? null,
                'created_by' => $admin->id,
                'paid_at' => $validated['payment_status'] === 'paid' ? now() : null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Extra charge added successfully.',
                'data' => [
                    'extra_charges' => $this->getBookingExtraCharges($id),
                ],
            ]);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Failed to add extra charge.',
            ], 500);
        }
    }

    public function updateCharge(Request $request, int $id, int $chargeId): JsonResponse
    {
        $admin = $this->authenticatedAdmin($request);

        if (! $admin) {
            return $this->unauthenticatedAdminResponse();
        }

        $validated = $request->validate([
            'payment_status' => ['required', 'string', 'in:due,paid'],
        ]);

        $charge = DB::table('booking_extra_charges')
            ->where('id', $chargeId)
            ->where('booking_id', $id)
            ->first();

        if (! $charge) {
            return response()->json([
                'success' => false,
                'message' => 'Extra charge not found.',
            ], 404);
        }

        DB::table('booking_extra_charges')
            ->where('id', $chargeId)
            ->where('booking_id', $id)
            ->update([
                'payment_status' => $validated['payment_status'],
                'paid_at' => $validated['payment_status'] === 'paid' ? now() : null,
                'updated_at' => now(),
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Extra charge status updated successfully.',
            'data' => [
                'extra_charges' => $this->getBookingExtraCharges($id),
            ],
        ]);
    }

    public function deleteCharge(Request $request, int $id, int $chargeId): JsonResponse
    {
        $admin = $this->authenticatedAdmin($request);

        if (! $admin) {
            return $this->unauthenticatedAdminResponse();
        }

        $deleted = DB::table('booking_extra_charges')
            ->where('id', $chargeId)
            ->where('booking_id', $id)
            ->delete();

        if (! $deleted) {
            return response()->json([
                'success' => false,
                'message' => 'Extra charge not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Extra charge deleted successfully.',
            'data' => [
                'extra_charges' => $this->getBookingExtraCharges($id),
            ],
        ]);
    }

    private function getCategories()
    {
        return DB::table('extra_charge_categories')
            ->where('is_active', 1)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->select([
                'id',
                'name',
                'slug',
                'is_active',
                'sort_order',
            ])
            ->get();
    }

    private function getBookingExtraCharges(int $bookingId)
    {
        return DB::table('booking_extra_charges as bec')
            ->leftJoin('extra_charge_categories as ecc', 'ecc.id', '=', 'bec.extra_charge_category_id')
            ->leftJoin('users as u', 'u.id', '=', 'bec.created_by')
            ->where('bec.booking_id', $bookingId)
            ->orderBy('bec.created_at')
            ->select([
                'bec.id',
                'bec.booking_id',
                'bec.extra_charge_category_id',
                'ecc.name as category_name',
                'bec.title',
                'bec.amount',
                'bec.payment_status',
                'bec.payment_method',
                'bec.notes',
                'bec.created_by',
                'u.name as created_by_name',
                'bec.paid_at',
                'bec.created_at',
                'bec.updated_at',
            ])
            ->get();
    }

    private function findOrCreateCategory(string $name): object
    {
        $cleanName = trim($name);
        $slug = Str::slug($cleanName);

        if (! $slug) {
            $slug = 'extra-charge-' . time();
        }

        $existing = DB::table('extra_charge_categories')
            ->where('slug', $slug)
            ->first();

        if ($existing) {
            return $existing;
        }

        $id = DB::table('extra_charge_categories')->insertGetId([
            'name' => $cleanName,
            'slug' => $slug,
            'is_active' => 1,
            'sort_order' => 100,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return DB::table('extra_charge_categories')->where('id', $id)->first();
    }
}