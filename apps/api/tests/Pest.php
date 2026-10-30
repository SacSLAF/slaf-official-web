<?php

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->beforeEach(fn () => $this->seed(RolesAndPermissionsSeeder::class))
    ->in('Feature');

/** A user with the given role, already past password + MFA. */
function staff(string $role, array $attributes = []): User
{
    $user = User::factory()->create([
        'must_change_password' => false,
        'two_factor_confirmed_at' => now(),
        ...$attributes,
    ]);
    $user->assignRole($role);

    return $user;
}

/** Authorization header for a fully authenticated admin session. */
function adminHeaders(User $user): array
{
    return ['Authorization' => 'Bearer '.$user->createToken('admin', ['admin'], now()->addHour())->plainTextToken];
}

function newsPayload(array $overrides = []): array
{
    return [
        'title' => ['en' => 'Test article', 'si' => 'පරීක්ෂණ ලිපිය'],
        'summary' => ['en' => 'Summary'],
        'body' => ['en' => '<p>Body</p>'],
        'category' => 'news',
        ...$overrides,
    ];
}
