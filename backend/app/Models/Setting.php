<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_name',
        'tagline',
        'gstin',
        'address',
        'phone',
        'email',
        'gst_invoice_prefix',
        'nongst_invoice_prefix',
        'job_card_prefix',
        'exchange_window_days',
        'warranty_period_months',
        'loyalty_earn_rate',
        'loyalty_redeem_rate',
        'loyalty_expiry_months',
        'job_card_terms'
    ];
}
