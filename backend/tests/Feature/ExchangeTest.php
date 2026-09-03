<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Watch;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ExchangeTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_process_watch_exchange()
    {
        $user = User::factory()->create(['role' => 'sales']);
        $customer = Customer::create(['name' => 'Exchange User', 'phone' => '9112223334']);

        $returnedWatch = Watch::create([
            'serial_number' => 'W3001',
            'brand' => 'Timex',
            'model' => 'Expedition',
            'category' => 'Men',
            'cost_price' => 2000,
            'selling_price' => 3500,
            'gst_rate' => 18,
            'status' => 'sold'
        ]);

        $sale = Sale::create([
            'invoice_number' => 'INV-2026-0001',
            'invoice_type' => 'gst',
            'customer_name' => 'Exchange User',
            'customer_phone' => '9112223334',
            'total_amount' => 3500,
            'payment_mode' => 'cash',
            'user_id' => $user->id,
        ]);

        SaleItem::create([
            'sale_id' => $sale->id,
            'watch_id' => $returnedWatch->id,
            'selling_price' => 3500,
            'discount_amount' => 0,
            'total' => 3500,
            'cost_price' => 2000
        ]);

        $newWatch = Watch::create([
            'serial_number' => 'W3002',
            'brand' => 'Casio',
            'model' => 'Edifice',
            'category' => 'Men',
            'cost_price' => 4000,
            'selling_price' => 6000,
            'gst_rate' => 18,
            'status' => 'in_stock'
        ]);

        $payload = [
            'original_sale_id' => $sale->id,
            'returned_watch_id' => $returnedWatch->id,
            'new_watch_id' => $newWatch->id,
            'reason' => 'Customer wanted a metal strap'
        ];

        $response = $this->actingAs($user)->postJson('/api/exchanges', $payload);

        $response->assertStatus(201)
                 ->assertJsonStructure(['message', 'exchange']);

        $this->assertDatabaseHas('watches', [
            'id' => $returnedWatch->id,
            'status' => 'exchanged_returned'
        ]);

        $this->assertDatabaseHas('watches', [
            'id' => $newWatch->id,
            'status' => 'sold'
        ]);
    }
}
