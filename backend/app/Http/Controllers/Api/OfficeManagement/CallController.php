<?php

namespace App\Http\Controllers\Api\OfficeManagement;

use App\Http\Controllers\Controller;
use App\Support\Office\DbDates;
use App\Support\Office\OfficeAuth;
use App\Support\Office\SheetLookup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Client call log + next-call scheduling.
 * Ported from MME's callsController.js.
 */
class CallController extends Controller
{
    public function index(string $rowKey): JsonResponse
    {
        if (! SheetLookup::isValidRowKey($rowKey)) {
            return response()->json(['message' => 'Invalid client reference.'], 400);
        }

        $sheetId = SheetLookup::defaultSheetId();

        $calls = DB::table('client_calls as c')
            ->leftJoin('employees as cb', 'cb.id', '=', 'c.created_by')
            ->leftJoin('employees as ub', 'ub.id', '=', 'c.updated_by')
            ->leftJoin('employees as ab', 'ab.id', '=', 'c.assigned_by_employee_id')
            ->leftJoin('client_next_calls as nc', 'nc.call_id', '=', 'c.id')
            ->leftJoin('employees as na', 'na.id', '=', 'nc.assigned_employee_id')
            ->where('c.linked_row_key', $rowKey)
            // Newest first so a freshly added call appears at the top.
            ->orderByDesc('c.id')
            ->get([
                'c.id', 'c.created_by', 'c.call_datetime', 'c.call_discussion',
                'c.created_at', 'c.updated_at',
                'nc.next_call_datetime', 'nc.assigned_employee_id as next_assigned_id',
                'na.full_name as next_assigned_name',
                'ab.full_name as assigned_by_name',
                'cb.full_name as created_by_name',
                'ub.full_name as updated_by_name',
            ]);

        return response()->json([
            'data' => [
                'rowKey' => $rowKey,
                'clientName' => SheetLookup::clientName($sheetId, $rowKey),
                'eventDate' => SheetLookup::eventDate($sheetId, $rowKey),
                'calls' => $calls->map(fn ($call) => [
                    'id' => (int) $call->id,
                    'createdById' => $call->created_by ? (int) $call->created_by : null,
                    'callDatetime' => DbDates::formatDateTime($call->call_datetime),
                    'callDiscussion' => $call->call_discussion,
                    'nextCallDatetime' => DbDates::formatDateTime($call->next_call_datetime),
                    'nextCallAssignedEmployeeId' => $call->next_assigned_id ? (int) $call->next_assigned_id : null,
                    'nextCallAssignedEmployeeName' => $call->next_assigned_name,
                    'assignedByEmployeeName' => $call->assigned_by_name,
                    'createdByName' => $call->created_by_name,
                    'updatedByName' => $call->updated_by_name,
                    'createdAt' => DbDates::formatDateTime($call->created_at),
                    'updatedAt' => DbDates::formatDateTime($call->updated_at),
                ])->values(),
            ],
        ]);
    }

