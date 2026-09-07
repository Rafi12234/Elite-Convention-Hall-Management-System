<?php

namespace App\Support\Office;

use Illuminate\Support\Facades\DB;

/**
 * Money and vendor-settlement maths for the Accounts module.
 * Ported from MME's Accounts/backend/utils/accountsShared.js.
 *
 * Sign convention for vendor balances: negative = we owe the vendor,
 * positive = we have paid/advanced beyond what is owed.
 */
class AccountsMath
{
    public const SETTLE_ALL_SENTINEL = 'ALL';
    public const DEFAULT_PAGE_SIZE = 50;
    public const MAX_PAGE_SIZE = 200;

    /** decimal(12,2) precision — applied before every store/aggregate. */
    public static function roundMoney(mixed $value): float
    {
        return round((float) ($value ?: 0), 2);
    }

    /**
     * Cash that actually leaves the wallet. Unpaid vendor bills ("to_pay")
     * are liabilities only, so they are excluded.
     *
     * @param  array<int,array>  $items
     */
    public static function computeWalletDeduction(array $items): float
    {
        $sum = 0.0;

        foreach ($items as $item) {
            if (! empty($item['vendorId']) && ($item['paymentStatus'] ?? null) === 'to_pay') {
                continue;
            }

            $sum += (float) $item['totalAmount'];
        }

        return static::roundMoney($sum);
    }

    /**
     * Per-vendor balance movement: "to_pay" increases what we owe (negative),
     * "paid" reduces it (positive).
     *
     * @return array<string,float> [vendorId => delta]
     */
    public static function computeVendorDeltas(array $items): array
    {
        $deltas = [];

        foreach ($items as $item) {
            if (empty($item['vendorId'])) {
                continue;
            }

            $key = (string) $item['vendorId'];
            $amount = (float) $item['totalAmount'];
            $delta = ($item['paymentStatus'] ?? null) === 'paid' ? $amount : -$amount;

            $deltas[$key] = static::roundMoney(($deltas[$key] ?? 0) + $delta);
        }

        return $deltas;
    }

    /** Flips every sign — used when reversing an effect (void/edit). */
    public static function negateDeltas(array $deltas): array
    {
        return array_map(fn ($delta) => static::roundMoney(-$delta), $deltas);
    }

    /**
     * The core settlement algorithm: how much of each "to_pay" bill is still
     * outstanding after every targeted and sweep payment is applied.
     *
     * @return array<string,float> [billItemId => remaining] (only > 0)
     */
    public static function computeVendorOutstandingBills(array $items): array
    {
        $bills = [];

        foreach ($items as $item) {
            if (! empty($item['vendorId']) && ($item['paymentStatus'] ?? null) === 'to_pay') {
                $bills[(string) $item['id']] = [
                    'vendorId' => (string) $item['vendorId'],
                    'remaining' => (float) $item['totalAmount'],
                ];
            }
        }

        // Payments that name a specific bill reduce only that bill.
        foreach ($items as $item) {
            if (empty($item['vendorId'])
                || ($item['paymentStatus'] ?? null) !== 'paid'
                || empty($item['settlesItemId'])) {
                continue;
            }

            $target = (string) $item['settlesItemId'];

            if (! isset($bills[$target])) {
                continue;
            }

            $bills[$target]['remaining'] = static::roundMoney(
                $bills[$target]['remaining'] - (float) $item['totalAmount']
            );
        }

        // Sweep payments clear the vendor's oldest bills first. The sweeps
        // themselves are applied oldest-first so they cascade in sequence.
        $sweeps = array_values(array_filter($items, fn ($item) => ! empty($item['vendorId'])
            && ($item['paymentStatus'] ?? null) === 'paid'
            && ! empty($item['settlesAllOwed'])));

        usort($sweeps, fn ($a, $b) => (int) $a['id'] <=> (int) $b['id']);

        foreach ($sweeps as $payment) {
            $remainingPayment = (float) $payment['totalAmount'];
            $vendorKey = (string) $payment['vendorId'];

            $vendorBillIds = array_keys(array_filter(
                $bills,
                fn ($bill) => $bill['vendorId'] === $vendorKey
            ));
            usort($vendorBillIds, fn ($a, $b) => (int) $a <=> (int) $b);

            foreach ($vendorBillIds as $billId) {
                if ($remainingPayment <= 0) {
                    break;
                }

                if ($bills[$billId]['remaining'] <= 0) {
                    continue;
                }

                $applied = min($bills[$billId]['remaining'], $remainingPayment);
                $bills[$billId]['remaining'] = static::roundMoney($bills[$billId]['remaining'] - $applied);
                $remainingPayment = static::roundMoney($remainingPayment - $applied);
            }
        }

        $remainingById = [];

        foreach ($bills as $billId => $bill) {
            $clamped = max(0, static::roundMoney($bill['remaining']));

            if ($clamped > 0) {
                $remainingById[$billId] = $clamped;
            }
        }

        return $remainingById;
    }

    /** @return array<string,float> [vendorId => total still owed] */
    public static function computeVendorStillOwed(array $items): array
    {
        $remainingById = static::computeVendorOutstandingBills($items);
        $stillOwedBy = [];

        foreach ($items as $item) {
            if (empty($item['vendorId']) || ($item['paymentStatus'] ?? null) !== 'to_pay') {
                continue;
            }

            $remaining = $remainingById[(string) $item['id']] ?? null;

            if (! $remaining) {
                continue;
            }

            $key = (string) $item['vendorId'];
            $stillOwedBy[$key] = static::roundMoney(($stillOwedBy[$key] ?? 0) + $remaining);
        }

        return $stillOwedBy;
    }

