<?php

namespace App\Http\Controllers\Api\OfficeManagement\Admin;

use App\Http\Controllers\Controller;
use App\Support\Office\DbDates;
use App\Support\Office\MeetingCallTimes;
use App\Support\Office\SheetCells;
use App\Support\Office\SheetLookup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Company-wide calendar: every employee's meetings, calls and scheduled
 * follow-ups, colour-coded per employee.
 * Ported from MME's adminCalendarController.js.
 */
class AdminCalendarController extends Controller
{
    public function month(Request $request): JsonResponse
    {
        $businessNow = DbDates::nowInBusinessTimezone();
        $year = (int) ($request->query('year') ?: $businessNow->year);
        $month = (int) ($request->query('month') ?: $businessNow->month);

        $startDate = sprintf('%04d-%02d-01', $year, $month);
        $endDate = date('Y-m-t', strtotime($startDate));
        $rangeStart = $startDate.' 00:00:00';
        $rangeEnd = $endDate.' 23:59:59';
        $now = DbDates::nowString();

        $employees = DB::table('employees as e')
            ->leftJoin('roles as r', 'r.id', '=', 'e.role_id')
            ->where('e.is_active', 1)
            ->where(function ($query) {
                $query->whereNull('r.name')->orWhere('r.name', '!=', 'Admin');
            })
            ->orderBy('e.full_name')
            ->get(['e.id', 'e.full_name', 'e.color_hex']);

        $employeeById = $employees->keyBy('id');

        $meetings = DB::table('client_meetings as m')
            ->leftJoin('client_next_meetings as nm', 'nm.meeting_id', '=', 'm.id')
            ->leftJoin('employees as na', 'na.id', '=', 'nm.assigned_employee_id')
            ->whereBetween('m.meeting_datetime', [$rangeStart, $rangeEnd])
            ->get([
                'm.id', 'm.linked_row_key', 'm.meeting_datetime', 'm.discussion_notes',
                'm.requirements', 'm.created_by',
                'nm.next_meeting_datetime', 'nm.assigned_employee_id as next_assigned_id',
                'na.full_name as next_assigned_name',
            ]);

        $calls = DB::table('client_calls as c')
            ->leftJoin('client_next_calls as nc', 'nc.call_id', '=', 'c.id')
            ->leftJoin('employees as na', 'na.id', '=', 'nc.assigned_employee_id')
            ->whereBetween('c.call_datetime', [$rangeStart, $rangeEnd])
            ->get([
                'c.id', 'c.linked_row_key', 'c.call_datetime', 'c.call_discussion', 'c.created_by',
                'nc.next_call_datetime', 'nc.assigned_employee_id as next_assigned_id',
                'na.full_name as next_assigned_name',
            ]);

        $nextMeetings = DB::table('client_next_meetings')
            ->whereBetween('next_meeting_datetime', [$rangeStart, $rangeEnd])
            ->get(['id', 'meeting_id', 'linked_row_key', 'next_meeting_datetime', 'assigned_employee_id', 'created_by']);

        $nextCalls = DB::table('client_next_calls')
            ->whereBetween('next_call_datetime', [$rangeStart, $rangeEnd])
            ->get(['id', 'call_id', 'linked_row_key', 'next_call_datetime', 'assigned_employee_id', 'created_by']);

        $rowKeys = collect()
            ->merge($meetings->pluck('linked_row_key'))
            ->merge($calls->pluck('linked_row_key'))
            ->merge($nextMeetings->pluck('linked_row_key'))
            ->merge($nextCalls->pluck('linked_row_key'))
            ->unique()
            ->values();

        [$worksheetColumns, $rowData, $clientNames] = $this->resolveRowDetails($rowKeys);

        $employeeTag = function (?int $employeeId) use ($employeeById) {
            $employee = $employeeId ? $employeeById->get($employeeId) : null;

            return [
                'employeeId' => $employeeId,
                'employeeName' => $employee->full_name ?? null,
                'employeeColor' => $employee->color_hex ?? null,
            ];
        };

        $events = [];

        foreach ($meetings as $meeting) {
            $events[] = array_merge([
                'id' => 'meeting_'.$meeting->id,
                'source' => 'meeting',
                'date' => DbDates::formatDateOnly($meeting->meeting_datetime),
                'time' => substr(DbDates::formatTimeOnly($meeting->meeting_datetime), 0, 5),
                'clientName' => $clientNames[$meeting->linked_row_key] ?? '',
                'rowKey' => $meeting->linked_row_key,
                'notes' => $meeting->discussion_notes,
                'requirements' => $this->parseJsonArray($meeting->requirements),
                'meetingId' => (int) $meeting->id,
                'nextMeetingDatetime' => DbDates::formatDateTime($meeting->next_meeting_datetime),
                'nextMeetingAssignedEmployeeId' => $meeting->next_assigned_id ? (int) $meeting->next_assigned_id : null,
                'nextMeetingAssignedEmployeeName' => $meeting->next_assigned_name,
            ], $employeeTag($meeting->created_by ? (int) $meeting->created_by : null));
        }

        foreach ($calls as $call) {
            $events[] = array_merge([
                'id' => 'call_'.$call->id,
                'source' => 'call',
                'date' => DbDates::formatDateOnly($call->call_datetime),
                'time' => substr(DbDates::formatTimeOnly($call->call_datetime), 0, 5),
                'clientName' => $clientNames[$call->linked_row_key] ?? '',
                'rowKey' => $call->linked_row_key,
                'notes' => $call->call_discussion,
                'callId' => (int) $call->id,
                'nextCallDatetime' => DbDates::formatDateTime($call->next_call_datetime),
                'nextCallAssignedEmployeeId' => $call->next_assigned_id ? (int) $call->next_assigned_id : null,
                'nextCallAssignedEmployeeName' => $call->next_assigned_name,
            ], $employeeTag($call->created_by ? (int) $call->created_by : null));
        }

        foreach ($nextMeetings as $next) {
            $at = DbDates::formatDateTime($next->next_meeting_datetime);

            $events[] = array_merge([
                'id' => 'next_meeting_'.$next->id,
                'source' => 'next_meeting',
                'date' => DbDates::formatDateOnly($next->next_meeting_datetime),
                'time' => substr(DbDates::formatTimeOnly($next->next_meeting_datetime), 0, 5),
                'clientName' => $clientNames[$next->linked_row_key] ?? '',
                'rowKey' => $next->linked_row_key,
                'missed' => $at < $now,
                'meetingId' => (int) $next->meeting_id,
            ], $employeeTag((int) ($next->assigned_employee_id ?: $next->created_by) ?: null));
        }

        foreach ($nextCalls as $next) {
            $at = DbDates::formatDateTime($next->next_call_datetime);

            $events[] = array_merge([
                'id' => 'next_call_'.$next->id,
                'source' => 'next_call',
                'date' => DbDates::formatDateOnly($next->next_call_datetime),
                'time' => substr(DbDates::formatTimeOnly($next->next_call_datetime), 0, 5),
                'clientName' => $clientNames[$next->linked_row_key] ?? '',
                'rowKey' => $next->linked_row_key,
                'missed' => $at < $now,
                'callId' => (int) $next->call_id,
            ], $employeeTag((int) ($next->assigned_employee_id ?: $next->created_by) ?: null));
        }

        usort($events, function ($a, $b) {
            $byDate = strcmp($a['date'] ?? '', $b['date'] ?? '');

            return $byDate !== 0 ? $byDate : strcmp($a['time'] ?? '', $b['time'] ?? '');
        });

        return response()->json([
            'data' => [
                'events' => $events,
                'worksheetColumns' => $worksheetColumns,
                'rowData' => (object) $rowData,
                'employees' => $employees->map(fn ($employee) => [
                    'id' => (int) $employee->id,
                    'fullName' => $employee->full_name,
                    'color' => $employee->color_hex,
                ])->values(),
            ],
        ]);
    }

