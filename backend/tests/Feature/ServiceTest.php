<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\ServiceJob;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_service_job_card()
    {
        $user = User::factory()->create(['role' => 'sales']);

        $payload = [
            'customer_name' => 'Robert Paulson',
            'customer_phone' => '9888877776',
            'brand' => 'Rolex',
            'model' => 'Submariner',
            'watch_id_serial' => 'RLX-9981',
            'condition_on_dropoff' => 'Scratched glass, broken strap pin',
            'issue_description' => 'Gaining 5 minutes per day, needs servicing',
            'estimated_cost' => 2500,
            'expected_delivery_date' => now()->addDays(5)->toDateString(),
        ];

        $response = $this->actingAs($user)->postJson('/api/services', $payload);

        $response->assertStatus(201)
                 ->assertJsonStructure(['message', 'service_job']);

        $this->assertDatabaseHas('service_jobs', [
            'customer_name' => 'Robert Paulson',
            'status' => 'received'
        ]);
    }

    public function test_can_update_service_status()
    {
        $user = User::factory()->create(['role' => 'sales']);
        $service = ServiceJob::create([
            'job_card_number' => 'JC-2026-0001',
            'customer_name' => 'Alice Smith',
            'customer_phone' => '9777766665',
            'brand' => 'Titan',
            'model' => 'Raga',
            'status' => 'received',
            'estimated_cost' => 800
        ]);

        $response = $this->actingAs($user)->putJson("/api/services/{$service->id}/status", [
            'status' => 'ready'
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('service_jobs', [
            'id' => $service->id,
            'status' => 'ready'
        ]);
    }
}
