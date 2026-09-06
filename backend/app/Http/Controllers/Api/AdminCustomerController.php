<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminCustomerController extends Controller
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

    public function index(Request $request): JsonResponse
    {
        $admin = $this->authenticatedAdmin($request);

        if (! $admin) {
            return $this->unauthenticatedAdminResponse();
        }

        $search = trim((string) $request->query('search', ''));
        $perPage = (int) $request->query('per_page', 15);
        $perPage = max(5, min($perPage, 50));

        $bookingCountSubquery = DB::table('bookings')
            ->select('customer_id', DB::raw('COUNT(*) as total_bookings'))
            ->groupBy('customer_id');

        $query = DB::table('customers as c')
            ->join('users as u', 'u.id', '=', 'c.user_id')
            ->leftJoinSub($bookingCountSubquery, 'bc', function ($join) {
                $join->on('bc.customer_id', '=', 'c.id');
            })
            ->where('u.user_type', 'customer')
            ->select([
                'c.id',
                'c.user_id',
                'c.customer_code',
                'c.address',
                'c.nid_or_passport',
                'c.created_at',
                'u.name',
                'u.email',
                'u.phone',
                'u.status',
                DB::raw('COALESCE(bc.total_bookings, 0) as total_bookings'),
            ]);

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('u.name', 'like', "%{$search}%")
                    ->orWhere('u.email', 'like', "%{$search}%")
                    ->orWhere('u.phone', 'like', "%{$search}%")
                    ->orWhere('c.customer_code', 'like', "%{$search}%")
                    ->orWhere('c.address', 'like', "%{$search}%");
            });
        }

        $customers = $query
            ->orderByDesc('c.created_at')
            ->orderByDesc('c.id')
            ->paginate($perPage);

        $statusRows = DB::table('customers as c')
            ->join('users as u', 'u.id', '=', 'c.user_id')
            ->where('u.user_type', 'customer')
            ->select('u.status', DB::raw('COUNT(*) as total'))
            ->groupBy('u.status')
            ->get();

        $statusSummary = [
            'active' => 0,
            'inactive' => 0,
            'blocked' => 0,
        ];

        foreach ($statusRows as $row) {
            $statusSummary[$row->status] = (int) $row->total;
        }

        $totalCustomers = array_sum($statusSummary);

        return response()->json([
            'message' => 'Customers loaded successfully.',
            'data' => [
                'admin' => [
                    'id' => $admin->id,
                    'name' => $admin->name,
                    'email' => $admin->email,
                    'user_type' => $admin->user_type,
                ],
                'summary' => [
                    'total_customers' => $totalCustomers,
                    'active_customers' => $statusSummary['active'] ?? 0,
                    'inactive_customers' => $statusSummary['inactive'] ?? 0,
                    'blocked_customers' => $statusSummary['blocked'] ?? 0,
                ],
                'customers' => $customers->items(),
                'pagination' => [
                    'current_page' => $customers->currentPage(),
                    'last_page' => $customers->lastPage(),
                    'per_page' => $customers->perPage(),
                    'total' => $customers->total(),
                ],
            ],
        ]);
    }

    public function show(Request $request, int $customerId): JsonResponse
    {
        $admin = $this->authenticatedAdmin($request);

        if (! $admin) {
            return $this->unauthenticatedAdminResponse();
        }

        $customer = DB::table('customers as c')
            ->join('users as u', 'u.id', '=', 'c.user_id')
            ->where('c.id', $customerId)
            ->where('u.user_type', 'customer')
            ->select([
                'c.id',
                'c.user_id',
                'c.customer_code',
                'c.address',
                'c.nid_or_passport',
                'c.created_at',
                'c.updated_at',
                'u.name',
                'u.email',
                'u.phone',
                'u.status',
            ])
            ->first();

        if (! $customer) {
            return response()->json([
                'message' => 'Customer not found.',
            ], 404);
        }

        $bookings = DB::table('bookings as b')
            ->leftJoin('booking_slots as bs', 'bs.id', '=', 'b.booking_slot_id')
            ->leftJoin('halls as h', 'h.id', '=', 'bs.hall_id')
            ->leftJoin('shifts as s', 's.id', '=', 'bs.shift_id')
            ->leftJoin('payments as p', 'p.booking_id', '=', 'b.id')
            ->where('b.customer_id', $customerId)
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
                'p.card_last_four',
                'p.paid_at',
            ])
            ->get();

        $payments = DB::table('payments as p')
            ->join('bookings as b', 'b.id', '=', 'p.booking_id')
            ->where('b.customer_id', $customerId)
            ->orderByDesc('p.created_at')
            ->select([
                'p.id',
                'p.booking_id',
                'b.booking_no',
                'b.event_title',
                'p.amount',
                'p.payment_method',
                'p.payment_status',
                'p.transaction_reference',
                'p.card_last_four',
                'p.paid_at',
                'p.created_at',
            ])
            ->get();

        $summary = [
            'total_bookings' => $bookings->count(),
            'confirmed_bookings' => $bookings->where('booking_status', 'confirmed')->count(),
            'pending_bookings' => $bookings->where('booking_status', 'pending')->count(),
            'rejected_bookings' => $bookings->where('booking_status', 'rejected')->count(),
            'cancelled_bookings' => $bookings->where('booking_status', 'cancelled')->count(),
            'total_booking_amount' => (float) $bookings->sum('total_amount'),
            'total_success_payment' => (float) $payments
                ->where('payment_status', 'success')
                ->sum('amount'),
        ];

        return response()->json([
            'message' => 'Customer details loaded successfully.',
            'data' => [
                'customer' => $customer,
                'summary' => $summary,
                'bookings' => $bookings,
                'payments' => $payments,
            ],
        ]);
    }

    public function updateStatus(Request $request, int $customerId): JsonResponse
    {
        $admin = $this->authenticatedAdmin($request);

        if (! $admin) {
            return $this->unauthenticatedAdminResponse();
        }

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:active,inactive,blocked'],
        ]);

        $customer = DB::table('customers as c')
            ->join('users as u', 'u.id', '=', 'c.user_id')
            ->where('c.id', $customerId)
            ->where('u.user_type', 'customer')
            ->select([
                'c.id',
                'c.user_id',
                'u.status',
            ])
            ->first();

        if (! $customer) {
            return response()->json([
                'message' => 'Customer not found.',
            ], 404);
        }

        DB::table('users')
            ->where('id', $customer->user_id)
            ->update([
                'status' => $validated['status'],
                'updated_at' => now(),
            ]);

        return response()->json([
            'message' => 'Customer status updated successfully.',
            'data' => [
                'customer_id' => $customerId,
                'status' => $validated['status'],
            ],
        ]);
    }
}