<?php

namespace App\Http\Controllers\Api\OfficeManagement\Admin;

use App\Http\Controllers\Api\OfficeManagement\CallController;
use App\Http\Controllers\Api\OfficeManagement\MeetingController;
use App\Http\Controllers\Controller;
use App\Support\Office\DbDates;
use App\Support\Office\OfficeAuth;
use App\Support\Office\SheetLookup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Company-wide meeting/call activity audit and admin follow-up overrides.
 * Ported from MME's adminActivityController.js.
 */
class AdminActivityController extends Controller
{
    public function meetings(): JsonResponse
    {
        $meetings = DB::table('client_meetings as m')
            ->leftJoin('employees as cb', 'cb.id', '=', 'm.created_by')
            ->leftJoin('employees as ab', 'ab.id', '=', 'm.assigned_by_employee_id')
            ->leftJoin('client_next_meetings as nm', 'nm.meeting_id', '=', 'm.id')
            ->leftJoin('employees as na', 'na.id', '=', 'nm.assigned_employee_id')
            ->orderByRaw('m.meeting_datetime IS NULL, m.meeting_datetime DESC')
            ->orderByDesc('m.id')
            ->get([
                'm.id', 'm.linked_row_key', 'm.meeting_datetime', 'm.discussion_notes',
                'cb.full_name as created_by_name', 'ab.full_name as assigned_by_name',
                'nm.id as next_id', 'nm.next_meeting_datetime',
                'nm.assigned_employee_id as next_assigned_id', 'na.full_name as next_assigned_name',
            ]);

        $clientNames = SheetLookup::clientNames(SheetLookup::defaultSheetId(), $meetings->pluck('linked_row_key'));

        $itemsByMeeting = DB::table('meeting_items')
            ->whereIn('meeting_id', $meetings->pluck('id'))
            ->orderBy('id')
            ->get()
            ->groupBy('meeting_id');

        return response()->json([
            'data' => $meetings->map(function ($meeting) use ($clientNames, $itemsByMeeting) {
                $items = $itemsByMeeting->get($meeting->id, collect());

                return [
                    'id' => (int) $meeting->id,
                    'rowKey' => $meeting->linked_row_key,
                    'clientName' => $clientNames[$meeting->linked_row_key] ?? '',
                    'meetingDatetime' => DbDates::formatDateTime($meeting->meeting_datetime),
                    'hasCompletedDetails' => trim((string) $meeting->discussion_notes) !== '' || count($items) > 0,
                    'createdByName' => $meeting->created_by_name,
                    'assignedByEmployeeName' => $meeting->assigned_by_name,
                    'items' => collect($items)->map(fn ($item) => [
                        'id' => (int) $item->id,
                        'itemKey' => $item->item_key,
                        'customLabel' => $item->custom_label ?? '',
                        'description' => $item->description ?? '',
                        'quantity' => (int) ($item->quantity ?? 1),
                    ])->values(),
                    'nextMeeting' => $meeting->next_id ? [
                        'id' => (int) $meeting->next_id,
                        'nextMeetingDatetime' => DbDates::formatDateTime($meeting->next_meeting_datetime),
                        'assignedEmployeeId' => $meeting->next_assigned_id ? (int) $meeting->next_assigned_id : null,
                        'assignedEmployeeName' => $meeting->next_assigned_name,
                    ] : null,
                ];
            })->values(),
        ]);
    }

    public function calls(): JsonResponse
    {
        $calls = DB::table('client_calls as c')
            ->leftJoin('employees as cb', 'cb.id', '=', 'c.created_by')
            ->leftJoin('employees as ab', 'ab.id', '=', 'c.assigned_by_employee_id')
            ->leftJoin('client_next_calls as nc', 'nc.call_id', '=', 'c.id')
            ->leftJoin('employees as na', 'na.id', '=', 'nc.assigned_employee_id')
            ->orderByRaw('c.call_datetime IS NULL, c.call_datetime DESC')
            ->orderByDesc('c.id')
            ->get([
                'c.id', 'c.linked_row_key', 'c.call_datetime', 'c.call_discussion',
                'cb.full_name as created_by_name', 'ab.full_name as assigned_by_name',
                'nc.id as next_id', 'nc.next_call_datetime',
                'nc.assigned_employee_id as next_assigned_id', 'na.full_name as next_assigned_name',
            ]);

        $clientNames = SheetLookup::clientNames(SheetLookup::defaultSheetId(), $calls->pluck('linked_row_key'));

        return response()->json([
            'data' => $calls->map(fn ($call) => [
                'id' => (int) $call->id,
                'rowKey' => $call->linked_row_key,
                'clientName' => $clientNames[$call->linked_row_key] ?? '',
                'callDatetime' => DbDates::formatDateTime($call->call_datetime),
                'hasCompletedDetails' => trim((string) $call->call_discussion) !== '',
                'discussion' => $call->call_discussion,
                'createdByName' => $call->created_by_name,
                'assignedByEmployeeName' => $call->assigned_by_name,
                'nextCall' => $call->next_id ? [
                    'id' => (int) $call->next_id,
                    'nextCallDatetime' => DbDates::formatDateTime($call->next_call_datetime),
                    'assignedEmployeeId' => $call->next_assigned_id ? (int) $call->next_assigned_id : null,
                    'assignedEmployeeName' => $call->next_assigned_name,
                ] : null,
            ])->values(),
        ]);
    }

