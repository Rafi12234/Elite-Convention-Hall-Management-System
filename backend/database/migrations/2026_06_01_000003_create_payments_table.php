<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('payments')) {
            Schema::create('payments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();
                $table->string('cardholder_name', 150);
                $table->string('card_last_four', 4);
                $table->decimal('amount', 12, 2);
                $table->string('billing_address', 255)->nullable();
                $table->string('payment_method', 50)->default('credit_card');
                $table->string('payment_status', 30)->default('completed');
                $table->string('transaction_id', 100)->unique();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
