<?php

namespace App\Http\Controllers\Api\OfficeManagement\Admin;

use App\Http\Controllers\Controller;
use App\Support\Office\DbDates;
use App\Support\Office\MeetingCallTimes;
use App\Support\Office\SheetCells;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Company-wide KPI overview and per-client detail.
 * Ported from MME's adminDashboardController.js.
 */
class AdminDashboardController extends Controller
{
    private const DETAIL_COLUMNS = [
        'Client Name', 'Venue', 'Shift', 'Client Phone Number', 'Guest Count', 'Event Date',
    ];

    public function index(): JsonResponse
    {
        $now = DbDates::nowString();
        $weekAgo = DbDates::nowInBusinessTimezone()->subDays(7)->format('Y-m-d H:i:s');
        $weekAhead = DbDates::nowInBusinessTimezone()->addDays(7)->format('Y-m-d H:i:s');

        $employees = DB::table('employees as e')
            ->leftJoin('roles as r', 'r.id', '=', 'e.role_id')
            ->where(function ($query) {
                $query->whereNull('r.name')->orWhere('r.name', '!=', 'Admin');
            })
            ->orderBy('e.full_name')
            ->get(['e.id', 'e.full_name', 'e.email', 'e.is_active', 'e.color_hex', 'r.name as role_name']);

        // Recent counts drive the summary cards; all-time counts drive the table.
        $recentMeetings = $this->countBy('client_meetings', 'created_by', 'meeting_datetime', $weekAgo, $now);
        $recentCalls = $this->countBy('client_calls', 'created_by', 'call_datetime', $weekAgo, $now);
        $upcomingMeetings = $this->countBy('client_next_meetings', 'assigned_employee_id', 'next_meeting_datetime', $now, $weekAhead);
        $upcomingCalls = $this->countBy('client_next_calls', 'assigned_employee_id', 'next_call_datetime', $now, $weekAhead);

        $allMeetings = $this->countBy('client_meetings', 'created_by', 'meeting_datetime', null, $now);
        $allCalls = $this->countBy('client_calls', 'created_by', 'call_datetime', null, $now);
        $allUpcomingMeetings = $this->countBy('client_next_meetings', 'assigned_employee_id', 'next_meeting_datetime', $now, null);
        $allUpcomingCalls = $this->countBy('client_next_calls', 'assigned_employee_id', 'next_call_datetime', $now, null);

        $sheetId = DB::table('management_sheets')
            ->where('is_default', 1)->where('is_active', 1)->orderBy('id')->value('id');

        $rows = $sheetId
            ? DB::table('sheet_rows')->where('sheet_id', $sheetId)->where('is_archived', 0)->get(['row_key', 'created_at'])
            : collect();

        $meetingStats = DB::table('client_meetings')
            ->groupBy('linked_row_key')
            ->get([
                'linked_row_key',
                DB::raw('COUNT(*) as total'),
                DB::raw('MAX(GREATEST(COALESCE(meeting_datetime, 0), COALESCE(updated_at, 0))) as last_at'),
            ])
            ->keyBy('linked_row_key');

        $callStats = DB::table('client_calls')
            ->groupBy('linked_row_key')
            ->get([
                'linked_row_key',
                DB::raw('COUNT(*) as total'),
                DB::raw('MAX(GREATEST(COALESCE(call_datetime, 0), COALESCE(updated_at, 0))) as last_at'),
            ])
            ->keyBy('linked_row_key');

        $details = $this->resolveClientDetails($sheetId, $rows->pluck('row_key'));

        $clients = $rows->map(function ($row) use ($meetingStats, $callStats, $details) {
            $meetings = (int) ($meetingStats[$row->row_key]->total ?? 0);
            $calls = (int) ($callStats[$row->row_key]->total ?? 0);
            $detail = $details[$row->row_key] ?? [];

            $lastActivity = collect([
                $meetingStats[$row->row_key]->last_at ?? null,
                $callStats[$row->row_key]->last_at ?? null,
                $row->created_at,
            ])->filter()->max();

            return [
                'rowKey' => $row->row_key,
                'clientName' => $detail['Client Name'] ?? '',
                'venue' => $detail['Venue'] ?? '',
                'shift' => $detail['Shift'] ?? '',
                'phone' => $detail['Client Phone Number'] ?? '',
                'guestCount' => $detail['Guest Count'] ?? '',
                'eventDate' => $detail['Event Date'] ?? '',
                'meetingsCount' => $meetings,
                'callsCount' => $calls,
                'totalActivity' => $meetings + $calls,
                'lastActivityAt' => DbDates::formatDateTime($lastActivity),
            ];
        })
            ->sortByDesc(fn ($client) => [$client['totalActivity'], $client['lastActivityAt'] ?? ''])
            ->values();

        return response()->json([
            'data' => [
                'employees' => $employees->map(fn ($employee) => [
                    'id' => (int) $employee->id,
                    'fullName' => $employee->full_name,
                    'email' => $employee->email,
                    'role' => $employee->role_name,
                    'isActive' => (bool) $employee->is_active,
                    'colorHex' => $employee->color_hex,
                    'meetingsDone' => $allMeetings[$employee->id] ?? 0,
                    'callsDone' => $allCalls[$employee->id] ?? 0,
                    'upcomingMeetings' => $allUpcomingMeetings[$employee->id] ?? 0,
                    'upcomingCalls' => $allUpcomingCalls[$employee->id] ?? 0,
                ])->values(),
                'clients' => $clients,
                'totals' => [
                    'employees' => $employees->count(),
                    'activeEmployees' => $employees->where('is_active', 1)->count(),
                    'meetingsDone' => array_sum($recentMeetings),
                    'callsDone' => array_sum($recentCalls),
                    'upcomingMeetings' => array_sum($upcomingMeetings),
                    'upcomingCalls' => array_sum($upcomingCalls),
                    'clients' => $rows->count(),
                ],
            ],
        ]);
    }

