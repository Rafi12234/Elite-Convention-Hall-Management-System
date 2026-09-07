<?php

namespace App\Http\Controllers\Api\Accounts;

use App\Http\Controllers\Controller;
use App\Support\Office\AccountsMath;
use App\Support\Office\DbDates;
use App\Support\Office\OfficeAuth;
use App\Support\Office\SheetLookup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Employee wallet, expenses and vendor payments.
 * Ported from MME's Accounts/backend/controllers/accountsController.js.
 */
class AccountsController extends Controller
{
    use SerializesAccounts;

    public function summary(Request $request): JsonResponse
    {
        $employeeId = OfficeAuth::currentId($request);

        $currentBalance = (float) (DB::table('account_wallets')
            ->where('employee_id', $employeeId)
            ->value('current_balance') ?? 0);

        $moneyReceived = DB::table('account_money_received as m')
            ->leftJoin('employees as a', 'a.id', '=', 'm.created_by_admin_id')
            ->where('m.employee_id', $employeeId)
            ->orderByDesc('m.id')
            ->get(['m.*', 'a.full_name as admin_name']);

        $expenses = DB::table('account_expenses')
            ->where('employee_id', $employeeId)
            ->orderByDesc('id')
            ->get();

        $itemsByExpense = $this->itemsByExpense($expenses->pluck('id'));

        // Unapproved expenses are shown as a pending hit against the wallet.
        $pendingDeduction = AccountsMath::roundMoney(
            $expenses->where('status', 'active')->where('approved', 0)->sum('wallet_deduction_amount')
        );

        $vendorPayments = [];

        foreach ($expenses as $expense) {
            foreach ($itemsByExpense[$expense->id] ?? [] as $item) {
                if ($item->vendor_id) {
                    $vendorPayments[] = $this->serializeVendorPayment($item, $expense);
                }
            }
        }

        usort($vendorPayments, fn ($a, $b) => (int) $b['id'] <=> (int) $a['id']);

        // The expenses tab shows settled spend only; unpaid vendor bills live
        // in the vendor payments tab instead.
        $expenseRows = $expenses
            ->filter(function ($expense) use ($itemsByExpense) {
                if (! $expense->approved) {
                    return false;
                }

                $items = $itemsByExpense[$expense->id] ?? [];

                return collect($items)->contains(
                    fn ($item) => ! ($item->vendor_id && $item->payment_status === 'to_pay')
                );
            })
            ->map(fn ($expense) => $this->serializeExpense($expense, $itemsByExpense[$expense->id] ?? []))
            ->values();

        return response()->json([
            'data' => [
                'currentBalance' => $currentBalance,
                'pendingDeduction' => $pendingDeduction,
                'moneyReceived' => $moneyReceived->map(fn ($row) => $this->serializeMoneyIn($row))->values(),
                'expenses' => $expenseRows,
                'vendorPayments' => $vendorPayments,
            ],
        ]);
    }

    /** Confirmed events booked through us, for the event-cost picker. */
    public function bookedEvents(): JsonResponse
    {
        $sheetId = SheetLookup::defaultSheetId();

        if (! $sheetId) {
            return response()->json(['data' => []]);
        }

        $rowKeys = DB::table('client_finalizations')->pluck('linked_row_key');

        if ($rowKeys->isEmpty()) {
            return response()->json(['data' => []]);
        }

        // The flags live on the row's Event Date cell.
        $eventCells = DB::table('sheet_cells as sc')
            ->join('sheet_rows as sr', 'sr.id', '=', 'sc.row_id')
            ->join('sheet_columns as col', 'col.id', '=', 'sc.column_id')
            ->where('sr.sheet_id', $sheetId)
            ->whereIn('sr.row_key', $rowKeys)
            ->where('col.column_name', 'Event Date')
            ->where('sc.booked_from_mme', 1)
            ->where('sc.already_booked', 0)
            ->get(['sr.row_key', 'sc.value_date']);

        $clientNames = SheetLookup::clientNames($sheetId, $eventCells->pluck('row_key'));

        $events = $eventCells
            ->map(fn ($cell) => [
                'rowKey' => $cell->row_key,
                'clientName' => $clientNames[$cell->row_key] ?? '',
                'eventDate' => DbDates::formatDateOnly($cell->value_date),
            ])
            ->sortByDesc('eventDate')
            ->values();

        return response()->json(['data' => $events]);
    }

    public function vendors(): JsonResponse
    {
        $vendors = DB::table('vendors')->where('is_active', 1)->orderBy('name')->get();
        $stillOwed = AccountsMath::computeVendorStillOwed(AccountsMath::activeVendorItems());

        return response()->json([
            'data' => $vendors->map(fn ($vendor) => [
                'id' => (string) $vendor->id,
                'name' => $vendor->name,
                'category' => $vendor->category,
                'isActive' => (bool) $vendor->is_active,
                'currentBalance' => -($stillOwed[(string) $vendor->id] ?? 0),
            ])->values(),
        ]);
    }

