<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('settings')->updateOrInsert(
            ['id' => 1],
            [
                'store_name' => 'Smart Times',
                'tagline' => 'TITAN - SONATA - FASTRACK - TIMEX - LENCO - SMART WATCHES',
                'gstin' => '33EJBPA4537C1ZW',
                'address' => '108, Pennagaram Main Road, (Next to R.C. Chruch), DHARMAPURI - 636 701.',
                'phone' => '97512 85945, 86672 88021',
                'email' => 'info@smarttimes.in',
            ]
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No revert operation needed for seeding data update
    }
};
