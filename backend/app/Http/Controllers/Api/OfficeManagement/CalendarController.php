<?php

namespace App\Http\Controllers\Api\OfficeManagement;

use App\Http\Controllers\Controller;
use App\Support\Office\DbDates;
use App\Support\Office\MeetingCallTimes;
use App\Support\Office\OfficeAuth;
use App\Support\Office\SheetCells;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Personalised month calendar aggregating worksheet date cells, meetings,
 * calls, scheduled follow-ups and manual events.
 * Ported from MME's calendarController.js.
 */
class CalendarController extends Controller
{
    public function month(Request $request): JsonResponse
    {
        $businessNow = DbDates::nowInBusinessTimezone();
        $year = (int) ($request->query('year') ?: $businessNow->year);
        $month = (int) ($request->query('month') ?: $businessNow->month);

        // The calendar is personalised: an employee only ever sees their own
        // records. The id comes from the session, so it can't be spoofed.
        $employeeId = OfficeAuth::currentId($request);

        $startDate = sprintf('%04d-%02d-01', $year, $month);
        $endDate = date('Y-m-t', strtotime($startDate));
        $rangeStart = $startDate.' 00:00:00';
        $rangeEnd = $endDate.' 23:59:59';

        $events = [];
        $worksheetColumns = [];

        $sheetId = DB::table('management_sheets')
            ->where('is_default', 1)
            ->where('is_active', 1)
            ->orderBy('id')
            ->value('id');

        if ($sheetId) {
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
            ])->values();

            $clientNameCol = $this->findClientNameColumn($allColumns);

            $dateColumns = $allColumns->whereIn('data_type', ['datetime', 'date']);
            $dateCells = collect();

            if ($dateColumns->isNotEmpty()) {
                $dateCells = DB::table('sheet_cells as sc')
                    ->join('sheet_rows as sr', 'sr.id', '=', 'sc.row_id')
                    ->whereIn('sc.column_id', $dateColumns->pluck('id'))
                    ->where('sr.is_archived', 0)
                    ->where('sr.created_by', $employeeId)
                    ->where(function ($query) use ($rangeStart, $rangeEnd, $startDate, $endDate) {
                        $query->whereBetween('sc.value_datetime', [$rangeStart, $rangeEnd])
                            ->orWhereBetween('sc.value_date', [$startDate, $endDate]);
                    })
                    ->get(['sc.id', 'sc.column_id', 'sc.value_datetime', 'sc.value_date', 'sr.row_key']);
            }

            // Scoping to active rows keeps records of deleted clients hidden.
            $activeRowKeys = DB::table('sheet_rows')
                ->where('sheet_id', $sheetId)
                ->where('is_archived', 0)
                ->pluck('row_key');

            $meetingRows = collect();
            $callRows = collect();
            $nextCallRows = collect();
            $nextMeetingRows = collect();

            if ($activeRowKeys->isNotEmpty()) {
                $meetingRows = DB::table('client_meetings')
                    ->whereIn('linked_row_key', $activeRowKeys)
                    ->whereBetween('meeting_datetime', [$rangeStart, $rangeEnd])
                    ->where('created_by', $employeeId)
                    ->get();

                $callRows = DB::table('client_calls')
                    ->whereIn('linked_row_key', $activeRowKeys)
                    ->whereBetween('call_datetime', [$rangeStart, $rangeEnd])
                    ->where('created_by', $employeeId)
                    ->get();

                // Follow-ups follow their assignee, so handing one over moves
                // it off the assigner's calendar.
                $nextCallRows = DB::table('client_next_calls')
                    ->whereIn('linked_row_key', $activeRowKeys)
                    ->whereBetween('next_call_datetime', [$rangeStart, $rangeEnd])
                    ->where('assigned_employee_id', $employeeId)
                    ->get();

                $nextMeetingRows = DB::table('client_next_meetings')
                    ->whereIn('linked_row_key', $activeRowKeys)
                    ->whereBetween('next_meeting_datetime', [$rangeStart, $rangeEnd])
                    ->where('assigned_employee_id', $employeeId)
                    ->get();
            }

