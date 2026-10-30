# Sri Lanka Air Force — official web platform

Trilingual (English / සිංහල / தமிழ்) public website and hardened content-management console for airforce.lk.

```
apps/
  api/      Laravel 12 — public read API (/api/v1) and administrative API (/api/admin)
  web/      Next.js 16 — public website (www)
  admin/    Next.js 16 — content & governance console (cms), separate host
packages/
  ui/       Shared design tokens (theme.css) for both front ends
infra/      Dockerfiles, docker-compose, nginx reverse proxy
```

## Architecture

```
            Internet                                     Approved networks only
               │                                                 │
        ┌──────▼──────┐                                   ┌──────▼──────┐
        │    nginx    │  www / api vhosts                 │    nginx    │  cms vhost (IP allow-list,
        └──┬───────┬──┘  rate limits, micro-cache         └──────┬──────┘   optional mutual TLS)
           │       │                                             │
     ┌─────▼──┐  ┌─▼────────────┐                         ┌──────▼──────┐
     │  web   │  │ api (public) │ ◄── internal vhost ───── │    admin    │  BFF: holds the Sanctum token
     └────────┘  └──────┬───────┘     /api/admin only      └─────────────┘  in an httpOnly cookie
                        │
                ┌───────▼────────┐
                │ MySQL · Redis  │  internal network, unreachable from web/admin
                └────────────────┘
```

- **The public API is read-only** and only ever returns published content. Responses are cached and invalidated on publish; the API then calls the web app's revalidation webhook.
- **The admin API is never exposed publicly.** nginx returns 404 for `/api/admin` on public hostnames, Laravel enforces its own allow-list (`ADMIN_ALLOWED_IPS`), and the browser only talks to the admin app's same-origin BFF (`/api/bff/*`).

## Security controls

| Control | Where |
|---|---|
| Mandatory TOTP MFA (Google/Microsoft Authenticator), 8 single-use recovery codes, replay protection | `app/Services/Auth/TwoFactorService.php` |
| Two-step sign-in: password → short-lived `mfa` token → `admin` token | `app/Http/Controllers/Admin/AuthController.php` |
| Account lockout (5 failures → 15 min), per-account and per-IP throttling, constant-time failures | `AuthController`, `AppServiceProvider` |
| Absolute session lifetime (8 h) and idle timeout (30 min) | `config/admin.php`, `AppServiceProvider::configureTokenIdleTimeout` |
| Forced password change for new/reset accounts; strong password policy (+ HIBP check in production) | `EnsureAdminSession`, `AppServiceProvider` |
| RBAC with base-level scoping for establishment officers | `RolesAndPermissionsSeeder`, `WorkflowService::inScope` |
| Maker-checker: nobody (including super admins) can approve content they created, edited or submitted | `app/Services/Workflow/WorkflowService.php` |
| Append-only audit log, SHA-256 hash chain, DB triggers block UPDATE/DELETE, nightly `audit:verify` | `app/Services/Audit/AuditLogger.php` |
| Security event log (failed sign-ins, lockouts, MFA failures, blocked IPs) and dashboard | `SecurityEvent`, admin `/security` |
| Rich-text allow-list sanitising (Symfony HtmlSanitizer); plain fields stripped of markup | `app/Services/RichTextSanitizer.php` |
| Image uploads re-encoded to WebP (strips EXIF/GPS, defeats polyglots) | `MediaController` |
| Tender documents on private storage, streamed by the API, SHA-256 published | `TenderDocumentController`, public `ContentController::tenderDocument` |
| Strict nonce CSP on the admin app; CSP, HSTS and frame denial on the public site | `apps/admin/src/proxy.ts`, `apps/web/next.config.ts` |
| CSRF: SameSite=Strict httpOnly cookies + Origin check on every state-changing BFF call | `apps/admin/src/lib/api-server.ts` |

### Roles

| Role | Can |
|---|---|
| `super-admin` (DECE) | Everything, including users and roles — but still subject to maker-checker |
| `media-editor` | Draft news, events, aircraft and pages; manage media |
| `media-approver` | Approve/reject news, events, aircraft and pages |
| `establishment-officer` | Edit **assigned** bases; draft base news |
| `establishment-approver` | Approve base pages (within assigned bases) |
| `tender-officer` | Draft tender notices and attach bidding documents |
| `tender-approver` | Approve/withdraw tender notices |
| `auditor` | Read-only: all content, audit trail, security events, system health |

### Content workflow