    /** Must be called inside a transaction. */
    public static function applyWalletDelta(?int $employeeId, float $delta): void
    {
        if (! $employeeId || ! $delta) {
            return;
        }

        static::incrementBalance('account_wallets', 'employee_id', $employeeId, $delta);
    }

    /** Must be called inside a transaction. */
    public static function applyVendorDeltas(array $deltas): void
    {
        foreach ($deltas as $vendorId => $delta) {
            if (! $delta) {
                continue;
            }

            static::incrementBalance('vendor_balances', 'vendor_id', (int) $vendorId, $delta);
        }
    }

    private static function incrementBalance(string $table, string $column, int $id, float $delta): void
    {
        $exists = DB::table($table)->where($column, $id)->exists();

        if ($exists) {
            DB::table($table)->where($column, $id)->update([
                'current_balance' => DB::raw('current_balance + '.static::roundMoney($delta)),
                'updated_at' => now(),
            ]);
        } else {
            DB::table($table)->insert([
                $column => $id,
                'current_balance' => static::roundMoney($delta),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Validates a "which bill does this payment settle?" reference.
     *
     * @return array{settlesItemId: ?int, settlesAllOwed: bool}|array{error: string}
     */
    public static function resolveSettlementTarget(int $vendorId, mixed $rawSettlesItemId): array
    {
        if ($rawSettlesItemId === null || $rawSettlesItemId === '') {
            return ['settlesItemId' => null, 'settlesAllOwed' => false];
        }

        if ($rawSettlesItemId === self::SETTLE_ALL_SENTINEL) {
            if (! static::listVendorOutstandingBills($vendorId)) {
                return ['error' => 'This vendor has no outstanding bills to settle.'];
            }

            return ['settlesItemId' => null, 'settlesAllOwed' => true];
        }

        if (! is_numeric($rawSettlesItemId)) {
            return ['error' => 'Invalid bill reference.'];
        }

        $target = DB::table('account_expense_items as i')
            ->join('account_expenses as e', 'e.id', '=', 'i.expense_id')
            ->where('i.id', (int) $rawSettlesItemId)
            ->where('i.vendor_id', $vendorId)
            ->where('i.payment_status', 'to_pay')
            ->where('e.status', 'active')
            ->first(['i.id']);

        if (! $target) {
            return ['error' => 'That bill is no longer available to settle.'];
        }

        return ['settlesItemId' => (int) $target->id, 'settlesAllOwed' => false];
    }

    /** Every still-open "to_pay" bill for a vendor, newest first. */
    public static function listVendorOutstandingBills(int $vendorId): array
    {
        $items = DB::table('account_expense_items as i')
            ->join('account_expenses as e', 'e.id', '=', 'i.expense_id')
            ->where('i.vendor_id', $vendorId)
            ->where('e.status', 'active')
            ->get([
                'i.id', 'i.purpose', 'i.cost_date', 'i.total_amount', 'i.payment_status',
                'i.settles_item_id', 'i.settles_all_owed',
                'e.cost_type', 'e.event_client_name_snapshot',
            ]);

        $remainingById = static::computeVendorOutstandingBills(
            $items->map(fn ($item) => [
                'id' => $item->id,
                'vendorId' => $vendorId,
                'paymentStatus' => $item->payment_status,
                'totalAmount' => $item->total_amount,
                'settlesItemId' => $item->settles_item_id,
                'settlesAllOwed' => $item->settles_all_owed,
            ])->all()
        );

        return $items
            ->filter(fn ($item) => $item->payment_status === 'to_pay'
                && isset($remainingById[(string) $item->id]))
            ->map(fn ($item) => [
                'id' => (string) $item->id,
                'purpose' => $item->purpose,
                'costDate' => DbDates::formatDateOnly($item->cost_date),
                'costType' => $item->cost_type,
                'eventClientName' => $item->event_client_name_snapshot ?: null,
                'originalAmount' => (float) $item->total_amount,
                'stillOwed' => $remainingById[(string) $item->id],
            ])
            ->sortByDesc(fn ($item) => (int) $item['id'])
            ->values()
            ->all();
    }

    /** All active vendor-linked items company-wide, shaped for the math above. */
    public static function activeVendorItems(?int $vendorId = null): array
    {
        return DB::table('account_expense_items as i')
            ->join('account_expenses as e', 'e.id', '=', 'i.expense_id')
            ->whereNotNull('i.vendor_id')
            ->where('e.status', 'active')
            ->when($vendorId, fn ($q) => $q->where('i.vendor_id', $vendorId))
            ->get([
                'i.id', 'i.vendor_id', 'i.payment_status', 'i.total_amount',
                'i.settles_item_id', 'i.settles_all_owed',
            ])
            ->map(fn ($item) => [
                'id' => $item->id,
                'vendorId' => $item->vendor_id,
                'paymentStatus' => $item->payment_status,
                'totalAmount' => $item->total_amount,
                'settlesItemId' => $item->settles_item_id,
                'settlesAllOwed' => $item->settles_all_owed,
            ])
            ->all();
    }

    /** @return array{page:int,pageSize:int,skip:int,take:int} */
    public static function parsePagination(mixed $page, mixed $pageSize): array
    {
        $page = max(1, (int) ($page ?: 1));
        $pageSize = (int) ($pageSize ?: self::DEFAULT_PAGE_SIZE);
        $pageSize = max(1, min($pageSize, self::MAX_PAGE_SIZE));

        return [
            'page' => $page,
            'pageSize' => $pageSize,
            'skip' => ($page - 1) * $pageSize,
            'take' => $pageSize,
        ];
    }

    /** Admin corrections must carry an audit reason. */
    public static function requireReason(mixed $raw): ?string
    {
        $reason = trim((string) $raw);

        return mb_strlen($reason) < 3 ? null : mb_substr($reason, 0, 500);
    }
}