            $relevantRowKeys = collect()
                ->merge($dateCells->pluck('row_key'))
                ->merge($meetingRows->pluck('linked_row_key'))
                ->merge($callRows->pluck('linked_row_key'))
                ->merge($nextCallRows->pluck('linked_row_key'))
                ->merge($nextMeetingRows->pluck('linked_row_key'))
                ->unique()
                ->values();

            $rowDataByKey = $this->buildRowData($sheetId, $allColumns, $relevantRowKeys, $employeeId);

            $clientNameFor = function (string $rowKey) use ($rowDataByKey, $clientNameCol) {
                if (! $clientNameCol) {
                    return '';
                }

                return $rowDataByKey[$rowKey][$clientNameCol->column_key] ?? '';
            };

            $dateColMap = $dateColumns->keyBy('id');

            foreach ($dateCells as $cell) {
                $dateCol = $dateColMap->get($cell->column_id);
                $raw = $cell->value_datetime ?: $cell->value_date;

                $events[] = [
                    'id' => 'ws_'.$cell->id,
                    'source' => 'worksheet',
                    'date' => DbDates::formatDateOnly($raw),
                    'time' => $cell->value_datetime ? substr(DbDates::formatTimeOnly($cell->value_datetime), 0, 5) : null,
                    'columnKey' => $dateCol->column_key,
                    'columnName' => $dateCol->column_name,
                    'rowKey' => $cell->row_key,
                    'clientName' => $clientNameFor($cell->row_key),
                    'rowData' => (object) ($rowDataByKey[$cell->row_key] ?? []),
                    'eventType' => $this->inferEventType($dateCol->column_name),
                ];
            }

            foreach ($meetingRows as $meeting) {
                $clientName = $clientNameFor($meeting->linked_row_key);

                $events[] = [
                    'id' => 'cm_'.$meeting->id,
                    'source' => 'client_meeting',
                    'date' => DbDates::formatDateOnly($meeting->meeting_datetime),
                    'time' => substr(DbDates::formatTimeOnly($meeting->meeting_datetime), 0, 5),
                    'title' => $clientName ? "Meeting with {$clientName}" : 'Client meeting',
                    'description' => $meeting->discussion_notes ?: null,
                    'rowKey' => $meeting->linked_row_key,
                    'clientName' => $clientName,
                    'rowData' => (object) ($rowDataByKey[$meeting->linked_row_key] ?? []),
                    'eventType' => 'meeting',
                ];
            }

            foreach ($callRows as $call) {
                $clientName = $clientNameFor($call->linked_row_key);

                $events[] = [
                    'id' => 'cc_'.$call->id,
                    'source' => 'client_call',
                    'date' => DbDates::formatDateOnly($call->call_datetime),
                    'time' => substr(DbDates::formatTimeOnly($call->call_datetime), 0, 5),
                    'title' => $clientName ? "Call with {$clientName}" : 'Client call',
                    'description' => $call->call_discussion ?: null,
                    'rowKey' => $call->linked_row_key,
                    'clientName' => $clientName,
                    'rowData' => (object) ($rowDataByKey[$call->linked_row_key] ?? []),
                    'eventType' => 'call',
                ];
            }

            foreach ($nextCallRows as $nextCall) {
                $clientName = $clientNameFor($nextCall->linked_row_key);

                $events[] = [
                    'id' => 'ncc_'.$nextCall->id,
                    'source' => 'client_next_call',
                    'date' => DbDates::formatDateOnly($nextCall->next_call_datetime),
                    'time' => substr(DbDates::formatTimeOnly($nextCall->next_call_datetime), 0, 5),
                    'title' => $clientName ? "Next call with {$clientName}" : 'Upcoming client call',
                    'rowKey' => $nextCall->linked_row_key,
                    'clientName' => $clientName,
                    'rowData' => (object) ($rowDataByKey[$nextCall->linked_row_key] ?? []),
                    'eventType' => 'upcoming',
                    'isAssignedToMe' => (int) $nextCall->assigned_employee_id === $employeeId
                        && (int) $nextCall->created_by !== $employeeId,
                ];
            }

