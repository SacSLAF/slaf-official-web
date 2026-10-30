<?php

namespace App\Services\Auth;

use App\Models\User;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

/**
 * TOTP (RFC 6238) enrolment and verification, compatible with Google /
 * Microsoft Authenticator. Codes cannot be replayed within their window.
 */
class TwoFactorService
{
    public const RECOVERY_CODE_COUNT = 8;

    public function __construct(private Google2FA $google2fa) {}

    /** @return array{secret: string, otpauth_url: string, qr_svg: string} */
    public function beginEnrolment(User $user): array
    {
        $secret = $this->google2fa->generateSecretKey(32);

        $user->forceFill([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_last_timestep' => null,
        ])->saveQuietly();

        $url = $this->google2fa->getQRCodeUrl(config('app.name'), $user->email, $secret);

        $svg = (new Writer(new ImageRenderer(new RendererStyle(220, 1), new SvgImageBackEnd)))->writeString($url);

        return ['secret' => $secret, 'otpauth_url' => $url, 'qr_svg' => $svg];
    }

    /** @return list<string> plain recovery codes, shown to the user exactly once */
    public function confirmEnrolment(User $user, string $code): ?array
    {
        if (! $user->two_factor_secret || ! $this->verifyCode($user, $code)) {
            return null;
        }

        $codes = collect(range(1, self::RECOVERY_CODE_COUNT))
            ->map(fn () => Str::upper(Str::random(5).'-'.Str::random(5)))
            ->all();

        $user->forceFill([
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => array_map(fn ($c) => hash('sha256', $c), $codes),
        ])->saveQuietly();

        return $codes;
    }

    public function verifyCode(User $user, string $code): bool
    {
        $code = preg_replace('/\s+/', '', $code);

        if (! preg_match('/^\d{6}$/', $code) || ! $user->two_factor_secret) {
            return false;
        }

        // verifyKeyNewer rejects any timestep at or before the last accepted one (replay protection).
        // Pass 0 rather than null: with null the library returns `true` instead of the timestep.
        $timestep = $this->google2fa->verifyKeyNewer($user->two_factor_secret, $code, $user->two_factor_last_timestep ?? 0, 1);

        if ($timestep === false) {
            return false;
        }

        $user->forceFill(['two_factor_last_timestep' => $timestep])->saveQuietly();

        return true;
    }

    public function useRecoveryCode(User $user, string $code): bool
    {
        $hash = hash('sha256', Str::upper(trim($code)));
        $codes = $user->two_factor_recovery_codes ?? [];

        foreach ($codes as $i => $stored) {
            if (hash_equals($stored, $hash)) {
                unset($codes[$i]);
                $user->forceFill(['two_factor_recovery_codes' => array_values($codes)])->saveQuietly();

                return true;
            }
        }

        return false;
    }

    public function reset(User $user): void
    {
        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
            'two_factor_last_timestep' => null,
        ])->saveQuietly();

        $user->tokens()->delete();
    }
}
