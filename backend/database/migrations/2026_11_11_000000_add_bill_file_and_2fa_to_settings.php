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
        if (Schema::hasTable('purchases') && !Schema::hasColumn('purchases', 'bill_file')) {
            Schema::table('purchases', function (Blueprint $table) {
                $table->longText('bill_file')->nullable()->after('remarks');
            });
        }

        if (Schema::hasTable('settings') && !Schema::hasColumn('settings', 'two_factor_secret')) {
            Schema::table('settings', function (Blueprint $table) {
                $table->string('two_factor_secret')->nullable()->after('job_card_terms');
                $table->boolean('two_factor_enabled')->default(false)->after('two_factor_secret');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('purchases') && Schema::hasColumn('purchases', 'bill_file')) {
            Schema::table('purchases', function (Blueprint $table) {
                $table->dropColumn('bill_file');
            });
        }

        if (Schema::hasTable('settings')) {
            Schema::table('settings', function (Blueprint $table) {
                if (Schema::hasColumn('settings', 'two_factor_secret')) {
                    $table->dropColumn('two_factor_secret');
                }
                if (Schema::hasColumn('settings', 'two_factor_enabled')) {
                    $table->dropColumn('two_factor_enabled');
                }
            });
        }
    }
};

