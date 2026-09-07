<?php

namespace App\Http\Middleware;

use App\Support\Office\OfficeAuth;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Office-module admin gate. Mirrors MME's requireAdmin middleware:
 * 401 when unauthenticated, 403 when authenticated without the Admin role.
 */
class AuthenticateOfficeAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $employee = OfficeAuth::resolve($request);

        if (! $employee) {
            return response()->json([
                'message' => 'Admin authentication required.',
            ], 401);
        }

        if (! $employee->is_active || $employee->role_name !== 'Admin') {
            return response()->json([
                'message' => 'Forbidden: Admin access only.',
            ], 403);
        }

        OfficeAuth::bind($request, $employee);

        return $next($request);
    }
}
