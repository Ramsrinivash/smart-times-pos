<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Add outstanding_dues to customers table if it doesn't exist
        if (!Schema::hasColumn('customers', 'outstanding_dues')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->decimal('outstanding_dues', 12, 2)->default(0.00)->after('points_balance');
            });
        }

        // 2. Add is_credit_sale to sales table if it doesn't exist
        if (!Schema::hasColumn('sales', 'is_credit_sale')) {
            Schema::table('sales', function (Blueprint $table) {
                $table->boolean('is_credit_sale')->default(false)->after('payment_mode');
            });
        }

        // 3. Create stock_adjustments table if it doesn't exist
        if (!Schema::hasTable('stock_adjustments')) {
            Schema::create('stock_adjustments', function (Blueprint $table) {
                $table->id();
                $table->string('watch_id');
                $table->foreign('watch_id')->references('id')->on('watches')->onDelete('cascade');
                $table->foreignId('user_id')->constrained('users');
                $table->string('old_status');
                $table->string('new_status');
                $table->string('reason');
                $table->text('remarks')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_adjustments');

        if (Schema::hasColumn('sales', 'is_credit_sale')) {
            Schema::table('sales', function (Blueprint $table) {
                $table->dropColumn('is_credit_sale');
            });
        }

        if (Schema::hasColumn('customers', 'outstanding_dues')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->dropColumn('outstanding_dues');
            });
        }
    }
};