    public function store(Request $request, string $rowKey): JsonResponse
    {
        if (! SheetLookup::isValidRowKey($rowKey)) {
            return response()->json(['message' => 'Invalid client reference.'], 400);
        }

        $employeeId = OfficeAuth::currentId($request);
        $discussion = $request->input('callDiscussion');

        // Whoever set the pending follow-up gets credited as the assigner.
        $pending = DB::table('client_next_calls')
            ->where('linked_row_key', $rowKey)
            ->first(['updated_by', 'created_by']);

        $assignedBy = $pending->updated_by ?? $pending->created_by ?? null;

        $now = DbDates::nowString();

        // The call time is always the server's current moment, never
        // employee-supplied, so a call can't be backdated.
        $id = DB::table('client_calls')->insertGetId([
            'linked_row_key' => $rowKey,
            'call_datetime' => $now,
            'call_discussion' => $discussion !== null ? (string) $discussion : null,
            'created_by' => $employeeId,
            'updated_by' => $employeeId,
            'assigned_by_employee_id' => $assignedBy,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // Logging this call fulfils any earlier pending follow-up, so stale
        // schedules must go — otherwise a passed date keeps winning as "soonest".
        DB::table('client_next_calls')
            ->where('linked_row_key', $rowKey)
            ->where('call_id', '!=', $id)
            ->delete();

        return response()->json(['data' => ['id' => $id]], 201);
    }

    public function update(Request $request, string $rowKey, int $callId): JsonResponse
    {
        if (! SheetLookup::isValidRowKey($rowKey) || $callId <= 0) {
            return response()->json(['message' => 'Invalid reference.'], 400);
        }

        $existing = DB::table('client_calls as c')
            ->leftJoin('client_next_calls as nc', 'nc.call_id', '=', 'c.id')
            ->where('c.id', $callId)
            ->where('c.linked_row_key', $rowKey)
            ->first(['c.id', 'nc.next_call_datetime']);

        if (! $existing) {
            return response()->json(['message' => 'Call not found.'], 404);
        }

        $employeeId = OfficeAuth::currentId($request);
        $discussion = $request->input('callDiscussion');
        $rawNextCall = $request->input('nextCallDatetime');
        $nextCallDatetime = DbDates::parseDateTimeLocal($rawNextCall);
        $nextAssignedId = SheetLookup::validId($request->input('nextCallAssignedEmployeeId'));

        // Only re-validate the follow-up date when it actually changed, so an
        // existing past date never blocks unrelated edits.
        $changed = DbDates::formatDateTime($existing->next_call_datetime) !== $nextCallDatetime;

        if ($changed && $rawNextCall && $this->isNextCallDateTooEarly($rawNextCall)) {
            return response()->json([
                'message' => 'Next meeting call date cannot be before today. Any time of day is fine.',
            ], 422);
        }

        DB::table('client_calls')
            ->where('id', $callId)
            ->where('linked_row_key', $rowKey)
            ->update([
                'call_discussion' => $discussion !== null ? (string) $discussion : null,
                'updated_by' => $employeeId,
                'updated_at' => DbDates::nowString(),
            ]);

        if ($nextCallDatetime) {
            $now = DbDates::nowString();
            $existingNextId = DB::table('client_next_calls')->where('call_id', $callId)->value('id');

            if ($existingNextId) {
                DB::table('client_next_calls')->where('id', $existingNextId)->update([
                    'next_call_datetime' => $nextCallDatetime,
                    'assigned_employee_id' => $nextAssignedId,
                    'updated_by' => $employeeId,
                    'updated_at' => $now,
                ]);
            } else {
                DB::table('client_next_calls')->insert([
                    'call_id' => $callId,
                    'linked_row_key' => $rowKey,
                    'next_call_datetime' => $nextCallDatetime,
                    'assigned_employee_id' => $nextAssignedId,
                    'created_by' => $employeeId,
                    'updated_by' => $employeeId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        } else {
            DB::table('client_next_calls')->where('call_id', $callId)->delete();
        }

        return response()->json(['data' => ['id' => $callId]]);
    }

    public function destroy(string $rowKey, int $callId): JsonResponse
    {
        if (! SheetLookup::isValidRowKey($rowKey) || $callId <= 0) {
            return response()->json(['message' => 'Invalid reference.'], 400);
        }

        $deleted = DB::table('client_calls')
            ->where('id', $callId)
            ->where('linked_row_key', $rowKey)
            ->delete();

        if (! $deleted) {
            return response()->json(['message' => 'Call not found.'], 404);
        }

        return response()->json(['data' => ['id' => $callId]]);
    }

    /** Compares the date part only; the follow-up's time of day is unrestricted. */
    private function isNextCallDateTooEarly(mixed $datetimeLocalValue): bool
    {
        $value = substr(trim((string) $datetimeLocalValue), 0, 10);

        if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return false;
        }

        return $value < DbDates::todayString();
    }
}