    /** Admin drill-down: identical payload to the employee meetings page. */
    public function clientMeetings(string $rowKey): JsonResponse
    {
        return app(MeetingController::class)->index($rowKey);
    }

    /** Admin drill-down: identical payload to the employee calls page. */
    public function clientCalls(string $rowKey): JsonResponse
    {
        return app(CallController::class)->index($rowKey);
    }

    public function updateNextMeeting(Request $request, int $meetingId): JsonResponse
    {
        if ($meetingId <= 0) {
            return response()->json(['message' => 'Invalid meeting reference.'], 400);
        }

        $meeting = DB::table('client_meetings')->where('id', $meetingId)->first(['id', 'linked_row_key']);

        if (! $meeting) {
            return response()->json(['message' => 'Meeting not found.'], 404);
        }

        $datetime = DbDates::parseDateTimeLocal($request->input('nextMeetingDatetime'));
        $assignedId = SheetLookup::validId($request->input('assignedEmployeeId'));

        if (! $datetime) {
            DB::table('client_next_meetings')->where('meeting_id', $meetingId)->delete();

            return response()->json(['data' => ['meetingId' => $meetingId, 'nextMeeting' => null]]);
        }

        $this->upsertFollowUp(
            'client_next_meetings',
            'meeting_id',
            $meetingId,
            'next_meeting_datetime',
            $datetime,
            $assignedId,
            $meeting->linked_row_key,
            OfficeAuth::currentId($request)
        );

        $saved = DB::table('client_next_meetings as nm')
            ->leftJoin('employees as na', 'na.id', '=', 'nm.assigned_employee_id')
            ->where('nm.meeting_id', $meetingId)
            ->first(['nm.id', 'nm.next_meeting_datetime', 'nm.assigned_employee_id', 'na.full_name as assigned_name']);

        return response()->json([
            'data' => [
                'meetingId' => $meetingId,
                'nextMeeting' => [
                    'id' => (int) $saved->id,
                    'nextMeetingDatetime' => DbDates::formatDateTime($saved->next_meeting_datetime),
                    'assignedEmployeeId' => $saved->assigned_employee_id ? (int) $saved->assigned_employee_id : null,
                    'assignedEmployeeName' => $saved->assigned_name,
                ],
            ],
        ]);
    }

    public function updateNextCall(Request $request, int $callId): JsonResponse
    {
        if ($callId <= 0) {
            return response()->json(['message' => 'Invalid call reference.'], 400);
        }

        $call = DB::table('client_calls')->where('id', $callId)->first(['id', 'linked_row_key']);

        if (! $call) {
            return response()->json(['message' => 'Call not found.'], 404);
        }

        $datetime = DbDates::parseDateTimeLocal($request->input('nextCallDatetime'));
        $assignedId = SheetLookup::validId($request->input('assignedEmployeeId'));

        if (! $datetime) {
            DB::table('client_next_calls')->where('call_id', $callId)->delete();

            return response()->json(['data' => ['callId' => $callId, 'nextCall' => null]]);
        }

        $this->upsertFollowUp(
            'client_next_calls',
            'call_id',
            $callId,
            'next_call_datetime',
            $datetime,
            $assignedId,
            $call->linked_row_key,
            OfficeAuth::currentId($request)
        );

        $saved = DB::table('client_next_calls as nc')
            ->leftJoin('employees as na', 'na.id', '=', 'nc.assigned_employee_id')
            ->where('nc.call_id', $callId)
            ->first(['nc.id', 'nc.next_call_datetime', 'nc.assigned_employee_id', 'na.full_name as assigned_name']);

        return response()->json([
            'data' => [
                'callId' => $callId,
                'nextCall' => [
                    'id' => (int) $saved->id,
                    'nextCallDatetime' => DbDates::formatDateTime($saved->next_call_datetime),
                    'assignedEmployeeId' => $saved->assigned_employee_id ? (int) $saved->assigned_employee_id : null,
                    'assignedEmployeeName' => $saved->assigned_name,
                ],
            ],
        ]);
    }

    private function upsertFollowUp(
        string $table,
        string $parentColumn,
        int $parentId,
        string $datetimeColumn,
        string $datetime,
        ?int $assignedId,
        string $rowKey,
        ?int $adminId
    ): void {
        $now = DbDates::nowString();
        $existingId = DB::table($table)->where($parentColumn, $parentId)->value('id');

        if ($existingId) {
            DB::table($table)->where('id', $existingId)->update([
                $datetimeColumn => $datetime,
                'assigned_employee_id' => $assignedId,
                'updated_by' => $adminId,
                'updated_at' => $now,
            ]);
        } else {
            DB::table($table)->insert([
                $parentColumn => $parentId,
                'linked_row_key' => $rowKey,
                $datetimeColumn => $datetime,
                'assigned_employee_id' => $assignedId,
                'created_by' => $adminId,
                'updated_by' => $adminId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
}
