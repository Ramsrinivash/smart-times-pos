<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('warranty_cards', function (Blueprint $table) {
            $table->id();
            $table->string('watch_id');
            $table->foreign('watch_id')->references('id')->on('watches')->onDelete('cascade');
            $table->string('sale_id');
            $table->foreign('sale_id')->references('id')->on('sales')->onDelete('cascade');
            $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade');
            $table->date('sale_date');
            $table->integer('warranty_months')->default(12);
            $table->date('expiry_date');
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // Retroactively generate warranty cards for all existing past sales
        try {
            $sales = DB::table('sales')->get();
            foreach ($sales as $sale) {
                $saleItems = DB::table('sale_items')->where('sale_id', $sale->id)->get();
                foreach ($saleItems as $item) {
                    $settings = DB::table('settings')->first();
                    $warrantyMonths = $settings ? (int) $settings->warranty_period_months : 12;
                    $expiryDate = date('Y-m-d', strtotime("+{$warrantyMonths} months", strtotime($sale->invoice_date)));

                    DB::table('warranty_cards')->insert([
                        'watch_id' => $item->watch_id,
                        'sale_id' => $sale->id,
                        'customer_id' => $sale->customer_id,
                        'sale_date' => $sale->invoice_date,
                        'warranty_months' => $warrantyMonths,
                        'expiry_date' => $expiryDate,
                        'is_active' => true,
                        'notes' => 'Generated retroactively for past purchase',
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                }
            }
        } catch (\Exception $e) {
            // Log warning but don't crash migration if past tables are empty or mismatched
            \Log::warning("Retroactive warranty seeding skipped: " . $e->getMessage());
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('warranty_cards');
    }
};
