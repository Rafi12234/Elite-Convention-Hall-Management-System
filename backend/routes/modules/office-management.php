<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\OfficeManagement\CalendarController;
use App\Http\Controllers\Api\OfficeManagement\CallController;
use App\Http\Controllers\Api\OfficeManagement\EmployeeAuthController;
use App\Http\Controllers\Api\OfficeManagement\MeetingController;
use App\Http\Controllers\Api\OfficeManagement\WorkspaceController;
use App\Http\Controllers\Api\OfficeManagement\Admin\AdminActivityController;
use App\Http\Controllers\Api\OfficeManagement\Admin\AdminCalendarController;
use App\Http\Controllers\Api\OfficeManagement\Admin\AdminDashboardController;
use App\Http\Controllers\Api\OfficeManagement\Admin\AdminEmployeeController;
use App\Http\Controllers\Api\OfficeManagement\Admin\AdminWorkspaceController;
use App\Http\Controllers\Api\OfficeManagement\Admin\OfficeAdminAuthController;

/*
|--------------------------------------------------------------------------
| Office Management Module
|--------------------------------------------------------------------------
| Employee portal + office-admin endpoints. Ported from the Make My Event
| Office Management System (Node/Express) to Laravel.
*/

/*
| Employee portal auth
*/
Route::prefix('office/employees')->middleware('throttle:60,1')->group(function () {
    Route::get('/', [EmployeeAuthController::class, 'directory'])
        ->name('api.office.employees.directory');

    Route::post('/identify', [EmployeeAuthController::class, 'identify'])
        ->middleware('throttle:20,1')
        ->name('api.office.employees.identify');

    Route::post('/logout', [EmployeeAuthController::class, 'logout'])
        ->name('api.office.employees.logout');

    Route::middleware('employee.auth')->group(function () {
        Route::get('/me', [EmployeeAuthController::class, 'me'])
            ->name('api.office.employees.me');

        Route::get('/me/today-summary', [EmployeeAuthController::class, 'todaySummary'])
            ->name('api.office.employees.today-summary');

        Route::post('/change-password', [EmployeeAuthController::class, 'changePassword'])
            ->middleware('throttle:20,1')
            ->name('api.office.employees.change-password');
    });
});

/*
| Management sheet (workspace)
*/
Route::prefix('office/workspace')
    ->middleware(['employee.auth', 'throttle:120,1'])
    ->group(function () {
        Route::get('/default', [WorkspaceController::class, 'show'])
            ->name('api.office.workspace.show');

        Route::put('/default', [WorkspaceController::class, 'save'])
            ->name('api.office.workspace.save');
    });

/*
| Client calls
*/
Route::prefix('office/calls')
    ->middleware(['employee.auth', 'throttle:120,1'])
    ->group(function () {
        Route::get('/{rowKey}', [CallController::class, 'index'])
            ->name('api.office.calls.index');

        Route::post('/{rowKey}', [CallController::class, 'store'])
            ->name('api.office.calls.store');

        Route::put('/{rowKey}/{callId}', [CallController::class, 'update'])
            ->whereNumber('callId')
            ->name('api.office.calls.update');

        Route::delete('/{rowKey}/{callId}', [CallController::class, 'destroy'])
            ->whereNumber('callId')
            ->name('api.office.calls.destroy');
    });

/*
| Client meetings, items, images and finalization
| Static segments are declared before {meetingId} so they aren't shadowed.
*/
Route::prefix('office/meetings')
    ->middleware(['employee.auth', 'throttle:120,1'])
    ->group(function () {
        Route::get('/{rowKey}/finalize/preview', [MeetingController::class, 'finalizePreview'])
            ->name('api.office.meetings.finalize.preview');

        Route::get('/{rowKey}/finalize', [MeetingController::class, 'finalizationDetail'])
            ->name('api.office.meetings.finalize.show');

        Route::post('/{rowKey}/finalize', [MeetingController::class, 'finalize'])
            ->name('api.office.meetings.finalize.store');

        Route::patch('/{rowKey}/images/{imageId}/tag', [MeetingController::class, 'updateImageTag'])
            ->whereNumber('imageId')
            ->name('api.office.meetings.images.tag');

        Route::patch('/{rowKey}/images/{imageId}/final', [MeetingController::class, 'toggleImageFinal'])
            ->whereNumber('imageId')
            ->name('api.office.meetings.images.final');

        Route::get('/{rowKey}', [MeetingController::class, 'index'])
            ->name('api.office.meetings.index');

        Route::post('/{rowKey}', [MeetingController::class, 'store'])
            ->name('api.office.meetings.store');

        Route::put('/{rowKey}/{meetingId}', [MeetingController::class, 'update'])
            ->whereNumber('meetingId')
            ->name('api.office.meetings.update');

        Route::delete('/{rowKey}/{meetingId}', [MeetingController::class, 'destroy'])
            ->whereNumber('meetingId')
            ->name('api.office.meetings.destroy');

        Route::post('/{rowKey}/{meetingId}/images', [MeetingController::class, 'uploadMeetingImages'])
            ->whereNumber('meetingId')
            ->name('api.office.meetings.images.store');

        Route::delete('/{rowKey}/{meetingId}/images/{imageId}', [MeetingController::class, 'deleteMeetingImage'])
            ->whereNumber(['meetingId', 'imageId'])
            ->name('api.office.meetings.images.destroy');

        Route::post('/{rowKey}/{meetingId}/items', [MeetingController::class, 'storeItem'])
            ->whereNumber('meetingId')
            ->name('api.office.meetings.items.store');

        Route::put('/{rowKey}/{meetingId}/items/{itemId}', [MeetingController::class, 'updateItem'])
            ->whereNumber(['meetingId', 'itemId'])
            ->name('api.office.meetings.items.update');

        Route::delete('/{rowKey}/{meetingId}/items/{itemId}', [MeetingController::class, 'destroyItem'])
            ->whereNumber(['meetingId', 'itemId'])
            ->name('api.office.meetings.items.destroy');

        Route::post('/{rowKey}/{meetingId}/items/{itemId}/images', [MeetingController::class, 'uploadItemImages'])
            ->whereNumber(['meetingId', 'itemId'])
            ->name('api.office.meetings.items.images.store');

        Route::delete('/{rowKey}/{meetingId}/items/{itemId}/images/{imageId}', [MeetingController::class, 'deleteItemImage'])
            ->whereNumber(['meetingId', 'itemId', 'imageId'])
            ->name('api.office.meetings.items.images.destroy');
    });

