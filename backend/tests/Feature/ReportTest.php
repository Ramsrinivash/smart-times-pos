<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_access_dashboard_and_reports()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->getJson('/api/dashboard')->assertStatus(200);
        $this->actingAs($admin)->getJson('/api/reports/sales')->assertStatus(200);
        $this->actingAs($admin)->getJson('/api/reports/stock-valuation')->assertStatus(200);
        $this->actingAs($admin)->getJson('/api/reports/profit')->assertStatus(200);
        $this->actingAs($admin)->getJson('/api/reports/gst')->assertStatus(200);
    }

    public function test_sales_role_cannot_access_profit_report()
    {
        $salesUser = User::factory()->create(['role' => 'sales']);

        $this->actingAs($salesUser)->getJson('/api/reports/profit')->assertStatus(403);
    }
}
