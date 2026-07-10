<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceJob extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'customer_id',
        'watch_id',
        'watch_details',
        'issue_reported',
        'drop_off_condition',
        'estimated_cost',
        'actual_cost',
        'expected_delivery_date',
        'actual_delivery_date',
        'status',
        'terms_accepted',
        'billing_invoice_id',
        'created_by'
    ];

    protected $casts = [
        'watch_details' => 'array',
        'terms_accepted' => 'boolean'
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function watch()
    {
        return $this->belongsTo(Watch::class, 'watch_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
