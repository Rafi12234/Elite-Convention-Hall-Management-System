<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\Attendance\AttendanceController;
use App\Http\Controllers\Api\Attendance\Admin\AdminAttendanceController;

/*
|--------------------------------------------------------------------------
| Attendance Module
|--------------------------------------------------------------------------
| GPS-based employee sign-in/sign-out plus admin oversight.
| Ported from the Make My Event Attendance module.
*/

Route::prefix('attendance')
    ->middleware(['employee.auth', 'throttle:60,1'])
    ->group(function () {
        Route::get('/today', [AttendanceController::class, 'today'])
            ->name('api.attendance.today');

        Route::post('/sign-in', [AttendanceController::class, 'signIn'])
            ->name('api.attendance.sign-in');

        Route::post('/sign-out', [AttendanceController::class, 'signOut'])
            ->name('api.attendance.sign-out');

        Route::get('/history', [AttendanceController::class, 'history'])
            ->name('api.attendance.history');
    });

Route::prefix('office/admin/attendance')
    ->middleware(['office.admin', 'throttle:60,1'])
    ->group(function () {
        Route::get('/', [AdminAttendanceController::class, 'index'])
            ->name('api.office.admin.attendance.index');
    });
