<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('booking_slots', function (Blueprint $table) {
            if (! Schema::hasColumn('booking_slots', 'hold_token')) {
                $table->string('hold_token', 100)->nullable()->after('slot_status');
            }

            if (! Schema::hasColumn('booking_slots', 'hold_expires_at')) {
                $table->timestamp('hold_expires_at')->nullable()->after('hold_token');
            }

            if (! Schema::hasColumn('booking_slots', 'hold_booking_id')) {
                $table->unsignedBigInteger('hold_booking_id')->nullable()->after('hold_expires_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('booking_slots', function (Blueprint $table) {
            if (Schema::hasColumn('booking_slots', 'hold_booking_id')) {
                $table->dropColumn('hold_booking_id');
            }

            if (Schema::hasColumn('booking_slots', 'hold_expires_at')) {
                $table->dropColumn('hold_expires_at');
            }

            if (Schema::hasColumn('booking_slots', 'hold_token')) {
                $table->dropColumn('hold_token');
            }
        });
    }
};