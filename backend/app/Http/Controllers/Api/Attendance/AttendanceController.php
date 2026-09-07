<?php

namespace App\Http\Controllers\Api\Attendance;

use App\Http\Controllers\Controller;
use App\Support\Office\DbDates;
use App\Support\Office\OfficeAuth;
use App\Support\Office\OfficeLocation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * GPS-based employee sign-in / sign-out.
 * Ported from the Make My Event Attendance module.
 *
 * Dates and timestamps are always backend-generated in the business
 * timezone — never taken from client input.
 */
class AttendanceController extends Controller
{
    public function today(Request $request): JsonResponse
    {
        $row = DB::table('attendances')
            ->where('employee_id', OfficeAuth::currentId($request))
            ->where('attendance_date', DbDates::todayString())
            ->first();

        return response()->json(['data' => $this->serialize($row)]);
    }

    public function signIn(Request $request): JsonResponse
    {
        $coords = $this->parseCoordinates($request);

        if (isset($coords['error'])) {
            return response()->json(['message' => $coords['error']], 422);
        }

        $employeeId = OfficeAuth::currentId($request);
        $attendanceDate = DbDates::todayString();

        $existing = DB::table('attendances')
            ->where('employee_id', $employeeId)
            ->where('attendance_date', $attendanceDate)
            ->exists();

        if ($existing) {
            return response()->json(['message' => 'You already signed in today.'], 409);
        }

        ['distanceFromOffice' => $distance, 'isInsideOffice' => $inside] =
            OfficeLocation::officeDistance($coords['latitude'], $coords['longitude']);

        $now = DbDates::nowString();

        try {
            $id = DB::table('attendances')->insertGetId([
                'employee_id' => $employeeId,
                'attendance_date' => $attendanceDate,
                'sign_in_at' => $now,
                'sign_in_latitude' => $coords['latitude'],
                'sign_in_longitude' => $coords['longitude'],
                'sign_in_accuracy' => $coords['accuracy'],
                'sign_in_distance_from_office' => round($distance, 2),
                'sign_in_inside_office' => $inside ? 1 : 0,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        } catch (\Illuminate\Database\UniqueConstraintViolationException) {
            // Two near-simultaneous requests can both pass the check above;
            // the unique index is the real guard.
            return response()->json(['message' => 'You already signed in today.'], 409);
        }

        return response()->json([
            'data' => $this->serialize(DB::table('attendances')->where('id', $id)->first()),
        ], 201);
    }

    public function signOut(Request $request): JsonResponse
    {
        $coords = $this->parseCoordinates($request);

        if (isset($coords['error'])) {
            return response()->json(['message' => $coords['error']], 422);
        }

        $existing = DB::table('attendances')
            ->where('employee_id', OfficeAuth::currentId($request))
            ->where('attendance_date', DbDates::todayString())
            ->first();

        if (! $existing) {
            return response()->json(['message' => 'Please sign in first.'], 409);
        }

        if ($existing->sign_out_at) {
            return response()->json(['message' => 'You already signed out today.'], 409);
        }

        ['distanceFromOffice' => $distance, 'isInsideOffice' => $inside] =
            OfficeLocation::officeDistance($coords['latitude'], $coords['longitude']);

        $now = DbDates::nowString();

        DB::table('attendances')->where('id', $existing->id)->update([
            'sign_out_at' => $now,
            'sign_out_latitude' => $coords['latitude'],
            'sign_out_longitude' => $coords['longitude'],
            'sign_out_accuracy' => $coords['accuracy'],
            'sign_out_distance_from_office' => round($distance, 2),
            'sign_out_inside_office' => $inside ? 1 : 0,
            'updated_at' => $now,
        ]);

        return response()->json([
            'data' => $this->serialize(DB::table('attendances')->where('id', $existing->id)->first()),
        ]);
    }

    public function history(Request $request): JsonResponse
    {
        $limit = (int) $request->query('limit');
        $limit = $limit > 0 ? min($limit, 100) : 30;

        $rows = DB::table('attendances')
            ->where('employee_id', OfficeAuth::currentId($request))
            ->orderByDesc('attendance_date')
            ->limit($limit)
            ->get();

        return response()->json([
            'data' => $rows->map(fn ($row) => $this->serialize($row))->values(),
        ]);
    }

    /** Client-reported GPS is never trusted blindly. */
    private function parseCoordinates(Request $request): array
    {
        $latitude = $request->input('latitude');
        $longitude = $request->input('longitude');
        $accuracy = $request->input('accuracy');

        if (! is_numeric($latitude) || $latitude < -90 || $latitude > 90) {
            return ['error' => 'A valid latitude between -90 and 90 is required.'];
        }

        if (! is_numeric($longitude) || $longitude < -180 || $longitude > 180) {
            return ['error' => 'A valid longitude between -180 and 180 is required.'];
        }

        if ($accuracy === null || $accuracy === '') {
            $accuracy = null;
        } elseif (! is_numeric($accuracy) || $accuracy < 0) {
            return ['error' => 'Accuracy must be a non-negative number.'];
        } else {
            $accuracy = (float) $accuracy;
        }

        return [
            'latitude' => (float) $latitude,
            'longitude' => (float) $longitude,
            'accuracy' => $accuracy,
        ];
    }

    public static function serializeRow(?object $row, ?string $employeeName = null): ?array
    {
        if (! $row) {
            return null;
        }

        $status = ! $row->sign_in_at ? 'absent' : ($row->sign_out_at ? 'completed' : 'working');

        $durationMinutes = null;

        if ($row->sign_in_at && $row->sign_out_at) {
            $durationMinutes = (int) round(
                (strtotime($row->sign_out_at) - strtotime($row->sign_in_at)) / 60
            );
        }

        $payload = [
            'id' => (int) $row->id,
            'attendanceDate' => DbDates::formatDateOnly($row->attendance_date),
            'signInAt' => DbDates::formatDateTime($row->sign_in_at),
            'signInLatitude' => $row->sign_in_latitude === null ? null : (float) $row->sign_in_latitude,
            'signInLongitude' => $row->sign_in_longitude === null ? null : (float) $row->sign_in_longitude,
            'signInAccuracy' => $row->sign_in_accuracy === null ? null : (float) $row->sign_in_accuracy,
            'signOutAt' => DbDates::formatDateTime($row->sign_out_at),
            'signOutLatitude' => $row->sign_out_latitude === null ? null : (float) $row->sign_out_latitude,
            'signOutLongitude' => $row->sign_out_longitude === null ? null : (float) $row->sign_out_longitude,
            'signOutAccuracy' => $row->sign_out_accuracy === null ? null : (float) $row->sign_out_accuracy,
            'signInDistanceFromOffice' => $row->sign_in_distance_from_office === null ? null : (float) $row->sign_in_distance_from_office,
            'signInInsideOffice' => $row->sign_in_inside_office === null ? null : (bool) $row->sign_in_inside_office,
            'signOutDistanceFromOffice' => $row->sign_out_distance_from_office === null ? null : (float) $row->sign_out_distance_from_office,
            'signOutInsideOffice' => $row->sign_out_inside_office === null ? null : (bool) $row->sign_out_inside_office,
            'officeRadiusMeters' => OfficeLocation::radiusMeters(),
            'status' => $status,
            'durationMinutes' => $durationMinutes,
        ];

        if ($employeeName !== null || property_exists($row, 'employee_id')) {
            $payload['employeeId'] = isset($row->employee_id) ? (int) $row->employee_id : null;
            $payload['employeeName'] = $employeeName;
        }

        return $payload;
    }

    private function serialize(?object $row): ?array
    {
        return static::serializeRow($row);
    }
}
