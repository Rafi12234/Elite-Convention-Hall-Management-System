<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Throwable;

class HomepageContentController extends Controller
{
    private function publicRoot(): string
    {
        return env('DLC_FRONTEND_PUBLIC_ROOT')
            ?: dirname(base_path()) . '/public_html/elite-convention-hall';
    }

    private function homepageDir(): string
    {
        return $this->publicRoot() . '/uploads/homepage';
    }

    private function galleryDir(): string
    {
        return $this->homepageDir() . '/gallery';
    }

    private function contentFile(): string
    {
        return $this->homepageDir() . '/homepage-content.json';
    }

    private function defaultContent(): array
    {
        return [
            'nav' => [
                'logo' => '/assets/img/ECH-02.png',
                'logo_alt' => 'Elite Convention Hall Logo',
                'links' => [
                    ['label' => 'Calendar', 'href' => '#calendar-booking'],
                    ['label' => 'About', 'href' => '#about'],
                    ['label' => 'Gallery', 'href' => '#gallery'],
                    ['label' => 'Features', 'href' => '#features'],
                ],
                'booking_button_text' => 'Book Now',
                'booking_button_link' => '#calendar-booking',
                'login_text' => 'Login',
                'admin_login_text' => 'Admin Login',
                'logout_text' => 'Logout',
            ],
            'hero' => [
                'title' => 'Elegant Events',
                'highlight' => 'Beautiful Memories',
                'subtitle' => 'Elite Convention Hall is a luxurious convention hall offering premium event spaces for weddings, receptions, conferences, and unforgettable celebrations.',
                'background_image' => '/uploads/homepage/hero-background.jpeg',
                'primary_button_text' => 'Book Your Event',
                'primary_button_link' => '#calendar-booking',
                'secondary_button_text' => 'Discover More',
                'secondary_button_link' => '#about',
            ],
            'stats' => [
                ['id' => 'events_hosted', 'count' => 500, 'suffix' => '+', 'label' => 'Events Hosted', 'delay' => ''],
                ['id' => 'happy_families', 'count' => 1200, 'suffix' => '+', 'label' => 'Happy Families', 'delay' => '100'],
                ['id' => 'years_experience', 'count' => 20, 'suffix' => '+', 'label' => 'Years Experience', 'delay' => '200'],
                ['id' => 'client_satisfaction', 'count' => 98, 'suffix' => '%', 'label' => 'Client Satisfaction', 'delay' => '300'],
            ],
            'calendar_section' => [
                'eyebrow' => 'Live Availability',
                'title' => 'Booking Calendar',
                'description' => 'Browse available shifts and reserve your preferred date. Click any date or event to view shift availability and proceed with booking.',
                'loading_text' => 'Loading booking calendar...',
                'button_today' => 'Today',
                'button_month' => 'Month',
                'button_year_view' => 'Year View',
                'legend' => [
                    ['label' => 'Available', 'color' => '#198754'],
                    ['label' => 'Booked', 'color' => '#dc3545'],
                    ['label' => 'Booking In Progress', 'color' => '#fd7e14'],
                    ['label' => 'Pending Approval', 'color' => '#b8860b'],
                    ['label' => 'Blocked', 'color' => '#6c757d'],
                ],
            ],
            'our_story' => [
                'eyebrow' => 'Our Story',
                'title' => 'About Elite Convention Hall',
                'description' => 'A prestigious event destination in Dhaka designed for elegant weddings, corporate events, and premium celebrations.',
            ],
            'creating_experiences' => [
                'image' => '/uploads/homepage/creating-experiences.jpg',
                'image_alt' => 'About Elite Convention Hall',
                'badge_text' => "20+\nYears\nExcellence",
                'eyebrow' => 'Creating Experiences',
                'title' => 'Where Every Event Becomes Extraordinary',
                'description_1' => 'Elite Convention Hall combines elegance, luxury, and professionalism to deliver exceptional event experiences for every guest. Our dedicated team ensures that every detail is meticulously planned and executed.',
                'description_2' => 'From stunning decoration arrangements to premium hospitality, every celebration is carefully designed to create lifelong memories that you and your guests will cherish forever.',
                'points' => [
                    'Premium Decorations',
                    'Expert Catering',
                    'State-of-Art AV',
                    'Valet Parking',
                    'Dedicated Team',
                    'Custom Packages',
                ],
                'button_text' => 'Book a Visit',
                'button_link' => '#calendar-booking',
            ],
            'gallery' => [
                'eyebrow' => 'Visual Gallery',
                'title' => 'Decoration Gallery',
                'description' => 'Explore stunning decoration concepts and luxurious setups from our most celebrated events.',
                'empty_text' => 'No gallery images uploaded yet.',
                'images' => [],
            ],
            'features_section' => [
                'eyebrow' => 'Why Choose Us',
                'title' => 'World-Class Features',
                'description' => 'Smart booking system with live calendar and secure payments — designed for a seamless experience.',
                'cards' => [
                    [
                        'id' => 'live_calendar',
                        'icon' => '📅',
                        'title' => 'Live Calendar',
                        'text' => 'Browse the full year calendar and view available or booked shifts instantly with real-time updates.',
                        'delay' => '',
                    ],
                    [
                        'id' => 'online_booking',
                        'icon' => '📝',
                        'title' => 'Online Booking',
                        'text' => 'Book event halls directly from the website with instant reservation requests and confirmation.',
                        'delay' => '150',
                    ],
                    [
                        'id' => 'secure_payment',
                        'icon' => '💳',
                        'title' => 'Secure Payment',
                        'text' => 'Easy and secure online payment system with encrypted transactions for booking confirmations.',
                        'delay' => '300',
                    ],
                    [
                        'id' => 'event_management',
                        'icon' => '🎉',
                        'title' => 'Event Management',
                        'text' => 'Full-service event coordination by our expert team to make your celebration flawless.',
                        'delay' => '450',
                    ],
                    [
                        'id' => 'premium_decor',
                        'icon' => '🌟',
                        'title' => 'Premium Décor',
                        'text' => 'Stunning decoration packages crafted by professional designers for every occasion.',
                        'delay' => '500',
                    ],
                    [
                        'id' => 'instant_alerts',
                        'icon' => '🔔',
                        'title' => 'Instant Alerts',
                        'text' => 'Get real-time notifications and reminders for your upcoming events and booking updates.',
                        'delay' => '550',
                    ],
                ],
            ],
            'booking_cta' => [
                'background_image' => '/uploads/homepage/hero-background.jpeg',
                'title' => 'Plan Your',
                'highlight' => 'Dream Event',
                'title_suffix' => 'Today',
                'description' => "Make your celebrations unforgettable with Elite Convention Hall's premium event management services. Your perfect event begins with a single click.",
                'primary_button_text' => 'Check Availability',
                'primary_button_link' => '#calendar-booking',
                'secondary_button_text' => 'Contact Us',
                'secondary_button_link' => 'tel:+8801700000000',
            ],
            'footer' => [
                'logo' => '/assets/img/ECH-02.png',
                'logo_alt' => 'Elite Convention Hall',
                'description' => 'A prestigious event destination in Dhaka delivering exceptional experiences for weddings, corporate events, and premium celebrations since 2005.',
                'quick_links_title' => 'Quick Links',
                'quick_links' => [
                    ['label' => 'Booking Calendar', 'href' => '#calendar-booking'],
                    ['label' => 'About Us', 'href' => '#about'],
                    ['label' => 'Gallery', 'href' => '#gallery'],
                    ['label' => 'Features', 'href' => '#features'],
                ],
                'contact_title' => 'Contact',
                'address' => 'Dhaka, Bangladesh',
                'phone' => '+880 1700-000000',
                'email' => 'info@eliteconventionhall.com',
                'copyright' => '© 2026 Elite Convention Hall. All Rights Reserved.',
                'copyright_brand' => 'Elite Convention Hall',
                'tagline' => 'Premium Convention & Party Venue in Dhaka',
            ],
        ];
    }

