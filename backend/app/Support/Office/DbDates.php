<?php

namespace App\Support\Office;

use Carbon\CarbonImmutable;
use DateTimeInterface;

/**
 * Date helpers ported from MME's utils/dbDates.js.
 *
 * Stored datetimes are naive wall-clock values (no timezone) representing
 * office time (Asia/Dhaka, UTC+6, no DST). "Now" is derived from real UTC
 * plus that fixed offset so comparisons stay correct regardless of the
 * server's own timezone.
 */
class DbDates
{
    private const BUSINESS_TIMEZONE = 'Asia/Dhaka';

    public static function formatDateOnly(?string $value): ?string
    {
        return static::format($value, 'Y-m-d');
    }

    public static function formatTimeOnly(?string $value): ?string
    {
        return static::format($value, 'H:i:s');
    }

    public static function formatDateTime(?string $value): ?string
    {
        return static::format($value, 'Y-m-d H:i:s');
    }

    /** Normalizes a frontend date string to "Y-m-d", or null when unusable. */
    public static function parseDateOnly(?string $value): ?string
    {
        $value = trim((string) $value);

        if ($value === '') {
            return null;
        }

        return static::format(substr($value, 0, 10), 'Y-m-d');
    }

    /** Normalizes "HH:MM" or "HH:MM:SS" to "H:i:s". */
    public static function parseTimeOnly(?string $value): ?string
    {
        $value = trim((string) $value);

        if ($value === '') {
            return null;
        }

        if (preg_match('/^\d{2}:\d{2}$/', $value)) {
            $value .= ':00';
        }

        return preg_match('/^\d{2}:\d{2}:\d{2}$/', $value) ? $value : null;
    }

    /** Normalizes "Y-m-dTH:i[:s]" (datetime-local) to "Y-m-d H:i:s". */
    public static function parseDateTimeLocal(?string $value): ?string
    {
        $value = str_replace('T', ' ', trim((string) $value));

        if ($value === '') {
            return null;
        }

        if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $value)) {
            $value .= ':00';
        }

        return static::format($value, 'Y-m-d H:i:s');
    }

    /** Current wall-clock time in the business timezone, as a naive value. */
    public static function nowInBusinessTimezone(): CarbonImmutable
    {
        return CarbonImmutable::now(self::BUSINESS_TIMEZONE)->shiftTimezone('UTC');
    }

    public static function nowString(): string
    {
        return static::nowInBusinessTimezone()->format('Y-m-d H:i:s');
    }

    public static function todayString(): string
    {
        return static::nowInBusinessTimezone()->format('Y-m-d');
    }

    private static function format(mixed $value, string $format): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof DateTimeInterface) {
            return $value->format($format);
        }

        try {
            return CarbonImmutable::parse((string) $value)->format($format);
        } catch (\Throwable) {
            return null;
        }
    }
}
