<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Exchange extends Model
{
    use HasFactory;

    protected $fillable = [
        'original_sale_id',
        'returned_watch_id',
        'replacement_sale_id',
        'replacement_watch_id',
        'difference_amount',
        'exchange_type',
        'exchange_date',
        'created_by',
        'status',
        'remarks'
    ];

    public function originalSale()
    {
        return $this->belongsTo(Sale::class, 'original_sale_id');
    }

    public function returnedWatch()
    {
        return $this->belongsTo(Watch::class, 'returned_watch_id');
    }

    public function replacementSale()
    {
        return $this->belongsTo(Sale::class, 'replacement_sale_id');
    }

    public function replacementWatch()
    {
        return $this->belongsTo(Watch::class, 'replacement_watch_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
