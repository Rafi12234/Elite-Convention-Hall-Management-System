<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class BookingContextController extends Controller
{
    public function index(): JsonResponse
    {
        $halls = DB::table('halls')
            ->select('id', 'name', 'slug', 'capacity')
            ->where('status', 'active')
            ->orderBy('id')
            ->get();

        $shifts = DB::table('shifts')
            ->select('id', 'name', 'start_time', 'end_time', 'sort_order')
            ->where('status', 'active')
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'message' => 'Booking context loaded successfully.',
            'data' => [
                'default_hall_id' => $halls->first()->id ?? null,
                'halls' => $halls,
                'shifts' => $shifts,
            ],
        ]);
    }
}