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
 * Admin oversight of employee wallets and expenses.
 * Ported from MME's Accounts/backend/controllers/adminAccountsController.js.
 */
class AdminAccountsController extends Controller
{
    use SerializesAccounts;

    public function employees(): JsonResponse
    {
        $employees = DB::table('employees as e')
            ->leftJoin('roles as r', 'r.id', '=', 'e.role_id')
            ->leftJoin('account_wallets as w', 'w.employee_id', '=', 'e.id')
            ->where(function ($query) {
                $query->whereNull('r.name')->orWhere('r.name', '!=', 'Admin');
            })
            ->get(['e.id', 'e.full_name', 'e.email', 'e.is_active', 'w.current_balance']);

        $moneyIn = DB::table('account_money_received')
            ->groupBy('employee_id')
            ->pluck(DB::raw('SUM(amount)'), 'employee_id');

        $lastMoneyAt = DB::table('account_money_received')
            ->groupBy('employee_id')
            ->pluck(DB::raw('MAX(created_at)'), 'employee_id');

        $lastExpenseAt = DB::table('account_expenses')
            ->groupBy('employee_id')
            ->pluck(DB::raw('MAX(created_at)'), 'employee_id');

        $items = DB::table('account_expense_items as i')
            ->join('account_expenses as e', 'e.id', '=', 'i.expense_id')
            ->where('e.status', 'active')
            ->get([
                'i.id', 'i.vendor_id', 'i.payment_status', 'i.total_amount',
                'i.settles_item_id', 'i.settles_all_owed', 'e.employee_id',
            ]);

        $stillPayableByEmployee = $this->stillPayableByEmployee($items);

        $rows = $employees->map(function ($employee) use ($items, $moneyIn, $lastMoneyAt, $lastExpenseAt, $stillPayableByEmployee) {
            $own = $items->where('employee_id', $employee->id);

            $lastActivity = collect([
                $lastMoneyAt[$employee->id] ?? null,
                $lastExpenseAt[$employee->id] ?? null,
            ])->filter()->max();

            return [
                'employeeId' => (string) $employee->id,
                'fullName' => $employee->full_name,
                'email' => $employee->email,
                'isActive' => (bool) $employee->is_active,
                'currentBalance' => (float) ($employee->current_balance ?? 0),
                'totalMoneyIn' => AccountsMath::roundMoney($moneyIn[$employee->id] ?? 0),
                'totalStillPayable' => $stillPayableByEmployee[(string) $employee->id] ?? 0,
                'totalPaidToVendors' => AccountsMath::roundMoney(
                    $own->where('payment_status', 'paid')->whereNotNull('vendor_id')->sum('total_amount')
                ),
                'totalExpenses' => AccountsMath::roundMoney(
                    $own->whereNull('vendor_id')->sum('total_amount')
                ),
                'lastActivityAt' => DbDates::formatDateTime($lastActivity),
            ];
        })
            ->sortBy([
                fn ($a, $b) => strcmp($b['lastActivityAt'] ?? '', $a['lastActivityAt'] ?? ''),
                fn ($a, $b) => strcmp($a['fullName'], $b['fullName']),
            ])
            ->values();

        return response()->json(['data' => $rows]);
    }

