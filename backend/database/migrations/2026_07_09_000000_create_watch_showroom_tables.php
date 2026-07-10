<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Users Table
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->enum('role', ['admin', 'manager', 'sales'])->default('sales');
            $table->rememberToken();
            $table->timestamps();
        });

        // 2. Customers Table
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone')->unique();
            $table->string('alt_phone')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->date('dob')->nullable();
            $table->date('anniversary')->nullable();
            $table->integer('points_balance')->default(0);
            $table->string('tags')->nullable(); // e.g. "VIP, Regular"
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 3. Purchases Table (Supplier Receipts)
        Schema::create('purchases', function (Blueprint $table) {
            $table->id();
            $table->string('supplier_name');
            $table->date('purchase_date');
            $table->string('invoice_number')->nullable();
            $table->decimal('total_amount', 12, 2)->default(0.00);
            $table->string('payment_status')->default('paid'); // paid, pending
            $table->text('remarks')->nullable();
            $table->timestamps();
        });

        // 4. Watches Table (Piece-level inventory tracking)
        Schema::create('watches', function (Blueprint $table) {
            $table->string('id')->primary(); // Watch ID / Serial Number (manually entered)
            $table->foreignId('purchase_id')->constrained('purchases')->onDelete('cascade');
            $table->string('brand');
            $table->string('model');
            $table->string('category')->nullable(); // e.g. Chronograph, Smart
            $table->string('gender')->nullable(); // Men, Women, Unisex
            $table->string('strap_type')->nullable(); // Leather, Metal, Rubber
            $table->string('dial_color')->nullable();
            $table->string('movement_type')->nullable(); // Quartz, Automatic, Mechanical
            $table->decimal('mrp', 10, 2);
            $table->decimal('discount_percent', 5, 2)->default(0.00);
            $table->decimal('cost_price', 10, 2); // Actual cost price (post-discount)
            $table->decimal('selling_price', 10, 2); // Target selling price
            $table->decimal('gst_rate', 5, 2)->default(18.00); // Dynamic GST rate for this item
            $table->enum('status', ['in_stock', 'sold', 'exchanged_returned', 'refurbishing'])->default('in_stock');
            $table->json('image_urls')->nullable(); // front, back, box, etc.
            $table->timestamps();
        });

        // 5. Sales Table (Invoices)
        Schema::create('sales', function (Blueprint $table) {
            $table->string('id')->primary(); // Invoice Number (financial-year-wise GST / Non-GST series)
            $table->foreignId('customer_id')->constrained('customers');
            $table->foreignId('user_id')->constrained('users'); // Salesperson
            $table->enum('invoice_type', ['gst', 'non-gst'])->default('non-gst');
            $table->date('invoice_date');
            $table->decimal('subtotal', 12, 2);
            $table->decimal('discount_amount', 12, 2)->default(0.00);
            $table->decimal('gst_amount', 12, 2)->default(0.00);
            $table->integer('points_redeemed')->default(0);
            $table->decimal('points_value', 10, 2)->default(0.00);
            $table->decimal('net_amount', 12, 2);
            $table->string('payment_mode')->default('cash'); // Cash, Card, UPI, Bank Transfer, Split
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 6. Sale Items Table
        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->string('sale_id');
            $table->foreign('sale_id')->references('id')->on('sales')->onDelete('cascade');
            $table->string('watch_id');
            $table->foreign('watch_id')->references('id')->on('watches');
            $table->decimal('price_sold', 10, 2);
            $table->decimal('discount_amount', 10, 2)->default(0.00);
            $table->decimal('cost_price', 10, 2); // Preserves cost at time of sale
            $table->decimal('gst_rate', 5, 2);
            $table->decimal('gst_amount', 10, 2);
            $table->timestamps();
        });

        // 7. Exchanges Table
        Schema::create('exchanges', function (Blueprint $table) {
            $table->id();
            $table->string('original_sale_id');
            $table->foreign('original_sale_id')->references('id')->on('sales');
            $table->string('returned_watch_id');
            $table->foreign('returned_watch_id')->references('id')->on('watches');
            $table->string('replacement_sale_id')->nullable(); // If net payable > 0
            $table->string('replacement_watch_id');
            $table->foreign('replacement_watch_id')->references('id')->on('watches');
            $table->decimal('difference_amount', 10, 2); // Replacement Price - Returned original price
            $table->enum('exchange_type', ['credit_note', 'tax_invoice', 'exchange_note']);
            $table->date('exchange_date');
            $table->foreignId('created_by')->constrained('users');
            $table->enum('status', ['pending_review', 'resellable', 'refurbish'])->default('pending_review');
            $table->text('remarks')->nullable();
            $table->timestamps();
        });

        // 8. Service/Repair Jobs Table
        Schema::create('service_jobs', function (Blueprint $table) {
            $table->string('id')->primary(); // Job Card Number: e.g. JC-YYYYMM-XXXX
            $table->foreignId('customer_id')->constrained('customers');
            $table->string('watch_id')->nullable(); // Null if external watch (not purchased here)
            $table->json('watch_details')->nullable(); // e.g. {brand: 'Omega', model: 'Speedmaster', serial: '1234'} for external
            $table->text('issue_reported');
            $table->text('drop_off_condition')->nullable(); // Scratches, missing link, etc.
            $table->decimal('estimated_cost', 10, 2)->nullable();
            $table->decimal('actual_cost', 10, 2)->nullable();
            $table->date('expected_delivery_date')->nullable();
            $table->date('actual_delivery_date')->nullable();
            $table->enum('status', ['received', 'in_repair', 'ready', 'delivered'])->default('received');
            $table->boolean('terms_accepted')->default(true);
            $table->string('billing_invoice_id')->nullable(); // Link to sales bill if service charged
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });

        // 9. Loyalty Points Ledger Table
        Schema::create('loyalty_ledgers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade');
            $table->integer('points_earned')->default(0);
            $table->integer('points_redeemed')->default(0);
            $table->enum('transaction_type', ['purchase', 'redemption', 'refund', 'expiry']);
            $table->string('reference_id')->nullable(); // invoice ID or exchange ID
            $table->string('remarks')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loyalty_ledgers');
        Schema::dropIfExists('service_jobs');
        Schema::dropIfExists('exchanges');
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('sales');
        Schema::dropIfExists('watches');
        Schema::dropIfExists('purchases');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('users');
    }
};
