<?php

namespace App\Support\Office;

use Illuminate\Support\Facades\File;

/**
 * Upload locations for the office modules. Files live under the same shared
 * uploads root the booking system already serves through the
 * `/uploads/{path}` route (UploadedAssetController), so the public URLs
 * match MME's originals: /uploads/meeting-images/<file>.
 */
class OfficeStorage
{
    public const MEETING_IMAGES_DIR = 'meeting-images';
    public const EXPENSE_RECEIPTS_DIR = 'expense-receipts';

    public static function uploadsRoot(): string
    {
        $root = env('DLC_FRONTEND_PUBLIC_ROOT')
            ?: dirname(base_path()).'/public_html/elite-convention-hall';

        return $root.'/uploads';
    }

    public static function directory(string $name): string
    {
        $path = static::uploadsRoot().'/'.$name;

        if (! File::isDirectory($path)) {
            File::makeDirectory($path, 0755, true);
        }

        return $path;
    }

    public static function meetingImagePath(string $storedFileName): string
    {
        return static::directory(self::MEETING_IMAGES_DIR).'/'.$storedFileName;
    }

    public static function expenseReceiptPath(string $storedFileName): string
    {
        return static::directory(self::EXPENSE_RECEIPTS_DIR).'/'.$storedFileName;
    }

    public static function publicUrl(string $dir, string $storedFileName): string
    {
        return '/uploads/'.$dir.'/'.$storedFileName;
    }
}
