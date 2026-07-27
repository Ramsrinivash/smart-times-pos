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
        if (!Schema::hasTable('sales_returns')) {
            Schema::create('sales_returns', function (Blueprint $table) {
                $table->id();
                $table->string('original_sale_id');
                $table->foreign('original_sale_id')->references('id')->on('sales')->onDelete('cascade');
                $table->string('watch_id');
                $table->foreign('watch_id')->references('id')->on('watches')->onDelete('cascade');
                $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade');
                $table->decimal('refund_amount', 12, 2);
                $table->string('refund_mode')->default('cash');
                $table->text('reason')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasColumn('sale_items', 'is_returned')) {
            Schema::table('sale_items', function (Blueprint $table) {
                $table->boolean('is_returned')->default(false)->after('gst_amount');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales_returns');

        if (Schema::hasColumn('sale_items', 'is_returned')) {
            Schema::table('sale_items', function (Blueprint $table) {
                $table->dropColumn('is_returned');
            });
        }
    }
};
