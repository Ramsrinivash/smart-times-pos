<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    use HasFactory;

    protected $table = 'activity_logs';

    protected $fillable = [
        'user_id',
        'action',
        'module',
        'details'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public static function log($userId, $action, $module, $details)
    {
        try {
            self::create([
                'user_id' => $userId,
                'action' => $action,
                'module' => $module,
                'details' => $details
            ]);
        } catch (\Exception $e) {
            \Log::error('ActivityLog write failure: ' . $e->getMessage());
        }
    }
}