    public function employee(int $id): JsonResponse
    {
        $employee = DB::table('employees')->where('id', $id)->first(['id', 'full_name', 'email', 'is_active']);

        if (! $employee) {
            return response()->json(['message' => 'Employee not found.'], 404);
        }

        $expenses = DB::table('account_expenses')->where('employee_id', $id)->orderByDesc('id')->get();
        $itemsByExpense = $this->itemsByExpense($expenses->pluck('id'));

        $moneyInHistory = DB::table('account_money_received as m')
            ->leftJoin('employees as a', 'a.id', '=', 'm.created_by_admin_id')
            ->where('m.employee_id', $id)
            ->orderByDesc('m.id')
            ->get(['m.*', 'a.full_name as admin_name']);

        $activeItems = collect();
        $vendorItems = [];
        $vendorPaymentsMade = [];
        $eventCostTotal = 0;
        $regularCostTotal = 0;

        foreach ($expenses as $expense) {
            $items = $itemsByExpense[$expense->id] ?? [];

            foreach ($items as $item) {
                if ($expense->status === 'active') {
                    $activeItems->push($item);
                }

                if ($item->vendor_id) {
                    $vendorItems[] = $this->serializeVendorPayment($item, $expense);

                    if ($item->payment_status === 'paid') {
                        $vendorPaymentsMade[] = $this->serializeVendorPayment($item, $expense);
                    }
                }
            }

            if ($expense->status === 'active') {
                if ($expense->cost_type === 'event') {
                    $eventCostTotal += (float) $expense->total_amount;
                } else {
                    $regularCostTotal += (float) $expense->total_amount;
                }
            }
        }

        $stillPayable = array_sum(AccountsMath::computeVendorStillOwed(
            $activeItems->map(fn ($item) => [
                'id' => $item->id,
                'vendorId' => $item->vendor_id,
                'paymentStatus' => $item->payment_status,
                'totalAmount' => $item->total_amount,
                'settlesItemId' => $item->settles_item_id,
                'settlesAllOwed' => $item->settles_all_owed,
            ])->all()
        ));

        $totalRecordedCost = AccountsMath::roundMoney($eventCostTotal + $regularCostTotal);

        return response()->json([
            'data' => [
                'employee' => [
                    'id' => (string) $employee->id,
                    'fullName' => $employee->full_name,
                    'email' => $employee->email,
                    'isActive' => (bool) $employee->is_active,
                ],
                'currentBalance' => (float) (DB::table('account_wallets')->where('employee_id', $id)->value('current_balance') ?? 0),
                'totalMoneyIn' => AccountsMath::roundMoney($moneyInHistory->sum('amount')),
                'totalRecordedCost' => $totalRecordedCost,
                'totalStillPayable' => AccountsMath::roundMoney($stillPayable),
                'totalActuallyPaid' => AccountsMath::roundMoney($totalRecordedCost - $stillPayable),
                'eventCostTotal' => AccountsMath::roundMoney($eventCostTotal),
                'regularCostTotal' => AccountsMath::roundMoney($regularCostTotal),
                'vendorItems' => $vendorItems,
                'vendorPaymentsMade' => $vendorPaymentsMade,
                'moneyInHistory' => $moneyInHistory->map(fn ($row) => $this->serializeMoneyIn($row))->values(),
                'expenseHistory' => $expenses->map(
                    fn ($expense) => $this->serializeExpense($expense, $itemsByExpense[$expense->id] ?? [])
                )->values(),
            ],
        ]);
    }

    public function moneyIn(Request $request): JsonResponse
    {
        $pagination = AccountsMath::parsePagination($request->query('page'), $request->query('pageSize'));

        $query = DB::table('account_money_received as m')
            ->leftJoin('employees as e', 'e.id', '=', 'm.employee_id')
            ->leftJoin('employees as a', 'a.id', '=', 'm.created_by_admin_id')
            ->when($request->query('employeeId'), fn ($q, $v) => $q->where('m.employee_id', (int) $v))
            ->when($request->query('source'), fn ($q, $v) => $q->where('m.source', $v))
            ->when(DbDates::parseDateOnly($request->query('dateFrom')), fn ($q, $v) => $q->where('m.received_date', '>=', $v))
            ->when(DbDates::parseDateOnly($request->query('dateTo')), fn ($q, $v) => $q->where('m.received_date', '<=', $v))
            ->when($request->query('search'), fn ($q, $v) => $q->where('m.note', 'like', '%'.$v.'%'));

        $total = (clone $query)->count();
        $filteredActiveTotal = AccountsMath::roundMoney((clone $query)->sum('m.amount'));

        $query = match ($request->query('sort')) {
            'oldest' => $query->orderBy('m.id'),
            'highest' => $query->orderByDesc('m.amount'),
            'lowest' => $query->orderBy('m.amount'),
            default => $query->orderByDesc('m.id'),
        };

        $rows = $query
            ->offset($pagination['skip'])
            ->limit($pagination['take'])
            ->get(['m.*', 'e.full_name as employee_name', 'a.full_name as admin_name']);

        return response()->json([
            'data' => [
                'rows' => $rows->map(fn ($row) => $this->serializeAdminMoneyIn($row))->values(),
                'page' => $pagination['page'],
                'pageSize' => $pagination['pageSize'],
                'total' => $total,
                'totalPages' => (int) ceil($total / $pagination['pageSize']),
                'filteredActiveTotal' => $filteredActiveTotal,
            ],
        ]);
    }

