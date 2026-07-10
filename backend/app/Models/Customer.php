<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'alt_phone',
        'email',
        'address',
        'dob',
        'anniversary',
        'points_balance',
        'tags',
        'notes'
    ];

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }

    public function serviceJobs()
    {
        return $this->hasMany(ServiceJob::class);
    }

    public function loyaltyLedgers()
    {
        return $this->hasMany(LoyaltyLedger::class);
    }
}
