<?php

namespace Database\Seeders;

use App\Content\ContentRegistry;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * RBAC matrix. Safe to re-run in production: it only adds missing
 * permissions and re-syncs the built-in roles.
 */
class RolesAndPermissionsSeeder extends Seeder
{
    public const ROLES = [
        'super-admin' => 'Super Administrator (DECE)',
        'media-editor' => 'Media Directorate Editor',
        'media-approver' => 'Media Directorate Approver',
        'establishment-officer' => 'Establishment / Base Officer',
        'establishment-approver' => 'Establishment Approver (Commanding Officer)',
        'tender-officer' => 'Tender Board Officer',
        'tender-approver' => 'Tender Board Approver',
        'auditor' => 'Auditor (read-only)',
    ];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = ['bases.manage-all', 'media.manage', 'users.manage', 'audit.view', 'security.view', 'system.view'];

        foreach (ContentRegistry::types() as $type) {
            foreach (['view', 'create', 'update', 'delete', 'approve'] as $ability) {
                $permissions[] = "{$type}.{$ability}";
            }
        }

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        $views = array_map(fn ($t) => "{$t}.view", ContentRegistry::types());
        $edit = fn (string $type) => ["{$type}.view", "{$type}.create", "{$type}.update", "{$type}.delete"];

        $matrix = [
            'super-admin' => $permissions,
            'media-editor' => [...$views, ...$edit('news'), ...$edit('events'), ...$edit('aircraft'), ...$edit('pages'), 'media.manage'],
            'media-approver' => [...$views, 'news.approve', 'events.approve', 'aircraft.approve', 'pages.approve', 'media.manage'],
            // Scoped to the bases assigned to the user (see base_user).
            'establishment-officer' => [...$views, 'bases.update', 'news.create', 'news.update', 'media.manage'],
            'establishment-approver' => [...$views, 'bases.approve'],
            'tender-officer' => ['tenders.view', ...$edit('tenders')],
            'tender-approver' => ['tenders.view', 'tenders.approve'],
            'auditor' => [...$views, 'audit.view', 'security.view', 'system.view'],
        ];

        foreach ($matrix as $role => $grants) {
            Role::findOrCreate($role, 'web')->syncPermissions(array_unique($grants));
        }
    }
}
