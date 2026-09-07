<?php

namespace App\Support\Office;

use Illuminate\Support\Facades\DB;

/**
 * Lookups against the management sheet used by the calls, meetings and
 * calendar controllers. Columns are located by display name (not
 * column_key, which isn't guaranteed to be a readable slug) — the same
 * approach MME uses.
 */
class SheetLookup
{
    public static function defaultSheetId(): ?int
    {
        $id = DB::table('management_sheets')
            ->where('is_default', 1)
            ->where('is_active', 1)
            ->orderBy('id')
            ->value('id');

        return $id ? (int) $id : null;
    }

    public static function clientName(?int $sheetId, string $rowKey): string
    {
        $cell = static::cellByColumnName($sheetId, $rowKey, 'Client Name');

        return $cell->value_text ?? $cell->display_value ?? '';
    }

    public static function eventDate(?int $sheetId, string $rowKey): ?string
    {
        $cell = static::cellByColumnName($sheetId, $rowKey, 'Event Date');

        return DbDates::formatDateOnly($cell->value_date ?? null);
    }

    /** Batch client-name lookup: [rowKey => name]. */
    public static function clientNames(?int $sheetId, iterable $rowKeys): array
    {
        $rowKeys = collect($rowKeys)->filter()->unique()->values();

        if (! $sheetId || $rowKeys->isEmpty()) {
            return [];
        }

        $rows = DB::table('sheet_cells as sc')
            ->join('sheet_rows as sr', 'sr.id', '=', 'sc.row_id')
            ->join('sheet_columns as col', 'col.id', '=', 'sc.column_id')
            ->where('sr.sheet_id', $sheetId)
            ->whereIn('sr.row_key', $rowKeys)
            ->where('col.column_name', 'Client Name')
            ->get(['sr.row_key', 'sc.value_text', 'sc.display_value']);

        $names = [];

        foreach ($rows as $row) {
            $names[$row->row_key] = $row->value_text ?? $row->display_value ?? '';
        }

        return $names;
    }

    public static function isValidRowKey(mixed $rowKey): bool
    {
        return (bool) preg_match('/^[0-9a-fA-F-]{36}$/', (string) $rowKey);
    }

    public static function validId(mixed $value): ?int
    {
        return (is_numeric($value) && (int) $value > 0 && (float) $value === (float) (int) $value)
            ? (int) $value
            : null;
    }

    private static function cellByColumnName(?int $sheetId, string $rowKey, string $columnName): object
    {
        $empty = (object) ['value_text' => null, 'display_value' => null, 'value_date' => null];

        if (! $sheetId) {
            return $empty;
        }

        return DB::table('sheet_cells as sc')
            ->join('sheet_rows as sr', 'sr.id', '=', 'sc.row_id')
            ->join('sheet_columns as col', 'col.id', '=', 'sc.column_id')
            ->where('sr.sheet_id', $sheetId)
            ->where('sr.row_key', $rowKey)
            ->where('col.column_name', $columnName)
            ->first(['sc.value_text', 'sc.display_value', 'sc.value_date']) ?? $empty;
    }
}
