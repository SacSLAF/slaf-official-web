<?php

use App\Models\AuditLog;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;

it('records content changes with actor and IP in a verifiable hash chain', function () {
    $editor = staff('media-editor');
    $approver = staff('media-approver');

    $id = $this->postJson('/api/admin/content/news', newsPayload(), adminHeaders($editor))->json('data.id');
    $this->postJson("/api/admin/content/news/{$id}/submit", [], adminHeaders($editor));
    $this->postJson("/api/admin/content/news/{$id}/approve", [], adminHeaders($approver));

    $actions = AuditLog::where('auditable_id', $id)->where('auditable_type', 'App\Models\News')->orderBy('id')->pluck('action');
    expect($actions->all())->toBe(['news.created', 'workflow.submit', 'workflow.approve']);

    $approval = AuditLog::where('action', 'workflow.approve')->first();
    expect($approval->user_id)->toBe($approver->id)
        ->and($approval->ip_address)->toBe('127.0.0.1')
        ->and($approval->new_values['status'])->toBe('published');

    expect(app(AuditLogger::class)->verify()['valid'])->toBeTrue();
});

it('never stores secrets in the audit trail', function () {
    $admin = staff('super-admin');

    $this->postJson('/api/admin/users', [
        'name' => 'New Officer', 'email' => 'new@slaf.test', 'roles' => ['media-editor'],
    ], adminHeaders($admin))->assertCreated()->assertJsonStructure(['temporary_password']);

    $created = AuditLog::where('action', 'user.created')->latest('id')->first();
    expect($created->new_values)->not->toHaveKey('password');
});

it('is append-only at the database level', function () {
    app(AuditLogger::class)->log('test.entry');

    expect(fn () => DB::table('audit_logs')->update(['action' => 'tampered']))->toThrow(Exception::class);
    expect(fn () => DB::table('audit_logs')->delete())->toThrow(Exception::class);
    expect(fn () => AuditLog::first()->forceFill(['action' => 'x'])->save())->toThrow(LogicException::class);
});

it('detects tampering even if someone bypasses the triggers', function () {
    $logger = app(AuditLogger::class);
    $logger->log('first', new: ['a' => 1]);
    $logger->log('second', new: ['b' => 2]);
    $logger->log('third');

    expect($logger->verify()['valid'])->toBeTrue();

    // Simulate a DBA with direct access disabling the trigger and editing history.
    DB::unprepared('DROP TRIGGER audit_logs_no_update');
    DB::table('audit_logs')->where('action', 'second')->update(['new_values' => json_encode(['b' => '3'])]);

    $result = $logger->verify();
    expect($result['valid'])->toBeFalse()
        ->and($result['broken_at'])->toBe(AuditLog::where('action', 'second')->value('id'));
});

it('still verifies when the database reorders JSON keys, as MySQL does', function () {
    $logger = app(AuditLogger::class);
    $logger->log('entry', new: ['zeta' => 'z', 'alpha' => ['b' => 2, 'a' => 1], 'mid' => 'm']);

    // MySQL's JSON type stores object keys in its own order; reproduce that by bypassing the trigger.
    DB::unprepared('DROP TRIGGER audit_logs_no_update');
    DB::table('audit_logs')->update(['new_values' => '{"mid": "m", "zeta": "z", "alpha": {"a": "1", "b": "2"}}']);

    expect($logger->verify()['valid'])->toBeTrue();
});

it('detects deleted rows', function () {
    $logger = app(AuditLogger::class);
    $logger->log('first');
    $logger->log('second');
    $logger->log('third');

    DB::unprepared('DROP TRIGGER audit_logs_no_delete');
    DB::table('audit_logs')->where('action', 'second')->delete();

    expect($logger->verify())->toMatchArray(['valid' => false, 'reason' => 'Chain link mismatch (row removed or reordered).']);
});
