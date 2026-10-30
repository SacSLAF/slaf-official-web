<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Auth\TwoFactorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function __construct(private AuditLogger $audit, private TwoFactorService $twoFactor) {}

    public function index(Request $request): JsonResponse
    {
        $q = $request->string('q')->toString();

        $page = User::query()
            ->with(['roles:id,name', 'bases:id,name'])
            ->when($q, fn ($query) => $query->where(fn ($w) => $w
                ->where('name', 'like', "%{$q}%")
                ->orWhere('email', 'like', "%{$q}%")
                ->orWhere('service_number', 'like', "%{$q}%")))
            ->orderBy('name')
            ->paginate(25);

        return response()->json([
            'data' => collect($page->items())->map(fn (User $u) => $this->present($u)),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
        ]);
    }

    public function roles(): JsonResponse
    {
        return response()->json([
            'data' => Role::with('permissions:id,name')->orderBy('name')->get()->map(fn ($r) => [
                'name' => $r->name,
                'permissions' => $r->permissions->pluck('name'),
            ]),
        ]);
    }

    /** Creates the account with a one-time temporary password, shown once to the administrator. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());
        $temporary = Str::password(16);

        $user = DB::transaction(function () use ($data, $temporary) {
            $user = User::create([
                ...collect($data)->only(['name', 'service_number', 'rank', 'designation'])->all(),
                'email' => strtolower($data['email']),
                'password' => $temporary,
                'must_change_password' => true,
                'is_active' => true,
            ]);
            $user->syncRoles($data['roles']);
            $user->bases()->sync($data['base_ids'] ?? []);

            return $user;
        });

        $this->audit->log('user.roles_assigned', $user, [], ['roles' => $data['roles'], 'base_ids' => $data['base_ids'] ?? []]);

        return response()->json(['data' => $this->present($user->fresh()), 'temporary_password' => $temporary], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate($this->rules($user));

        if ($user->is($request->user()) && (! ($data['is_active'] ?? true) || ! in_array('super-admin', $data['roles'], true)) && $user->hasRole('super-admin')) {
            abort(422, 'You cannot deactivate or demote your own super administrator account.');
        }

        $oldRoles = $user->getRoleNames()->all();
        $oldBases = $user->bases()->pluck('bases.id')->all();

        DB::transaction(function () use ($user, $data) {
            $user->fill([
                ...collect($data)->only(['name', 'service_number', 'rank', 'designation', 'is_active'])->all(),
                'email' => strtolower($data['email']),
            ])->save();
            $user->syncRoles($data['roles']);
            $user->bases()->sync($data['base_ids'] ?? []);

            if (! $user->is_active) {
                $user->tokens()->delete();
            }
        });

        if ($oldRoles != $data['roles'] || $oldBases != ($data['base_ids'] ?? [])) {
            $this->audit->log('user.roles_assigned', $user, ['roles' => $oldRoles, 'base_ids' => $oldBases], ['roles' => $data['roles'], 'base_ids' => $data['base_ids'] ?? []]);
        }

        return response()->json(['data' => $this->present($user->fresh())]);
    }

    public function resetMfa(Request $request, User $user): JsonResponse
    {
        $this->twoFactor->reset($user);
        $this->audit->log('user.mfa_reset', $user);

        return response()->json(['message' => 'Two-factor authentication reset. The user must enrol again at next sign-in.']);
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $temporary = Str::password(16);
        $user->forceFill(['password' => $temporary, 'must_change_password' => true])->saveQuietly();
        $user->tokens()->delete();
        $this->audit->log('user.password_reset', $user);

        return response()->json(['temporary_password' => $temporary]);
    }

    public function unlock(User $user): JsonResponse
    {
        $user->forceFill(['locked_until' => null, 'failed_login_count' => 0])->saveQuietly();
        $this->audit->log('user.unlocked', $user);

        return response()->json(['data' => $this->present($user)]);
    }

    private function rules(?User $user = null): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:255', Rule::unique('users', 'email')->ignore($user?->id)],
            'service_number' => ['nullable', 'string', 'max:30', Rule::unique('users', 'service_number')->ignore($user?->id)],
            'rank' => ['nullable', 'string', 'max:60'],
            'designation' => ['nullable', 'string', 'max:120'],
            'is_active' => ['sometimes', 'boolean'],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['string', Rule::exists('roles', 'name')],
            'base_ids' => ['nullable', 'array'],
            'base_ids.*' => ['integer', Rule::exists('bases', 'id')],
        ];
    }

    private function present(User $user): array
    {
        return [
            ...$user->only(['id', 'name', 'email', 'service_number', 'rank', 'designation', 'is_active', 'must_change_password']),
            'roles' => $user->getRoleNames(),
            'bases' => $user->bases->map(fn ($b) => ['id' => $b->id, 'name' => $b->displayTitle()]),
            'mfa_enabled' => $user->hasTwoFactorEnabled(),
            'locked' => $user->isLocked(),
            'last_login_at' => $user->last_login_at?->toIso8601String(),
            'last_login_ip' => $user->last_login_ip,
        ];
    }
}