/*
| Calendar
*/
Route::prefix('office/calendar')
    ->middleware(['employee.auth', 'throttle:120,1'])
    ->group(function () {
        Route::get('/', [CalendarController::class, 'month'])
            ->name('api.office.calendar.month');

        Route::post('/events', [CalendarController::class, 'storeEvent'])
            ->name('api.office.calendar.events.store');

        Route::put('/events/{id}', [CalendarController::class, 'updateEvent'])
            ->whereNumber('id')
            ->name('api.office.calendar.events.update');

        Route::delete('/events/{id}', [CalendarController::class, 'destroyEvent'])
            ->whereNumber('id')
            ->name('api.office.calendar.events.destroy');
    });

/*
| Office admin auth
*/
Route::prefix('office/admin/auth')->middleware('throttle:30,1')->group(function () {
    Route::post('/login', [OfficeAdminAuthController::class, 'login'])
        ->name('api.office.admin.login');

    Route::post('/logout', [OfficeAdminAuthController::class, 'logout'])
        ->name('api.office.admin.logout');

    Route::get('/me', [OfficeAdminAuthController::class, 'me'])
        ->middleware('office.admin')
        ->name('api.office.admin.me');
});

/*
| Office admin — workspace, activity, calendar and dashboard
*/
Route::prefix('office/admin')
    ->middleware(['office.admin', 'throttle:120,1'])
    ->group(function () {
        Route::get('/workspace', [AdminWorkspaceController::class, 'show'])
            ->name('api.office.admin.workspace.show');

        Route::patch('/workspace/rows/{rowKey}', [AdminWorkspaceController::class, 'updateCell'])
            ->name('api.office.admin.workspace.cell');

        Route::get('/meetings', [AdminActivityController::class, 'meetings'])
            ->name('api.office.admin.meetings');

        Route::get('/calls', [AdminActivityController::class, 'calls'])
            ->name('api.office.admin.calls');

        Route::get('/clients/{rowKey}/meetings', [AdminActivityController::class, 'clientMeetings'])
            ->name('api.office.admin.clients.meetings');

        Route::get('/clients/{rowKey}/calls', [AdminActivityController::class, 'clientCalls'])
            ->name('api.office.admin.clients.calls');

        Route::patch('/meetings/{meetingId}/next', [AdminActivityController::class, 'updateNextMeeting'])
            ->whereNumber('meetingId')
            ->name('api.office.admin.meetings.next');

        Route::patch('/calls/{callId}/next', [AdminActivityController::class, 'updateNextCall'])
            ->whereNumber('callId')
            ->name('api.office.admin.calls.next');

        Route::get('/calendar', [AdminCalendarController::class, 'month'])
            ->name('api.office.admin.calendar');

        Route::get('/dashboard', [AdminDashboardController::class, 'index'])
            ->name('api.office.admin.dashboard');

        Route::get('/dashboard/clients/{rowKey}', [AdminDashboardController::class, 'client'])
            ->name('api.office.admin.dashboard.client');
    });

/*
| Office admin — employee management
*/
Route::prefix('office/admin/employees')
    ->middleware(['office.admin', 'throttle:60,1'])
    ->group(function () {
        Route::get('/', [AdminEmployeeController::class, 'index'])
            ->name('api.office.admin.employees.index');

        Route::post('/', [AdminEmployeeController::class, 'store'])
            ->name('api.office.admin.employees.store');

        Route::patch('/{id}', [AdminEmployeeController::class, 'updateStatus'])
            ->whereNumber('id')
            ->name('api.office.admin.employees.status');

        Route::patch('/{id}/password', [AdminEmployeeController::class, 'resetPassword'])
            ->whereNumber('id')
            ->name('api.office.admin.employees.password');
    });
