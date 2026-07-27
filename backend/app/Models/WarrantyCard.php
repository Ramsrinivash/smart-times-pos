<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WarrantyCard extends Model
{
    use HasFactory;

    protected $fillable = [
        'watch_id',
        'sale_id',
        'customer_id',
        'sale_date',
        'warranty_months',
        'expiry_date',
        'is_active',
        'notes',
    ];

    public function watch()
    {
        return $this->belongsTo(Watch::class, 'watch_id');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class, 'sale_id');
    }
}