    /** @return array{0: array, 1: array, 2: array} columns, rowData, clientNames */
    private function resolveRowDetails($rowKeys): array
    {
        $sheetId = SheetLookup::defaultSheetId();

        if (! $sheetId) {
            return [[], [], []];
        }

        $allColumns = DB::table('sheet_columns')
            ->where('sheet_id', $sheetId)
            ->where('is_active', 1)
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();

        $worksheetColumns = $allColumns->map(fn ($column) => [
            'key' => $column->column_key,
            'name' => $column->column_name,
            'type' => $column->data_type,
        ])->values()->all();

        if ($rowKeys->isEmpty()) {
            return [$worksheetColumns, [], []];
        }

        $columnMap = $allColumns->keyBy('id');

        $cells = DB::table('sheet_cells as sc')
            ->join('sheet_rows as sr', 'sr.id', '=', 'sc.row_id')
            ->leftJoin('employees as e', 'e.id', '=', 'sc.value_employee_id')
            ->where('sr.sheet_id', $sheetId)
            ->whereIn('sr.row_key', $rowKeys)
            ->get(['sc.*', 'sr.row_key', 'e.full_name as employee_name']);

        $rowData = [];

        foreach ($cells as $cell) {
            $column = $columnMap->get($cell->column_id);

            if ($column) {
                $rowData[$cell->row_key][$column->column_key] = SheetCells::readValue($cell, $column->data_type);
            }
        }

        // Company-wide, so times are computed unscoped by employee.
        $meetingTimeColumns = $allColumns->whereIn('data_type', SheetCells::COMPUTED_TYPES);

        if ($meetingTimeColumns->isNotEmpty()) {
            $times = MeetingCallTimes::compute($rowKeys->all());

            foreach ($rowKeys as $rowKey) {
                foreach ($meetingTimeColumns as $column) {
                    $isLast = $column->data_type === 'last_meeting_time';
                    $meetingRaw = $isLast ? ($times[$rowKey]['lastMeeting'] ?? null) : ($times[$rowKey]['nextMeeting'] ?? null);
                    $callRaw = $isLast ? ($times[$rowKey]['lastCall'] ?? null) : ($times[$rowKey]['nextCall'] ?? null);

                    $rowData[$rowKey][$column->column_key] = $meetingRaw ?: ($callRaw ?: '');
                    $rowData[$rowKey][$column->column_key.'__meeting'] = $meetingRaw ?: '';
                    $rowData[$rowKey][$column->column_key.'__call'] = $callRaw ?: '';
                }
            }
        }

        $clientNames = SheetLookup::clientNames($sheetId, $rowKeys);

        return [$worksheetColumns, $rowData, $clientNames];
    }

    private function parseJsonArray(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        $decoded = json_decode((string) $value, true);

        return is_array($decoded) ? $decoded : [];
    }
}
