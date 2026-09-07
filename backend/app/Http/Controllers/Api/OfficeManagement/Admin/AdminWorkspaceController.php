<?php

namespace App\Http\Controllers\Api\OfficeManagement\Admin;

use App\Http\Controllers\Controller;
use App\Support\Office\DbDates;
use App\Support\Office\MeetingCallTimes;
use App\Support\Office\OfficeAuth;
use App\Support\Office\SheetCells;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Read-only admin mirror of the management sheet, plus a single-cell edit.
 * Ported from MME's adminWorkspaceController.js. Deliberately not a
 * whole-sheet replace, so the admin view can never drop rows or columns.
 */
class AdminWorkspaceController extends Controller
{
    public function show(): JsonResponse
    {
        $sheet = DB::table('management_sheets')
            ->where('is_default', 1)
            ->where('is_active', 1)
            ->orderBy('id')
            ->first();

        if (! $sheet) {
            return response()->json(['data' => ['id' => null, 'name' => null, 'columns' => [], 'rows' => []]]);
        }

        // Computed time columns are omitted here; the hover buttons use the
        // separate lastCallDatetime/nextCallDatetime fields instead.
        $columns = DB::table('sheet_columns')
            ->where('sheet_id', $sheet->id)
            ->where('is_active', 1)
            ->where('is_visible', 1)
            ->whereNotIn('data_type', SheetCells::COMPUTED_TYPES)
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();

        $rows = DB::table('sheet_rows')
            ->where('sheet_id', $sheet->id)
            ->where('is_archived', 0)
            ->orderBy('row_position')
            ->orderBy('id')
            ->get();

        $valuesByRow = [];

        if ($rows->isNotEmpty() && $columns->isNotEmpty()) {
            $columnById = $columns->keyBy('id');

            $cells = DB::table('sheet_cells as sc')
                ->leftJoin('employees as e', 'e.id', '=', 'sc.value_employee_id')
                ->whereIn('sc.row_id', $rows->pluck('id'))
                ->whereIn('sc.column_id', $columns->pluck('id'))
                ->get(['sc.*', 'e.full_name as employee_name']);

            foreach ($cells as $cell) {
                $column = $columnById->get($cell->column_id);

                if ($column) {
                    $valuesByRow[$cell->row_id][$column->column_key] = SheetCells::readValue($cell, $column->data_type);
                }
            }
        }

        // Admin view is company-wide, so times are computed unscoped.
        $times = $rows->isNotEmpty() ? MeetingCallTimes::compute($rows->pluck('row_key')->all()) : [];

        return response()->json([
            'data' => [
                'id' => (string) $sheet->id,
                'name' => $sheet->sheet_name,
                'columns' => $columns->map(fn ($column) => [
                    'id' => $column->column_key,
                    'name' => $column->column_name,
                    'type' => SheetCells::DB_TO_FRONTEND_TYPE[$column->data_type] ?? $column->data_type,
                    'width' => $column->width_px,
                    'required' => (bool) $column->is_required,
                ])->values(),
                'rows' => $rows->map(fn ($row) => [
                    'id' => $row->row_key,
                    'rowNumber' => $row->row_position,
                    'values' => (object) ($valuesByRow[$row->id] ?? []),
                    'lastCallDatetime' => $times[$row->row_key]['lastCall'] ?? '',
                    'nextCallDatetime' => $times[$row->row_key]['nextCall'] ?? '',
                    'createdAt' => $row->created_at,
                    'updatedAt' => $row->updated_at,
                ])->values(),
            ],
        ]);
    }

    public function updateCell(Request $request, string $rowKey): JsonResponse
    {
        $columnKey = trim((string) $request->input('columnKey'));

        if ($rowKey === '' || $columnKey === '') {
            return response()->json(['message' => 'columnKey is required.'], 422);
        }

        $sheetId = DB::table('management_sheets')
            ->where('is_default', 1)
            ->where('is_active', 1)
            ->orderBy('id')
            ->value('id');

        if (! $sheetId) {
            return response()->json(['message' => 'Workspace not found.'], 404);
        }

        $column = DB::table('sheet_columns')
            ->where('sheet_id', $sheetId)
            ->where('column_key', $columnKey)
            ->first();

        if (! $column || ! $column->is_active) {
            return response()->json(['message' => 'Column not found.'], 404);
        }

        if (in_array($column->data_type, SheetCells::COMPUTED_TYPES, true)) {
            return response()->json([
                'message' => "This column is computed automatically and can't be edited.",
            ], 400);
        }

        $row = DB::table('sheet_rows')
            ->where('sheet_id', $sheetId)
            ->where('row_key', $rowKey)
            ->first();

        if (! $row || $row->is_archived) {
            return response()->json(['message' => 'Client row not found.'], 404);
        }

        $adminId = OfficeAuth::currentId($request);
        $fields = SheetCells::buildValueFields($request->input('value'), $column->data_type);
        $now = DbDates::nowString();

        DB::transaction(function () use ($row, $column, $fields, $adminId, $now) {
            $cellId = DB::table('sheet_cells')
                ->where('row_id', $row->id)
                ->where('column_id', $column->id)
                ->value('id');

            if ($cellId) {
                DB::table('sheet_cells')->where('id', $cellId)->update($fields + [
                    'updated_by' => $adminId,
                    'updated_at' => $now,
                ]);
            } else {
                DB::table('sheet_cells')->insert($fields + [
                    'row_id' => $row->id,
                    'column_id' => $column->id,
                    'created_by' => $adminId,
                    'updated_by' => $adminId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            DB::table('sheet_rows')->where('id', $row->id)->update([
                'updated_by' => $adminId,
                'updated_at' => $now,
            ]);
        });

        $saved = DB::table('sheet_cells as sc')
            ->leftJoin('employees as e', 'e.id', '=', 'sc.value_employee_id')
            ->where('sc.row_id', $row->id)
            ->where('sc.column_id', $column->id)
            ->first(['sc.*', 'e.full_name as employee_name']);

        return response()->json([
            'data' => [
                'rowKey' => $rowKey,
                'columnKey' => $columnKey,
                'value' => SheetCells::readValue($saved, $column->data_type),
                'displayValue' => $saved->display_value,
            ],
        ]);
    }
}
