<?php

use App\Support\WorkflowColumns;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bases', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->json('name');
            $table->json('summary')->nullable();
            $table->json('body')->nullable();
            $table->string('base_type', 30)->default('base');
            $table->string('province', 40)->nullable();
            $table->decimal('latitude', 9, 6)->nullable();
            $table->decimal('longitude', 9, 6)->nullable();
            $table->unsignedSmallInteger('established_year')->nullable();
            $table->foreignId('image_id')->nullable()->constrained('media')->nullOnDelete();
            $table->unsignedInteger('sort_order')->default(0);
            WorkflowColumns::add($table);
            $table->timestamps();
            $table->softDeletes();
        });

        // Establishment officers may only manage the bases assigned to them.
        Schema::create('base_user', function (Blueprint $table) {
            $table->foreignId('base_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->primary(['base_id', 'user_id']);
        });

        Schema::create('news', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->json('title');
            $table->json('summary')->nullable();
            $table->json('body')->nullable();
            $table->string('category', 30)->default('news')->index();
            $table->foreignId('image_id')->nullable()->constrained('media')->nullOnDelete();
            $table->foreignId('base_id')->nullable()->constrained()->nullOnDelete();
            $table->boolean('is_featured')->default(false);
            WorkflowColumns::add($table);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('pages', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->json('title');
            $table->json('summary')->nullable();
            $table->json('body')->nullable();
            $table->string('section', 30)->default('about')->index();
            $table->foreignId('image_id')->nullable()->constrained('media')->nullOnDelete();
            $table->unsignedInteger('sort_order')->default(0);
            WorkflowColumns::add($table);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('aircraft', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->json('name');
            $table->json('summary')->nullable();
            $table->json('body')->nullable();
            $table->string('role', 30)->index();
            $table->string('manufacturer')->nullable();
            $table->string('origin_country')->nullable();
            $table->unsignedSmallInteger('inducted_year')->nullable();
            $table->foreignId('image_id')->nullable()->constrained('media')->nullOnDelete();
            $table->unsignedInteger('sort_order')->default(0);
            WorkflowColumns::add($table);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->json('title');
            $table->json('summary')->nullable();
            $table->json('body')->nullable();
            $table->json('venue')->nullable();
            $table->dateTime('starts_at')->index();
            $table->dateTime('ends_at')->nullable();
            $table->foreignId('image_id')->nullable()->constrained('media')->nullOnDelete();
            WorkflowColumns::add($table);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('tenders', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('reference_no')->unique();
            $table->json('title');
            $table->json('summary')->nullable();
            $table->json('body')->nullable();
            $table->string('category', 30)->default('goods')->index();
            $table->string('procurement_method', 40)->nullable();
            $table->decimal('bid_security_lkr', 14, 2)->nullable();
            $table->dateTime('opens_at')->nullable();
            $table->dateTime('closes_at')->index();
            $table->string('tender_state', 20)->default('open')->index();
            WorkflowColumns::add($table);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('tender_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tender_id')->constrained()->cascadeOnDelete();
            $table->json('title');
            $table->string('path');
            $table->string('original_name');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size');
            $table->char('sha256', 64);
            $table->unsignedInteger('download_count')->default(0);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Snapshot of an item at each save / workflow transition (history + review diffs).
        Schema::create('content_revisions', function (Blueprint $table) {
            $table->id();
            $table->string('revisionable_type');
            $table->unsignedBigInteger('revisionable_id');
            $table->string('event', 30);
            $table->string('status', 20);
            $table->json('data');
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->text('comment')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['revisionable_type', 'revisionable_id']);
        });
    }

    public function down(): void
    {
        foreach (['content_revisions', 'tender_documents', 'tenders', 'events', 'aircraft', 'pages', 'news', 'base_user', 'bases'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
