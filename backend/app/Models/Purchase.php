<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Purchase extends Model
{
    use HasFactory;

    protected $fillable = [
        'supplier_name',
        'purchase_date',
        'invoice_number',
        'total_amount',
        'payment_status',
        'remarks'
    ];

    public function watches()
    {
        return $this->hasMany(Watch::class);
    }
}
