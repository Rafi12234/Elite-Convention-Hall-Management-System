<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdminAuthController;
use App\Http\Controllers\Api\AdminDashboardController;
use App\Http\Controllers\Api\AdminManualBookingController;
use App\Http\Controllers\Api\AdminCalendarSlotController;
use App\Http\Controllers\Api\BookingContextController;
use App\Http\Controllers\Api\BookingHoldController;
use App\Http\Controllers\Api\CalendarSlotController;
use App\Http\Controllers\Api\CustomerAuthController;
use App\Http\Controllers\Api\HomepageContentController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\AdminBookingInvoiceController;
use App\Http\Controllers\Api\AdminCustomerController;
use App\Http\Controllers\Api\AdminReportController;
use App\Http\Controllers\Api\SslCommerzPaymentController;

/*
|--------------------------------------------------------------------------
| Public Booking APIs
|--------------------------------------------------------------------------
*/

Route::middleware('throttle:60,1')->group(function () {
    Route::get('/booking-context', [BookingContextController::class, 'index'])
        ->name('api.booking-context');

    Route::get('/calendar-slots', [CalendarSlotController::class, 'index'])
        ->name('api.calendar-slots');

    Route::get('/calendar-availability', [CalendarSlotController::class, 'availability'])
        ->name('api.calendar-availability');

    Route::get('/homepage-content', [HomepageContentController::class, 'show'])
        ->name('api.homepage-content.show');
});

/*
|--------------------------------------------------------------------------
| Customer Auth APIs
|--------------------------------------------------------------------------
*/

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])
        ->middleware('throttle:20,1')
        ->name('api.auth.register');

    Route::post('/login', [CustomerAuthController::class, 'login'])
        ->middleware('throttle:20,1')
        ->name('api.auth.login');

    Route::post('/change-password', [CustomerAuthController::class, 'changePassword'])
        ->middleware('throttle:20,1')
        ->name('api.auth.change-password');

    Route::get('/me', [CustomerAuthController::class, 'me'])
        ->middleware('throttle:60,1')
        ->name('api.auth.me');

    Route::get('/panel', [CustomerAuthController::class, 'panel'])
        ->middleware('throttle:60,1')
        ->name('api.auth.panel');

    Route::patch('/profile', [CustomerAuthController::class, 'updateProfile'])
        ->middleware('throttle:20,1')
        ->name('api.auth.profile.update');

    Route::patch('/bookings/{bookingId}', [CustomerAuthController::class, 'updateBooking'])
        ->middleware('throttle:20,1')
        ->name('api.auth.bookings.update');

    Route::post('/logout', [CustomerAuthController::class, 'logout'])
        ->middleware('throttle:20,1')
        ->name('api.auth.logout');
});

/*
|--------------------------------------------------------------------------
| Booking Hold + Payment APIs
|--------------------------------------------------------------------------
*/

Route::post('/booking-holds', [BookingHoldController::class, 'store'])
    ->middleware('throttle:5,1')
    ->name('api.booking-holds.store');

Route::post('/booking-holds/release', [BookingHoldController::class, 'release'])
    ->middleware('throttle:10,1')
    ->name('api.booking-holds.release');

Route::post('/payments/process', [PaymentController::class, 'process'])
    ->middleware('throttle:5,1')
    ->name('api.payments.process');


Route::prefix('payments/sslcommerz')->middleware('throttle:30,1')->group(function () {
    Route::post('/bookings/{bookingId}/initiate', [SslCommerzPaymentController::class, 'initiate'])
        ->name('api.sslcommerz.initiate');

    Route::match(['get', 'post'], '/success', [SslCommerzPaymentController::class, 'success'])
        ->name('api.sslcommerz.success');

    Route::match(['get', 'post'], '/fail', [SslCommerzPaymentController::class, 'fail'])
        ->name('api.sslcommerz.fail');

    Route::match(['get', 'post'], '/cancel', [SslCommerzPaymentController::class, 'cancel'])
        ->name('api.sslcommerz.cancel');

    Route::post('/ipn', [SslCommerzPaymentController::class, 'ipn'])
        ->name('api.sslcommerz.ipn');
});

/*
|--------------------------------------------------------------------------
| Admin APIs
|--------------------------------------------------------------------------
*/

