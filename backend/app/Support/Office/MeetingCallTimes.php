<?php

namespace App\Support\Office;

use Illuminate\Support\Facades\DB;

/**
 * Ported from MME's utils/meetingCallTimes.js. Shared by the management
 * sheet and the calendar so "last/next meeting" and "last/next call" are
 * computed identically in both places.
 *
 * Returns [rowKey => ['lastMeeting'|'nextMeeting'|'lastCall'|'nextCall' => ?string]].
 */
class MeetingCallTimes
{
    public static function compute(array $rowKeys, ?int $employeeId = null): array
    {
        if (! $rowKeys) {
            return [];
        }

        // Past meetings/calls only count as "mine" when I logged them myself,
        // while upcoming follow-ups belong to whoever they're assigned to.
        $meetings = DB::table('client_meetings as m')
            ->leftJoin('meeting_items as mi', 'mi.meeting_id', '=', 'm.id')
            ->whereIn('m.linked_row_key', $rowKeys)
            ->whereNotNull('m.meeting_datetime')
            ->when($employeeId, fn ($q) => $q->where('m.created_by', $employeeId))
            ->groupBy('m.id', 'm.linked_row_key', 'm.meeting_datetime')
            ->havingRaw('COUNT(mi.id) > 0')
            ->get(['m.linked_row_key', 'm.meeting_datetime']);

        $calls = DB::table('client_calls')
            ->whereIn('linked_row_key', $rowKeys)
            ->whereNotNull('call_datetime')
            ->whereRaw("COALESCE(TRIM(call_discussion), '') <> ''")
            ->when($employeeId, fn ($q) => $q->where('created_by', $employeeId))
            ->get(['linked_row_key', 'call_datetime']);

        $nextCalls = DB::table('client_next_calls')
            ->whereIn('linked_row_key', $rowKeys)
            ->when($employeeId, fn ($q) => $q->where('assigned_employee_id', $employeeId))
            ->get(['linked_row_key', 'next_call_datetime']);

        $nextMeetings = DB::table('client_next_meetings')
            ->whereIn('linked_row_key', $rowKeys)
            ->when($employeeId, fn ($q) => $q->where('assigned_employee_id', $employeeId))
            ->get(['linked_row_key', 'next_meeting_datetime']);

        $now = DbDates::nowString();
        $result = [];

        $entry = function (string $rowKey) use (&$result): void {
            $result[$rowKey] ??= [
                'lastMeeting' => null,
                'nextMeeting' => null,
                'lastCall' => null,
                'nextCall' => null,
            ];
        };

        foreach ($meetings as $meeting) {
            $entry($meeting->linked_row_key);
            $row = &$result[$meeting->linked_row_key];
            $at = DbDates::formatDateTime($meeting->meeting_datetime);

            if ($at <= $now) {
                if (! $row['lastMeeting'] || $at > $row['lastMeeting']) {
                    $row['lastMeeting'] = $at;
                }
            } elseif (! $row['nextMeeting'] || $at < $row['nextMeeting']) {
                $row['nextMeeting'] = $at;
            }
            unset($row);
        }

        foreach ($calls as $call) {
            $entry($call->linked_row_key);
            $row = &$result[$call->linked_row_key];
            $at = DbDates::formatDateTime($call->call_datetime);

            if ($at <= $now) {
                if (! $row['lastCall'] || $at > $row['lastCall']) {
                    $row['lastCall'] = $at;
                }
            } elseif (! $row['nextCall'] || $at < $row['nextCall']) {
                $row['nextCall'] = $at;
            }
            unset($row);
        }

        // An explicit follow-up wins whenever it lands sooner than the
        // record's own still-upcoming time.
        foreach ($nextCalls as $nextCall) {
            $entry($nextCall->linked_row_key);
            $row = &$result[$nextCall->linked_row_key];
            $at = DbDates::formatDateTime($nextCall->next_call_datetime);

            if (! $row['nextCall'] || $at < $row['nextCall']) {
                $row['nextCall'] = $at;
            }
            unset($row);
        }

        foreach ($nextMeetings as $nextMeeting) {
            $entry($nextMeeting->linked_row_key);
            $row = &$result[$nextMeeting->linked_row_key];
            $at = DbDates::formatDateTime($nextMeeting->next_meeting_datetime);

            if (! $row['nextMeeting'] || $at < $row['nextMeeting']) {
                $row['nextMeeting'] = $at;
            }
            unset($row);
        }

        return $result;
    }
}
