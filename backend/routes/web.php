<?php

use App\Http\Controllers\UploadedAssetController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/uploads/{path}', [UploadedAssetController::class, 'show'])
    ->where('path', '.*')
    ->name('uploads.show');
