<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use Auditable, HasApiTokens, HasFactory, HasRoles, Notifiable;

    public const MAX_FAILED_LOGINS = 5;

    public const LOCKOUT_MINUTES = 15;

    protected $fillable = [
        'name',
        'email',
        'password',
        'service_number',
        'rank',
        'designation',
        'is_active',
        'must_change_password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'two_factor_last_timestep',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
            'password_changed_at' => 'datetime',
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
            'two_factor_confirmed_at' => 'datetime',
            'locked_until' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }

    /** Bases this user may manage (establishment officers). Empty = unrestricted. */
    public function bases(): BelongsToMany
    {
        return $this->belongsToMany(Base::class);
    }

    public function hasTwoFactorEnabled(): bool
    {
        return $this->two_factor_confirmed_at !== null;
    }

    public function isLocked(): bool
    {
        return $this->locked_until !== null && $this->locked_until->isFuture();
    }

    public function registerFailedLogin(): void
    {
        $this->failed_login_count++;

        if ($this->failed_login_count >= self::MAX_FAILED_LOGINS) {
            $this->locked_until = now()->addMinutes(self::LOCKOUT_MINUTES);
            $this->failed_login_count = 0;
        }

        $this->saveQuietly();
    }

    protected function auditIgnore(): array
    {
        return ['updated_at', 'failed_login_count', 'last_login_at', 'last_login_ip', 'remember_token'];
    }
}
