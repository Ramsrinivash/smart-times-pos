<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'message' => 'Welcome to the Horology Showroom API gateway. Please access routes via /api.'
    ]);
});
