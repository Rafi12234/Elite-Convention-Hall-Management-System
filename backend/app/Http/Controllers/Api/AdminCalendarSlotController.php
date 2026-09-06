<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class AdminCalendarSlotController extends Controller
{
    private function authenticatedAdmin(Request $request): ?object
    {
        $token = $request->bearerToken();

        if (! $token) {
            return null;
        }

        return DB::table('users')
            ->where('api_token_hash', hash('sha256', $token))
            ->where('user_type', 'Super Admin')
            ->where('status', 'active')
            ->first();
    }

    private function unauthenticatedAdminResponse(): JsonResponse
    {
        return response()->json([
            'message' => 'Unauthenticated admin.',
        ], 401);
    }

    public function index(Request $request): JsonResponse
    {
        if (! $this->authenticatedAdmin($request)) {
            return $this->unauthenticatedAdminResponse();
        }

        $validated = $request->validate([
            'hall_id' => ['nullable', 'integer', 'exists:halls,id'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        ]);

        $hallId = (int) ($validated['hall_id'] ?? 1);

        $startDate = isset($validated['start_date'])
            ? Carbon::parse($validated['start_date'])->toDateString()
            : Carbon::today()->toDateString();

        $endDate = isset($validated['end_date'])
            ? Carbon::parse($validated['end_date'])->toDateString()
            : Carbon::today()->addDays(30)->toDateString();

        $slots = DB::table('booking_slots as bs')
            ->leftJoin('halls as h', 'bs.hall_id', '=', 'h.id')
            ->leftJoin('shifts as s', 'bs.shift_id', '=', 's.id')
            ->where('bs.hall_id', $hallId)
            ->whereBetween('bs.slot_date', [$startDate, $endDate])
            ->orderBy('bs.slot_date')
            ->orderBy('s.sort_order')
            ->orderBy('bs.shift_id')
            ->select([
                'bs.id',
                'bs.hall_id',
                'h.name as hall_name',
                'bs.shift_id',
                's.name as shift_name',
                's.start_time',
                's.end_time',
                'bs.slot_date',
                'bs.slot_status',
                'bs.hold_token',
                'bs.hold_expires_at',
                'bs.hold_booking_id',
                'bs.created_at',
                'bs.updated_at',
            ])
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Admin calendar slots loaded successfully.',
            'data' => [
                'slots' => $slots,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'hall_id' => $hallId,
            ],
        ]);
    }

    public function generateUntil(Request $request): JsonResponse
    {
        if (! $this->authenticatedAdmin($request)) {
            return $this->unauthenticatedAdminResponse();
        }

        $validated = $request->validate([
            'hall_id' => ['nullable', 'integer', 'exists:halls,id'],
            'until_date' => ['required', 'date', 'after_or_equal:today'],
        ]);

        $hallId = (int) ($validated['hall_id'] ?? 1);
        $startDate = Carbon::today()->startOfDay();
        $untilDate = Carbon::parse($validated['until_date'])->startOfDay();

        if ($untilDate->gt(Carbon::today()->addYears(3))) {
            return response()->json([
                'success' => false,
                'message' => 'For safety, you can generate slots for maximum 3 years from today.',
            ], 422);
        }

        $shifts = DB::table('shifts')
            ->select('id', 'name', 'sort_order')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        if ($shifts->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No shifts found. Please add shifts first.',
            ], 422);
        }

        $created = 0;
        $updatedToAvailable = 0;
        $keptLocked = 0;
        $lockedStatuses = ['booked', 'payment_in_progress', 'pending_approval', 'blocked'];

        try {
            DB::transaction(function () use (
                $hallId,
                $startDate,
                $untilDate,
                $shifts,
                &$created,
                &$updatedToAvailable,
                &$keptLocked,
                $lockedStatuses
            ) {
                foreach (CarbonPeriod::create($startDate, $untilDate) as $date) {
                    $slotDate = $date->toDateString();

                    foreach ($shifts as $shift) {
                        $slot = DB::table('booking_slots')
                            ->where('hall_id', $hallId)
                            ->where('shift_id', $shift->id)
                            ->where('slot_date', $slotDate)
                            ->lockForUpdate()
                            ->first();

                        if (! $slot) {
                            DB::table('booking_slots')->insert([
                                'hall_id' => $hallId,
                                'shift_id' => $shift->id,
                                'slot_date' => $slotDate,
                                'slot_status' => 'available',
                                'hold_token' => null,
                                'hold_expires_at' => null,
                                'hold_booking_id' => null,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);

                            $created++;
                            continue;
                        }

                        if (in_array($slot->slot_status, $lockedStatuses, true)) {
                            $keptLocked++;
                            continue;
                        }

                        DB::table('booking_slots')
                            ->where('id', $slot->id)
                            ->update([
                                'slot_status' => 'available',
                                'hold_token' => null,
                                'hold_expires_at' => null,
                                'hold_booking_id' => null,
                                'updated_at' => now(),
                            ]);

                        $updatedToAvailable++;
                    }
                }
            });

            return response()->json([
                'success' => true,
                'message' => 'Calendar slots updated successfully. Booked, payment in progress, pending approval, and blocked slots were not changed.',
                'data' => [
                    'from_date' => $startDate->toDateString(),
                    'until_date' => $untilDate->toDateString(),
                    'created' => $created,
                    'updated_to_available' => $updatedToAvailable,
                    'kept_locked' => $keptLocked,
                    'kept_booked' => $keptLocked,
                ],
            ]);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate calendar slots.',
            ], 500);
        }
    }

    public function updateStatus(Request $request): JsonResponse
    {
        if (! $this->authenticatedAdmin($request)) {
            return $this->unauthenticatedAdminResponse();
        }

        $validated = $request->validate([
            'hall_id' => ['nullable', 'integer', 'exists:halls,id'],
            'slot_date' => ['required', 'date', 'after_or_equal:today'],
            'shift_id' => ['required', 'integer', 'exists:shifts,id'],
            'slot_status' => ['required', 'string', 'in:available,blocked'],
        ]);

        $hallId = (int) ($validated['hall_id'] ?? 1);
        $slotDate = Carbon::parse($validated['slot_date'])->toDateString();
        $shiftId = (int) $validated['shift_id'];
        $newStatus = $validated['slot_status'];

        try {
            $slotId = null;

            DB::transaction(function () use ($hallId, $slotDate, $shiftId, $newStatus, &$slotId) {
                $slot = DB::table('booking_slots')
                    ->where('hall_id', $hallId)
                    ->where('shift_id', $shiftId)
                    ->where('slot_date', $slotDate)
                    ->lockForUpdate()
                    ->first();

                if ($slot && in_array($slot->slot_status, ['booked', 'payment_in_progress', 'pending_approval'], true)) {
                    throw new \RuntimeException('LOCKED_SLOT_CANNOT_BE_CHANGED');
                }

                if (! $slot) {
                    $slotId = DB::table('booking_slots')->insertGetId([
                        'hall_id' => $hallId,
                        'shift_id' => $shiftId,
                        'slot_date' => $slotDate,
                        'slot_status' => $newStatus,
                        'hold_token' => null,
                        'hold_expires_at' => null,
                        'hold_booking_id' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    return;
                }

                $slotId = $slot->id;

                DB::table('booking_slots')
                    ->where('id', $slot->id)
                    ->update([
                        'slot_status' => $newStatus,
                        'hold_token' => null,
                        'hold_expires_at' => null,
                        'hold_booking_id' => null,
                        'updated_at' => now(),
                    ]);
            });

            $slot = $this->findSlotById($slotId);

            return response()->json([
                'success' => true,
                'message' => $newStatus === 'blocked'
                    ? 'Slot blocked successfully.'
                    : 'Slot marked as available successfully.',
                'data' => [
                    'slot' => $slot,
                ],
            ]);
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'LOCKED_SLOT_CANNOT_BE_CHANGED') {
                return response()->json([
                    'success' => false,
                    'message' => 'This slot is already booked, payment in progress, or pending approval. It cannot be changed from this page.',
                ], 422);
            }

            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update slot status.',
            ], 500);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update slot status.',
            ], 500);
        }
    }

    private function findSlotById(int $slotId): ?object
    {
        return DB::table('booking_slots as bs')
            ->leftJoin('halls as h', 'bs.hall_id', '=', 'h.id')
            ->leftJoin('shifts as s', 'bs.shift_id', '=', 's.id')
            ->where('bs.id', $slotId)
            ->select([
                'bs.id',
                'bs.hall_id',
                'h.name as hall_name',
                'bs.shift_id',
                's.name as shift_name',
                's.start_time',
                's.end_time',
                'bs.slot_date',
                'bs.slot_status',
                'bs.hold_token',
                'bs.hold_expires_at',
                'bs.hold_booking_id',
                'bs.created_at',
                'bs.updated_at',
            ])
            ->first();
    }
}