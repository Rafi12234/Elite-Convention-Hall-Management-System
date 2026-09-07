<?php

namespace App\Support\Office;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Bearer-token authentication for the office modules (Office Management,
 * Accounts, Attendance). Uses employees.api_token_hash, matching the
 * convention already used by the booking system's users.api_token_hash.
 */
class OfficeAuth
{
    private const REQUEST_KEY = 'office_employee';

    /** Employee row joined with its role name, or null when the token is absent/unknown. */
    public static function resolve(Request $request): ?object
    {
        $token = $request->bearerToken();

        if (! $token) {
            return null;
        }

        return static::findByTokenHash(hash('sha256', $token));
    }

    public static function bind(Request $request, object $employee): void
    {
        $request->attributes->set(self::REQUEST_KEY, $employee);
    }

    /** The employee resolved by middleware for the current request. */
    public static function current(Request $request): ?object
    {
        return $request->attributes->get(self::REQUEST_KEY);
    }

    public static function currentId(Request $request): ?int
    {
        $employee = static::current($request);

        return $employee ? (int) $employee->id : null;
    }

    /** Issues a fresh bearer token, replacing any existing one. */
    public static function issueToken(int $employeeId): string
    {
        $token = Str::random(80);

        DB::table('employees')
            ->where('id', $employeeId)
            ->update([
                'api_token_hash' => hash('sha256', $token),
                'last_used_at' => now(),
                'updated_at' => now(),
            ]);

        return $token;
    }

    public static function revokeToken(int $employeeId): void
    {
        DB::table('employees')
            ->where('id', $employeeId)
            ->update([
                'api_token_hash' => null,
                'updated_at' => now(),
            ]);
    }

    public static function findById(int $employeeId): ?object
    {
        return static::baseQuery()->where('e.id', $employeeId)->first();
    }

    public static function findByEmail(string $email): ?object
    {
        return static::baseQuery()->where('e.email', $email)->first();
    }

    private static function findByTokenHash(string $tokenHash): ?object
    {
        return static::baseQuery()->where('e.api_token_hash', $tokenHash)->first();
    }

    private static function baseQuery()
    {
        return DB::table('employees as e')
            ->leftJoin('roles as r', 'r.id', '=', 'e.role_id')
            ->select('e.*', 'r.name as role_name');
    }

    /** Shape shared by every endpoint that returns the signed-in employee. */
    public static function publicEmployee(object $employee): array
    {
        return [
            'id' => (int) $employee->id,
            'fullName' => $employee->full_name,
            'email' => $employee->email,
            'role' => $employee->role_name ?? 'Employee',
            'mustChangePassword' => (bool) $employee->must_change_password,
        ];
    }
}
