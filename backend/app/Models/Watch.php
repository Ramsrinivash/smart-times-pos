<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Watch extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'purchase_id',
        'brand',
        'model',
        'category',
        'gender',
        'strap_type',
        'dial_color',
        'movement_type',
        'mrp',
        'discount_percent',
        'cost_price',
        'selling_price',
        'gst_rate',
        'status',
        'image_urls',
        'hsn_code'
    ];

    protected $casts = [
        'image_urls' => 'array',
    ];

    public function purchase()
    {
        return $this->belongsTo(Purchase::class);
    }

    public function saleItems()
    {
        return $this->hasMany(SaleItem::class);
    }
}
