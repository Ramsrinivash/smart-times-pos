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
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('store_name')->default('Smart Times');
            $table->string('tagline')->nullable();
            $table->string('gstin')->nullable();
            $table->text('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('gst_invoice_prefix')->default('ST-GST');
            $table->string('nongst_invoice_prefix')->default('ST-RETL');
            $table->string('job_card_prefix')->default('JC');
            $table->integer('exchange_window_days')->default(7);
            $table->integer('warranty_period_months')->default(12);
            $table->integer('loyalty_earn_rate')->default(1);
            $table->integer('loyalty_redeem_rate')->default(1);
            $table->integer('loyalty_expiry_months')->default(12);
            $table->text('job_card_terms')->nullable();
            $table->timestamps();
        });

        // Insert a default settings record
        \DB::table('settings')->insert([
            'store_name' => 'Smart Times',
            'tagline' => 'Time is Precious',
            'gstin' => '29AAAAA0000A1Z5',
            'address' => 'Royal Mall, Brigade Road, Bangalore - 560001',
            'phone' => '+91 80 44445555',
            'email' => 'info@smarttimes.in',
            'gst_invoice_prefix' => 'ST-GST',
            'nongst_invoice_prefix' => 'ST-RETL',
            'job_card_prefix' => 'JC',
            'exchange_window_days' => 7,
            'warranty_period_months' => 12,
            'loyalty_earn_rate' => 1,
            'loyalty_redeem_rate' => 1,
            'loyalty_expiry_months' => 12,
            'job_card_terms' => '1. Standard repair warranty applies.\n2. Goods once sold cannot be returned.\n3. Please produce job card during delivery.'
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
