<?php

namespace App\Support;

use Illuminate\Database\Schema\Blueprint;

/**
 * Columns shared by every maker-checker governed content table.
 */
class WorkflowColumns
{
    public static function add(Blueprint $table): void
    {
        $table->string('status', 20)->default('draft')->index();
        $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
        $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
        $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
        $table->timestamp('submitted_at')->nullable();
        $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
        $table->timestamp('reviewed_at')->nullable();
        $table->text('review_comment')->nullable();
        $table->timestamp('published_at')->nullable()->index();
    }
}
