<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Customer;
use App\Models\ServiceJob;
use App\Models\User;

class ServiceBookSeeder extends Seeder
{
    /**
     * Seed real service book records from Servive_Book.xlsx into the database.
     */
    public function run(): void
    {
        $jsonPath = __DIR__ . '/parsed_services.json';
        if (!file_exists($jsonPath)) {
            $this->command->info('parsed_services.json not found, skipping ServiceBookSeeder.');
            return;
        }

        $records = json_decode(file_get_contents($jsonPath), true);
        if (!$records || !is_array($records)) {
            return;
        }

        $adminUser = User::where('role', 'admin')->first() ?? User::first();
        $adminId = $adminUser ? $adminUser->id : 1;

        foreach ($records as $rec) {
            // Find or create customer by phone or name
            $customer = Customer::firstOrCreate(
                ['phone' => $rec['phone']],
                [
                    'name' => $rec['customer_name'] ?: 'Customer',
                    'points_balance' => 0,
                    'tags' => 'Service Customer',
                    'notes' => 'Imported from Servive_Book.xlsx'
                ]
            );

            // Update customer name if generic
            if ($customer->name === 'Customer' && !empty($rec['customer_name'])) {
                $customer->update(['name' => $rec['customer_name']]);
            }

            // Create Service Job Card
            ServiceJob::updateOrCreate(
                ['id' => $rec['job_id']],
                [
                    'customer_id' => $customer->id,
                    'watch_id' => null,
                    'watch_details' => [
                        'brand' => $rec['brand'],
                        'model' => $rec['model']
                    ],
                    'issue_reported' => $rec['issue'],
                    'drop_off_condition' => 'Standard drop-off',
                    'estimated_cost' => $rec['actual_cost'],
                    'actual_cost' => $rec['actual_cost'],
                    'expected_delivery_date' => $rec['expected_delivery_date'],
                    'actual_delivery_date' => $rec['actual_delivery_date'],
                    'status' => $rec['status'],
                    'terms_accepted' => true,
                    'created_by' => $adminId
                ]
            );
        }
    }
}
