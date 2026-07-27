<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payroll extends Model
{
    use HasFactory;

    protected $table = 'payrolls';

    protected $fillable = [
        'user_id',
        'month',
        'year',
        'base_salary',
        'net_salary',
        'status',
        'payment_date'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
