<?php

namespace App\Support\Office;

use Illuminate\Support\Facades\DB;

/**
 * Sheet cell type mapping + value coercion, ported from MME's
 * workspaceController.js. Shared by the employee workspace save and the
 * admin single-cell PATCH so both stay in sync.
 */
class SheetCells
{
    public const FRONTEND_TO_DB_TYPE = [
        'text' => 'text',
        'long_text' => 'long_text',
        'email' => 'email',
        'phone' => 'phone',
        'number' => 'decimal',
        'integer' => 'integer',
        'date' => 'date',
        'time' => 'time',
        'datetime' => 'datetime',
        'checkbox' => 'boolean',
        'employee' => 'employee',
        'status' => 'status',
        'priority' => 'priority',
        'venue' => 'venue',
        'shift' => 'shift',
        'currency' => 'currency',
        'meeting_manager' => 'meeting_manager',
        'last_meeting_time' => 'last_meeting_time',
        'next_meeting_time' => 'next_meeting_time',
    ];

    public const DB_TO_FRONTEND_TYPE = [
        'decimal' => 'number',
        'boolean' => 'checkbox',
    ];

    /** Columns stored in value_datetime, differing only by semantic label. */
    public const DATETIME_LIKE_TYPES = ['datetime', 'last_meeting_time', 'next_meeting_time'];

    /** Never persisted — always recomputed live from client_meetings. */
    public const COMPUTED_TYPES = ['last_meeting_time', 'next_meeting_time'];

    /** Reads a stored cell back out as the frontend's expected value. */
    public static function readValue(object $cell, string $dataType): mixed
    {
        // "N/A" is stored as literal text regardless of the column's type.
        if ($cell->display_value === 'N/A') {
            return 'N/A';
        }

        if ($dataType === 'integer') {
            return $cell->value_integer === null ? '' : (int) $cell->value_integer;
        }

        if (in_array($dataType, ['decimal', 'currency'], true)) {
            return $cell->value_decimal === null ? '' : (float) $cell->value_decimal;
        }

        if ($dataType === 'date') {
            return DbDates::formatDateOnly($cell->value_date) ?? '';
        }

        if ($dataType === 'time') {
            return DbDates::formatTimeOnly($cell->value_time) ?? '';
        }

        if (in_array($dataType, self::DATETIME_LIKE_TYPES, true)) {
            return DbDates::formatDateTime($cell->value_datetime) ?? '';
        }

        if ($dataType === 'boolean') {
            return $cell->value_boolean === null ? '' : (bool) $cell->value_boolean;
        }

        if ($dataType === 'employee') {
            return $cell->employee_name ?? $cell->display_value ?? '';
        }

        return $cell->value_text ?? $cell->display_value ?? '';
    }

    /** Turns one raw frontend value into the typed sheet_cells columns. */
    public static function buildValueFields(mixed $rawValue, string $dataType): array
    {
        $fields = [
            'value_text' => null,
            'value_integer' => null,
            'value_decimal' => null,
            'value_date' => null,
            'value_time' => null,
            'value_datetime' => null,
            'value_boolean' => null,
            'value_employee_id' => null,
        ];

        $displayValue = $rawValue === null ? '' : (is_bool($rawValue) ? ($rawValue ? 'true' : 'false') : (string) $rawValue);

        if (strtoupper(trim($displayValue)) === 'N/A') {
            $fields['value_text'] = 'N/A';
            $fields['display_value'] = 'N/A';

            return $fields;
        }

        if ($dataType === 'integer' && $displayValue !== '') {
            $fields['value_integer'] = is_numeric($displayValue) ? (int) round((float) $displayValue) : null;
        } elseif (in_array($dataType, ['decimal', 'currency'], true) && $displayValue !== '') {
            $fields['value_decimal'] = is_numeric($displayValue) ? (float) $displayValue : null;
        } elseif ($dataType === 'date') {
            $fields['value_date'] = DbDates::parseDateOnly($displayValue);
        } elseif ($dataType === 'time') {
            $fields['value_time'] = DbDates::parseTimeOnly($displayValue);
        } elseif (in_array($dataType, self::DATETIME_LIKE_TYPES, true)) {
            $fields['value_datetime'] = DbDates::parseDateTimeLocal($displayValue);
        } elseif ($dataType === 'boolean') {
            $fields['value_boolean'] = ($rawValue === true || $rawValue === 'true' || $rawValue === '1' || $rawValue === 1) ? 1 : 0;
        } elseif ($dataType === 'employee' && $displayValue !== '') {
            $fields['value_employee_id'] = DB::table('employees')
                ->where('full_name', $displayValue)
                ->where('is_active', 1)
                ->orderBy('id')
                ->value('id');
        } else {
            $fields['value_text'] = $displayValue;
        }

        $fields['display_value'] = $displayValue;

        return $fields;
    }
}
