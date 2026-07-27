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
        if (!Schema::hasColumn('users', 'base_salary')) {
            Schema::table('users', function (Blueprint $table) {
                $table->decimal('base_salary', 10, 2)->default(15000.00)->after('role');
            });
        }

        if (!Schema::hasTable('attendances')) {
            Schema::create('attendances', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->date('date');
                $table->enum('status', ['present', 'absent', 'half_day', 'leave'])->default('present');
                $table->string('notes')->nullable();
                $table->timestamps();
                $table->unique(['user_id', 'date']);
            });
        }

        if (!Schema::hasTable('payrolls')) {
            Schema::create('payrolls', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->integer('month');
                $table->integer('year');
                $table->decimal('base_salary', 10, 2);
                $table->decimal('net_salary', 10, 2);
                $table->enum('status', ['unpaid', 'paid'])->default('unpaid');
                $table->date('payment_date')->nullable();
                $table->timestamps();
                $table->unique(['user_id', 'month', 'year']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payrolls');
        Schema::dropIfExists('attendances');
        if (Schema::hasColumn('users', 'base_salary')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('base_salary');
            });
        }
    }
};
