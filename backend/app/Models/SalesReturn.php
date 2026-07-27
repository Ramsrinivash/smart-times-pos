<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalesReturn extends Model
{
    use HasFactory;

    protected $table = 'sales_returns';

    protected $fillable = [
        'original_sale_id',
        'watch_id',
        'customer_id',
        'refund_amount',
        'refund_mode',
        'reason'
    ];

    public function originalSale()
    {
        return $this->belongsTo(Sale::class, 'original_sale_id');
    }

    public function watch()
    {
        return $this->belongsTo(Watch::class, 'watch_id');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }
}