            foreach ($nextMeetingRows as $nextMeeting) {
                $clientName = $clientNameFor($nextMeeting->linked_row_key);

                $events[] = [
                    'id' => 'ncm_'.$nextMeeting->id,
                    'source' => 'client_next_meeting',
                    'date' => DbDates::formatDateOnly($nextMeeting->next_meeting_datetime),
                    'time' => substr(DbDates::formatTimeOnly($nextMeeting->next_meeting_datetime), 0, 5),
                    'title' => $clientName ? "Next meeting with {$clientName}" : 'Upcoming client meeting',
                    'rowKey' => $nextMeeting->linked_row_key,
                    'clientName' => $clientName,
                    'rowData' => (object) ($rowDataByKey[$nextMeeting->linked_row_key] ?? []),
                    'eventType' => 'upcoming',
                    'isAssignedToMe' => (int) $nextMeeting->assigned_employee_id === $employeeId
                        && (int) $nextMeeting->created_by !== $employeeId,
                ];
            }
        }

        // Manual events: mine, or assigned to me.
        $manualEvents = DB::table('calendar_events as ce')
            ->leftJoin('employees as ae', 'ae.id', '=', 'ce.assigned_employee_id')
            ->whereBetween('ce.event_date', [$startDate, $endDate])
            ->where(function ($query) use ($employeeId) {
                $query->where('ce.created_by', $employeeId)
                    ->orWhere('ce.assigned_employee_id', $employeeId);
            })
            ->orderBy('ce.event_date')
            ->orderBy('ce.event_time')
            ->get(['ce.*', 'ae.full_name as assigned_employee_name']);

        foreach ($manualEvents as $event) {
            $events[] = [
                'id' => 'ev_'.$event->id,
                'dbId' => (int) $event->id,
                'source' => 'manual',
                'date' => DbDates::formatDateOnly($event->event_date),
                'time' => $event->event_time ? substr(DbDates::formatTimeOnly($event->event_time), 0, 5) : null,
                'title' => $event->title,
                'description' => $event->description ?: null,
                'eventType' => $event->event_type,
                'clientName' => $event->client_name ?: null,
                'companyName' => $event->company_name ?: null,
                'priority' => $event->priority,
                'status' => $event->status,
                'linkedRowKey' => $event->linked_row_key ?: null,
                'assignedEmployee' => $event->assigned_employee_name,
                'isAssignedToMe' => (int) $event->assigned_employee_id === $employeeId
                    && (int) $event->created_by !== $employeeId,
            ];
        }

        usort($events, function ($a, $b) {
            $byDate = strcmp($a['date'] ?? '', $b['date'] ?? '');

            return $byDate !== 0 ? $byDate : strcmp($a['time'] ?? '', $b['time'] ?? '');
        });

        return response()->json([
            'data' => [
                'year' => $year,
                'month' => $month,
                'events' => $events,
                'worksheetColumns' => $worksheetColumns,
            ],
        ]);
    }

    public function storeEvent(Request $request): JsonResponse
    {
        $title = trim((string) $request->input('title'));
        $eventDate = DbDates::parseDateOnly($request->input('eventDate'));

        if ($title === '' || ! $eventDate) {
            return response()->json(['message' => 'Title and event date are required.'], 422);
        }

        $employeeId = OfficeAuth::currentId($request);
        $now = DbDates::nowString();

        $id = DB::table('calendar_events')->insertGetId(
            $this->eventAttributes($request, $title, $eventDate) + [
                'created_by' => $employeeId,
                'updated_by' => $employeeId,
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        return response()->json(['data' => ['id' => $id]], 201);
    }

    public function updateEvent(Request $request, int $id): JsonResponse
    {
        $title = trim((string) $request->input('title'));
        $eventDate = DbDates::parseDateOnly($request->input('eventDate'));

        if ($title === '' || ! $eventDate) {
            return response()->json(['message' => 'Title and event date are required.'], 422);
        }

        DB::table('calendar_events')->where('id', $id)->update(
            $this->eventAttributes($request, $title, $eventDate) + [
                'updated_by' => OfficeAuth::currentId($request),
                'updated_at' => DbDates::nowString(),
            ]
        );

        return response()->json(['message' => 'Event updated.']);
    }

    public function destroyEvent(int $id): JsonResponse
    {
        DB::table('calendar_events')->where('id', $id)->delete();

        return response()->json(['message' => 'Event deleted.']);
    }

    // ─── Helpers ───────────────────────────────────────────────────

    private function eventAttributes(Request $request, string $title, string $eventDate): array
    {
        return [
            'title' => $title,
            'description' => $request->input('description') ?: null,
            'event_date' => $eventDate,
            'event_time' => DbDates::parseTimeOnly($request->input('eventTime')),
            'event_type' => $request->input('eventType') ?: 'task',
            'client_name' => $request->input('clientName') ?: null,
            'company_name' => $request->input('companyName') ?: null,
            'priority' => $request->input('priority') ?: 'Medium',
            'status' => $request->input('status') ?: 'Pending',
            'linked_row_key' => $request->input('linkedRowKey') ?: null,
            'assigned_employee_id' => (int) $request->input('assignedEmployeeId') ?: null,
        ];
    }

    /** Full per-row values so each event can carry the whole client record. */
    private function buildRowData(int $sheetId, $allColumns, $rowKeys, ?int $employeeId): array
    {
        if ($rowKeys->isEmpty()) {
            return [];
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

            if (! $column) {
                continue;
            }

            $rowData[$cell->row_key][$column->column_key] = SheetCells::readValue($cell, $column->data_type);
        }

        // Last/Next meeting columns are never persisted — compute them here
        // too so the hover card matches the management sheet.
        $meetingTimeColumns = $allColumns->whereIn('data_type', SheetCells::COMPUTED_TYPES);

        if ($meetingTimeColumns->isNotEmpty()) {
            $timesByRowKey = MeetingCallTimes::compute($rowKeys->all(), $employeeId);

            foreach ($rowKeys as $rowKey) {
                if (! isset($rowData[$rowKey])) {
                    continue;
                }

                $times = $timesByRowKey[$rowKey] ?? null;

                foreach ($meetingTimeColumns as $column) {
                    $isLast = $column->data_type === 'last_meeting_time';
                    $meetingRaw = $isLast ? ($times['lastMeeting'] ?? null) : ($times['nextMeeting'] ?? null);
                    $callRaw = $isLast ? ($times['lastCall'] ?? null) : ($times['nextCall'] ?? null);

                    // Meeting first, call as fallback — matches ManagementPage.
                    $rowData[$rowKey][$column->column_key] = $meetingRaw ?: ($callRaw ?: '');
                    $rowData[$rowKey][$column->column_key.'__meeting'] = $meetingRaw ?: '';
                    $rowData[$rowKey][$column->column_key.'__call'] = $callRaw ?: '';
                }
            }
        }

        return $rowData;
    }

    private function findClientNameColumn($allColumns): ?object
    {
        $exact = $allColumns->first(fn ($column) => strtolower($column->column_name) === 'client name');

        if ($exact) {
            return $exact;
        }

        return $allColumns->first(function ($column) {
            $name = strtolower($column->column_name);

            return $column->data_type === 'text'
                && str_contains($name, 'client')
                && ! str_contains($name, 'email')
                && ! str_contains($name, 'phone');
        });
    }

    private function inferEventType(string $columnName): string
    {
        $name = strtolower($columnName);

        return match (true) {
            str_contains($name, 'next'), str_contains($name, 'upcoming') => 'upcoming',
            str_contains($name, 'meeting'), str_contains($name, 'call') => 'meeting',
            str_contains($name, 'follow') => 'followup',
            str_contains($name, 'deadline'), str_contains($name, 'due') => 'deadline',
            default => 'task',
        };
    }
}
