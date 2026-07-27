<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        // Truncate transaction tables to clear existing data
        DB::table('warranty_cards')->truncate();
        DB::table('exchanges')->truncate();
        DB::table('sale_items')->truncate();
        DB::table('sales')->truncate();
        DB::table('loyalty_ledgers')->truncate();
        DB::table('service_jobs')->truncate();
        DB::table('stock_adjustments')->truncate();
        DB::table('purchases')->truncate();
        DB::table('watches')->truncate();

        // Delete all customers except the default POS Walk-in Customer
        DB::table('customers')->where('email', '!=', 'walkin@smarttimes.in')->delete();

        // Reset default walk-in customer properties to start fresh
        DB::table('customers')->where('email', 'walkin@smarttimes.in')->update([
            'points_balance' => 0,
            'outstanding_dues' => 0.00
        ]);

        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No rollback action needed for clearing data
    }
};