    public function storeMoneyIn(Request $request): JsonResponse
    {
        $employeeId = (int) $request->input('employeeId');

        if (! $employeeId) {
            return response()->json(['message' => 'Select an employee.'], 422);
        }

        if (! DB::table('employees')->where('id', $employeeId)->exists()) {
            return response()->json(['message' => 'Employee not found.'], 404);
        }

        $amount = $request->input('amount');

        if (! is_numeric($amount) || (float) $amount <= 0) {
            return response()->json(['message' => 'Enter an amount greater than zero.'], 422);
        }

        $receivedDate = DbDates::parseDateOnly($request->input('receivedDate'));

        if (! $receivedDate) {
            return response()->json(['message' => 'Select a valid received date.'], 422);
        }

        $amount = AccountsMath::roundMoney($amount);
        $note = mb_substr(trim((string) $request->input('note')), 0, 255);
        $adminId = OfficeAuth::currentId($request);
        $now = DbDates::nowString();

        $id = DB::transaction(function () use ($employeeId, $amount, $receivedDate, $note, $adminId, $now) {
            $id = DB::table('account_money_received')->insertGetId([
                'employee_id' => $employeeId,
                'amount' => $amount,
                'received_date' => $receivedDate,
                'note' => $note === '' ? null : $note,
                'source' => 'admin',
                'created_by_admin_id' => $adminId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            AccountsMath::applyWalletDelta($employeeId, $amount);

            return $id;
        });

        return response()->json(['data' => $this->findAdminMoneyIn($id)], 201);
    }

    public function updateMoneyIn(Request $request, int $id): JsonResponse
    {
        $reason = AccountsMath::requireReason($request->input('reason'));

        if (! $reason) {
            return response()->json(['message' => 'A reason for this correction is required.'], 422);
        }

        $existing = DB::table('account_money_received')->where('id', $id)->first();

        if (! $existing) {
            return response()->json(['message' => 'Money In record not found.'], 404);
        }

        $amount = $request->has('amount') ? $request->input('amount') : $existing->amount;

        if (! is_numeric($amount) || (float) $amount <= 0) {
            return response()->json(['message' => 'Enter an amount greater than zero.'], 422);
        }

        $receivedDate = $request->has('receivedDate')
            ? DbDates::parseDateOnly($request->input('receivedDate'))
            : $existing->received_date;

        if (! $receivedDate) {
            return response()->json(['message' => 'Select a valid received date.'], 422);
        }

        $amount = AccountsMath::roundMoney($amount);
        $walletDelta = AccountsMath::roundMoney($amount - (float) $existing->amount);
        $note = $request->has('note')
            ? mb_substr(trim((string) $request->input('note')), 0, 255)
            : $existing->note;

        DB::transaction(function () use ($id, $existing, $amount, $receivedDate, $note, $walletDelta) {
            DB::table('account_money_received')->where('id', $id)->update([
                'amount' => $amount,
                'received_date' => $receivedDate,
                'note' => $note === '' ? null : $note,
                'updated_at' => DbDates::nowString(),
            ]);

            AccountsMath::applyWalletDelta($existing->employee_id ? (int) $existing->employee_id : null, $walletDelta);
        });

        return response()->json([
            'data' => $this->findAdminMoneyIn($id),
            'walletChange' => $walletDelta,
        ]);
    }

    public function expenses(Request $request): JsonResponse
    {
        $pagination = AccountsMath::parsePagination($request->query('page'), $request->query('pageSize'));
        $pendingApproval = filter_var($request->query('pendingApproval'), FILTER_VALIDATE_BOOLEAN);

        $query = DB::table('account_expenses as e')
            ->leftJoin('employees as emp', 'emp.id', '=', 'e.employee_id')
            ->leftJoin('employees as va', 'va.id', '=', 'e.voided_by_admin_id')
            ->leftJoin('employees as aa', 'aa.id', '=', 'e.approved_by_admin_id')
            ->leftJoin('employees as ca', 'ca.id', '=', 'e.created_by_admin_id')
            ->when($request->query('employeeId'), fn ($q, $v) => $q->where('e.employee_id', (int) $v))
            ->when($request->query('costType'), fn ($q, $v) => $q->where('e.cost_type', $v))
            ->when($request->query('status'), fn ($q, $v) => $q->where('e.status', $v))
            ->when($request->query('paymentSource'), fn ($q, $v) => $q->where('e.payment_source', $v))
            ->when($request->query('linkedRowKey'), fn ($q, $v) => $q->where('e.linked_row_key', $v))
            ->when($request->query('eventSearch'), fn ($q, $v) => $q->where('e.event_client_name_snapshot', 'like', '%'.$v.'%'))
            ->when($request->query('minAmount'), fn ($q, $v) => $q->where('e.total_amount', '>=', (float) $v))
            ->when($request->query('maxAmount'), fn ($q, $v) => $q->where('e.total_amount', '<=', (float) $v));

        if ($pendingApproval) {
            $query->where('e.approved', 0)->where('e.status', 'active');
        } elseif ($request->query('approved') !== null) {
            $query->where('e.approved', filter_var($request->query('approved'), FILTER_VALIDATE_BOOLEAN) ? 1 : 0);
        }

        $dateField = $request->query('dateField') === 'cost' ? 'cost' : 'submitted';
        $dateFrom = DbDates::parseDateOnly($request->query('dateFrom'));
        $dateTo = DbDates::parseDateOnly($request->query('dateTo'));

        if ($dateField === 'submitted') {
            $query->when($dateFrom, fn ($q, $v) => $q->whereDate('e.created_at', '>=', $v))
                ->when($dateTo, fn ($q, $v) => $q->whereDate('e.created_at', '<=', $v));
        }

        // Item-level filters narrow the parent expense via EXISTS.
        $itemFilters = array_filter([
            'vendorId' => $request->query('vendorId'),
            'paymentStatus' => $request->query('paymentStatus'),
            'purposeSearch' => $request->query('purposeSearch'),
            'receipt' => $request->query('receipt'),
        ]);

        if ($itemFilters || ($dateField === 'cost' && ($dateFrom || $dateTo))) {
            $query->whereExists(function ($sub) use ($itemFilters, $dateField, $dateFrom, $dateTo) {
                $sub->select(DB::raw(1))
                    ->from('account_expense_items as i')
                    ->whereColumn('i.expense_id', 'e.id')
                    ->when($itemFilters['vendorId'] ?? null, fn ($q, $v) => $q->where('i.vendor_id', (int) $v))
                    ->when($itemFilters['paymentStatus'] ?? null, fn ($q, $v) => $q->where('i.payment_status', $v))
                    ->when($itemFilters['purposeSearch'] ?? null, fn ($q, $v) => $q->where('i.purpose', 'like', '%'.$v.'%'))
                    ->when(($itemFilters['receipt'] ?? null) === 'with', fn ($q) => $q->whereNotNull('i.receipt_file_url'))
                    ->when(($itemFilters['receipt'] ?? null) === 'without', fn ($q) => $q->whereNull('i.receipt_file_url'));

                if ($dateField === 'cost') {
                    $sub->when($dateFrom, fn ($q, $v) => $q->where('i.cost_date', '>=', $v))
                        ->when($dateTo, fn ($q, $v) => $q->where('i.cost_date', '<=', $v));
                }
            });
        }

        $total = (clone $query)->count();

        $query = match ($request->query('sort')) {
            'oldest' => $query->orderBy('e.id'),
            'highest' => $query->orderByDesc('e.total_amount'),
            'lowest' => $query->orderBy('e.total_amount'),
            'employee' => $query->orderBy('emp.full_name')->orderByDesc('e.id'),
            default => $query->orderByDesc('e.id'),
        };

        $expenses = $query
            ->offset($pagination['skip'])
            ->limit($pagination['take'])
            ->get([
                'e.*', 'emp.full_name as employee_name', 'va.full_name as voided_by_name',
                'aa.full_name as approved_by_name', 'ca.full_name as created_by_admin_name',
            ]);

        $itemsByExpense = $this->itemsByExpense($expenses->pluck('id'));

        // "Still owed" must account for settlements made by other expenses,
        // so it's computed against every active vendor item company-wide.
        $outstanding = AccountsMath::computeVendorOutstandingBills(AccountsMath::activeVendorItems());

        $rows = $expenses->map(function ($expense) use ($itemsByExpense, $outstanding) {
            $items = $itemsByExpense[$expense->id] ?? [];

            $payable = AccountsMath::roundMoney(collect($items)
                ->filter(fn ($item) => $item->vendor_id && $item->payment_status === 'to_pay')
                ->sum(fn ($item) => $outstanding[(string) $item->id] ?? 0));

            return $this->serializeAdminExpense($expense, $items, $payable);
        })->values();

        return response()->json([
            'data' => [
                'rows' => $rows,
                'page' => $pagination['page'],
                'pageSize' => $pagination['pageSize'],
                'total' => $total,
                'totalPages' => (int) ceil($total / $pagination['pageSize']),
                'filteredTotals' => [
                    'recordedCost' => AccountsMath::roundMoney($rows->sum('recordedTotalAmount')),
                    'actuallyPaid' => $pendingApproval ? 0.0 : AccountsMath::roundMoney($rows->sum('walletDeductionAmount')),
                    'stillToPay' => AccountsMath::roundMoney($rows->sum('vendorPayableAmount')),
                ],
            ],
        ]);
    }

    public function expense(int $id): JsonResponse
    {
        $expense = $this->findAdminExpense($id);

        if (! $expense) {
            return response()->json(['message' => 'Expense not found.'], 404);
        }

        return response()->json([
            'data' => [
                'expense' => $this->serializeAdminExpense($expense, $this->itemsByExpense(collect([$id]))[$id] ?? []),
            ],
        ]);
    }

    public function voidExpense(Request $request, int $id): JsonResponse
    {
        $reason = AccountsMath::requireReason($request->input('reason'));

        if (! $reason) {
            return response()->json(['message' => 'A reason for this correction is required.'], 422);
        }

        $expense = DB::table('account_expenses')->where('id', $id)->first();

        if (! $expense) {
            return response()->json(['message' => 'Expense not found.'], 404);
        }

        if ($expense->status === 'void') {
            return response()->json(['message' => 'This expense is already voided.'], 409);
        }

        $items = $this->itemsByExpense(collect([$id]))[$id] ?? [];
        $shaped = $this->shapeForMath($items);

        // Voiding reverses both ledgers: the wallet deduction is refunded and
        // every vendor movement is undone.
        $walletRefund = $expense->approved ? AccountsMath::roundMoney((float) $expense->wallet_deduction_amount) : 0.0;
        $vendorReversal = AccountsMath::negateDeltas(AccountsMath::computeVendorDeltas($shaped));
        $adminId = OfficeAuth::currentId($request);
        $now = DbDates::nowString();

        DB::transaction(function () use ($id, $expense, $reason, $adminId, $now, $walletRefund, $vendorReversal) {
            DB::table('account_expenses')->where('id', $id)->update([
                'status' => 'void',
                'void_reason' => $reason,
                'voided_by_admin_id' => $adminId,
                'voided_at' => $now,
                'updated_at' => $now,
            ]);

            AccountsMath::applyWalletDelta($expense->employee_id ? (int) $expense->employee_id : null, $walletRefund);
            AccountsMath::applyVendorDeltas($vendorReversal);
        });

        return response()->json([
            'data' => $this->serializeAdminExpense($this->findAdminExpense($id), $items),
            'walletChange' => $walletRefund,
        ]);
    }

    public function approveExpense(Request $request, int $id): JsonResponse
    {
        $expense = DB::table('account_expenses')->where('id', $id)->first();

        if (! $expense) {
            return response()->json(['message' => 'Expense not found.'], 404);
        }

        if ($expense->status === 'void') {
            return response()->json(['message' => 'This expense is voided and cannot be approved.'], 409);
        }

        if ($expense->approved) {
            return response()->json(['message' => 'This expense is already approved.'], 409);
        }

        $adminId = OfficeAuth::currentId($request);
        $now = DbDates::nowString();

        // Approval is when the cash actually leaves the employee's wallet.
        $deduction = AccountsMath::roundMoney(-(float) $expense->wallet_deduction_amount);

        DB::transaction(function () use ($id, $expense, $adminId, $now, $deduction) {
            DB::table('account_expenses')->where('id', $id)->update([
                'approved' => 1,
                'approved_by_admin_id' => $adminId,
                'approved_at' => $now,
                'updated_at' => $now,
            ]);

            if ($expense->payment_source === 'employee_wallet') {
                AccountsMath::applyWalletDelta($expense->employee_id ? (int) $expense->employee_id : null, $deduction);
            }
        });

        return response()->json([
            'data' => $this->serializeAdminExpense(
                $this->findAdminExpense($id),
                $this->itemsByExpense(collect([$id]))[$id] ?? []
            ),
        ]);
    }

    public function previewExpenseUpdate(Request $request, int $id): JsonResponse
    {
        $result = $this->computeExpenseUpdate($request, $id);

        if (isset($result['error'])) {
            return response()->json(['message' => $result['error']], $result['status']);
        }

        return response()->json([
            'data' => [
                'walletChange' => $result['walletChange'],
                'vendorChanges' => $result['vendorChanges'],
                'newRecordedTotal' => $result['newTotal'],
                'newWalletDeduction' => $result['newWalletDeduction'],
            ],
        ]);
    }

    public function updateExpense(Request $request, int $id): JsonResponse
    {
        $reason = AccountsMath::requireReason($request->input('reason'));

        if (! $reason) {
            return response()->json(['message' => 'A reason for this correction is required.'], 422);
        }

        $result = $this->computeExpenseUpdate($request, $id);

        if (isset($result['error'])) {
            return response()->json(['message' => $result['error']], $result['status']);
        }

        $expense = $result['expense'];
        $now = DbDates::nowString();

        DB::transaction(function () use ($id, $expense, $result, $now) {
            foreach ($result['items'] as $item) {
                DB::table('account_expense_items')->where('id', $item['id'])->update([
                    'purpose' => $item['purpose'],
                    'cost_date' => $item['costDate'],
                    'quantity' => $item['quantity'],
                    'per_qty_amount' => $item['perQtyAmount'],
                    'total_amount' => $item['totalAmount'],
                    'vendor_id' => $item['vendorId'],
                    'payment_status' => $item['paymentStatus'],
                    'settles_item_id' => $item['settlesItemId'],
                    'settles_all_owed' => $item['settlesAllOwed'] ? 1 : 0,
                    'updated_at' => $now,
                ]);
            }

            DB::table('account_expenses')->where('id', $id)->update([
                'total_amount' => $result['newTotal'],
                'wallet_deduction_amount' => $result['newWalletDeduction'],
                'updated_at' => $now,
            ]);

            AccountsMath::applyWalletDelta(
                $expense->employee_id ? (int) $expense->employee_id : null,
                $result['walletChange']
            );

            AccountsMath::applyVendorDeltas($result['vendorDeltaMap']);
        });

        return response()->json([
            'data' => $this->serializeAdminExpense(
                $this->findAdminExpense($id),
                $this->itemsByExpense(collect([$id]))[$id] ?? []
            ),
            'walletChange' => $result['walletChange'],
            'vendorChanges' => $result['vendorChanges'],
        ]);
    }

    /** Shared by preview and commit so both see identical numbers. */
    private function computeExpenseUpdate(Request $request, int $id): array
    {
        $expense = DB::table('account_expenses')->where('id', $id)->first();

        if (! $expense) {
            return ['error' => 'Expense not found.', 'status' => 404];
        }

        if ($expense->status === 'void') {
            return ['error' => 'This expense is voided and can no longer be edited.', 'status' => 409];
        }

        $rawItems = $request->input('items');

        if (! is_array($rawItems) || ! $rawItems) {
            return ['error' => 'At least one expense item is required.', 'status' => 422];
        }

        $existingItems = collect($this->itemsByExpense(collect([$id]))[$id] ?? [])->keyBy('id');
        $prepared = [];

        foreach (array_values($rawItems) as $index => $raw) {
            $existing = $existingItems->get((int) ($raw['id'] ?? 0));

            if (! $existing) {
                return ['error' => 'Item '.($index + 1).' was not found on this expense.', 'status' => 422];
            }

            $purpose = mb_substr(trim((string) ($raw['purpose'] ?? $existing->purpose)), 0, 190);
            $costDate = DbDates::parseDateOnly($raw['costDate'] ?? $existing->cost_date);
            $quantity = $raw['quantity'] ?? $existing->quantity;
            $perQtyAmount = $raw['perQtyAmount'] ?? $existing->per_qty_amount;

            if ($purpose === '' || ! $costDate
                || ! is_numeric($quantity) || (float) $quantity <= 0
                || ! is_numeric($perQtyAmount) || (float) $perQtyAmount < 0) {
                return ['error' => 'Item '.($index + 1).' is missing required fields.', 'status' => 422];
            }

            $vendorId = array_key_exists('vendorId', $raw)
                ? ($raw['vendorId'] ? (int) $raw['vendorId'] : null)
                : ($existing->vendor_id ? (int) $existing->vendor_id : null);

            $paymentStatus = null;
            $settlesItemId = null;
            $settlesAllOwed = false;

            if ($vendorId) {
                if (! DB::table('vendors')->where('id', $vendorId)->exists()) {
                    return ['error' => 'Item '.($index + 1).' has an invalid vendor.', 'status' => 422];
                }

                $paymentStatus = $raw['paymentStatus'] ?? $existing->payment_status;

                if (! in_array($paymentStatus, ['to_pay', 'paid'], true)) {
                    return ['error' => 'Item '.($index + 1).' needs a payment status (To Pay or Paid).', 'status' => 422];
                }

                if ($paymentStatus === 'paid') {
                    $vendorChanged = $vendorId !== ($existing->vendor_id ? (int) $existing->vendor_id : null);
                    $rawSettles = array_key_exists('settlesItemId', $raw) || $vendorChanged
                        ? ($raw['settlesItemId'] ?? null)
                        : $existing->settles_item_id;

                    $settlement = AccountsMath::resolveSettlementTarget($vendorId, $rawSettles);

                    if (isset($settlement['error'])) {
                        return ['error' => 'Item '.($index + 1).': '.$settlement['error'], 'status' => 422];
                    }

                    $settlesItemId = $settlement['settlesItemId'];
                    $settlesAllOwed = $settlement['settlesAllOwed'];
                }
            }

            $prepared[] = [
                'id' => (int) $existing->id,
                'purpose' => $purpose,
                'costDate' => $costDate,
                'quantity' => AccountsMath::roundMoney($quantity),
                'perQtyAmount' => AccountsMath::roundMoney($perQtyAmount),
                'totalAmount' => AccountsMath::roundMoney((float) $quantity * (float) $perQtyAmount),
                'vendorId' => $vendorId,
                'paymentStatus' => $paymentStatus,
                'settlesItemId' => $settlesItemId,
                'settlesAllOwed' => $settlesAllOwed,
            ];
        }

        $oldShaped = $this->shapeForMath($existingItems->values()->all());
        $oldVendorDeltas = AccountsMath::computeVendorDeltas($oldShaped);
        $newVendorDeltas = AccountsMath::computeVendorDeltas($prepared);

        // Net movement = new effect minus the effect being replaced.
        $vendorDeltaMap = [];

        foreach (array_unique(array_merge(array_keys($oldVendorDeltas), array_keys($newVendorDeltas))) as $vendorId) {
            $delta = AccountsMath::roundMoney(
                ($newVendorDeltas[$vendorId] ?? 0) - ($oldVendorDeltas[$vendorId] ?? 0)
            );

            if ($delta) {
                $vendorDeltaMap[$vendorId] = $delta;
            }
        }

        $newTotal = AccountsMath::roundMoney(array_sum(array_column($prepared, 'totalAmount')));
        $newWalletDeduction = AccountsMath::computeWalletDeduction($prepared);

        // The wallet has only been charged once the expense is approved.
        $walletChange = $expense->approved && $expense->payment_source === 'employee_wallet'
            ? AccountsMath::roundMoney((float) $expense->wallet_deduction_amount - $newWalletDeduction)
            : 0.0;

        return [
            'expense' => $expense,
            'items' => $prepared,
            'newTotal' => $newTotal,
            'newWalletDeduction' => $newWalletDeduction,
            'walletChange' => $walletChange,
            'vendorDeltaMap' => $vendorDeltaMap,
            'vendorChanges' => collect($vendorDeltaMap)
                ->map(fn ($delta, $vendorId) => ['vendorId' => (string) $vendorId, 'delta' => $delta])
                ->values()
                ->all(),
        ];
    }

    private function shapeForMath(array $items): array
    {
        return collect($items)->map(fn ($item) => [
            'id' => $item->id,
            'vendorId' => $item->vendor_id,
            'paymentStatus' => $item->payment_status,
            'totalAmount' => $item->total_amount,
            'settlesItemId' => $item->settles_item_id,
            'settlesAllOwed' => $item->settles_all_owed,
        ])->all();
    }

    /** @return array<string,float> [employeeId => still payable] */
    private function stillPayableByEmployee($items): array
    {
        $shaped = $items->map(fn ($item) => [
            'id' => $item->id,
            'vendorId' => $item->vendor_id,
            'paymentStatus' => $item->payment_status,
            'totalAmount' => $item->total_amount,
            'settlesItemId' => $item->settles_item_id,
            'settlesAllOwed' => $item->settles_all_owed,
        ])->all();

        $outstanding = AccountsMath::computeVendorOutstandingBills($shaped);
        $byEmployee = [];

        foreach ($items as $item) {
            if (! $item->vendor_id || $item->payment_status !== 'to_pay' || ! $item->employee_id) {
                continue;
            }

            $remaining = $outstanding[(string) $item->id] ?? 0;

            if ($remaining) {
                $key = (string) $item->employee_id;
                $byEmployee[$key] = AccountsMath::roundMoney(($byEmployee[$key] ?? 0) + $remaining);
            }
        }

        return $byEmployee;
    }

    private function findAdminExpense(int $id): ?object
    {
        return DB::table('account_expenses as e')
            ->leftJoin('employees as emp', 'emp.id', '=', 'e.employee_id')
            ->leftJoin('employees as va', 'va.id', '=', 'e.voided_by_admin_id')
            ->leftJoin('employees as aa', 'aa.id', '=', 'e.approved_by_admin_id')
            ->leftJoin('employees as ca', 'ca.id', '=', 'e.created_by_admin_id')
            ->where('e.id', $id)
            ->first([
                'e.*', 'emp.full_name as employee_name', 'va.full_name as voided_by_name',
                'aa.full_name as approved_by_name', 'ca.full_name as created_by_admin_name',
            ]);
    }

    private function findAdminMoneyIn(int $id): array
    {
        $row = DB::table('account_money_received as m')
            ->leftJoin('employees as e', 'e.id', '=', 'm.employee_id')
            ->leftJoin('employees as a', 'a.id', '=', 'm.created_by_admin_id')
            ->where('m.id', $id)
            ->first(['m.*', 'e.full_name as employee_name', 'a.full_name as admin_name']);

        return $this->serializeAdminMoneyIn($row);
    }

    private function serializeAdminMoneyIn(object $row): array
    {
        return [
            'id' => (string) $row->id,
            'employeeId' => $row->employee_id ? (string) $row->employee_id : null,
            'employeeName' => $row->employee_name ?? null,
            'amount' => (float) $row->amount,
            'receivedDate' => DbDates::formatDateOnly($row->received_date),
            'note' => $row->note,
            'source' => $row->source,
            'createdByAdminName' => $row->admin_name ?? null,
            'createdAt' => DbDates::formatDateTime($row->created_at),
            'updatedAt' => DbDates::formatDateTime($row->updated_at),
            'wasEdited' => $this->wasEdited($row),
        ];
    }

    private function serializeAdminExpense(object $expense, array $items, ?float $vendorPayable = null): array
    {
        $vendorPayable ??= AccountsMath::roundMoney(collect($items)
            ->filter(fn ($item) => $item->vendor_id && $item->payment_status === 'to_pay')
            ->sum('total_amount'));

        return [
            'id' => (string) $expense->id,
            'employeeId' => $expense->employee_id ? (string) $expense->employee_id : null,
            'employeeName' => $expense->employee_name ?? null,
            'costType' => $expense->cost_type,
            'linkedRowKey' => $expense->linked_row_key,
            'eventClientName' => $expense->event_client_name_snapshot,
            'eventDate' => DbDates::formatDateOnly($expense->event_date_snapshot),
            'recordedTotalAmount' => (float) $expense->total_amount,
            'walletDeductionAmount' => (float) $expense->wallet_deduction_amount,
            'vendorPayableAmount' => $vendorPayable,
            'paymentSource' => $expense->payment_source,
            'status' => $expense->status,
            'voidReason' => $expense->void_reason,
            'voidedByName' => $expense->voided_by_name ?? null,
            'voidedAt' => DbDates::formatDateTime($expense->voided_at),
            'approved' => (bool) $expense->approved,
            'approvedByName' => $expense->approved_by_name ?? null,
            'approvedAt' => DbDates::formatDateTime($expense->approved_at),
            'createdByAdminName' => $expense->created_by_admin_name ?? null,
            'createdAt' => DbDates::formatDateTime($expense->created_at),
            'updatedAt' => DbDates::formatDateTime($expense->updated_at),
            'wasEdited' => $this->wasEdited($expense),
            'items' => array_map(fn ($item) => $this->serializeItem($item), $items),
        ];
    }
}
