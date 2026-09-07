<?php

namespace App\Http\Middleware;

use App\Support\Office\OfficeAuth;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the office-module employee behind the bearer token.
 * Mirrors MME's requireEmployee middleware (cookie JWT there, bearer token here).
 */
class AuthenticateEmployee
{
    public function handle(Request $request, Closure $next): Response
    {
        $employee = OfficeAuth::resolve($request);

        if (! $employee) {
            return response()->json([
                'message' => 'Login required.',
            ], 401);
        }

        if (! $employee->is_active) {
            return response()->json([
                'message' => 'Your account is no longer available. Please log in again.',
            ], 401);
        }

        OfficeAuth::bind($request, $employee);

        return $next($request);
    }
}