    public function client(string $rowKey): JsonResponse
    {
        if (trim($rowKey) === '') {
            return response()->json(['message' => 'A client row key is required.'], 400);
        }

        $sheetId = DB::table('management_sheets')
            ->where('is_default', 1)->where('is_active', 1)->orderBy('id')->value('id');

        if (! $sheetId) {
            return response()->json(['message' => 'No active worksheet found.'], 404);
        }

        $row = DB::table('sheet_rows')
            ->where('sheet_id', $sheetId)
            ->where('row_key', $rowKey)
            ->first(['id']);

        if (! $row) {
            return response()->json(['message' => 'Client not found.'], 404);
        }

        $columns = DB::table('sheet_columns')
            ->where('sheet_id', $sheetId)
            ->where('is_active', 1)
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();

        $cells = DB::table('sheet_cells as sc')
            ->leftJoin('employees as e', 'e.id', '=', 'sc.value_employee_id')
            ->where('sc.row_id', $row->id)
            ->get(['sc.*', 'e.full_name as employee_name'])
            ->keyBy('column_id');

        $times = MeetingCallTimes::compute([$rowKey])[$rowKey] ?? null;

        $columnValues = $columns->map(function ($column) use ($cells, $times) {
            if (in_array($column->data_type, SheetCells::COMPUTED_TYPES, true)) {
                $isLast = $column->data_type === 'last_meeting_time';
                $value = $isLast
                    ? ($times['lastMeeting'] ?? $times['lastCall'] ?? '')
                    : ($times['nextMeeting'] ?? $times['nextCall'] ?? '');

                return ['name' => $column->column_name, 'value' => $value];
            }

            $cell = $cells->get($column->id);

            return [
                'name' => $column->column_name,
                'value' => $cell ? SheetCells::readValue($cell, $column->data_type) : '',
            ];
        })->values();

        $meetings = DB::table('client_meetings as m')
            ->leftJoin('employees as cb', 'cb.id', '=', 'm.created_by')
            ->leftJoin('employees as ab', 'ab.id', '=', 'm.assigned_by_employee_id')
            ->leftJoin('client_next_meetings as nm', 'nm.meeting_id', '=', 'm.id')
            ->leftJoin('employees as na', 'na.id', '=', 'nm.assigned_employee_id')
            ->where('m.linked_row_key', $rowKey)
            ->orderByDesc('m.id')
            ->get([
                'm.id', 'm.meeting_datetime', 'm.discussion_notes',
                'cb.full_name as created_by_name', 'ab.full_name as assigned_by_name',
                'nm.next_meeting_datetime', 'na.full_name as next_assigned_name',
            ]);

        $calls = DB::table('client_calls as c')
            ->leftJoin('employees as cb', 'cb.id', '=', 'c.created_by')
            ->leftJoin('employees as ab', 'ab.id', '=', 'c.assigned_by_employee_id')
            ->leftJoin('client_next_calls as nc', 'nc.call_id', '=', 'c.id')
            ->leftJoin('employees as na', 'na.id', '=', 'nc.assigned_employee_id')
            ->where('c.linked_row_key', $rowKey)
            ->orderByDesc('c.id')
            ->get([
                'c.id', 'c.call_datetime', 'c.call_discussion',
                'cb.full_name as created_by_name', 'ab.full_name as assigned_by_name',
                'nc.next_call_datetime', 'na.full_name as next_assigned_name',
            ]);

        $finalization = DB::table('client_finalizations as f')
            ->leftJoin('employees as e', 'e.id', '=', 'f.finalized_by')
            ->where('f.linked_row_key', $rowKey)
            ->first(['f.finalized_at', 'e.full_name as finalized_by_name']);

        return response()->json([
            'data' => [
                'rowKey' => $rowKey,
                'columns' => $columnValues,
                'totals' => [
                    'meetingsCount' => $meetings->count(),
                    'callsCount' => $calls->count(),
                ],
                'finalization' => $finalization ? [
                    'finalizedAt' => DbDates::formatDateTime($finalization->finalized_at),
                    'finalizedByName' => $finalization->finalized_by_name,
                ] : null,
                'meetings' => $meetings->map(fn ($meeting) => [
                    'id' => (int) $meeting->id,
                    'meetingDatetime' => DbDates::formatDateTime($meeting->meeting_datetime),
                    'discussionNotes' => $meeting->discussion_notes,
                    'createdByName' => $meeting->created_by_name,
                    'assignedByEmployeeName' => $meeting->assigned_by_name,
                    'nextMeeting' => $meeting->next_meeting_datetime ? [
                        'nextMeetingDatetime' => DbDates::formatDateTime($meeting->next_meeting_datetime),
                        'assignedEmployeeName' => $meeting->next_assigned_name,
                    ] : null,
                ])->values(),
                'calls' => $calls->map(fn ($call) => [
                    'id' => (int) $call->id,
                    'callDatetime' => DbDates::formatDateTime($call->call_datetime),
                    'callDiscussion' => $call->call_discussion,
                    'createdByName' => $call->created_by_name,
                    'assignedByEmployeeName' => $call->assigned_by_name,
                    'nextCall' => $call->next_call_datetime ? [
                        'nextCallDatetime' => DbDates::formatDateTime($call->next_call_datetime),
                        'assignedEmployeeName' => $call->next_assigned_name,
                    ] : null,
                ])->values(),
            ],
        ]);
    }

