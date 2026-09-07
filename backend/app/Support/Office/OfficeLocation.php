<?php

namespace App\Support\Office;

/**
 * Office geofence constants and distance maths, ported from the Attendance
 * module's utils/officeLocation.js. Coordinates/radius are configurable via
 * env so this deployment can point at the Elite Convention Hall office.
 */
class OfficeLocation
{
    public static function latitude(): float
    {
        return (float) env('OFFICE_LATITUDE', 23.776915);
    }

    public static function longitude(): float
    {
        return (float) env('OFFICE_LONGITUDE', 90.411707);
    }

    public static function radiusMeters(): float
    {
        return (float) env('OFFICE_RADIUS_METERS', 20);
    }

    /** Straight-line (Haversine) distance in metres — no external API. */
    public static function distanceInMeters(float $latA, float $lonA, float $latB, float $lonB): float
    {
        $earthRadius = 6371000;

        $dLat = deg2rad($latB - $latA);
        $dLon = deg2rad($lonB - $lonA);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($latA)) * cos(deg2rad($latB)) * sin($dLon / 2) ** 2;

        return $earthRadius * 2 * asin(sqrt($a));
    }

    /**
     * Distance to the office plus whether it falls inside the radius. The
     * inside/outside decision uses the raw distance; callers round only for
     * storage/display.
     *
     * @return array{distanceFromOffice: float, isInsideOffice: bool}
     */
    public static function officeDistance(float $latitude, float $longitude): array
    {
        $distance = static::distanceInMeters(
            $latitude,
            $longitude,
            static::latitude(),
            static::longitude()
        );

        return [
            'distanceFromOffice' => $distance,
            'isInsideOffice' => $distance <= static::radiusMeters(),
        ];
    }
}
