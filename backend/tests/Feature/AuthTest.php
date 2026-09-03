<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_login_with_valid_credentials()
    {
        $user = User::factory()->create([
            'email' => 'admin@smarttimes.in',
            'password' => bcrypt('admin123'),
            'role' => 'admin',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'admin@smarttimes.in',
            'password' => 'admin123',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['status', 'token', 'user']);
    }

    public function test_login_fails_with_invalid_password()
    {
        User::factory()->create([
            'email' => 'admin@smarttimes.in',
            'password' => bcrypt('admin123'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'admin@smarttimes.in',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(401);
    }

    public function test_authenticated_user_can_fetch_profile()
    {
        $user = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($user)->getJson('/api/me');

        $response->assertStatus(200)
                 ->assertJsonPath('email', $user->email);
    }

    public function test_only_admin_can_list_users()
    {
        $salesUser = User::factory()->create(['role' => 'sales']);
        $adminUser = User::factory()->create(['role' => 'admin']);

        $this->actingAs($salesUser)->getJson('/api/users')->assertStatus(403);
        $this->actingAs($adminUser)->getJson('/api/users')->assertStatus(200);
    }
}
