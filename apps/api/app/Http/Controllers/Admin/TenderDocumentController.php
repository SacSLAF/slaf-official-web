<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Tender;
use App\Models\TenderDocument;
use App\Services\Workflow\WorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TenderDocumentController extends Controller
{
    /** Bid documents: PDFs, office documents and drawings archives. */
    private const MIMES = 'pdf,doc,docx,xls,xlsx,zip';

    public function __construct(private WorkflowService $workflow) {}

    public function store(Request $request, Tender $tender): JsonResponse
    {
        // Documents are part of the notice, so they follow the notice's edit lock.
        $this->workflow->authorize($request->user(), $tender, 'update');

        $data = $request->validate([
            'file' => ['required', 'file', 'mimes:'.self::MIMES, 'max:25600'],
            'title' => ['required', 'array:en,si,ta'],
            'title.en' => ['required', 'string', 'max:255'],
            'title.si' => ['nullable', 'string', 'max:255'],
            'title.ta' => ['nullable', 'string', 'max:255'],
        ]);

        $file = $data['file'];
        $path = $file->storeAs(
            "tenders/{$tender->id}",
            Str::uuid().'.'.$file->extension(),
            TenderDocument::DISK,
        );

        $document = $tender->documents()->create([
            'title' => array_map('strip_tags', array_filter($data['title'])),
            'path' => $path,
            'original_name' => Str::limit(basename($file->getClientOriginalName()), 200, ''),
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'sha256' => hash_file('sha256', $file->getRealPath()),
            'uploaded_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $document], 201);
    }

    public function download(Request $request, Tender $tender, TenderDocument $document): StreamedResponse
    {
        abort_unless($request->user()->can('tenders.view') && $document->tender_id === $tender->id, 404);

        return Storage::disk(TenderDocument::DISK)->download($document->path, $document->original_name);
    }

    public function destroy(Request $request, Tender $tender, TenderDocument $document): JsonResponse
    {
        abort_unless($document->tender_id === $tender->id, 404);
        $this->workflow->authorize($request->user(), $tender, 'update');

        Storage::disk(TenderDocument::DISK)->delete($document->path);
        $document->delete();

        return response()->json(null, 204);
    }
}
