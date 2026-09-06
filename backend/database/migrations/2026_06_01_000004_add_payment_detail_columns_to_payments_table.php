<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            if (! Schema::hasColumn('payments', 'cardholder_name')) {
                $table->string('cardholder_name', 150)->nullable()->after('booking_id');
            }

            if (! Schema::hasColumn('payments', 'card_last_four')) {
                $table->string('card_last_four', 4)->nullable()->after('cardholder_name');
            }

            if (! Schema::hasColumn('payments', 'billing_address')) {
                $table->string('billing_address', 255)->nullable()->after('amount');
            }
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            if (Schema::hasColumn('payments', 'billing_address')) {
                $table->dropColumn('billing_address');
            }

            if (Schema::hasColumn('payments', 'card_last_four')) {
                $table->dropColumn('card_last_four');
            }

            if (Schema::hasColumn('payments', 'cardholder_name')) {
                $table->dropColumn('cardholder_name');
            }
        });
    }
};
