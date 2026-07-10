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
        User::create([
            'name' => 'Owner Admin',
            'email' => 'admin@smarttimes.in',
            'password' => Hash::make('admin123'),
            'role' => 'admin',
        ]);

        User::create([
            'name' => 'Store Manager',
            'email' => 'manager@smarttimes.in',
            'password' => Hash::make('manager123'),
            'role' => 'manager',
        ]);

        User::create([
            'name' => 'Sales Counter',
            'email' => 'sales@smarttimes.in',
            'password' => Hash::make('sales123'),
            'role' => 'sales',
        ]);

        // 2. Create Default Walk-in Customer Profile (required for POS cash/guest sales)
        Customer::create([
            'name' => 'Walk-in Customer',
            'phone' => '9999999999',
            'email' => 'walkin@smarttimes.in',
            'address' => 'Counter Sale',
            'points_balance' => 0,
            'tags' => 'Walk-in',
            'notes' => 'Default billing account for unregistered walk-ins.'
        ]);
    }
}
