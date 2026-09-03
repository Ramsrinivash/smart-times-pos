<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Watch;
use Illuminate\Foundation\Testing\RefreshDatabase;

class InventoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_list_inventory()
    {
        $user = User::factory()->create(['role' => 'admin']);

        Watch::create([
            'serial_number' => 'W1001',
            'brand' => 'Titan',
            'model' => 'Octane',
            'category' => 'Men',
            'cost_price' => 3000,
            'selling_price' => 4500,
            'gst_rate' => 18,
            'status' => 'in_stock'
        ]);

        $response = $this->actingAs($user)->getJson('/api/inventory');

        $response->assertStatus(200)
                 ->assertJsonCount(1);
    }

    public function test_can_update_inventory_item()
    {
        $user = User::factory()->create(['role' => 'admin']);

        $watch = Watch::create([
            'serial_number' => 'W1002',
            'brand' => 'Fastrack',
            'model' => 'Casual',
            'category' => 'Men',
            'cost_price' => 1000,
            'selling_price' => 1800,
            'gst_rate' => 18,
            'status' => 'in_stock'
        ]);

        $response = $this->actingAs($user)->putJson("/api/inventory/{$watch->id}", [
            'brand' => 'Fastrack',
            'model' => 'Casual Sport',
            'selling_price' => 2000,
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('watches', [
            'id' => $watch->id,
            'model' => 'Casual Sport',
            'selling_price' => 2000
        ]);
    }

    public function test_stock_adjustment_requires_manager_or_admin()
    {
        $salesUser = User::factory()->create(['role' => 'sales']);
        $adminUser = User::factory()->create(['role' => 'admin']);

        $watch = Watch::create([
            'serial_number' => 'W1003',
            'brand' => 'Casio',
            'model' => 'G-Shock',
            'category' => 'Men',
            'cost_price' => 5000,
            'selling_price' => 7500,
            'gst_rate' => 18,
            'status' => 'in_stock'
        ]);

        $payload = [
            'watch_id' => $watch->id,
            'adjustment_type' => 'damaged',
            'reason' => 'Display screen scratched'
        ];

        $this->actingAs($salesUser)->postJson('/api/inventory/adjust', $payload)->assertStatus(403);
        $this->actingAs($adminUser)->postJson('/api/inventory/adjust', $payload)->assertStatus(200);
    }
}
