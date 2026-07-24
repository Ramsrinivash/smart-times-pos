<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockAdjustment extends Model
{
    protected $fillable = [
        'watch_id',
        'user_id',
        'old_status',
        'new_status',
        'reason',
        'remarks'
    ];

    public function watch()
    {
        return $this->belongsTo(Watch::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