```
draft ──submit──▶ in review ──approve──▶ published ──archive──▶ archived
  ▲                   │                     │                      │
  └──── changes ◀── reject              withdraw ──▶ draft ◀── restore
       requested
```

Approvers can schedule publication. Every save and transition stores a revision snapshot; reviewers see a field-by-field diff against the last published version.

## Local development

Everything runs in Docker (`compose.yaml` at the repository root). The only requirement is Docker Desktop.

First time only, create the API environment file and its key:

```bash
cp apps/api/.env.example apps/api/.env
```

```bash
docker compose run --rm --no-deps api php artisan key:generate
```

Start the stack:

```bash
docker compose up -d --build
```

The first start takes a few minutes (it installs Composer and npm packages inside the containers). The API container migrates and seeds MySQL automatically on every start; seeding only adds demo content to an empty database.

| Service | URL |
|---|---|
| Public site | http://localhost:3000 |
| Admin console | http://localhost:3001 |
| API | http://localhost:8000 |
| phpMyAdmin | http://localhost:8080 |
| MySQL | `localhost:3307`, database/user/password `slaf` (3307 avoids clashing with XAMPP on 3306) |

Source files are mounted into the containers, so code changes reload live. Useful commands:

| Command | What it does |
|---|---|
| `npm run up` / `npm run down` | Start / stop the stack (data is kept) |
| `npm run logs` | Follow API, web, admin and worker logs |
| `npm run artisan -- route:list` | Run any artisan command in the API container |
| `npm run db:reset` | Drop all tables, migrate and re-seed |
| `docker compose down -v` | Stop and delete the database and package volumes |

Containers: `mysql`, `phpmyadmin`, `api` (PHP 8.3), `worker` (queue — sends publish notifications to the web app), `web`, `admin`, and a one-shot `deps` that installs npm packages into a Linux volume (the Windows `node_modules` is not used inside Docker).

**Development accounts** (seeded only outside production; the password is `SEED_USER_PASSWORD` in `apps/api/.env`): `admin@slaf.test`, `editor@slaf.test`, `approver@slaf.test`, `base.officer@slaf.test`, `base.commander@slaf.test`, `tenders@slaf.test`, `tender.chair@slaf.test`, `auditor@slaf.test`. Each account enrols MFA on first sign-in.

The seeded news, events and tenders are **illustrative placeholders**. Sinhala and Tamil strings — in the seeder and in `apps/web/src/lib/i18n.ts` — must be reviewed by the Media Directorate's translators.

### Tests

```bash
npm run test:api
```

Tests run inside the API container against a separate in-memory SQLite database; `tests/TestCase.php` refuses to run against any other database, so the dev MySQL data is never touched. The suite covers MFA enrolment and replay, lockout, idle timeout, forced password change, network allow-listing, maker-checker (including for super admins), base scoping, rich-text sanitising, revision history, audit-chain tamper and deletion detection, and public visibility rules.

## Production

1. Create `apps/api/.env.production` (`APP_ENV=production`, `APP_DEBUG=false`, a new `APP_KEY`) and `infra/.env` from `infra/.env.example`.
2. Put TLS certificates in `infra/nginx/certs/` and replace the example hostnames and the `allow` ranges in `infra/nginx/conf.d/slaf.conf` with the approved internal networks.
3. Run:

   ```bash
   docker compose -f infra/docker-compose.yml --env-file infra/.env up -d --build
   ```

4. Run the migrations and create the first super administrator (a temporary password is printed once):

   ```bash
   docker compose -f infra/docker-compose.yml exec api php artisan migrate --force --seed
   ```

   ```bash
   docker compose -f infra/docker-compose.yml exec api php artisan slaf:create-admin officer@airforce.lk "Officer Name"
   ```

The scheduler container runs `audit:verify` nightly at 02:00, prunes expired tokens, and logs a critical error if the audit chain is broken.

**PHP support:** PHP 8.2 receives security fixes only until 31 December 2026. The Docker image already uses PHP 8.3. Move local environments to 8.3+ and plan the Laravel 13 upgrade.

## Not in phase 1

- Retired-members portal, Helitours / Marble Beach bookings, Piyasara flipbook viewer
- Edit-while-live revisions: published items must currently be withdrawn to draft before they are edited
- Hardware security keys (WebAuthn) as a second factor alongside TOTP
- Meilisearch full-text search (the current search is a trilingual `LIKE` across titles and summaries)
- Self-hosted analytics (Umami/Matomo) on the dashboard
- Hero video loop (the hero currently uses the base-network chart)
