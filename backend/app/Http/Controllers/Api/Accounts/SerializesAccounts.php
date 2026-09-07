<?php

namespace App\Http\Controllers\Api\Accounts;

use App\Support\Office\AccountsMath;
use App\Support\Office\DbDates;
use App\Support\Office\OfficeStorage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

/**
 * Response shapes and receipt handling shared by the employee and admin
 * Accounts controllers, matching MME's serializers field-for-field.
 */
trait SerializesAccounts
{
    private const ALLOWED_RECEIPT_MIMES = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
    ];

    private const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;

    /** @return array<int,array<int,object>> [expenseId => items] */
    protected function itemsByExpense($expenseIds): array
    {
        if (collect($expenseIds)->isEmpty()) {
            return [];
        }

        return DB::table('account_expense_items as i')
            ->leftJoin('vendors as v', 'v.id', '=', 'i.vendor_id')
            ->whereIn('i.expense_id', $expenseIds)
            ->orderBy('i.id')
            ->get(['i.*', 'v.name as vendor_name'])
            ->groupBy('expense_id')
            ->map(fn ($items) => $items->all())
            ->all();
    }

    protected function serializeMoneyIn(object $row): array
    {
        return [
            'id' => (string) $row->id,
            'amount' => (float) $row->amount,
            'receivedDate' => DbDates::formatDateOnly($row->received_date),
            'note' => $row->note,
            'source' => $row->source,
            'addedByAdminName' => $row->admin_name ?? null,
            'createdAt' => DbDates::formatDateTime($row->created_at),
            'status' => 'active',
            'correctedByAdmin' => $this->wasEdited($row),
            'correctedAt' => $this->wasEdited($row) ? DbDates::formatDateTime($row->updated_at) : null,
            'voidReason' => null,
            'voidedAt' => null,
        ];
    }

    protected function serializeItem(object $item): array
    {
        return [
            'id' => (string) $item->id,
            'purpose' => $item->purpose,
            'costDate' => DbDates::formatDateOnly($item->cost_date),
            'quantity' => (float) $item->quantity,
            'perQtyAmount' => (float) $item->per_qty_amount,
            'totalAmount' => (float) $item->total_amount,
            'receiptUrl' => $item->receipt_file_url,
            'receiptOriginalFileName' => $item->receipt_original_file_name,
            'vendorId' => $item->vendor_id ? (string) $item->vendor_id : null,
            'vendorName' => $item->vendor_name ?? null,
            'paymentStatus' => $item->payment_status,
            'settlesItemId' => $item->settles_item_id ? (string) $item->settles_item_id : null,
            'settlesAllOwed' => (bool) $item->settles_all_owed,
        ];
    }

    protected function serializeExpense(object $expense, array $items): array
    {
        // The headline figure excludes unpaid vendor bills; those are tracked
        // separately as a payable.
        $vendorPayable = AccountsMath::roundMoney(collect($items)
            ->filter(fn ($item) => $item->vendor_id && $item->payment_status === 'to_pay')
            ->sum('total_amount'));

        return [
            'id' => (string) $expense->id,
            'costType' => $expense->cost_type,
            'linkedRowKey' => $expense->linked_row_key,
            'eventClientName' => $expense->event_client_name_snapshot,
            'eventDate' => DbDates::formatDateOnly($expense->event_date_snapshot),
            'totalAmount' => AccountsMath::roundMoney((float) $expense->total_amount - $vendorPayable),
            'recordedTotalAmount' => (float) $expense->total_amount,
            'walletDeductionAmount' => (float) $expense->wallet_deduction_amount,
            'vendorPayableAmount' => $vendorPayable,
            'paymentSource' => $expense->payment_source,
            'createdAt' => DbDates::formatDateTime($expense->created_at),
            'status' => $expense->status,
            'approved' => (bool) $expense->approved,
            'correctedByAdmin' => $this->wasEdited($expense),
            'correctedAt' => $this->wasEdited($expense) ? DbDates::formatDateTime($expense->updated_at) : null,
            'voidReason' => $expense->void_reason,
            'voidedAt' => DbDates::formatDateTime($expense->voided_at),
            'items' => array_map(fn ($item) => $this->serializeItem($item), $items),
        ];
    }

    protected function serializeVendorPayment(object $item, object $expense): array
    {
        return [
            'id' => (string) $item->id,
            'purpose' => $item->purpose,
            'costType' => $expense->cost_type,
            'linkedRowKey' => $expense->linked_row_key,
            'eventClientName' => $expense->event_client_name_snapshot,
            'costDate' => DbDates::formatDateOnly($item->cost_date),
            'totalAmount' => (float) $item->total_amount,
            'paymentStatus' => $item->payment_status,
            'vendorId' => $item->vendor_id ? (string) $item->vendor_id : null,
            'vendorName' => $item->vendor_name ?? null,
            'settlesItemId' => $item->settles_item_id ? (string) $item->settles_item_id : null,
            'settlesAllOwed' => (bool) $item->settles_all_owed,
            'createdAt' => DbDates::formatDateTime($item->created_at),
        ];
    }

    /** Receipts arrive as receipt_0, receipt_1, … aligned to item index. */
    protected function storeReceipt(Request $request, int $index): array
    {
        $empty = [
            'storedFileName' => null,
            'originalFileName' => null,
            'fileUrl' => null,
            'fileSizeBytes' => null,
        ];

        $file = $request->file('receipt_'.$index);

        if (! $file) {
            return $empty;
        }

        if (! $file->isValid() || ! isset(self::ALLOWED_RECEIPT_MIMES[$file->getMimeType()])) {
            return ['error' => 'Only JPG, PNG, GIF, or WEBP images are allowed.'];
        }

        if ($file->getSize() > self::MAX_RECEIPT_BYTES) {
            return ['error' => 'Each receipt must be 8MB or smaller.'];
        }

        $storedFileName = Str::uuid().'.'.self::ALLOWED_RECEIPT_MIMES[$file->getMimeType()];
        $originalFileName = mb_substr((string) $file->getClientOriginalName(), 0, 255);

        $file->move(OfficeStorage::directory(OfficeStorage::EXPENSE_RECEIPTS_DIR), $storedFileName);

        return [
            'storedFileName' => $storedFileName,
            'originalFileName' => $originalFileName,
            'fileUrl' => OfficeStorage::publicUrl(OfficeStorage::EXPENSE_RECEIPTS_DIR, $storedFileName),
            'fileSizeBytes' => File::size(OfficeStorage::expenseReceiptPath($storedFileName)),
        ];
    }

    /** An edit is inferred from updated_at drifting past created_at. */
    protected function wasEdited(object $row): bool
    {
        if (! isset($row->created_at, $row->updated_at)) {
            return false;
        }

        return strtotime($row->updated_at) - strtotime($row->created_at) > 1;
    }
}
