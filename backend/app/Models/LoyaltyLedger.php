<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoyaltyLedger extends Model
{
    use HasFactory;

    protected $table = 'loyalty_ledgers';

    protected $fillable = [
        'customer_id',
        'points_earned',
        'points_redeemed',
        'transaction_type',
        'reference_id',
        'remarks'
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
