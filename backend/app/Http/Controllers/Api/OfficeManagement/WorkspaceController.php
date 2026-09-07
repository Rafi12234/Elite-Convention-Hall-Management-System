<?php

namespace App\Http\Controllers\Api\OfficeManagement;

use App\Http\Controllers\Controller;
use App\Support\Office\DbDates;
use App\Support\Office\MeetingCallTimes;
use App\Support\Office\OfficeAuth;
use App\Support\Office\OfficeStorage;
use App\Support\Office\SheetCells;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

/**
 * The dynamic management sheet (CRM client list).
 * Ported from MME's workspaceController.js.
 */
class WorkspaceController extends Controller
{
    /**
     * Columns a brand-new sheet starts with, mirroring the frontend's
     * data/defaultSheet.js. Excel import matches spreadsheet headers against
     * these by name, so a sheet with no columns silently imports nothing.
     *
     * @var list<array{0:string,1:string,2:string,3:int,4:bool}> id, name, data_type, width, required
     */
    private const DEFAULT_COLUMNS = [
        ['event_date', 'Event Date', 'date', 165, true],
        ['client_name', 'Client Name', 'text', 210, true],
        ['client_phone', 'Client Phone Number', 'phone', 190, true],
        ['venue', 'Venue', 'venue', 220, true],
        ['shift', 'Shift', 'shift', 130, true],
        ['floor', 'Floor', 'text', 150, true],
        ['guest_count', 'Guest Count', 'integer', 150, true],
        ['last_meeting_time', 'Last Meeting Time', 'last_meeting_time', 205, false],
        ['meeting_short_note', 'Meeting Call Short Note', 'meeting_manager', 220, false],
        ['next_meeting_time', 'Next Meeting Time', 'next_meeting_time', 205, false],
    ];

