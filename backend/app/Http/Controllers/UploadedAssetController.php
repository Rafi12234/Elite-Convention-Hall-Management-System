<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Symfony\Component\HttpFoundation\Response;

class UploadedAssetController extends Controller
{
    private function uploadsRoot(): string
    {
        return env('DLC_FRONTEND_PUBLIC_ROOT')
            ?: dirname(base_path()) . '/public_html/elite-convention-hall';
    }

    // Serves files from the shared uploads store with long-lived cache headers.
    // Safe because every image URL is versioned with a ?v= cache-busting query param.
    public function show(Request $request, string $path): Response
    {
        $base = realpath($this->uploadsRoot() . '/uploads');
        $target = realpath($base . '/' . $path);

        if (
            $base === false ||
            $target === false ||
            !str_starts_with($target, $base) ||
            !is_file($target)
        ) {
            abort(404);
        }

        return response()->file($target, [
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }
}
