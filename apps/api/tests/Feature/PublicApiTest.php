<?php

use App\Enums\ContentStatus;
use App\Models\News;
use App\Models\Tender;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

function publishedNews(array $attributes = []): News
{
    return News::forceCreate([
        'slug' => 'n-'.uniqid(),
        'title' => ['en' => 'Published'],
        'category' => 'news',
        'status' => ContentStatus::Published,
        'published_at' => now()->subMinute(),
        ...$attributes,
    ]);
}

it('only lists published content', function () {
    publishedNews(['title' => ['en' => 'Visible']]);
    publishedNews(['title' => ['en' => 'Draft'], 'status' => ContentStatus::Draft]);
    publishedNews(['title' => ['en' => 'In review'], 'status' => ContentStatus::InReview]);
    publishedNews(['title' => ['en' => 'Archived'], 'status' => ContentStatus::Archived]);

    $this->getJson('/api/v1/en/news')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Visible');
});

it('falls back to English and flags untranslated content', function () {
    publishedNews(['slug' => 'only-en', 'title' => ['en' => 'English only']]);

    $this->getJson('/api/v1/ta/news/only-en')
        ->assertJsonPath('data.title', 'English only')
        ->assertJsonPath('data.translated', false);
});

it('searches Sinhala and Tamil text', function () {
    publishedNews(['title' => ['en' => 'Relief', 'si' => 'ගංවතුර සහන', 'ta' => 'வெள்ள நிவாரணம்']]);

    $this->getJson('/api/v1/si/search?q='.urlencode('ගංවතුර'))->assertJsonPath('meta.total', 1);
    $this->getJson('/api/v1/ta/search?q='.urlencode('நிவாரணம்'))->assertJsonPath('meta.total', 1);
});

it('rejects unsupported locales and content types', function () {
    $this->getJson('/api/v1/fr/news')->assertNotFound();
    $this->getJson('/api/v1/en/users')->assertNotFound();
});

it('serves tender documents only for published tenders', function () {
    Storage::fake('local');
    $editor = staff('tender-officer');

    $tender = Tender::forceCreate([
        'slug' => 't-1', 'reference_no' => 'T/1', 'title' => ['en' => 'Tender'], 'category' => 'goods',
        'closes_at' => now()->addWeek(), 'tender_state' => 'open', 'status' => ContentStatus::Draft, 'created_by' => $editor->id,
    ]);

    $this->post("/api/admin/tenders/{$tender->id}/documents", [
        'file' => UploadedFile::fake()->create('bid.pdf', 100, 'application/pdf'),
        'title' => ['en' => 'Bid document'],
    ], [...adminHeaders($editor), 'Accept' => 'application/json'])->assertCreated();

    $doc = $tender->documents()->first();
    Storage::disk('local')->assertExists($doc->path);

    $this->get("/api/v1/tenders/t-1/documents/{$doc->id}")->assertNotFound();

    $tender->forceFill(['status' => ContentStatus::Published, 'published_at' => now()->subMinute()])->saveQuietly();

    $this->get("/api/v1/tenders/t-1/documents/{$doc->id}")->assertOk()->assertDownload();
    expect($doc->fresh()->download_count)->toBe(1);
});

it('reports open tenders as closed after their closing time', function () {
    Tender::forceCreate([
        'slug' => 'late', 'reference_no' => 'T/2', 'title' => ['en' => 'Late'], 'category' => 'goods',
        'closes_at' => now()->subHour(), 'tender_state' => 'open', 'status' => ContentStatus::Published, 'published_at' => now()->subDay(),
    ]);

    $this->getJson('/api/v1/en/tenders/late')->assertJsonPath('data.state', 'closed');
    $this->getJson('/api/v1/en/tenders?state=open')->assertJsonCount(0, 'data');
    $this->getJson('/api/v1/en/tenders?state=closed')->assertJsonCount(1, 'data');
});

it('sends security headers', function () {
    $this->getJson('/api/v1/en/news')
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'DENY');
});
