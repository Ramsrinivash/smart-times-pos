<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * CONSOLIDATED FRESH SCHEMA MIGRATION
 * ---------------------------------------------------
 * This migration creates ALL tables and ALL columns
 * for the Smart Times Watch Showroom POS system.
 *
 * It is idempotent (safe to re-run): every table and
 * column creation is guarded with hasTable / hasColumn.
 *
 * Run order:
 *   1. users
 *   2. personal_access_tokens
 *   3. customers
 *   4. purchases
 *   5. watches
 *   6. sales
 *   7. sale_items
 *   8. exchanges
 *   9. service_jobs
 *  10. loyalty_ledgers
 *  11. stock_adjustments
 *  12. warranty_cards
 *  13. sales_returns
 *  14. attendances
 *  15. payrolls
 *  16. activity_logs
 *  17. settings (with default seed data)
 *  18. cache / cache_locks (Laravel internal)
 */
return new class extends Migration
{
    public function up(): void
    {
        // ──────────────────────────────────────────
        // 1. USERS
        // ──────────────────────────────────────────
        if (!Schema::hasTable('users')) {
            Schema::create('users', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('email')->unique();
                $table->string('password');
                $table->enum('role', ['admin', 'manager', 'sales'])->default('sales');
                $table->decimal('base_salary', 10, 2)->default(0.00);
                $table->rememberToken();
                $table->timestamps();
            });
        } else {
            // Add any missing columns to existing users table
            Schema::table('users', function (Blueprint $table) {
                if (!Schema::hasColumn('users', 'base_salary')) {
                    $table->decimal('base_salary', 10, 2)->default(0.00)->after('role');
                }
            });
        }

        // ──────────────────────────────────────────
        // 2. PERSONAL ACCESS TOKENS (Sanctum)
        // ──────────────────────────────────────────
        if (!Schema::hasTable('personal_access_tokens')) {
            Schema::create('personal_access_tokens', function (Blueprint $table) {
                $table->id();
                $table->morphs('tokenable');
                $table->string('name');
                $table->string('token', 64)->unique();
                $table->text('abilities')->nullable();
                $table->timestamp('last_used_at')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->timestamps();
            });
        }

        // ──────────────────────────────────────────
        // 3. CUSTOMERS
        // ──────────────────────────────────────────
        if (!Schema::hasTable('customers')) {
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
                $table->decimal('outstanding_dues', 12, 2)->default(0.00);
                $table->string('tags')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        } else {
            Schema::table('customers', function (Blueprint $table) {
                if (!Schema::hasColumn('customers', 'outstanding_dues')) {
                    $table->decimal('outstanding_dues', 12, 2)->default(0.00)->after('points_balance');
                }
                if (!Schema::hasColumn('customers', 'gstin')) {
                    $table->string('gstin')->nullable()->after('alt_phone');
                }
            });
        }

        // ──────────────────────────────────────────
        // 4. PURCHASES (Supplier Receipts)
        // ──────────────────────────────────────────
        if (!Schema::hasTable('purchases')) {
            Schema::create('purchases', function (Blueprint $table) {
                $table->id();
                $table->string('supplier_name');
                $table->date('purchase_date');
                $table->string('invoice_number')->nullable();
                $table->decimal('total_amount', 12, 2)->default(0.00);
                $table->string('payment_status')->default('paid');
                $table->text('remarks')->nullable();
                $table->timestamps();
            });
        }

        // ──────────────────────────────────────────
        // 5. WATCHES (Piece-level inventory)
        // ──────────────────────────────────────────
        if (!Schema::hasTable('watches')) {
            Schema::create('watches', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->foreignId('purchase_id')->constrained('purchases')->onDelete('cascade');
                $table->string('brand');
                $table->string('model');
                $table->string('category')->nullable();
                $table->string('gender')->nullable();
                $table->string('strap_type')->nullable();
                $table->string('dial_color')->nullable();
                $table->string('movement_type')->nullable();
                $table->decimal('mrp', 10, 2);
                $table->decimal('discount_percent', 5, 2)->default(0.00);
                $table->decimal('cost_price', 10, 2);
                $table->decimal('selling_price', 10, 2);
                $table->decimal('gst_rate', 5, 2)->default(18.00);
                $table->string('status')->default('in_stock');
                $table->json('image_urls')->nullable();
                $table->string('hsn_code')->nullable();
                $table->timestamps();
            });
        } else {
            Schema::table('watches', function (Blueprint $table) {
                if (!Schema::hasColumn('watches', 'hsn_code')) {
                    $table->string('hsn_code')->nullable()->after('image_urls');
                }
                if (!Schema::hasColumn('watches', 'image_urls')) {
                    $table->json('image_urls')->nullable()->after('status');
                }
            });
            // Ensure status column is string (not enum) to allow any status value
            try {
                DB::statement("ALTER TABLE watches MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'in_stock'");
            } catch (\Exception $e) {}
        }

        // ──────────────────────────────────────────
        // 6. SALES (Invoices)
        // ──────────────────────────────────────────
        if (!Schema::hasTable('sales')) {
            Schema::create('sales', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->foreignId('customer_id')->constrained('customers');
                $table->foreignId('user_id')->constrained('users');
                $table->enum('invoice_type', ['gst', 'non-gst'])->default('non-gst');
                $table->date('invoice_date');
                $table->decimal('subtotal', 12, 2);
                $table->decimal('discount_amount', 12, 2)->default(0.00);
                $table->decimal('bill_discount_amount', 12, 2)->default(0.00);
                $table->decimal('gst_amount', 12, 2)->default(0.00);
                $table->integer('points_redeemed')->default(0);
                $table->decimal('points_value', 10, 2)->default(0.00);
                $table->decimal('net_amount', 12, 2);
                $table->string('payment_mode')->default('cash');
                $table->boolean('is_credit_sale')->default(false);
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        } else {
            Schema::table('sales', function (Blueprint $table) {
                if (!Schema::hasColumn('sales', 'is_credit_sale')) {
                    $table->boolean('is_credit_sale')->default(false)->after('payment_mode');
                }
                if (!Schema::hasColumn('sales', 'bill_discount_amount')) {
                    $table->decimal('bill_discount_amount', 12, 2)->default(0.00)->after('discount_amount');
                }
            });
        }

        // ──────────────────────────────────────────
        // 7. SALE ITEMS
        // ──────────────────────────────────────────
        if (!Schema::hasTable('sale_items')) {
            Schema::create('sale_items', function (Blueprint $table) {
                $table->id();
                $table->string('sale_id');
                $table->foreign('sale_id')->references('id')->on('sales')->onDelete('cascade');
                $table->string('watch_id');
                $table->foreign('watch_id')->references('id')->on('watches');
                $table->decimal('price_sold', 10, 2);
                $table->decimal('discount_amount', 10, 2)->default(0.00);
                $table->decimal('cost_price', 10, 2);
                $table->decimal('gst_rate', 5, 2);
                $table->decimal('gst_amount', 10, 2);
                $table->boolean('is_returned')->default(false);
                $table->timestamps();
            });
        } else {
            Schema::table('sale_items', function (Blueprint $table) {
                if (!Schema::hasColumn('sale_items', 'is_returned')) {
                    $table->boolean('is_returned')->default(false)->after('gst_amount');
                }
            });
        }

        // ──────────────────────────────────────────
        // 8. EXCHANGES
        // ──────────────────────────────────────────
        if (!Schema::hasTable('exchanges')) {
            Schema::create('exchanges', function (Blueprint $table) {
                $table->id();
                $table->string('original_sale_id');
                $table->foreign('original_sale_id')->references('id')->on('sales');
                $table->string('returned_watch_id');
                $table->foreign('returned_watch_id')->references('id')->on('watches');
                $table->string('replacement_sale_id')->nullable();
                $table->string('replacement_watch_id');
                $table->foreign('replacement_watch_id')->references('id')->on('watches');
                $table->decimal('difference_amount', 10, 2);
                $table->enum('exchange_type', ['credit_note', 'tax_invoice', 'exchange_note']);
                $table->date('exchange_date');
                $table->foreignId('created_by')->constrained('users');
                $table->enum('status', ['pending_review', 'resellable', 'refurbish'])->default('pending_review');
                $table->text('remarks')->nullable();
                $table->timestamps();
            });
        }

        // ──────────────────────────────────────────
        // 9. SERVICE JOBS
        // ──────────────────────────────────────────
        if (!Schema::hasTable('service_jobs')) {
            Schema::create('service_jobs', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->foreignId('customer_id')->constrained('customers');
                $table->string('watch_id')->nullable();
                $table->text('watch_details')->nullable();
                $table->text('issue_reported');
                $table->text('drop_off_condition')->nullable();
                $table->decimal('estimated_cost', 10, 2)->nullable();
                $table->decimal('actual_cost', 10, 2)->nullable();
                $table->date('expected_delivery_date')->nullable();
                $table->date('actual_delivery_date')->nullable();
                $table->enum('status', ['received', 'in_repair', 'ready', 'delivered'])->default('received');
                $table->boolean('terms_accepted')->default(true);
                $table->string('billing_invoice_id')->nullable();
                $table->foreignId('created_by')->constrained('users');
                $table->timestamps();
            });
        }

        // ──────────────────────────────────────────
        // 10. LOYALTY LEDGER
        // ──────────────────────────────────────────
        if (!Schema::hasTable('loyalty_ledgers')) {
            Schema::create('loyalty_ledgers', function (Blueprint $table) {
                $table->id();
                $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade');
                $table->integer('points_earned')->default(0);
                $table->integer('points_redeemed')->default(0);
                $table->enum('transaction_type', ['purchase', 'redemption', 'refund', 'expiry']);
                $table->string('reference_id')->nullable();
                $table->string('remarks')->nullable();
                $table->timestamps();
            });
        }

        // ──────────────────────────────────────────
        // 11. STOCK ADJUSTMENTS
        // ──────────────────────────────────────────
        if (!Schema::hasTable('stock_adjustments')) {
            Schema::create('stock_adjustments', function (Blueprint $table) {
                $table->id();
                $table->string('watch_id');
                $table->foreign('watch_id')->references('id')->on('watches')->onDelete('cascade');
                $table->foreignId('user_id')->nullable()->constrained('users');
                $table->string('old_status')->nullable();
                $table->string('new_status');
                $table->string('reason');
                $table->text('remarks')->nullable();
                $table->timestamps();
            });
        } else {
            Schema::table('stock_adjustments', function (Blueprint $table) {
                if (!Schema::hasColumn('stock_adjustments', 'user_id')) {
                    $table->unsignedBigInteger('user_id')->nullable()->after('watch_id');
                    try {
                        $table->foreign('user_id')->references('id')->on('users');
                    } catch (\Exception $e) {}
                }
                if (!Schema::hasColumn('stock_adjustments', 'old_status')) {
                    $table->string('old_status')->nullable();
                }
                if (!Schema::hasColumn('stock_adjustments', 'new_status')) {
                    $table->string('new_status')->default('in_stock');
                }
                if (!Schema::hasColumn('stock_adjustments', 'reason')) {
                    $table->string('reason')->default('Other');
                }
                if (!Schema::hasColumn('stock_adjustments', 'remarks')) {
                    $table->text('remarks')->nullable();
                }
            });
        }

        // ──────────────────────────────────────────
        // 12. WARRANTY CARDS
        // ──────────────────────────────────────────
        if (!Schema::hasTable('warranty_cards')) {
            Schema::create('warranty_cards', function (Blueprint $table) {
                $table->id();
                $table->string('watch_id');
                $table->foreign('watch_id')->references('id')->on('watches')->onDelete('cascade');
                $table->string('sale_id');
                $table->foreign('sale_id')->references('id')->on('sales')->onDelete('cascade');
                $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade');
                $table->date('sale_date');
                $table->integer('warranty_months')->default(12);
                $table->date('expiry_date');
                $table->boolean('is_active')->default(true);
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        // ──────────────────────────────────────────
        // 13. SALES RETURNS
        // ──────────────────────────────────────────
        if (!Schema::hasTable('sales_returns')) {
            Schema::create('sales_returns', function (Blueprint $table) {
                $table->id();
                $table->string('original_sale_id');
                $table->foreign('original_sale_id')->references('id')->on('sales')->onDelete('cascade');
                $table->string('watch_id');
                $table->foreign('watch_id')->references('id')->on('watches')->onDelete('cascade');
                $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade');
                $table->decimal('refund_amount', 12, 2);
                $table->string('refund_mode')->default('cash');
                $table->text('reason')->nullable();
                $table->timestamps();
            });
        }

        // ──────────────────────────────────────────
        // 14. ATTENDANCES
        // ──────────────────────────────────────────
        if (!Schema::hasTable('attendances')) {
            Schema::create('attendances', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->date('date');
                $table->enum('status', ['present', 'absent', 'half_day', 'leave'])->default('present');
                $table->string('notes')->nullable();
                $table->timestamps();
                $table->unique(['user_id', 'date']);
            });
        }

        // ──────────────────────────────────────────
        // 15. PAYROLLS
        // ──────────────────────────────────────────
        if (!Schema::hasTable('payrolls')) {
            Schema::create('payrolls', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->integer('month');
                $table->integer('year');
                $table->decimal('base_salary', 10, 2);
                $table->decimal('net_salary', 10, 2);
                $table->enum('status', ['unpaid', 'paid'])->default('unpaid');
                $table->date('payment_date')->nullable();
                $table->timestamps();
                $table->unique(['user_id', 'month', 'year']);
            });
        }

        // ──────────────────────────────────────────
        // 16. ACTIVITY LOGS
        // ──────────────────────────────────────────
        if (!Schema::hasTable('activity_logs')) {
            Schema::create('activity_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->string('action');
                $table->string('module');
                $table->text('details');
                $table->timestamps();
            });
        }

        // ──────────────────────────────────────────
        // 17. SETTINGS (with full seed data)
        // ──────────────────────────────────────────
        if (!Schema::hasTable('settings')) {
            Schema::create('settings', function (Blueprint $table) {
                $table->id();
                $table->string('store_name')->default('Smart Times');
                $table->string('tagline')->nullable();
                $table->string('gstin')->nullable();
                $table->text('address')->nullable();
                $table->string('phone')->nullable();
                $table->string('email')->nullable();
                $table->string('gst_invoice_prefix')->default('ST-GST');
                $table->string('nongst_invoice_prefix')->default('ST-RETL');
                $table->string('job_card_prefix')->default('JC');
                $table->integer('exchange_window_days')->default(7);
                $table->integer('warranty_period_months')->default(12);
                $table->integer('loyalty_earn_rate')->default(1);
                $table->integer('loyalty_redeem_rate')->default(1);
                $table->integer('loyalty_expiry_months')->default(12);
                $table->decimal('loyalty_conversion_rate', 8, 2)->default(1.00);
                $table->enum('default_gst_type', ['intra-state', 'inter-state', 'dynamic'])->default('dynamic');
                $table->text('job_card_terms')->nullable();
                $table->timestamps();
            });
        } else {
            Schema::table('settings', function (Blueprint $table) {
                if (!Schema::hasColumn('settings', 'loyalty_conversion_rate')) {
                    $table->decimal('loyalty_conversion_rate', 8, 2)->default(1.00);
                }
                if (!Schema::hasColumn('settings', 'default_gst_type')) {
                    $table->enum('default_gst_type', ['intra-state', 'inter-state', 'dynamic'])->default('dynamic');
                }
            });
        }

        // Always ensure the default settings record exists
        if (DB::table('settings')->count() === 0) {
            DB::table('settings')->insert([
                'store_name'             => 'Smart Times',
                'tagline'                => 'TITAN - SONATA - FASTRACK - TIMEX - LENCO - SMART WATCHES',
                'gstin'                  => '33EJBPA4537C1ZW',
                'address'                => '108, Pennagaram Main Road, (Next to R.C. Chruch), DHARMAPURI - 636 701.',
                'phone'                  => '97512 85945, 86672 88021',
                'email'                  => 'info@smarttimes.in',
                'gst_invoice_prefix'     => 'ST-GST',
                'nongst_invoice_prefix'  => 'ST-RETL',
                'job_card_prefix'        => 'JC',
                'exchange_window_days'   => 7,
                'warranty_period_months' => 12,
                'loyalty_earn_rate'      => 1,
                'loyalty_redeem_rate'    => 1,
                'loyalty_expiry_months'  => 12,
                'job_card_terms'         => "1. All service charges are estimates. Actual costs might vary up to 15%.\n2. Smart Times is not responsible for watches left unclaimed for more than 90 days.\n3. Warranty on serviced parts is 90 days from delivery date.",
                'created_at'             => now(),
                'updated_at'             => now(),
            ]);
        }

        // ──────────────────────────────────────────
        // 18. CACHE TABLES (Laravel internal)
        // ──────────────────────────────────────────
        if (!Schema::hasTable('cache')) {
            Schema::create('cache', function (Blueprint $table) {
                $table->string('key')->primary();
                $table->mediumText('value');
                $table->integer('expiration');
            });
        }

        if (!Schema::hasTable('cache_locks')) {
            Schema::create('cache_locks', function (Blueprint $table) {
                $table->string('key')->primary();
                $table->string('owner');
                $table->integer('expiration');
            });
        }
    }

    public function down(): void
    {
        // Drop in reverse dependency order
        Schema::dropIfExists('cache_locks');
        Schema::dropIfExists('cache');
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('payrolls');
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('sales_returns');
        Schema::dropIfExists('warranty_cards');
        Schema::dropIfExists('stock_adjustments');
        Schema::dropIfExists('loyalty_ledgers');
        Schema::dropIfExists('service_jobs');
        Schema::dropIfExists('exchanges');
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('sales');
        Schema::dropIfExists('watches');
        Schema::dropIfExists('purchases');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('settings');
        Schema::dropIfExists('users');
    }
};