    public function vendorProfile(int $id): JsonResponse
    {
        $vendor = DB::table('vendors')->where('id', $id)->first();

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
                'e.cost_type', 'e.event_client_name_snapshot', 'emp.full_name as employee_name',
            ]);

        return response()->json([
            'data' => [
                'vendor' => [
                    'id' => (string) $vendor->id,
                    'name' => $vendor->name,
                    'category' => $vendor->category,
                    'isActive' => (bool) $vendor->is_active,
                    'currentBalance' => -($stillOwed[(string) $id] ?? 0),
                ],
                'transactions' => $transactions->map(fn ($item) => [
                    'id' => (string) $item->id,
                    'purpose' => $item->purpose,
                    'costDate' => DbDates::formatDateOnly($item->cost_date),
                    'totalAmount' => (float) $item->total_amount,
                    'paymentStatus' => $item->payment_status,
                    'costType' => $item->cost_type,
                    'settlesItemId' => $item->settles_item_id ? (string) $item->settles_item_id : null,
                    'settlesAllOwed' => (bool) $item->settles_all_owed,
                    'eventClientName' => $item->event_client_name_snapshot ?: null,
                    'employeeName' => $item->employee_name,
                    'createdAt' => DbDates::formatDateTime($item->created_at),
                ])->values(),
            ],
        ]);
    }

    public function vendorOutstanding(int $id): JsonResponse
    {
        if (! DB::table('vendors')->where('id', $id)->exists()) {
            return response()->json(['message' => 'Vendor not found.'], 404);
        }

        return response()->json(['data' => AccountsMath::listVendorOutstandingBills($id)]);
    }

    public function payVendor(Request $request, int $id): JsonResponse
    {
        $amount = $request->input('amount');

        if (! is_numeric($amount) || (float) $amount <= 0) {
            return response()->json(['message' => 'Enter a valid amount greater than 0.'], 422);
        }

        $vendor = DB::table('vendors')->where('id', $id)->where('is_active', 1)->first();

        if (! $vendor) {
            return response()->json(['message' => 'Vendor not found.'], 404);
        }

        $settlement = AccountsMath::resolveSettlementTarget($id, $request->input('settlesItemId'));

        if (isset($settlement['error'])) {
            return response()->json(['message' => $settlement['error']], 422);
        }

        $amount = AccountsMath::roundMoney($amount);
        $paidOn = DbDates::parseDateOnly($request->input('paidOn')) ?? DbDates::todayString();
        $note = mb_substr(trim((string) $request->input('note')), 0, 190);
        $employeeId = OfficeAuth::currentId($request);
        $now = DbDates::nowString();

        DB::transaction(function () use ($id, $vendor, $amount, $paidOn, $note, $settlement, $employeeId, $now) {
            $expenseId = DB::table('account_expenses')->insertGetId([
                'employee_id' => $employeeId,
                'cost_type' => 'regular',
                'total_amount' => $amount,
                'wallet_deduction_amount' => $amount,
                'payment_source' => 'employee_wallet',
                'status' => 'active',
                'approved' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('account_expense_items')->insert([
                'expense_id' => $expenseId,
                'purpose' => $note !== '' ? $note : 'Payment to '.$vendor->name,
                'cost_date' => $paidOn,
                'quantity' => 1,
                'per_qty_amount' => $amount,
                'total_amount' => $amount,
                'vendor_id' => $id,
                'payment_status' => 'paid',
                'settles_item_id' => $settlement['settlesItemId'],
                'settles_all_owed' => $settlement['settlesAllOwed'] ? 1 : 0,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            AccountsMath::applyVendorDeltas([(string) $id => $amount]);
        });

        $stillOwed = AccountsMath::computeVendorStillOwed(AccountsMath::activeVendorItems($id));

        return response()->json([
            'data' => [
                'vendor' => [
                    'id' => (string) $vendor->id,
                    'name' => $vendor->name,
                    'category' => $vendor->category,
                    'isActive' => (bool) $vendor->is_active,
                    'currentBalance' => -($stillOwed[(string) $id] ?? 0),
                ],
                'currentBalance' => (float) (DB::table('account_wallets')
                    ->where('employee_id', $employeeId)
                    ->value('current_balance') ?? 0),
            ],
        ], 201);
    }

    public function storeMoneyReceived(Request $request): JsonResponse
    {
        $amount = $request->input('amount');

        if (! is_numeric($amount) || (float) $amount <= 0) {
            return response()->json(['message' => 'Enter a valid amount greater than 0.'], 422);
        }

        $receivedDate = DbDates::parseDateOnly($request->input('receivedDate'));

        if (! $receivedDate) {
            return response()->json(['message' => 'Received date is required.'], 422);
        }

        $amount = AccountsMath::roundMoney($amount);
        $note = mb_substr(trim((string) $request->input('note')), 0, 255);
        $employeeId = OfficeAuth::currentId($request);
        $now = DbDates::nowString();

        $id = DB::transaction(function () use ($employeeId, $amount, $receivedDate, $note, $now) {
            $id = DB::table('account_money_received')->insertGetId([
                'employee_id' => $employeeId,
                'amount' => $amount,
                'received_date' => $receivedDate,
                'note' => $note === '' ? null : $note,
                'source' => 'employee',
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            AccountsMath::applyWalletDelta($employeeId, $amount);

            return $id;
        });

        $entry = DB::table('account_money_received as m')
            ->leftJoin('employees as a', 'a.id', '=', 'm.created_by_admin_id')
            ->where('m.id', $id)
            ->first(['m.*', 'a.full_name as admin_name']);

        return response()->json([
            'data' => [
                'entry' => $this->serializeMoneyIn($entry),
                'currentBalance' => (float) (DB::table('account_wallets')
                    ->where('employee_id', $employeeId)
                    ->value('current_balance') ?? 0),
            ],
        ], 201);
    }

    public function storeExpense(Request $request): JsonResponse
    {
        $costType = $request->input('costType');

        if (! in_array($costType, ['event', 'regular'], true)) {
            return response()->json(['message' => "costType must be 'event' or 'regular'."], 422);
        }

        $rawItems = $request->input('items');

        if (is_string($rawItems)) {
            $rawItems = json_decode($rawItems, true);
        }

        if (! is_array($rawItems) || ! $rawItems) {
            return response()->json(['message' => 'At least one expense item is required.'], 422);
        }

        $linkedRowKey = null;
        $eventSnapshot = null;
        $eventVendorId = null;

        if ($costType === 'event') {
            $linkedRowKey = (string) $request->input('linkedRowKey');

            if (! SheetLookup::isValidRowKey($linkedRowKey)) {
                return response()->json(['message' => 'Select a confirmed event.'], 422);
            }

            if (! DB::table('client_finalizations')->where('linked_row_key', $linkedRowKey)->exists()) {
                return response()->json(['message' => 'That event is not a confirmed booked event.'], 404);
            }

            $eventVendorId = $request->input('vendorId');

            if (! $eventVendorId) {
                return response()->json(['message' => 'Select which vendor this bill is for.'], 422);
            }

            $eventVendorId = (int) $eventVendorId;

            if (! DB::table('vendors')->where('id', $eventVendorId)->where('is_active', 1)->exists()) {
                return response()->json(['message' => 'Select a valid, active vendor.'], 422);
            }

            $sheetId = SheetLookup::defaultSheetId();
            $eventSnapshot = [
                'clientName' => SheetLookup::clientName($sheetId, $linkedRowKey),
                'eventDate' => SheetLookup::eventDate($sheetId, $linkedRowKey),
            ];
        }

        $prepared = $this->prepareNewItems($request, $rawItems, $costType, $eventVendorId);

        if (isset($prepared['error'])) {
            return response()->json(['message' => $prepared['error']], 422);
        }

        $items = $prepared['items'];
        $employeeId = OfficeAuth::currentId($request);
        $totalAmount = AccountsMath::roundMoney(array_sum(array_column($items, 'totalAmount')));
        $walletDeduction = AccountsMath::computeWalletDeduction($items);
        $vendorDeltas = AccountsMath::computeVendorDeltas($items);
        $now = DbDates::nowString();

        $expenseId = DB::transaction(function () use (
            $employeeId, $costType, $linkedRowKey, $eventSnapshot, $totalAmount,
            $walletDeduction, $items, $vendorDeltas, $now
        ) {
            $expenseId = DB::table('account_expenses')->insertGetId([
                'employee_id' => $employeeId,
                'cost_type' => $costType,
                'linked_row_key' => $linkedRowKey,
                'event_client_name_snapshot' => $eventSnapshot['clientName'] ?? null,
                'event_date_snapshot' => $eventSnapshot['eventDate'] ?? null,
                'total_amount' => $totalAmount,
                'wallet_deduction_amount' => $walletDeduction,
                'payment_source' => 'employee_wallet',
                'status' => 'active',
                'approved' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            foreach ($items as $item) {
                DB::table('account_expense_items')->insert([
                    'expense_id' => $expenseId,
                    'purpose' => $item['purpose'],
                    'cost_date' => $item['costDate'],
                    'quantity' => $item['quantity'],
                    'per_qty_amount' => $item['perQtyAmount'],
                    'total_amount' => $item['totalAmount'],
                    'receipt_stored_file_name' => $item['receiptStoredFileName'],
                    'receipt_original_file_name' => $item['receiptOriginalFileName'],
                    'receipt_file_url' => $item['receiptFileUrl'],
                    'receipt_file_size_bytes' => $item['receiptFileSizeBytes'],
                    'vendor_id' => $item['vendorId'],
                    'payment_status' => $item['paymentStatus'],
                    'settles_item_id' => $item['settlesItemId'],
                    'settles_all_owed' => $item['settlesAllOwed'] ? 1 : 0,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            AccountsMath::applyVendorDeltas($vendorDeltas);

            return $expenseId;
        });

        $expense = DB::table('account_expenses')->where('id', $expenseId)->first();
        $expenseItems = $this->itemsByExpense(collect([$expenseId]))[$expenseId] ?? [];

        $vendorPayments = collect($expenseItems)
            ->filter(fn ($item) => $item->vendor_id)
            ->map(fn ($item) => $this->serializeVendorPayment($item, $expense))
            ->values();

        return response()->json([
            'data' => [
                'expense' => $this->serializeExpense($expense, $expenseItems),
                'vendorPayments' => $vendorPayments,
                'currentBalance' => (float) (DB::table('account_wallets')
                    ->where('employee_id', $employeeId)
                    ->value('current_balance') ?? 0),
            ],
        ], 201);
    }

    /** @return array{items: array}|array{error: string} */
    private function prepareNewItems(Request $request, array $rawItems, string $costType, ?int $eventVendorId): array
    {
        $items = [];

        foreach (array_values($rawItems) as $index => $raw) {
            $purpose = mb_substr(trim((string) ($raw['purpose'] ?? '')), 0, 190);
            $costDate = DbDates::parseDateOnly($raw['costDate'] ?? null);
            $quantity = $raw['quantity'] ?? null;
            $perQtyAmount = $raw['perQtyAmount'] ?? null;

            if ($purpose === '' || ! $costDate
                || ! is_numeric($quantity) || (float) $quantity <= 0
                || ! is_numeric($perQtyAmount) || (float) $perQtyAmount < 0) {
                return ['error' => 'Item '.($index + 1).' is missing required fields.'];
            }

            $vendorId = null;
            $paymentStatus = null;
            $settlesItemId = null;
            $settlesAllOwed = false;

            if ($costType === 'event') {
                // The whole event bill belongs to one vendor and is unpaid.
                $vendorId = $eventVendorId;
                $paymentStatus = 'to_pay';
            } elseif (! empty($raw['vendorId'])) {
                $vendorId = (int) $raw['vendorId'];

                if (! DB::table('vendors')->where('id', $vendorId)->where('is_active', 1)->exists()) {
                    return ['error' => 'Item '.($index + 1).' has an invalid or inactive vendor.'];
                }

                $paymentStatus = $raw['paymentStatus'] ?? null;

                if (! in_array($paymentStatus, ['to_pay', 'paid'], true)) {
                    return ['error' => 'Item '.($index + 1).' needs a payment status (To Pay or Paid).'];
                }

                if ($paymentStatus === 'paid') {
                    $settlement = AccountsMath::resolveSettlementTarget($vendorId, $raw['settlesItemId'] ?? null);

                    if (isset($settlement['error'])) {
                        return ['error' => 'Item '.($index + 1).': '.$settlement['error']];
                    }

                    $settlesItemId = $settlement['settlesItemId'];
                    $settlesAllOwed = $settlement['settlesAllOwed'];
                }
            }

            $receipt = $this->storeReceipt($request, $index);

            if (isset($receipt['error'])) {
                return ['error' => $receipt['error']];
            }

            $items[] = [
                'purpose' => $purpose,
                'costDate' => $costDate,
                'quantity' => AccountsMath::roundMoney($quantity),
                'perQtyAmount' => AccountsMath::roundMoney($perQtyAmount),
                'totalAmount' => AccountsMath::roundMoney((float) $quantity * (float) $perQtyAmount),
                'vendorId' => $vendorId,
                'paymentStatus' => $paymentStatus,
                'settlesItemId' => $settlesItemId,
                'settlesAllOwed' => $settlesAllOwed,
                'receiptStoredFileName' => $receipt['storedFileName'],
                'receiptOriginalFileName' => $receipt['originalFileName'],
                'receiptFileUrl' => $receipt['fileUrl'],
                'receiptFileSizeBytes' => $receipt['fileSizeBytes'],
            ];
        }

        return ['items' => $items];
    }
}
