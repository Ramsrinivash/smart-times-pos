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
        Schema::table('watches', function (Blueprint $table) {
            $table->string('status', 50)->default('in_stock')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('watches', function (Blueprint $table) {
            $table->enum('status', ['in_stock', 'sold', 'exchanged_returned', 'refurbishing'])->default('in_stock')->change();
        });
    }
};
