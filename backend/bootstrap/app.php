<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
    web: __DIR__.'/../routes/web.php',
    api: __DIR__.'/../routes/api.php',
    commands: __DIR__.'/../routes/console.php',
    health: '/up',
    apiPrefix: '',
)
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'employee.auth' => \App\Http\Middleware\AuthenticateEmployee::class,
            'office.admin' => \App\Http\Middleware\AuthenticateOfficeAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // apiPrefix is '', so `is('api/*')` never matched and validation
        // errors were returned as 302 redirects that the SPA couldn't read.
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->expectsJson() || $request->is('api/*'),
        );
    })->create();
