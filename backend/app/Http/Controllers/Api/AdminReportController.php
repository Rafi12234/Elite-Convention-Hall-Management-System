<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminReportController extends Controller
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

    private function normalizeDateRange(Request $request): array
    {
        $from = $request->query('from');
        $to = $request->query('to');

        if (! $from) {
            $from = now()->startOfMonth()->toDateString();
        }

        if (! $to) {
            $to = now()->toDateString();
        }

        return [$from, $to];
    }

    public function bookingReport(Request $request): JsonResponse
    {
        $admin = $this->authenticatedAdmin($request);

        if (! $admin) {
            return $this->unauthenticatedAdminResponse();
        }

        [$from, $to] = $this->normalizeDateRange($request);

        $status = trim((string) $request->query('status', 'all'));
        $isExport = $request->boolean('export');

        $summaryQuery = DB::table('bookings as b')
            ->whereBetween(DB::raw('DATE(b.created_at)'), [$from, $to]);

        if ($status !== '' && $status !== 'all') {
            $summaryQuery->where('b.booking_status', $status);
        }

        $statusCounts = (clone $summaryQuery)
            ->select('b.booking_status', DB::raw('COUNT(*) as total'))
            ->groupBy('b.booking_status')
            ->get();

        $statusSummary = [
            'total_bookings' => (clone $summaryQuery)->count(),
            'approved_bookings' => 0,
            'confirmed_bookings' => 0,
            'rejected_bookings' => 0,
            'pending_bookings' => 0,
            'cancelled_bookings' => 0,
        ];

        foreach ($statusCounts as $row) {
            $bookingStatus = strtolower((string) $row->booking_status);
            $count = (int) $row->total;

            if ($bookingStatus === 'confirmed') {
                $statusSummary['approved_bookings'] = $count;
                $statusSummary['confirmed_bookings'] = $count;
            }

            if ($bookingStatus === 'rejected') {
                $statusSummary['rejected_bookings'] = $count;
            }

            if ($bookingStatus === 'pending') {
                $statusSummary['pending_bookings'] = $count;
            }

            if ($bookingStatus === 'cancelled') {
                $statusSummary['cancelled_bookings'] = $count;
            }
        }

        $bookingsQuery = DB::table('bookings as b')
            ->leftJoin('customers as c', 'c.id', '=', 'b.customer_id')
            ->leftJoin('users as u', 'u.id', '=', 'c.user_id')
            ->leftJoin('booking_slots as bs', 'bs.id', '=', 'b.booking_slot_id')
            ->leftJoin('halls as h', 'h.id', '=', 'bs.hall_id')
            ->leftJoin('shifts as s', 's.id', '=', 'bs.shift_id')
            ->whereBetween(DB::raw('DATE(b.created_at)'), [$from, $to]);

        if ($status !== '' && $status !== 'all') {
            $bookingsQuery->where('b.booking_status', $status);
        }

        $bookingsQuery
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

                'c.id as customer_id',
                'c.customer_code',
                'c.address as customer_address',

                'u.name as customer_name',
                'u.email as customer_email',
                'u.phone as customer_phone',

                'bs.id as booking_slot_id',
                'bs.slot_date',
                'bs.slot_status',

                'h.id as hall_id',
                'h.name as hall_name',

                's.id as shift_id',
                's.name as shift_name',
                's.start_time',
                's.end_time',
            ])
            ->orderByDesc('b.created_at');

        if (! $isExport) {
            $bookingsQuery->limit(300);
        }

        $bookings = $bookingsQuery->get();

        return response()->json([
            'message' => 'Booking report loaded successfully.',
            'data' => [
                'filters' => [
                    'from' => $from,
                    'to' => $to,
                    'status' => $status ?: 'all',
                    'export' => $isExport,
                ],
                'summary' => $statusSummary,
                'bookings' => $bookings,
            ],
        ]);
    }

    public function revenueReport(Request $request): JsonResponse
    {
        $admin = $this->authenticatedAdmin($request);

        if (! $admin) {
            return $this->unauthenticatedAdminResponse();
        }

        [$from, $to] = $this->normalizeDateRange($request);

        $groupBy = trim((string) $request->query('group_by', 'month'));
        $paymentMethod = trim((string) $request->query('payment_method', 'all'));
        $isExport = $request->boolean('export');

        if (! in_array($groupBy, ['day', 'week', 'month', 'year'], true)) {
            $groupBy = 'month';
        }

        $paidStatuses = ['success', 'paid'];

        $paidPaymentsBaseQuery = DB::table('payments as p')
            ->join('bookings as b', 'b.id', '=', 'p.booking_id')
            ->leftJoin('customers as c', 'c.id', '=', 'b.customer_id')
            ->leftJoin('users as u', 'u.id', '=', 'c.user_id')
            ->whereIn('p.payment_status', $paidStatuses)
            ->whereBetween(DB::raw('DATE(COALESCE(p.paid_at, p.created_at))'), [$from, $to]);

        if ($paymentMethod !== '' && $paymentMethod !== 'all') {
            $paidPaymentsBaseQuery->where('p.payment_method', $paymentMethod);
        }

        $totalPaid = (clone $paidPaymentsBaseQuery)->sum('p.amount');
        $paymentCount = (clone $paidPaymentsBaseQuery)->count();

        $bookingTotals = DB::table('bookings as b')
            ->whereBetween(DB::raw('DATE(b.created_at)'), [$from, $to])
            ->sum('b.total_amount');

        $allPaidForBookingsInRange = DB::table('payments as p')
            ->join('bookings as b', 'b.id', '=', 'p.booking_id')
            ->whereIn('p.payment_status', $paidStatuses)
            ->whereBetween(DB::raw('DATE(b.created_at)'), [$from, $to])
            ->sum('p.amount');

        $dueAmount = max(0, (float) $bookingTotals - (float) $allPaidForBookingsInRange);

        $periodExpression = match ($groupBy) {
            'day' => "DATE(COALESCE(p.paid_at, p.created_at))",
            'week' => "YEARWEEK(COALESCE(p.paid_at, p.created_at), 3)",
            'year' => "YEAR(COALESCE(p.paid_at, p.created_at))",
            default => "DATE_FORMAT(COALESCE(p.paid_at, p.created_at), '%Y-%m')",
        };

        $revenueByPeriod = (clone $paidPaymentsBaseQuery)
            ->select([
                DB::raw("$periodExpression as period_label"),
                DB::raw('COUNT(*) as payment_count'),
                DB::raw('SUM(p.amount) as total_amount'),
            ])
            ->groupBy(DB::raw($periodExpression))
            ->orderBy(DB::raw($periodExpression))
            ->get();

        $revenueByMethod = (clone $paidPaymentsBaseQuery)
            ->select([
                'p.payment_method',
                DB::raw('COUNT(*) as payment_count'),
                DB::raw('SUM(p.amount) as total_amount'),
            ])
            ->groupBy('p.payment_method')
            ->orderByDesc(DB::raw('SUM(p.amount)'))
            ->get();

        $paymentsQuery = (clone $paidPaymentsBaseQuery)
            ->select([
                'p.id',
                'p.booking_id',
                'p.amount',
                'p.payment_method',
                'p.payment_status',
                'p.card_last_four',
                'p.paid_at',
                'p.created_at',

                'b.booking_no',
                'b.event_title',
                'b.event_type',
                'b.total_amount as booking_total',
                'b.booking_status',

                'c.id as customer_id',
                'c.customer_code',

                'u.name as customer_name',
                'u.email as customer_email',
                'u.phone as customer_phone',
            ])
            ->orderByDesc(DB::raw('COALESCE(p.paid_at, p.created_at)'));

        if (! $isExport) {
            $paymentsQuery->limit(300);
        }

        $payments = $paymentsQuery->get();

        $paymentMethods = DB::table('payments')
            ->whereNotNull('payment_method')
            ->where('payment_method', '<>', '')
            ->select('payment_method')
            ->distinct()
            ->orderBy('payment_method')
            ->pluck('payment_method');

        return response()->json([
            'message' => 'Revenue report loaded successfully.',
            'data' => [
                'filters' => [
                    'from' => $from,
                    'to' => $to,
                    'group_by' => $groupBy,
                    'payment_method' => $paymentMethod ?: 'all',
                    'export' => $isExport,
                ],
                'summary' => [
                    'total_paid_amount' => (float) $totalPaid,
                    'due_amount' => (float) $dueAmount,
                    'booking_total_amount' => (float) $bookingTotals,
                    'payment_count' => (int) $paymentCount,
                ],
                'payment_methods' => $paymentMethods,
                'revenue_by_period' => $revenueByPeriod,
                'revenue_by_method' => $revenueByMethod,
                'payments' => $payments,
            ],
        ]);
    }

    public function customerReport(Request $request): JsonResponse
    {
        $admin = $this->authenticatedAdmin($request);

        if (! $admin) {
            return $this->unauthenticatedAdminResponse();
        }

        [$from, $to] = $this->normalizeDateRange($request);

        $search = trim((string) $request->query('search', ''));
        $isExport = $request->boolean('export');

        $totalCustomers = DB::table('customers as c')
            ->join('users as u', 'u.id', '=', 'c.user_id')
            ->where('u.user_type', 'customer')
            ->count();

        $newCustomersBaseQuery = DB::table('customers as c')
            ->join('users as u', 'u.id', '=', 'c.user_id')
            ->where('u.user_type', 'customer')
            ->whereBetween(DB::raw('DATE(c.created_at)'), [$from, $to]);

        $newCustomersCount = (clone $newCustomersBaseQuery)->count();

        $customerBookingSummaryQuery = DB::table('customers as c')
            ->join('users as u', 'u.id', '=', 'c.user_id')
            ->leftJoin('bookings as b', function ($join) use ($from, $to) {
                $join->on('b.customer_id', '=', 'c.id')
                    ->whereBetween(DB::raw('DATE(b.created_at)'), [$from, $to]);
            })
            ->where('u.user_type', 'customer');

        if ($search !== '') {
            $customerBookingSummaryQuery->where(function ($q) use ($search) {
                $q->where('u.name', 'like', "%{$search}%")
                    ->orWhere('u.email', 'like', "%{$search}%")
                    ->orWhere('u.phone', 'like', "%{$search}%")
                    ->orWhere('c.customer_code', 'like', "%{$search}%")
                    ->orWhere('c.address', 'like', "%{$search}%");
            });
        }

        $customerBookingSummaryQuery
            ->select([
                'c.id',
                'c.customer_code',
                'c.address',
                'c.created_at',
                'u.name',
                'u.email',
                'u.phone',
                'u.status',

                DB::raw('COUNT(b.id) as total_bookings'),
                DB::raw("SUM(CASE WHEN b.booking_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_bookings"),
                DB::raw("SUM(CASE WHEN b.booking_status = 'pending' THEN 1 ELSE 0 END) as pending_bookings"),
                DB::raw("SUM(CASE WHEN b.booking_status = 'rejected' THEN 1 ELSE 0 END) as rejected_bookings"),
                DB::raw("SUM(CASE WHEN b.booking_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings"),
                DB::raw('COALESCE(SUM(b.total_amount), 0) as total_booking_amount'),
            ])
            ->groupBy([
                'c.id',
                'c.customer_code',
                'c.address',
                'c.created_at',
                'u.name',
                'u.email',
                'u.phone',
                'u.status',
            ])
            ->orderByDesc(DB::raw('COUNT(b.id)'))
            ->orderBy('u.name');

        if (! $isExport) {
            $customerBookingSummaryQuery->limit(300);
        }

        $customers = $customerBookingSummaryQuery->get();

        $topCustomers = $customers
            ->sortByDesc('total_bookings')
            ->take(10)
            ->values();

        $newCustomersQuery = (clone $newCustomersBaseQuery)
            ->select([
                'c.id',
                'c.customer_code',
                'c.address',
                'c.created_at',
                'u.name',
                'u.email',
                'u.phone',
                'u.status',
            ])
            ->orderByDesc('c.created_at');

        if (! $isExport) {
            $newCustomersQuery->limit(50);
        }

        $newCustomers = $newCustomersQuery->get();

        return response()->json([
            'message' => 'Customer report loaded successfully.',
            'data' => [
                'filters' => [
                    'from' => $from,
                    'to' => $to,
                    'search' => $search,
                    'export' => $isExport,
                ],
                'summary' => [
                    'total_customers' => (int) $totalCustomers,
                    'new_customers' => (int) $newCustomersCount,
                    'matched_customers' => $customers->count(),
                ],
                'top_customers' => $topCustomers,
                'new_customers' => $newCustomers,
                'customers' => $customers,
            ],
        ]);
    }
}