<?php

namespace App\Http\Controllers\Api\Accounts\Admin;

use App\Http\Controllers\Api\Accounts\SerializesAccounts;
use App\Http\Controllers\Controller;
use App\Support\Office\AccountsMath;
use App\Support\Office\DbDates;
use App\Support\Office\OfficeAuth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Vendor directory management plus admin-initiated (company-paid) vendor
 * costs and payments.
 * Ported from MME's Accounts/backend/controllers/adminVendorsController.js.
 *
 * Company rows carry payment_source = "company" and employee_id = null, so
 * they hit the vendor ledger only and never touch an employee wallet.
 */
class AdminVendorController extends Controller
{
    use SerializesAccounts;

    public function index(Request $request): JsonResponse
    {
        $vendors = DB::table('vendors as v')
            ->leftJoin('vendor_balances as b', 'b.vendor_id', '=', 'v.id')
            ->when($request->query('search'), fn ($q, $v) => $q->where('v.name', 'like', '%'.$v.'%'))
            ->when($request->query('category'), fn ($q, $v) => $q->where('v.category', $v))
            ->when($request->query('status') === 'active', fn ($q) => $q->where('v.is_active', 1))
            ->when($request->query('status') === 'inactive', fn ($q) => $q->where('v.is_active', 0))
            ->orderBy('v.name')
            ->get(['v.*', 'b.current_balance']);

        $stillOwed = AccountsMath::computeVendorStillOwed(AccountsMath::activeVendorItems());

        return response()->json([
            'data' => $vendors->map(fn ($vendor) => $this->serializeVendor($vendor, $stillOwed))->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $name = mb_substr(trim((string) $request->input('name')), 0, 190);

        if ($name === '') {
            return response()->json(['message' => 'Vendor name is required.'], 422);
        }

        if (DB::table('vendors')->where('name', $name)->exists()) {
            return response()->json(['message' => 'A vendor with this name already exists.'], 409);
        }

        $now = DbDates::nowString();

        $id = DB::table('vendors')->insertGetId($this->vendorAttributes($request, $name) + [
            'is_active' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return response()->json(['data' => $this->findVendor($id)], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $vendor = DB::table('vendors')->where('id', $id)->first();

        if (! $vendor) {
            return response()->json(['message' => 'Vendor not found.'], 404);
        }

        $name = $request->has('name')
            ? mb_substr(trim((string) $request->input('name')), 0, 190)
            : $vendor->name;

        if ($name === '') {
            return response()->json(['message' => 'Vendor name is required.'], 422);
        }

        $duplicate = DB::table('vendors')->where('name', $name)->where('id', '!=', $id)->exists();

        if ($duplicate) {
            return response()->json(['message' => 'A vendor with this name already exists.'], 409);
        }

        DB::table('vendors')->where('id', $id)->update(
            $this->vendorAttributes($request, $name, $vendor) + ['updated_at' => DbDates::nowString()]
        );

        return response()->json(['data' => $this->findVendor($id)]);
    }

    public function setStatus(Request $request, int $id): JsonResponse
    {
        if (! DB::table('vendors')->where('id', $id)->exists()) {
            return response()->json(['message' => 'Vendor not found.'], 404);
        }

        DB::table('vendors')->where('id', $id)->update([
            'is_active' => filter_var($request->input('isActive'), FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
            'updated_at' => DbDates::nowString(),
        ]);

        return response()->json(['data' => $this->findVendor($id)]);
    }

    public function show(int $id): JsonResponse
    {
        $vendor = DB::table('vendors as v')
            ->leftJoin('vendor_balances as b', 'b.vendor_id', '=', 'v.id')
            ->where('v.id', $id)
            ->first(['v.*', 'b.current_balance']);

        if (! $vendor) {
            return response()->json(['message' => 'Vendor not found.'], 404);
        }

        $stillOwed = AccountsMath::computeVendorStillOwed(AccountsMath::activeVendorItems($id));

        $transactions = DB::table('account_expense_items as i')
            ->join('account_expenses as e', 'e.id', '=', 'i.expense_id')
            ->leftJoin('employees as emp', 'emp.id', '=', 'e.employee_id')
            ->where('i.vendor_id', $id)
            ->orderByDesc('i.id')
            ->get([
                'i.id', 'i.purpose', 'i.cost_date', 'i.total_amount', 'i.payment_status',
                'i.settles_item_id', 'i.settles_all_owed', 'i.created_at',
                'e.cost_type', 'e.status', 'e.payment_source', 'e.event_client_name_snapshot',
                'emp.full_name as employee_name',
            ]);

        return response()->json([
            'data' => [
                'vendor' => $this->serializeVendor($vendor, $stillOwed),
                'transactions' => $transactions->map(fn ($item) => [
                    'id' => (string) $item->id,
                    'purpose' => $item->purpose,
                    'costDate' => DbDates::formatDateOnly($item->cost_date),
                    'totalAmount' => (float) $item->total_amount,
                    'paymentStatus' => $item->payment_status,
                    'costType' => $item->cost_type,
                    'expenseStatus' => $item->status,
                    'paymentSource' => $item->payment_source,
                    'settlesItemId' => $item->settles_item_id ? (string) $item->settles_item_id : null,
                    'settlesAllOwed' => (bool) $item->settles_all_owed,
                    'eventClientName' => $item->event_client_name_snapshot ?: null,
                    'employeeName' => $item->employee_name,
                    'createdAt' => DbDates::formatDateTime($item->created_at),
                ])->values(),
            ],
        ]);
    }

    public function outstanding(int $id): JsonResponse
    {
        if (! DB::table('vendors')->where('id', $id)->exists()) {
            return response()->json(['message' => 'Vendor not found.'], 404);
        }

        return response()->json(['data' => AccountsMath::listVendorOutstandingBills($id)]);
    }

    /** Admin records a bill the company owes this vendor directly. */
    public function storeCost(Request $request, int $id): JsonResponse
    {
        return $this->storeCompanyEntry($request, $id, 'to_pay');
    }

    /** Admin records a payment the company made to this vendor directly. */
    public function storePayment(Request $request, int $id): JsonResponse
    {
        return $this->storeCompanyEntry($request, $id, 'paid');
    }

    private function storeCompanyEntry(Request $request, int $vendorId, string $paymentStatus): JsonResponse
    {
        $amount = $request->input('amount');

        if (! is_numeric($amount) || (float) $amount <= 0) {
            return response()->json(['message' => 'Enter an amount greater than zero.'], 422);
        }

        $vendor = DB::table('vendors')->where('id', $vendorId)->first();

        if (! $vendor) {
            return response()->json(['message' => 'Vendor not found.'], 404);
        }

        $settlement = ['settlesItemId' => null, 'settlesAllOwed' => false];

        if ($paymentStatus === 'paid') {
            $settlement = AccountsMath::resolveSettlementTarget($vendorId, $request->input('settlesItemId'));

            if (isset($settlement['error'])) {
                return response()->json(['message' => $settlement['error']], 422);
            }
        }

        $amount = AccountsMath::roundMoney($amount);
        $costDate = DbDates::parseDateOnly($request->input('costDate')) ?? DbDates::todayString();
        $purpose = mb_substr(trim((string) $request->input('purpose')), 0, 190);

        if ($purpose === '') {
            $purpose = $paymentStatus === 'paid'
                ? 'Company payment to '.$vendor->name
                : 'Company cost from '.$vendor->name;
        }

        $adminId = OfficeAuth::currentId($request);
        $now = DbDates::nowString();

        DB::transaction(function () use ($vendorId, $amount, $costDate, $purpose, $paymentStatus, $settlement, $adminId, $now) {
            $expenseId = DB::table('account_expenses')->insertGetId([
                'employee_id' => null,
                'cost_type' => 'regular',
                'total_amount' => $amount,
                // Company money never touches an employee wallet.
                'wallet_deduction_amount' => 0,
                'payment_source' => 'company',
                'created_by_admin_id' => $adminId,
                'status' => 'active',
                'approved' => 1,
                'approved_by_admin_id' => $adminId,
                'approved_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('account_expense_items')->insert([
                'expense_id' => $expenseId,
                'purpose' => $purpose,
                'cost_date' => $costDate,
                'quantity' => 1,
                'per_qty_amount' => $amount,
                'total_amount' => $amount,
                'vendor_id' => $vendorId,
                'payment_status' => $paymentStatus,
                'settles_item_id' => $settlement['settlesItemId'],
                'settles_all_owed' => $settlement['settlesAllOwed'] ? 1 : 0,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            AccountsMath::applyVendorDeltas([
                (string) $vendorId => $paymentStatus === 'paid' ? $amount : -$amount,
            ]);
        });

        return response()->json(['data' => $this->findVendor($vendorId)], 201);
    }

    private function vendorAttributes(Request $request, string $name, ?object $existing = null): array
    {
        return [
            'name' => $name,
            'category' => $this->optionalString($request, 'category', 100, $existing?->category),
            'contact_name' => $this->optionalString($request, 'contactName', 190, $existing?->contact_name),
            'contact_phone' => $this->optionalString($request, 'contactPhone', 50, $existing?->contact_phone),
            'contact_email' => $this->optionalString($request, 'contactEmail', 190, $existing?->contact_email),
            'notes' => $this->optionalString($request, 'notes', 500, $existing?->notes),
        ];
    }

    private function optionalString(Request $request, string $key, int $max, ?string $fallback): ?string
    {
        if (! $request->has($key)) {
            return $fallback;
        }

        $value = mb_substr(trim((string) $request->input($key)), 0, $max);

        return $value === '' ? null : $value;
    }

    private function findVendor(int $id): array
    {
        $vendor = DB::table('vendors as v')
            ->leftJoin('vendor_balances as b', 'b.vendor_id', '=', 'v.id')
            ->where('v.id', $id)
            ->first(['v.*', 'b.current_balance']);

        return $this->serializeVendor(
            $vendor,
            AccountsMath::computeVendorStillOwed(AccountsMath::activeVendorItems($id))
        );
    }

    private function serializeVendor(object $vendor, array $stillOwed): array
    {
        return [
            'id' => (string) $vendor->id,
            'name' => $vendor->name,
            'category' => $vendor->category,
            'contactName' => $vendor->contact_name,
            'contactPhone' => $vendor->contact_phone,
            'contactEmail' => $vendor->contact_email,
            'notes' => $vendor->notes,
            'isActive' => (bool) $vendor->is_active,
            'currentBalance' => -($stillOwed[(string) $vendor->id] ?? 0),
            'createdAt' => DbDates::formatDateTime($vendor->created_at),
        ];
    }
}