    private function ensureStorageExists(): void
    {
        if (!File::exists($this->homepageDir())) {
            File::makeDirectory($this->homepageDir(), 0755, true);
        }

        if (!File::exists($this->galleryDir())) {
            File::makeDirectory($this->galleryDir(), 0755, true);
        }

        if (!File::exists($this->contentFile())) {
            $this->writeContent($this->defaultContent());
        }
    }

    private function readContent(): array
    {
        $this->ensureStorageExists();

        $raw = File::get($this->contentFile());
        $decoded = json_decode($raw, true);

        if (!is_array($decoded)) {
            $decoded = [];
        }

        return array_replace_recursive($this->defaultContent(), $decoded);
    }

    private function writeContent(array $content): void
    {
        $this->ensureStorageExists();

        File::put(
            $this->contentFile(),
            json_encode($content, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
        );
    }

public function show(): JsonResponse
{
    $content = $this->readContent();

    $content['_cache_version'] = File::exists($this->contentFile())
        ? File::lastModified($this->contentFile())
        : time();

    return response()
        ->json([
            'success' => true,
            'message' => 'Homepage content loaded successfully.',
            'data' => $content,
        ])
        ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        ->header('Pragma', 'no-cache')
        ->header('Expires', '0');
}

public function adminShow(Request $request): JsonResponse
{
    if (! $this->authenticatedAdmin($request)) {
        return $this->unauthenticatedAdminResponse();
    }

    $content = $this->readContent();

    $content['_cache_version'] = File::exists($this->contentFile())
        ? File::lastModified($this->contentFile())
        : time();

    return response()
        ->json([
            'success' => true,
            'message' => 'Homepage editor data loaded successfully.',
            'data' => [
                'content' => $content,
                'gallery_files' => $this->getGalleryFilesArray(),
            ],
        ])
        ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        ->header('Pragma', 'no-cache')
        ->header('Expires', '0');
}

public function update(Request $request): JsonResponse
{
    if (! $this->authenticatedAdmin($request)) {
        return $this->unauthenticatedAdminResponse();
    }

    try {
        $incoming = $request->all();

        $allowedKeys = [
            'nav',
            'hero',
            'stats',
            'calendar_section',
            'our_story',
            'creating_experiences',
            'gallery',
            'features_section',
            'booking_cta',
            'footer',
        ];

        $incoming = Arr::only($incoming, $allowedKeys);
        $current = $this->readContent();

        $updated = array_replace_recursive($current, $incoming);

        /*
        |--------------------------------------------------------------------------
        | Important:
        | Numeric arrays must be replaced directly.
        | array_replace_recursive can keep old array items.
        |--------------------------------------------------------------------------
        */

        if (array_key_exists('stats', $incoming) && is_array($incoming['stats'])) {
            $updated['stats'] = array_values($incoming['stats']);
        }

        if (isset($incoming['nav']['links']) && is_array($incoming['nav']['links'])) {
            $updated['nav']['links'] = array_values($incoming['nav']['links']);
        }

        if (isset($incoming['calendar_section']['legend']) && is_array($incoming['calendar_section']['legend'])) {
            $updated['calendar_section']['legend'] = array_values($incoming['calendar_section']['legend']);
        }

        if (isset($incoming['creating_experiences']['points']) && is_array($incoming['creating_experiences']['points'])) {
            $updated['creating_experiences']['points'] = array_values($incoming['creating_experiences']['points']);
        }

        if (isset($incoming['gallery']['images']) && is_array($incoming['gallery']['images'])) {
            $updated['gallery']['images'] = array_values($incoming['gallery']['images']);
        }

        if (isset($incoming['features_section']['cards']) && is_array($incoming['features_section']['cards'])) {
            $updated['features_section']['cards'] = array_values($incoming['features_section']['cards']);
        }

        if (isset($incoming['footer']['quick_links']) && is_array($incoming['footer']['quick_links'])) {
            $updated['footer']['quick_links'] = array_values($incoming['footer']['quick_links']);
        }

        $this->writeContent($updated);

        return response()
            ->json([
                'success' => true,
                'message' => 'Homepage content updated successfully.',
                'data' => $updated,
            ])
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    } catch (Throwable $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to update homepage content.',
            'error' => $e->getMessage(),
        ], 500);
    }
}

