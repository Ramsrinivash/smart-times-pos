<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;

class CustomerTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_and_list_customers()
    {
        $user = User::factory()->create(['role' => 'sales']);

        $payload = [
            'name' => 'Charlie Brown',
            'phone' => '9444433332',
            'email' => 'charlie@peanuts.com',
            'address' => '123 Main St',
            'tag' => 'VIP'
        ];

        $response = $this->actingAs($user)->postJson('/api/customers', $payload);
        $response->assertStatus(201);

        $response = $this->actingAs($user)->getJson('/api/customers');
        $response->assertStatus(200)
                 ->assertJsonCount(1);
    }
}
