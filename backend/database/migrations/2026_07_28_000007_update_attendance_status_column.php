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
        if (Schema::hasTable('attendances')) {
            // Change status column from ENUM to VARCHAR to support present, absent, half_day, leave, cl, ml
            DB::statement("ALTER TABLE attendances MODIFY status VARCHAR(20) NOT NULL DEFAULT 'present'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('attendances')) {
            DB::statement("ALTER TABLE attendances MODIFY status ENUM('present', 'absent', 'half_day', 'leave') NOT NULL DEFAULT 'present'");
        }
    }
};
