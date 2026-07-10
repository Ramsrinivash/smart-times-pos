<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SaleItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'sale_id',
        'watch_id',
        'price_sold',
        'discount_amount',
        'cost_price',
        'gst_rate',
        'gst_amount'
    ];

    public function sale()
    {
        return $this->belongsTo(Sale::class, 'sale_id');
    }

    public function watch()
    {
        return $this->belongsTo(Watch::class, 'watch_id');
    }
}
