<?php

use App\Enums\ContentStatus;
use App\Models\Base;
use App\Models\News;

it('runs the maker-checker workflow from draft to the public site', function () {
    $editor = staff('media-editor');
    $approver = staff('media-approver');

    $id = $this->postJson('/api/admin/content/news', newsPayload(), adminHeaders($editor))
        ->assertCreated()
        ->assertJsonPath('data.status', 'draft')
        ->json('data.id');

    $slug = News::find($id)->slug;
    $this->getJson("/api/v1/en/news/{$slug}")->assertNotFound();

    $this->postJson("/api/admin/content/news/{$id}/submit", [], adminHeaders($editor))->assertOk()->assertJsonPath('data.status', 'in_review');

    // Editors cannot approve at all; approvers see it in their queue.
    $this->postJson("/api/admin/content/news/{$id}/approve", [], adminHeaders($editor))->assertForbidden();
    $this->getJson('/api/admin/review-queue', adminHeaders($approver))->assertJsonPath('data.0.id', $id);

    $this->postJson("/api/admin/content/news/{$id}/approve", [], adminHeaders($approver))->assertOk()->assertJsonPath('data.status', 'published');

    $this->getJson("/api/v1/si/news/{$slug}")
        ->assertOk()
        ->assertJsonPath('data.title', 'පරීක්ෂණ ලිපිය')
        ->assertJsonPath('data.summary', 'Summary'); // falls back to English
});

it('never lets the maker approve their own content, even as super admin', function () {
    $admin = staff('super-admin');

    $id = $this->postJson('/api/admin/content/news', newsPayload(), adminHeaders($admin))->json('data.id');
    $this->postJson("/api/admin/content/news/{$id}/submit", [], adminHeaders($admin))->assertOk();

    $this->postJson("/api/admin/content/news/{$id}/approve", [], adminHeaders($admin))
        ->assertForbidden()
        ->assertJsonPath('message', 'Maker-checker: you cannot review content you created, edited or submitted.');

    expect(News::find($id)->status)->toBe(ContentStatus::InReview);
});

it('requires a comment to reject and returns the item to the maker', function () {
    $editor = staff('media-editor');
    $approver = staff('media-approver');

    $id = $this->postJson('/api/admin/content/news', newsPayload(), adminHeaders($editor))->json('data.id');
    $this->postJson("/api/admin/content/news/{$id}/submit", [], adminHeaders($editor));

    $this->postJson("/api/admin/content/news/{$id}/reject", [], adminHeaders($approver))->assertUnprocessable();
    $this->postJson("/api/admin/content/news/{$id}/reject", ['comment' => 'Check the date'], adminHeaders($approver))
        ->assertOk()->assertJsonPath('data.status', 'rejected')->assertJsonPath('data.review_comment', 'Check the date');

    $this->putJson("/api/admin/content/news/{$id}", newsPayload(['summary' => ['en' => 'Fixed']]), adminHeaders($editor))->assertOk();
});

it('locks content while in review and once published', function () {
    $editor = staff('media-editor');
    $approver = staff('media-approver');

    $id = $this->postJson('/api/admin/content/news', newsPayload(), adminHeaders($editor))->json('data.id');
    $this->postJson("/api/admin/content/news/{$id}/submit", [], adminHeaders($editor));
    $this->putJson("/api/admin/content/news/{$id}", newsPayload(), adminHeaders($editor))->assertConflict();

    $this->postJson("/api/admin/content/news/{$id}/approve", [], adminHeaders($approver));
    $this->putJson("/api/admin/content/news/{$id}", newsPayload(), adminHeaders($editor))->assertConflict();
    $this->deleteJson("/api/admin/content/news/{$id}", [], adminHeaders($editor))->assertConflict();

    // Withdrawing takes it offline and back to draft for editing.
    $this->postJson("/api/admin/content/news/{$id}/withdraw", [], adminHeaders($approver))->assertJsonPath('data.status', 'draft');
    $this->getJson('/api/v1/en/news/'.News::find($id)->slug)->assertNotFound();
});

it('supports scheduled publishing', function () {
    $editor = staff('media-editor');
    $approver = staff('media-approver');

    $id = $this->postJson('/api/admin/content/news', newsPayload(), adminHeaders($editor))->json('data.id');
    $this->postJson("/api/admin/content/news/{$id}/submit", [], adminHeaders($editor));
    $this->postJson("/api/admin/content/news/{$id}/approve", ['publish_at' => now()->addDay()->toIso8601String()], adminHeaders($approver))->assertOk();

    $slug = News::find($id)->slug;
    $this->getJson("/api/v1/en/news/{$slug}")->assertNotFound();

    $this->travel(2)->days();
    $this->app['cache']->flush();
    $this->getJson("/api/v1/en/news/{$slug}")->assertOk();
});

it('restricts establishment officers to their assigned bases', function () {
    $mine = Base::forceCreate(['slug' => 'mine', 'name' => ['en' => 'Mine'], 'base_type' => 'base']);
    $other = Base::forceCreate(['slug' => 'other', 'name' => ['en' => 'Other'], 'base_type' => 'base']);
    $officer = staff('establishment-officer');
    $officer->bases()->attach($mine);

    $payload = ['name' => ['en' => 'Renamed'], 'base_type' => 'base'];

    $this->putJson("/api/admin/content/bases/{$mine->id}", $payload, adminHeaders($officer))->assertOk();
    $this->putJson("/api/admin/content/bases/{$other->id}", $payload, adminHeaders($officer))->assertForbidden();
    $this->postJson('/api/admin/content/bases', [...$payload, 'slug' => 'new-base'], adminHeaders($officer))->assertForbidden();

    $this->getJson('/api/admin/content/bases', adminHeaders($officer))
        ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $mine->id);
});

it('denies roles access to content types they do not manage', function () {
    $tenders = staff('tender-officer');

    $this->getJson('/api/admin/content/news', adminHeaders($tenders))->assertForbidden();
    $this->postJson('/api/admin/content/news', newsPayload(), adminHeaders($tenders))->assertForbidden();
    $this->getJson('/api/admin/users', adminHeaders($tenders))->assertForbidden();
    $this->getJson('/api/admin/audit-logs', adminHeaders($tenders))->assertForbidden();
});

it('sanitises rich text and strips markup from plain fields', function () {
    $editor = staff('media-editor');

    $id = $this->postJson('/api/admin/content/news', newsPayload([
        'title' => ['en' => '<b>Bold</b> title'],
        'body' => ['en' => '<p onclick="steal()">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><img src="https://example.org/a.jpg" onerror="x()">'],
    ]), adminHeaders($editor))->json('data.id');

    $news = News::find($id);
    expect($news->getTranslation('title', 'en'))->toBe('Bold title')
        ->and($news->getTranslation('body', 'en'))->not->toContain('script', 'onclick', 'javascript:', 'onerror')
        ->and($news->getTranslation('body', 'en'))->toContain('<p>Hi</p>');
});

it('records a revision snapshot for every save and transition', function () {
    $editor = staff('media-editor');

    $id = $this->postJson('/api/admin/content/news', newsPayload(), adminHeaders($editor))->json('data.id');
    $this->putJson("/api/admin/content/news/{$id}", newsPayload(['summary' => ['en' => 'v2']]), adminHeaders($editor));
    $this->postJson("/api/admin/content/news/{$id}/submit", [], adminHeaders($editor));

    $this->getJson("/api/admin/content/news/{$id}/revisions", adminHeaders($editor))
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('data.0.event', 'submit')
        ->assertJsonPath('data.1.data.summary.en', 'v2');
});
