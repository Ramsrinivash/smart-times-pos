<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Create Primary Admin Account Only
        User::updateOrCreate(
            ['email' => 'admin@smarttimes.in'],
            [
                'name' => 'Ram Srinivash (Admin)',
                'password' => Hash::make('admin123'),
                'role' => 'admin',
                'base_salary' => 30000
            ]
        );
    }
}
