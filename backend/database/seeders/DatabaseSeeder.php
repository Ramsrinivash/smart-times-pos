<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Customer;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Create Staff Logins
        User::updateOrCreate(
            ['email' => 'admin@smarttimes.in'],
            [
                'name' => 'Owner Admin',
                'password' => Hash::make('admin123'),
                'role' => 'admin',
            ]
        );

        User::updateOrCreate(
            ['email' => 'manager@smarttimes.in'],
            [
                'name' => 'Store Manager',
                'password' => Hash::make('manager123'),
                'role' => 'manager',
            ]
        );

        User::updateOrCreate(
            ['email' => 'sales@smarttimes.in'],
            [
                'name' => 'Sales Counter',
                'password' => Hash::make('sales123'),
                'role' => 'sales',
            ]
        );

        User::updateOrCreate(
            ['email' => 'suresh@smarttimes.in'],
            [
                'name' => 'Sales Staff (Suresh)',
                'password' => Hash::make('suresh123'),
                'role' => 'sales',
            ]
        );

        // 2. Service Book records import
        $this->call(ServiceBookSeeder::class);
    }
}
