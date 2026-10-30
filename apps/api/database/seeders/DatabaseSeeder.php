<?php

namespace Database\Seeders;

use App\Models\Base;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Local development accounts — one per role. All share the password in
     * SEED_USER_PASSWORD (see .env.example). MFA enrolment is still required
     * at first sign-in. Never runs in production.
     */
    public const DEV_USERS = [
        ['super-admin', 'DECE Administrator', 'admin@slaf.test', 'Sqn Ldr'],
        ['media-editor', 'Media Editor', 'editor@slaf.test', 'Flt Lt'],
        ['media-approver', 'Director Media', 'approver@slaf.test', 'Gp Capt'],
        ['establishment-officer', 'Katunayake Base Officer', 'base.officer@slaf.test', 'Flg Off'],
        ['establishment-approver', 'Base Commander', 'base.commander@slaf.test', 'Air Cdre'],
        ['tender-officer', 'Tender Board Clerk', 'tenders@slaf.test', 'Cpl'],
        ['tender-approver', 'Tender Board Chairman', 'tender.chair@slaf.test', 'Wg Cdr'],
        ['auditor', 'Internal Auditor', 'auditor@slaf.test', 'Sqn Ldr'],
    ];

    public function run(): void
    {
        $this->call(RolesAndPermissionsSeeder::class);

        if (app()->isProduction()) {
            $this->command?->warn('Production: only roles and permissions were seeded. Create the first super admin with `php artisan slaf:create-admin`.');

            return;
        }

        $password = env('SEED_USER_PASSWORD', 'Slaf-Dev-Pass-2026!');

        foreach (self::DEV_USERS as $i => [$role, $name, $email, $rank]) {
            $user = User::updateOrCreate(['email' => $email], [
                'name' => $name,
                'rank' => $rank,
                'service_number' => sprintf('DEV%04d', $i + 1),
                'password' => $password,
                'must_change_password' => false,
                'is_active' => true,
            ]);
            $user->syncRoles([$role]);
        }

        $this->call(DemoContentSeeder::class);

        User::where('email', 'base.officer@slaf.test')->first()
            ->bases()->sync(Base::where('slug', 'slaf-katunayake')->pluck('id'));
        User::where('email', 'base.commander@slaf.test')->first()
            ->bases()->sync(Base::where('slug', 'slaf-katunayake')->pluck('id'));
    }
}
