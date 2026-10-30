<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SecurityEvent extends Model
{
    public const LOGIN_SUCCESS = 'login.success';

    public const LOGIN_FAILED = 'login.failed';

    public const LOGIN_LOCKED = 'login.locked';

    public const MFA_FAILED = 'mfa.failed';

    public const MFA_SUCCESS = 'mfa.success';

    public const MFA_ENROLLED = 'mfa.enrolled';

    public const MFA_RECOVERY_USED = 'mfa.recovery_used';

    public const LOGOUT = 'logout';

    public const SESSION_IDLE_EXPIRED = 'session.idle_expired';

    public const IP_BLOCKED = 'admin.ip_blocked';

    public const PASSWORD_CHANGED = 'password.changed';

    public const UPDATED_AT = null;

    protected $fillable = ['type', 'user_id', 'email', 'ip_address', 'user_agent', 'meta'];

    protected function casts(): array
    {
        return ['meta' => 'array'];
    }

    public static function record(string $type, ?User $user = null, ?string $email = null, array $meta = []): self
    {
        $request = request();

        return static::create([
            'type' => $type,
            'user_id' => $user?->id,
            'email' => $email ?? $user?->email,
            'ip_address' => $request->ip(),
            'user_agent' => mb_substr((string) $request->userAgent(), 0, 500),
            'meta' => $meta ?: null,
        ]);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