public function listGalleryFiles(Request $request): JsonResponse
{
    if (! $this->authenticatedAdmin($request)) {
        return $this->unauthenticatedAdminResponse();
    }

    return response()->json([
            'success' => true,
            'message' => 'Gallery files loaded successfully.',
            'data' => $this->getGalleryFilesArray(),
        ]);
    }

public function uploadSectionImage(Request $request): JsonResponse
{
    if (! $this->authenticatedAdmin($request)) {
        return $this->unauthenticatedAdminResponse();
    }

    try {
            $validated = $request->validate([
                'target' => [
                    'required',
                    'string',
                    'in:hero_background,creating_experiences_image,booking_cta_background,nav_logo,footer_logo',
                ],
                'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
            ]);

            $this->ensureStorageExists();

            $content = $this->readContent();
            $file = $request->file('image');
            $extension = strtolower($file->getClientOriginalExtension());

            $targetMap = [
                'hero_background' => [
                    'filename' => 'hero-background.' . $extension,
                    'paths' => ['hero.background_image', 'booking_cta.background_image'],
                ],
                'creating_experiences_image' => [
                    'filename' => 'creating-experiences.' . $extension,
                    'paths' => ['creating_experiences.image'],
                ],
                'booking_cta_background' => [
                    'filename' => 'booking-cta-background.' . $extension,
                    'paths' => ['booking_cta.background_image'],
                ],
                'nav_logo' => [
                    'filename' => 'nav-logo.' . $extension,
                    'paths' => ['nav.logo'],
                ],
                'footer_logo' => [
                    'filename' => 'footer-logo.' . $extension,
                    'paths' => ['footer.logo'],
                ],
            ];

            $config = $targetMap[$validated['target']];
            $publicUrl = '/uploads/homepage/' . $config['filename'];

            foreach ($config['paths'] as $jsonPath) {
                $oldUrl = Arr::get($content, $jsonPath);
                $this->deleteUploadedFileByUrl($oldUrl, false);
            }

            $this->deleteKnownFixedFiles(pathinfo($config['filename'], PATHINFO_FILENAME), $this->homepageDir());

            $file->move($this->homepageDir(), $config['filename']);

            foreach ($config['paths'] as $jsonPath) {
                Arr::set($content, $jsonPath, $publicUrl);
            }

            $this->writeContent($content);

            return response()->json([
                'success' => true,
                'message' => 'Section image uploaded successfully.',
                'image_url' => $publicUrl,
                'data' => $content,
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload section image.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

public function uploadGalleryImages(Request $request): JsonResponse
{
    if (! $this->authenticatedAdmin($request)) {
        return $this->unauthenticatedAdminResponse();
    }

    try {
            $validated = $request->validate([
                'images' => ['required', 'array', 'min:1'],
                'images.*' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
            ]);

            $this->ensureStorageExists();

            $uploaded = [];

            foreach ($request->file('images', []) as $file) {
                $extension = strtolower($file->getClientOriginalExtension());
                $number = $this->nextGalleryNumber();
                $filename = 'gallery_' . $number . '.' . $extension;

                $file->move($this->galleryDir(), $filename);

                $uploaded[] = [
                    'id' => pathinfo($filename, PATHINFO_FILENAME),
                    'name' => $filename,
                    'url' => '/uploads/homepage/gallery/' . $filename,
                    'alt' => 'Gallery Image ' . $number,
                ];
            }

            return response()->json([
                'success' => true,
                'message' => 'Gallery image uploaded successfully.',
                'uploaded' => $uploaded,
                'gallery_files' => $this->getGalleryFilesArray(),
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload gallery image.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

public function selectGalleryImages(Request $request): JsonResponse
{
    if (! $this->authenticatedAdmin($request)) {
        return $this->unauthenticatedAdminResponse();
    }

    try {
        $validated = $request->validate([
            'selected_urls' => ['present', 'array'],
            'selected_urls.*' => ['string'],
        ]);

        $content = $this->readContent();

        $selectedImages = [];

        foreach ($validated['selected_urls'] as $index => $rawUrl) {
            $url = $this->normalizeGalleryUrl($rawUrl);

            if (!$url) {
                continue;
            }

            $absolutePath = $this->publicRoot() . $url;

            if (!File::exists($absolutePath) || !File::isFile($absolutePath)) {
                continue;
            }

            $filename = basename($url);
            $id = pathinfo($filename, PATHINFO_FILENAME);

            $selectedImages[] = [
                'id' => $id,
                'url' => $url,
                'alt' => 'Gallery Image ' . ($index + 1),
            ];
        }

        /*
        |--------------------------------------------------------------------------
        | Important:
        | Replace gallery images fully.
        | Do not merge with old gallery images.
        |--------------------------------------------------------------------------
        */

        $content['gallery']['images'] = array_values($selectedImages);

        $this->writeContent($content);

        return response()
            ->json([
                'success' => true,
                'message' => 'Homepage gallery selection updated successfully.',
                'data' => $content,
                'gallery_files' => $this->getGalleryFilesArray(),
                'selected_urls' => array_column($selectedImages, 'url'),
            ])
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    } catch (Throwable $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to update gallery selection.',
            'error' => $e->getMessage(),
        ], 500);
    }
}

public function deleteGalleryFile(Request $request): JsonResponse
{
    if (! $this->authenticatedAdmin($request)) {
        return $this->unauthenticatedAdminResponse();
    }

    try {
            $validated = $request->validate([
                'url' => ['required', 'string'],
            ]);

            $url = $validated['url'];

            if (!Str::startsWith($url, '/uploads/homepage/gallery/')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid gallery image path.',
                ], 422);
            }

            $absolutePath = $this->publicRoot() . $url;

            if (File::exists($absolutePath) && File::isFile($absolutePath)) {
                File::delete($absolutePath);
            }

            $content = $this->readContent();

            $content['gallery']['images'] = array_values(array_filter(
                $content['gallery']['images'] ?? [],
                fn ($image) => ($image['url'] ?? null) !== $url
            ));

            $this->writeContent($content);

            return response()->json([
                'success' => true,
                'message' => 'Gallery file deleted successfully.',
                'data' => $content,
                'gallery_files' => $this->getGalleryFilesArray(),
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete gallery file.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    private function getGalleryFilesArray(): array
    {
        $this->ensureStorageExists();

        $files = File::files($this->galleryDir());
        $selectedUrls = collect($this->readContent()['gallery']['images'] ?? [])
            ->pluck('url')
            ->filter()
            ->values()
            ->all();

        $items = [];

        foreach ($files as $file) {
            $extension = strtolower($file->getExtension());

            if (!in_array($extension, ['jpg', 'jpeg', 'png', 'webp'], true)) {
                continue;
            }

            $filename = $file->getFilename();
            $url = '/uploads/homepage/gallery/' . $filename;

            $items[] = [
                'id' => pathinfo($filename, PATHINFO_FILENAME),
                'name' => $filename,
                'url' => $url,
                'size' => $file->getSize(),
                'selected' => in_array($url, $selectedUrls, true),
            ];
        }

        usort($items, function ($a, $b) {
            return strnatcasecmp($a['name'], $b['name']);
        });

        return $items;
    }

    private function nextGalleryNumber(): int
    {
        $max = 0;

        foreach (File::files($this->galleryDir()) as $file) {
            if (preg_match('/^gallery_(\d+)\.(jpg|jpeg|png|webp)$/i', $file->getFilename(), $matches)) {
                $max = max($max, (int) $matches[1]);
            }
        }

        return $max + 1;
    }

    private function deleteKnownFixedFiles(string $baseName, string $directory): void
    {
        foreach (['jpg', 'jpeg', 'png', 'webp'] as $extension) {
            $path = $directory . '/' . $baseName . '.' . $extension;

            if (File::exists($path) && File::isFile($path)) {
                File::delete($path);
            }
        }
    }

    private function deleteUploadedFileByUrl(?string $url, bool $deleteGallery = true): void
    {
        if (!$url || !Str::startsWith($url, '/uploads/homepage/')) {
            return;
        }

        if (!$deleteGallery && Str::startsWith($url, '/uploads/homepage/gallery/')) {
            return;
        }

        $absolutePath = $this->publicRoot() . $url;

        if (File::exists($absolutePath) && File::isFile($absolutePath)) {
            File::delete($absolutePath);
        }
    }

    private function normalizeGalleryUrl(?string $url): ?string
{
    if (!$url) {
        return null;
    }

    $path = parse_url($url, PHP_URL_PATH);

    if (!$path) {
        return null;
    }

    if (!Str::startsWith($path, '/')) {
        $path = '/' . $path;
    }

    if (!Str::startsWith($path, '/uploads/homepage/gallery/')) {
        return null;
    }

    return $path;
}
    private function authenticatedAdmin(Request $request): ?object
{
    $token = $request->bearerToken();

    if (! $token) {
        return null;
    }

    return DB::table('users')
        ->where('api_token_hash', hash('sha256', $token))
        ->where('user_type', 'Super Admin')
        ->where('status', 'active')
        ->first();
}

    private function unauthenticatedAdminResponse(): JsonResponse
{
    return response()->json([
        'message' => 'Unauthenticated admin.',
    ], 401);
}

}