    public function show(): JsonResponse
    {
        $sheet = $this->defaultSheet();

        $columns = DB::table('sheet_columns')
            ->where('sheet_id', $sheet->id)
            ->where('is_active', 1)
            ->where('is_visible', 1)
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();

        $rows = DB::table('sheet_rows')
            ->where('sheet_id', $sheet->id)
            ->where('is_archived', 0)
            ->orderBy('row_position')
            ->orderBy('id')
            ->get();

        $columnById = $columns->keyBy('id');
        $valuesByRow = [];
        $alreadyBookedByRow = [];
        $bookedFromMmeByRow = [];

        foreach ($rows as $row) {
            $valuesByRow[$row->id] = [];
        }

        if ($rows->isNotEmpty()) {
            $cells = DB::table('sheet_cells as sc')
                ->leftJoin('employees as e', 'e.id', '=', 'sc.value_employee_id')
                ->whereIn('sc.row_id', $rows->pluck('id'))
                ->get(['sc.*', 'e.full_name as employee_name']);

            foreach ($cells as $cell) {
                $column = $columnById->get($cell->column_id);

                if (! $column) {
                    continue;
                }

                $valuesByRow[$cell->row_id][$column->column_key] = SheetCells::readValue($cell, $column->data_type);

                if ($cell->already_booked) {
                    $alreadyBookedByRow[$cell->row_id] = true;
                }

                if ($cell->booked_from_mme) {
                    $bookedFromMmeByRow[$cell->row_id] = true;
                }
            }
        }

        // "Last/Next Meeting Time" columns are always computed live so a
        // "next" meeting whose time has passed reads as "last" on next load.
        $timeSummaryByRowKey = [];
        $meetingTimeColumns = $columns->whereIn('data_type', SheetCells::COMPUTED_TYPES);

        if ($meetingTimeColumns->isNotEmpty() && $rows->isNotEmpty()) {
            $timesByRowKey = MeetingCallTimes::compute($rows->pluck('row_key')->all());

            foreach ($rows as $row) {
                $times = $timesByRowKey[$row->row_key] ?? null;

                foreach ($meetingTimeColumns as $column) {
                    $raw = $column->data_type === 'last_meeting_time'
                        ? ($times['lastMeeting'] ?? null)
                        : ($times['nextMeeting'] ?? null);

                    $valuesByRow[$row->id][$column->column_key] = $raw ?? '';
                }

                $timeSummaryByRowKey[$row->row_key] = [
                    'lastCallDatetime' => $times['lastCall'] ?? '',
                    'nextCallDatetime' => $times['nextCall'] ?? '',
                ];
            }
        }

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
                    'alreadyBooked' => $alreadyBookedByRow[$row->id] ?? false,
                    'bookedFromMme' => $bookedFromMmeByRow[$row->id] ?? false,
                    'lastCallDatetime' => $timeSummaryByRowKey[$row->row_key]['lastCallDatetime'] ?? '',
                    'nextCallDatetime' => $timeSummaryByRowKey[$row->row_key]['nextCallDatetime'] ?? '',
                    'createdAt' => $row->created_at,
                    'updatedAt' => $row->updated_at,
                ])->values(),
            ],
        ]);
    }

    public function save(Request $request): JsonResponse
    {
        $workspace = $request->input('workspace');

        if (! is_array($workspace) || ! is_array($workspace['columns'] ?? null) || ! is_array($workspace['rows'] ?? null)) {
            return response()->json(['message' => 'A valid workspace payload is required.'], 422);
        }

        $employeeId = OfficeAuth::currentId($request);

        DB::transaction(function () use ($workspace, $employeeId) {
            $sheet = $this->defaultSheet();
            $now = now();

            $columnIdsByKey = [];

            foreach (array_values($workspace['columns']) as $index => $column) {
                $columnKey = (string) $column['id'];
                $dataType = SheetCells::FRONTEND_TO_DB_TYPE[$column['type'] ?? 'text'] ?? 'text';

                $attributes = [
                    'column_name' => trim((string) ($column['name'] ?? '')) ?: 'Untitled Column',
                    'data_type' => $dataType,
                    'display_order' => $index + 1,
                    'width_px' => max(80, min((int) ($column['width'] ?? 180), 1000)),
                    'is_required' => ! empty($column['required']) ? 1 : 0,
                    'is_visible' => 1,
                    'is_active' => 1,
                    'updated_by' => $employeeId,
                    'updated_at' => $now,
                ];

                $existingId = DB::table('sheet_columns')
                    ->where('sheet_id', $sheet->id)
                    ->where('column_key', $columnKey)
                    ->value('id');

                if ($existingId) {
                    DB::table('sheet_columns')->where('id', $existingId)->update($attributes);
                } else {
                    $existingId = DB::table('sheet_columns')->insertGetId($attributes + [
                        'sheet_id' => $sheet->id,
                        'column_key' => $columnKey,
                        'created_by' => $employeeId,
                        'created_at' => $now,
                    ]);
                }

                $columnIdsByKey[$columnKey] = ['id' => $existingId, 'dataType' => $dataType];
            }

            $activeColumnKeys = array_map(fn ($column) => (string) $column['id'], $workspace['columns']);

            if ($activeColumnKeys) {
                DB::table('sheet_columns')
                    ->where('sheet_id', $sheet->id)
                    ->whereNotIn('column_key', $activeColumnKeys)
                    ->update(['is_active' => 0, 'is_visible' => 0]);
            }

            $activeRowKeys = array_map(fn ($row) => (string) $row['id'], $workspace['rows']);

            // Rows dropped from the payload are hard-deleted BEFORE upserting
            // the survivors, so a row shifting into a freed row_position never
            // collides with the unique (sheet_id, row_position) index.
            $removedQuery = DB::table('sheet_rows')->where('sheet_id', $sheet->id);

            if ($activeRowKeys) {
                $removedQuery->whereNotIn('row_key', $activeRowKeys);
            }

            $rowKeysBeingRemoved = $removedQuery->pluck('row_key')->all();

            if ($rowKeysBeingRemoved) {
                DB::table('sheet_rows')
                    ->where('sheet_id', $sheet->id)
                    ->whereIn('row_key', $rowKeysBeingRemoved)
                    ->delete();
            }

            foreach (array_values($workspace['rows']) as $index => $row) {
                $rowKey = (string) $row['id'];

                $existingRowId = DB::table('sheet_rows')
                    ->where('sheet_id', $sheet->id)
                    ->where('row_key', $rowKey)
                    ->value('id');

                if ($existingRowId) {
                    DB::table('sheet_rows')->where('id', $existingRowId)->update([
                        'row_position' => $index + 1,
                        'updated_by' => $employeeId,
                        'is_archived' => 0,
                        'archived_at' => null,
                        'updated_at' => $now,
                    ]);
                } else {
                    $existingRowId = DB::table('sheet_rows')->insertGetId([
                        'sheet_id' => $sheet->id,
                        'row_key' => $rowKey,
                        'row_position' => $index + 1,
                        'created_by' => $employeeId,
                        'updated_by' => $employeeId,
                        'is_archived' => 0,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }

                foreach (($row['values'] ?? []) as $columnKey => $rawValue) {
                    $column = $columnIdsByKey[(string) $columnKey] ?? null;

                    if (! $column || in_array($column['dataType'], SheetCells::COMPUTED_TYPES, true)) {
                        continue;
                    }

                    $fields = SheetCells::buildValueFields($rawValue, $column['dataType']);

                    // "Already booked" is a per-row flag but lives on the row's
                    // Event Date cell, since sheet_cells is the only per-row table.
                    if ((string) $columnKey === 'event_date') {
                        $fields['already_booked'] = ! empty($row['alreadyBooked']) ? 1 : 0;
                    }

                    $existingCellId = DB::table('sheet_cells')
                        ->where('row_id', $existingRowId)
                        ->where('column_id', $column['id'])
                        ->value('id');

                    if ($existingCellId) {
                        DB::table('sheet_cells')->where('id', $existingCellId)->update($fields + [
                            'updated_by' => $employeeId,
                            'updated_at' => $now,
                        ]);
                    } else {
                        DB::table('sheet_cells')->insert($fields + [
                            'row_id' => $existingRowId,
                            'column_id' => $column['id'],
                            'created_by' => $employeeId,
                            'updated_by' => $employeeId,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                    }
                }
            }

            $this->deleteClientDataForRowKeys($rowKeysBeingRemoved);

            DB::table('management_sheets')->where('id', $sheet->id)->update([
                'updated_by' => $employeeId,
                'updated_at' => $now,
            ]);
        });

        return response()->json(['message' => 'Workspace saved successfully.']);
    }

    /**
     * A deleted client must leave no trace: its meetings (and their uploaded
     * image files), calls, finalization and calendar events all go with it.
     */
    private function deleteClientDataForRowKeys(array $rowKeys): void
    {
        if (! $rowKeys) {
            return;
        }

        $meetingIds = DB::table('client_meetings')
            ->whereIn('linked_row_key', $rowKeys)
            ->pluck('id');

        if ($meetingIds->isNotEmpty()) {
            $storedFileNames = DB::table('client_meeting_images')
                ->whereIn('meeting_id', $meetingIds)
                ->pluck('stored_file_name');

            DB::table('client_meeting_images')->whereIn('meeting_id', $meetingIds)->delete();

            foreach ($storedFileNames as $storedFileName) {
                if ($storedFileName) {
                    File::delete(OfficeStorage::meetingImagePath($storedFileName));
                }
            }

            DB::table('client_meetings')->whereIn('id', $meetingIds)->delete();
        }

        DB::table('client_calls')->whereIn('linked_row_key', $rowKeys)->delete();
        DB::table('client_finalizations')->whereIn('linked_row_key', $rowKeys)->delete();
        DB::table('calendar_events')->whereIn('linked_row_key', $rowKeys)->delete();
    }

    private function defaultSheet(): object
    {
        $sheet = DB::table('management_sheets')
            ->where('is_default', 1)
            ->where('is_active', 1)
            ->orderBy('id')
            ->first();

        if (! $sheet) {
            $id = DB::table('management_sheets')->insertGetId([
                'sheet_name' => 'Meeting Management',
                'description' => 'Shared management workspace',
                'is_default' => 1,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $sheet = DB::table('management_sheets')->where('id', $id)->first();
        }

        $this->seedDefaultColumns((int) $sheet->id);

        return $sheet;
    }

    /**
     * Gives a sheet its starting columns. Only runs when the sheet has no
     * columns at all — columns removed by an employee are deactivated rather
     * than deleted, so this never resurrects them.
     */
    private function seedDefaultColumns(int $sheetId): void
    {
        if (DB::table('sheet_columns')->where('sheet_id', $sheetId)->exists()) {
            return;
        }

        $now = now();

        foreach (self::DEFAULT_COLUMNS as $index => [$key, $name, $dataType, $width, $required]) {
            DB::table('sheet_columns')->insert([
                'sheet_id' => $sheetId,
                'column_key' => $key,
                'column_name' => $name,
                'data_type' => $dataType,
                'display_order' => $index + 1,
                'width_px' => $width,
                'is_required' => $required ? 1 : 0,
                'is_visible' => 1,
                'is_active' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
}
