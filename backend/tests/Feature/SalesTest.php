<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Watch;
use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;

class SalesTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_gst_sale_invoice()
    {
        $user = User::factory()->create(['role' => 'sales']);
        $customer = Customer::create([
            'name' => 'John Doe',
            'phone' => '9876543210',
            'email' => 'john@example.com'
        ]);

        $watch = Watch::create([
            'serial_number' => 'W2001',
            'brand' => 'Fossil',
            'model' => 'FS5241',
            'category' => 'Men',
            'cost_price' => 6000,
            'selling_price' => 9000,
            'gst_rate' => 18,
            'status' => 'in_stock'
        ]);

        $payload = [
            'customer_name' => 'John Doe',
            'customer_phone' => '9876543210',
            'customer_email' => 'john@example.com',
            'invoice_type' => 'gst',
            'payment_mode' => 'upi',
            'items' => [
                [
                    'watch_id' => $watch->id,
                    'selling_price' => 9000,
                    'discount_amount' => 500
                ]
            ]
        ];

        $response = $this->actingAs($user)->postJson('/api/sales', $payload);

        $response->assertStatus(201)
                 ->assertJsonStructure(['message', 'sale']);

        $this->assertDatabaseHas('watches', [
            'id' => $watch->id,
            'status' => 'sold'
        ]);
    }

    public function test_can_redeem_loyalty_points_on_sale()
    {
        $user = User::factory()->create(['role' => 'sales']);
        $customer = Customer::create([
            'name' => 'VIP Customer',
            'phone' => '9998887776',
            'points_balance' => 200
        ]);

        $watch = Watch::create([
            'serial_number' => 'W2002',
            'brand' => 'Seiko',
            'model' => '5 Sports',
            'category' => 'Men',
            'cost_price' => 15000,
            'selling_price' => 22000,
            'gst_rate' => 18,
            'status' => 'in_stock'
        ]);

        $payload = [
            'customer_name' => 'VIP Customer',
            'customer_phone' => '9998887776',
            'invoice_type' => 'non-gst',
            'payment_mode' => 'card',
            'redeem_points' => 100,
            'items' => [
                [
                    'watch_id' => $watch->id,
                    'selling_price' => 22000
                ]
            ]
        ];

        $response = $this->actingAs($user)->postJson('/api/sales', $payload);

        $response->assertStatus(201);
        $this->assertDatabaseHas('customers', [
            'id' => $customer->id,
            'points_balance' => 100 // 200 - 100 redeemed
        ]);
    }
}
