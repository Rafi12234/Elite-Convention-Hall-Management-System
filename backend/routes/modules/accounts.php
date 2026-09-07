<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\Accounts\AccountsController;
use App\Http\Controllers\Api\Accounts\Admin\AdminAccountsController;
use App\Http\Controllers\Api\Accounts\Admin\AdminVendorController;

/*
|--------------------------------------------------------------------------
| Accounts Module
|--------------------------------------------------------------------------
| Employee wallet / expenses / vendor payments plus admin oversight.
| Ported from the Make My Event Accounts module.
*/

/*
| Employee wallet
*/
Route::prefix('accounts')
    ->middleware(['employee.auth', 'throttle:120,1'])
    ->group(function () {
        Route::get('/summary', [AccountsController::class, 'summary'])
            ->name('api.accounts.summary');

        Route::get('/booked-events', [AccountsController::class, 'bookedEvents'])
            ->name('api.accounts.booked-events');

        Route::get('/vendors', [AccountsController::class, 'vendors'])
            ->name('api.accounts.vendors');

        Route::get('/vendors/{id}', [AccountsController::class, 'vendorProfile'])
            ->whereNumber('id')
            ->name('api.accounts.vendors.show');

        Route::get('/vendors/{id}/outstanding', [AccountsController::class, 'vendorOutstanding'])
            ->whereNumber('id')
            ->name('api.accounts.vendors.outstanding');

        Route::post('/vendors/{id}/pay', [AccountsController::class, 'payVendor'])
            ->whereNumber('id')
            ->name('api.accounts.vendors.pay');

        Route::post('/money-received', [AccountsController::class, 'storeMoneyReceived'])
            ->name('api.accounts.money-received.store');

        Route::post('/expenses', [AccountsController::class, 'storeExpense'])
            ->name('api.accounts.expenses.store');
    });

/*
| Admin — employee wallets, money in, expense audit
*/
Route::prefix('office/admin/accounts')
    ->middleware(['office.admin', 'throttle:120,1'])
    ->group(function () {
        Route::get('/employees', [AdminAccountsController::class, 'employees'])
            ->name('api.office.admin.accounts.employees');

        Route::get('/employees/{id}', [AdminAccountsController::class, 'employee'])
            ->whereNumber('id')
            ->name('api.office.admin.accounts.employees.show');

        Route::get('/money-in', [AdminAccountsController::class, 'moneyIn'])
            ->name('api.office.admin.accounts.money-in');

        Route::post('/money-in', [AdminAccountsController::class, 'storeMoneyIn'])
            ->name('api.office.admin.accounts.money-in.store');

        Route::patch('/money-in/{id}', [AdminAccountsController::class, 'updateMoneyIn'])
            ->whereNumber('id')
            ->name('api.office.admin.accounts.money-in.update');

        Route::get('/expenses', [AdminAccountsController::class, 'expenses'])
            ->name('api.office.admin.accounts.expenses');

        Route::get('/expenses/{id}', [AdminAccountsController::class, 'expense'])
            ->whereNumber('id')
            ->name('api.office.admin.accounts.expenses.show');

        Route::patch('/expenses/{id}', [AdminAccountsController::class, 'updateExpense'])
            ->whereNumber('id')
            ->name('api.office.admin.accounts.expenses.update');

        Route::post('/expenses/{id}/preview', [AdminAccountsController::class, 'previewExpenseUpdate'])
            ->whereNumber('id')
            ->name('api.office.admin.accounts.expenses.preview');

        Route::post('/expenses/{id}/void', [AdminAccountsController::class, 'voidExpense'])
            ->whereNumber('id')
            ->name('api.office.admin.accounts.expenses.void');

        Route::post('/expenses/{id}/approve', [AdminAccountsController::class, 'approveExpense'])
            ->whereNumber('id')
            ->name('api.office.admin.accounts.expenses.approve');

        /*
        | Admin — vendor directory
        */
        Route::get('/vendors', [AdminVendorController::class, 'index'])
            ->name('api.office.admin.accounts.vendors');

        Route::post('/vendors', [AdminVendorController::class, 'store'])
            ->name('api.office.admin.accounts.vendors.store');

        Route::get('/vendors/{id}', [AdminVendorController::class, 'show'])
            ->whereNumber('id')
            ->name('api.office.admin.accounts.vendors.show');

        Route::patch('/vendors/{id}', [AdminVendorController::class, 'update'])
            ->whereNumber('id')
            ->name('api.office.admin.accounts.vendors.update');

        Route::patch('/vendors/{id}/status', [AdminVendorController::class, 'setStatus'])
            ->whereNumber('id')
            ->name('api.office.admin.accounts.vendors.status');

        Route::get('/vendors/{id}/outstanding', [AdminVendorController::class, 'outstanding'])
            ->whereNumber('id')
            ->name('api.office.admin.accounts.vendors.outstanding');

        Route::post('/vendors/{id}/cost', [AdminVendorController::class, 'storeCost'])
            ->whereNumber('id')
            ->name('api.office.admin.accounts.vendors.cost');

        Route::post('/vendors/{id}/pay', [AdminVendorController::class, 'storePayment'])
            ->whereNumber('id')
            ->name('api.office.admin.accounts.vendors.pay');
    });