    /** [employeeId => count] within an optional datetime window. */
    private function countBy(string $table, string $groupColumn, string $dateColumn, ?string $from, ?string $to): array
    {
        return DB::table($table)
            ->whereNotNull($groupColumn)
            ->when($from, fn ($q) => $q->where($dateColumn, '>=', $from))
            ->when($to, fn ($q) => $q->where($dateColumn, '<=', $to))
            ->groupBy($groupColumn)
            ->pluck(DB::raw('COUNT(*)'), $groupColumn)
            ->map(fn ($count) => (int) $count)
            ->all();
    }

    /** [rowKey => [columnName => value]] for the dashboard's summary columns. */
    private function resolveClientDetails(?int $sheetId, $rowKeys): array
    {
        $rowKeys = collect($rowKeys)->filter()->unique()->values();

        if (! $sheetId || $rowKeys->isEmpty()) {
            return [];
        }

        $cells = DB::table('sheet_cells as sc')
            ->join('sheet_rows as sr', 'sr.id', '=', 'sc.row_id')
            ->join('sheet_columns as col', 'col.id', '=', 'sc.column_id')
            ->leftJoin('employees as e', 'e.id', '=', 'sc.value_employee_id')
            ->where('sr.sheet_id', $sheetId)
            ->whereIn('sr.row_key', $rowKeys)
            ->whereIn('col.column_name', self::DETAIL_COLUMNS)
            ->get(['sc.*', 'sr.row_key', 'col.column_name', 'col.data_type', 'e.full_name as employee_name']);

        $details = [];

        foreach ($cells as $cell) {
            $details[$cell->row_key][$cell->column_name] = SheetCells::readValue($cell, $cell->data_type);
        }

        return $details;
    }
}