Route::prefix('admin')->middleware('throttle:30,1')->group(function () {
    Route::post('/login', [AdminAuthController::class, 'login'])
        ->name('api.admin.login');

    Route::get('/me', [AdminAuthController::class, 'me'])
        ->name('api.admin.me');

    Route::post('/logout', [AdminAuthController::class, 'logout'])
        ->name('api.admin.logout');

    Route::get('/dashboard', [AdminDashboardController::class, 'dashboard'])
        ->name('api.admin.dashboard');

    Route::get('/bookings', [AdminDashboardController::class, 'bookings'])
        ->name('api.admin.bookings');

    Route::get('/customers', [AdminCustomerController::class, 'index'])
        ->name('api.admin.customers.index');

    Route::get('/customers/{customerId}', [AdminCustomerController::class, 'show'])
        ->name('api.admin.customers.show');

    Route::patch('/customers/{customerId}/status', [AdminCustomerController::class, 'updateStatus'])
        ->middleware('throttle:20,1')
        ->name('api.admin.customers.status');

    Route::post('/bookings/{id}/approve', [AdminDashboardController::class, 'approveBooking'])
        ->name('api.admin.bookings.approve');

    Route::post('/bookings/{id}/reject', [AdminDashboardController::class, 'rejectBooking'])
        ->name('api.admin.bookings.reject');

    Route::post('/manual-bookings', [AdminManualBookingController::class, 'store'])
        ->middleware('throttle:20,1')
        ->name('api.admin.manual-bookings.store');
        Route::get('/calendar-slots', [AdminCalendarSlotController::class, 'index'])
        ->name('api.admin.calendar-slots.index');

    Route::post('/calendar-slots/generate-until', [AdminCalendarSlotController::class, 'generateUntil'])
        ->middleware('throttle:5,1')
        ->name('api.admin.calendar-slots.generate-until');

    Route::patch('/calendar-slots/status', [AdminCalendarSlotController::class, 'updateStatus'])
        ->middleware('throttle:20,1')
        ->name('api.admin.calendar-slots.status');

    Route::get('/bookings/{id}/details', [AdminBookingInvoiceController::class, 'details'])
    ->name('api.admin.bookings.details');

    Route::get('/extra-charge-categories', [AdminBookingInvoiceController::class, 'categories'])
        ->name('api.admin.extra-charge-categories.index');
    
    Route::post('/extra-charge-categories', [AdminBookingInvoiceController::class, 'storeCategory'])
        ->middleware('throttle:20,1')
        ->name('api.admin.extra-charge-categories.store');
    
    Route::post('/bookings/{id}/extra-charges', [AdminBookingInvoiceController::class, 'storeCharge'])
        ->middleware('throttle:20,1')
        ->name('api.admin.bookings.extra-charges.store');
    
    Route::patch('/bookings/{id}/extra-charges/{chargeId}', [AdminBookingInvoiceController::class, 'updateCharge'])
        ->middleware('throttle:20,1')
        ->name('api.admin.bookings.extra-charges.update');
    
    Route::delete('/bookings/{id}/extra-charges/{chargeId}', [AdminBookingInvoiceController::class, 'deleteCharge'])
        ->middleware('throttle:20,1')
        ->name('api.admin.bookings.extra-charges.delete');
    Route::get('/reports/bookings', [AdminReportController::class, 'bookingReport'])
        ->name('api.admin.reports.bookings');

    Route::get('/reports/revenue', [AdminReportController::class, 'revenueReport'])
        ->name('api.admin.reports.revenue');

    Route::get('/reports/customers', [AdminReportController::class, 'customerReport'])
        ->name('api.admin.reports.customers');
});

/*
|--------------------------------------------------------------------------
| Admin Homepage Content APIs
|--------------------------------------------------------------------------
*/

Route::prefix('admin/homepage-content')->middleware('throttle:30,1')->group(function () {
    Route::get('/', [HomepageContentController::class, 'adminShow'])
        ->name('api.admin.homepage-content.show');

    Route::put('/', [HomepageContentController::class, 'update'])
        ->name('api.admin.homepage-content.update');

    Route::get('/gallery-files', [HomepageContentController::class, 'listGalleryFiles'])
        ->name('api.admin.homepage-content.gallery-files');

    Route::post('/upload-section-image', [HomepageContentController::class, 'uploadSectionImage'])
        ->name('api.admin.homepage-content.upload-section-image');

    Route::post('/gallery/upload', [HomepageContentController::class, 'uploadGalleryImages'])
        ->name('api.admin.homepage-content.gallery.upload');

    Route::post('/gallery/select', [HomepageContentController::class, 'selectGalleryImages'])
        ->name('api.admin.homepage-content.gallery.select');

    Route::delete('/gallery/file', [HomepageContentController::class, 'deleteGalleryFile'])
        ->name('api.admin.homepage-content.gallery.delete-file');
});


/*
|--------------------------------------------------------------------------
| API Fallback
|--------------------------------------------------------------------------
*/

Route::fallback(function () {
    return response()->json([
        'message' => 'API route not found.',
    ], 404);
});