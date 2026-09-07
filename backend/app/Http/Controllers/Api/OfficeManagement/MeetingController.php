<?php

namespace App\Http\Controllers\Api\OfficeManagement;

use App\Http\Controllers\Controller;
use App\Support\Office\DbDates;
use App\Support\Office\OfficeAuth;
use App\Support\Office\OfficeStorage;
use App\Support\Office\SheetLookup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

/**
 * Client meetings, meeting items, images and event finalization.
 * Ported from MME's meetingsController.js.
 */
class MeetingController extends Controller
{
    private const ITEM_KEY_OPTIONS = [
        'stage', 'entry_gate', 'head_table', 'photo_booth', 'truss_ceiling_decoration',
        'tent_ceiling_decoration', 'walkway', 'tunnel_walkway', 'mirror_ramp',
        'welcome_stand', 'centre_pieces', 'head_table_chair', 'photo_gallery',
        'comments_board', 'sangeet_stage', 'sound_system', 'led', 'other',
    ];

    private const ALLOWED_IMAGE_MIMES = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
    ];

    private const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
    private const MAX_IMAGES_PER_UPLOAD = 10;

    // ─── Meetings ──────────────────────────────────────────────────

    public function index(string $rowKey): JsonResponse
    {
        if (! SheetLookup::isValidRowKey($rowKey)) {
            return response()->json(['message' => 'Invalid client reference.'], 400);
        }

        $sheetId = SheetLookup::defaultSheetId();

        $meetings = DB::table('client_meetings as m')
            ->leftJoin('employees as cb', 'cb.id', '=', 'm.created_by')
            ->leftJoin('employees as ub', 'ub.id', '=', 'm.updated_by')
            ->leftJoin('employees as ab', 'ab.id', '=', 'm.assigned_by_employee_id')
            ->leftJoin('client_next_meetings as nm', 'nm.meeting_id', '=', 'm.id')
            ->leftJoin('employees as na', 'na.id', '=', 'nm.assigned_employee_id')
            ->where('m.linked_row_key', $rowKey)
            ->orderByDesc('m.id')
            ->get([
                'm.id', 'm.created_by', 'm.meeting_datetime', 'm.requirements',
                'm.is_completed', 'm.completed_at', 'm.created_at', 'm.updated_at',
                'nm.next_meeting_datetime', 'nm.assigned_employee_id as next_assigned_id',
                'na.full_name as next_assigned_name',
                'ab.full_name as assigned_by_name',
                'cb.full_name as created_by_name',
                'ub.full_name as updated_by_name',
            ]);

        $meetingIds = $meetings->pluck('id')->all();
        $imagesByMeeting = [];
        $imagesByItem = [];
        $itemsByMeeting = [];

        if ($meetingIds) {
            foreach (DB::table('client_meeting_images')->whereIn('meeting_id', $meetingIds)->orderBy('id')->get() as $image) {
                $payload = [
                    'id' => (int) $image->id,
                    'originalFileName' => $image->original_file_name,
                    'tagName' => $image->tag_name ?? '',
                    'url' => $image->file_url,
                    'isFinalSelected' => (bool) $image->is_final_selected,
                    'createdAt' => DbDates::formatDateTime($image->created_at),
                ];

                if ($image->item_id) {
                    $imagesByItem[$image->item_id][] = $payload;
                } else {
                    $imagesByMeeting[$image->meeting_id][] = $payload;
                }
            }

            foreach (DB::table('meeting_items')->whereIn('meeting_id', $meetingIds)->orderBy('id')->get() as $item) {
                $itemsByMeeting[$item->meeting_id][] = [
                    'id' => (int) $item->id,
                    'itemKey' => $item->item_key,
                    'customLabel' => $item->custom_label ?? '',
                    'description' => $item->description ?? '',
                    'quantity' => (int) ($item->quantity ?? 1),
                    'images' => $imagesByItem[$item->id] ?? [],
                ];
            }
        }

        return response()->json([
            'data' => [
                'rowKey' => $rowKey,
                'clientName' => SheetLookup::clientName($sheetId, $rowKey),
                'eventDate' => SheetLookup::eventDate($sheetId, $rowKey),
                'finalization' => $this->finalizationSummary($rowKey),
                'meetings' => $meetings->map(fn ($meeting) => [
                    'id' => (int) $meeting->id,
                    'createdById' => $meeting->created_by ? (int) $meeting->created_by : null,
                    'meetingDatetime' => DbDates::formatDateTime($meeting->meeting_datetime),
                    'nextMeetingDatetime' => DbDates::formatDateTime($meeting->next_meeting_datetime),
                    'nextMeetingAssignedEmployeeId' => $meeting->next_assigned_id ? (int) $meeting->next_assigned_id : null,
                    'nextMeetingAssignedEmployeeName' => $meeting->next_assigned_name,
                    'assignedByEmployeeName' => $meeting->assigned_by_name,
                    'requirements' => $this->parseRequirements($meeting->requirements),
                    'isCompleted' => (bool) $meeting->is_completed,
                    'completedAt' => DbDates::formatDateTime($meeting->completed_at),
                    'createdByName' => $meeting->created_by_name,
                    'updatedByName' => $meeting->updated_by_name,
                    'createdAt' => DbDates::formatDateTime($meeting->created_at),
                    'updatedAt' => DbDates::formatDateTime($meeting->updated_at),
                    'images' => $imagesByMeeting[$meeting->id] ?? [],
                    'items' => $itemsByMeeting[$meeting->id] ?? [],
                ])->values(),
            ],
        ]);
    }

    public function store(Request $request, string $rowKey): JsonResponse
    {
        if (! SheetLookup::isValidRowKey($rowKey)) {
            return response()->json(['message' => 'Invalid client reference.'], 400);
        }

        $employeeId = OfficeAuth::currentId($request);
        $now = DbDates::nowString();

        $pending = DB::table('client_next_meetings')
            ->where('linked_row_key', $rowKey)
            ->first(['updated_by', 'created_by']);

        $meetingId = DB::table('client_meetings')->insertGetId([
            'linked_row_key' => $rowKey,
            'meeting_datetime' => $now,
            'created_by' => $employeeId,
            'updated_by' => $employeeId,
            'assigned_by_employee_id' => $pending->updated_by ?? $pending->created_by ?? null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $this->copyForwardFromPreviousMeeting($rowKey, $meetingId, $employeeId);

        // A newly logged meeting fulfils any pending follow-up.
        DB::table('client_next_meetings')
            ->where('linked_row_key', $rowKey)
            ->where('meeting_id', '!=', $meetingId)
            ->delete();

        return response()->json(['data' => ['id' => $meetingId]], 201);
    }

    public function update(Request $request, string $rowKey, int $meetingId): JsonResponse
    {
        if (! SheetLookup::isValidRowKey($rowKey) || $meetingId <= 0) {
            return response()->json(['message' => 'Invalid reference.'], 400);
        }

        $existing = DB::table('client_meetings as m')
            ->leftJoin('client_next_meetings as nm', 'nm.meeting_id', '=', 'm.id')
            ->where('m.id', $meetingId)
            ->where('m.linked_row_key', $rowKey)
            ->first(['m.id', 'nm.next_meeting_datetime']);

        if (! $existing) {
            return response()->json(['message' => 'Meeting not found.'], 404);
        }

        $employeeId = OfficeAuth::currentId($request);
        $rawNext = $request->input('nextMeetingDatetime');
        $nextDatetime = DbDates::parseDateTimeLocal($rawNext);
        $nextAssignedId = SheetLookup::validId($request->input('nextMeetingAssignedEmployeeId'));

        $changed = DbDates::formatDateTime($existing->next_meeting_datetime) !== $nextDatetime;

        if ($changed && $rawNext && substr(trim((string) $rawNext), 0, 10) < DbDates::todayString()) {
            return response()->json([
                'message' => 'Next meeting date cannot be before today. Any time of day is fine.',
            ], 422);
        }

        $now = DbDates::nowString();
        $update = ['updated_by' => $employeeId, 'updated_at' => $now];

        if ($request->has('requirements')) {
            $update['requirements'] = json_encode($this->sanitizeRequirements($request->input('requirements')));
        }

        DB::table('client_meetings')->where('id', $meetingId)->update($update);

        if ($nextDatetime) {
            $existingNextId = DB::table('client_next_meetings')->where('meeting_id', $meetingId)->value('id');

            if ($existingNextId) {
                DB::table('client_next_meetings')->where('id', $existingNextId)->update([
                    'next_meeting_datetime' => $nextDatetime,
                    'assigned_employee_id' => $nextAssignedId,
                    'updated_by' => $employeeId,
                    'updated_at' => $now,
                ]);
            } else {
                DB::table('client_next_meetings')->insert([
                    'meeting_id' => $meetingId,
                    'linked_row_key' => $rowKey,
                    'next_meeting_datetime' => $nextDatetime,
                    'assigned_employee_id' => $nextAssignedId,
                    'created_by' => $employeeId,
                    'updated_by' => $employeeId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        } else {
            DB::table('client_next_meetings')->where('meeting_id', $meetingId)->delete();
        }

        return response()->json(['data' => ['id' => $meetingId]]);
    }

    public function destroy(string $rowKey, int $meetingId): JsonResponse
    {
        if (! SheetLookup::isValidRowKey($rowKey) || $meetingId <= 0) {
            return response()->json(['message' => 'Invalid reference.'], 400);
        }

        $exists = DB::table('client_meetings')
            ->where('id', $meetingId)
            ->where('linked_row_key', $rowKey)
            ->exists();

        if (! $exists) {
            return response()->json(['message' => 'Meeting not found.'], 404);
        }

        $storedFileNames = DB::table('client_meeting_images')
            ->where('meeting_id', $meetingId)
            ->pluck('stored_file_name');

        DB::table('client_meetings')->where('id', $meetingId)->delete();

        // Any prior finalization is stale once a source meeting disappears.
        DB::table('client_finalizations')->where('linked_row_key', $rowKey)->delete();
        $this->setBookedFromMme($rowKey, false);

        foreach ($storedFileNames as $storedFileName) {
            $this->deleteImageFileIfUnreferenced($storedFileName);
        }

        return response()->json(['data' => ['id' => $meetingId]]);
    }

    // ─── Meeting images ────────────────────────────────────────────

    public function uploadMeetingImages(Request $request, string $rowKey, int $meetingId): JsonResponse
    {
        if (! SheetLookup::isValidRowKey($rowKey) || $meetingId <= 0) {
            return response()->json(['message' => 'Invalid reference.'], 400);
        }

        $files = $request->file('images');
        $files = $files === null ? [] : (is_array($files) ? $files : [$files]);

        if (! $files) {
            return response()->json(['message' => 'Please choose at least one image.'], 422);
        }

        $meetingExists = DB::table('client_meetings')
            ->where('id', $meetingId)
            ->where('linked_row_key', $rowKey)
            ->exists();

        if (! $meetingExists) {
            return response()->json(['message' => 'Meeting not found.'], 404);
        }

        $tagNames = $this->parseTagNames($request->input('tagNames'));

        return $this->storeImages($request, $files, $meetingId, null, $tagNames);
    }

    public function deleteMeetingImage(string $rowKey, int $meetingId, int $imageId): JsonResponse
    {
        if (! SheetLookup::isValidRowKey($rowKey) || $meetingId <= 0 || $imageId <= 0) {
            return response()->json(['message' => 'Invalid reference.'], 400);
        }

        $image = DB::table('client_meeting_images as i')
            ->join('client_meetings as m', 'm.id', '=', 'i.meeting_id')
            ->where('i.id', $imageId)
            ->where('i.meeting_id', $meetingId)
            ->where('m.linked_row_key', $rowKey)
            ->first(['i.id', 'i.stored_file_name']);

        if (! $image) {
            return response()->json(['message' => 'Image not found.'], 404);
        }

        DB::table('client_meeting_images')->where('id', $imageId)->delete();
        $this->deleteImageFileIfUnreferenced($image->stored_file_name);

        return response()->json(['data' => ['id' => $imageId]]);
    }

    public function updateImageTag(Request $request, string $rowKey, int $imageId): JsonResponse
    {
        if (! SheetLookup::isValidRowKey($rowKey) || $imageId <= 0) {
            return response()->json(['message' => 'Invalid reference.'], 400);
        }

        if (! $this->findClientImage($rowKey, $imageId)) {
            return response()->json(['message' => 'Image not found.'], 404);
        }

        $tagName = trim((string) $request->input('tagName'));
        $tagName = $tagName === '' ? null : mb_substr($tagName, 0, 120);

        DB::table('client_meeting_images')->where('id', $imageId)->update(['tag_name' => $tagName]);

        return response()->json(['data' => ['id' => $imageId, 'tagName' => $tagName ?? '']]);
    }

    public function toggleImageFinal(string $rowKey, int $imageId): JsonResponse
    {
        if (! SheetLookup::isValidRowKey($rowKey) || $imageId <= 0) {
            return response()->json(['message' => 'Invalid reference.'], 400);
        }

        $image = $this->findClientImage($rowKey, $imageId);

        if (! $image) {
            return response()->json(['message' => 'Image not found.'], 404);
        }

        $next = ! $image->is_final_selected;

        DB::table('client_meeting_images')->where('id', $imageId)->update(['is_final_selected' => $next ? 1 : 0]);

        return response()->json(['data' => ['id' => $imageId, 'isFinalSelected' => $next]]);
    }

    // ─── Meeting items ─────────────────────────────────────────────

    public function storeItem(Request $request, string $rowKey, int $meetingId): JsonResponse
    {
        if (! SheetLookup::isValidRowKey($rowKey) || $meetingId <= 0) {
            return response()->json(['message' => 'Invalid reference.'], 400);
        }

        $itemKey = (string) $request->input('itemKey');

        if (! in_array($itemKey, self::ITEM_KEY_OPTIONS, true)) {
            return response()->json(['message' => 'Please choose a valid item from the list.'], 422);
        }

        $customLabel = mb_substr(trim((string) $request->input('customLabel')), 0, 160);

        if ($itemKey === 'other' && $customLabel === '') {
            return response()->json(['message' => 'Please enter a name for this item.'], 422);
        }

        $meetingExists = DB::table('client_meetings')
            ->where('id', $meetingId)
            ->where('linked_row_key', $rowKey)
            ->exists();

        if (! $meetingExists) {
            return response()->json(['message' => 'Meeting not found.'], 404);
        }

        // Fixed items are unique per meeting; "other" items may repeat.
        if ($itemKey !== 'other') {
            $duplicate = DB::table('meeting_items')
                ->where('meeting_id', $meetingId)
                ->where('item_key', $itemKey)
                ->exists();

            if ($duplicate) {
                return response()->json(['message' => 'This item has already been added to the meeting.'], 409);
            }
        }

        $employeeId = OfficeAuth::currentId($request);
        $description = mb_substr(trim((string) $request->input('description')), 0, 2000);
        $now = DbDates::nowString();

        $itemId = DB::table('meeting_items')->insertGetId([
            'meeting_id' => $meetingId,
            'item_key' => $itemKey,
            'custom_label' => $itemKey === 'other' ? $customLabel : null,
            'description' => $description === '' ? null : $description,
            'quantity' => $this->parseQuantity($request->input('quantity')),
            'created_by' => $employeeId,
            'updated_by' => $employeeId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $item = DB::table('meeting_items')->where('id', $itemId)->first();

        return response()->json([
            'data' => [
                'id' => (int) $item->id,
                'itemKey' => $item->item_key,
                'customLabel' => $item->custom_label ?? '',
                'description' => $item->description ?? '',
                'quantity' => (int) $item->quantity,
                'images' => [],
            ],
        ], 201);
    }

    public function updateItem(Request $request, string $rowKey, int $meetingId, int $itemId): JsonResponse
    {
        if (! SheetLookup::isValidRowKey($rowKey) || $meetingId <= 0 || $itemId <= 0) {
            return response()->json(['message' => 'Invalid reference.'], 400);
        }

        $item = $this->findItem($rowKey, $meetingId, $itemId);

        if (! $item) {
            return response()->json(['message' => 'Item not found.'], 404);
        }

        $update = [
            'description' => null,
            'quantity' => $this->parseQuantity($request->input('quantity')),
            'updated_by' => OfficeAuth::currentId($request),
            'updated_at' => DbDates::nowString(),
        ];

        $description = mb_substr(trim((string) $request->input('description')), 0, 2000);
        $update['description'] = $description === '' ? null : $description;

        if ($item->item_key === 'other' && $request->has('customLabel')) {
            $customLabel = mb_substr(trim((string) $request->input('customLabel')), 0, 160);

            if ($customLabel === '') {
                return response()->json(['message' => 'Please enter a name for this item.'], 422);
            }

            $update['custom_label'] = $customLabel;
        }

        DB::table('meeting_items')->where('id', $itemId)->update($update);

        $fresh = DB::table('meeting_items')->where('id', $itemId)->first();

        return response()->json([
            'data' => [
                'id' => (int) $fresh->id,
                'customLabel' => $fresh->custom_label ?? '',
                'description' => $fresh->description ?? '',
                'quantity' => (int) $fresh->quantity,
            ],
        ]);
    }

    public function destroyItem(string $rowKey, int $meetingId, int $itemId): JsonResponse
    {
        if (! SheetLookup::isValidRowKey($rowKey) || $meetingId <= 0 || $itemId <= 0) {
            return response()->json(['message' => 'Invalid reference.'], 400);
        }

        if (! $this->findItem($rowKey, $meetingId, $itemId)) {
            return response()->json(['message' => 'Item not found.'], 404);
        }

        $storedFileNames = DB::table('client_meeting_images')
            ->where('item_id', $itemId)
            ->pluck('stored_file_name');

        DB::table('meeting_items')->where('id', $itemId)->delete();

        foreach ($storedFileNames as $storedFileName) {
            $this->deleteImageFileIfUnreferenced($storedFileName);
        }

        return response()->json(['data' => ['id' => $itemId]]);
    }

    public function uploadItemImages(Request $request, string $rowKey, int $meetingId, int $itemId): JsonResponse
    {
        if (! SheetLookup::isValidRowKey($rowKey) || $meetingId <= 0 || $itemId <= 0) {
            return response()->json(['message' => 'Invalid reference.'], 400);
        }

        $files = $request->file('images');
        $files = $files === null ? [] : (is_array($files) ? $files : [$files]);

        if (! $files) {
            return response()->json(['message' => 'Please choose at least one image.'], 422);
        }

        if (! $this->findItem($rowKey, $meetingId, $itemId)) {
            return response()->json(['message' => 'Item not found.'], 404);
        }

        return $this->storeImages($request, $files, $meetingId, $itemId, []);
    }

    public function deleteItemImage(string $rowKey, int $meetingId, int $itemId, int $imageId): JsonResponse
    {
        if (! SheetLookup::isValidRowKey($rowKey) || $meetingId <= 0 || $itemId <= 0 || $imageId <= 0) {
            return response()->json(['message' => 'Invalid reference.'], 400);
        }

        $image = DB::table('client_meeting_images as i')
            ->join('client_meetings as m', 'm.id', '=', 'i.meeting_id')
            ->where('i.id', $imageId)
            ->where('i.item_id', $itemId)
            ->where('i.meeting_id', $meetingId)
            ->where('m.linked_row_key', $rowKey)
            ->first(['i.id', 'i.stored_file_name']);

        if (! $image) {
            return response()->json(['message' => 'Image not found.'], 404);
        }

        DB::table('client_meeting_images')->where('id', $imageId)->delete();
        $this->deleteImageFileIfUnreferenced($image->stored_file_name);

        return response()->json(['data' => ['id' => $imageId]]);
    }

    // ─── Finalization ──────────────────────────────────────────────

    public function finalizePreview(string $rowKey): JsonResponse
    {
        if (! SheetLookup::isValidRowKey($rowKey)) {
            return response()->json(['message' => 'Invalid client reference.'], 400);
        }

        $meetingIds = DB::table('client_meetings')
            ->where('linked_row_key', $rowKey)
            ->orderBy('id')
            ->pluck('id');

        // Previously-saved picks, so the preview reopens with them checked.
        $savedSelections = [];
        $finalizationId = DB::table('client_finalizations')->where('linked_row_key', $rowKey)->value('id');

        if ($finalizationId) {
            $savedItems = DB::table('client_finalization_items')->where('finalization_id', $finalizationId)->get();

            foreach ($savedItems as $savedItem) {
                $groupKey = $this->finalizeGroupKey($savedItem->item_key, $savedItem->custom_label);
                $savedSelections[$groupKey] = DB::table('client_finalization_images')
                    ->where('finalization_item_id', $savedItem->id)
                    ->pluck('stored_file_name')
                    ->all();
            }
        }

        $groups = [];

        if ($meetingIds->isNotEmpty()) {
            $items = DB::table('meeting_items')
                ->whereIn('meeting_id', $meetingIds)
                ->orderBy('meeting_id')
                ->orderBy('id')
                ->get();

            $itemImages = DB::table('client_meeting_images')
                ->whereIn('meeting_id', $meetingIds)
                ->whereNotNull('item_id')
                ->orderBy('id')
                ->get()
                ->groupBy('item_id');

            foreach ($items as $item) {
                $groupKey = $this->finalizeGroupKey($item->item_key, $item->custom_label);

                // Later meetings win on the descriptive fields.
                $groups[$groupKey] ??= ['images' => []];
                $groups[$groupKey] = array_merge($groups[$groupKey], [
                    'groupKey' => $groupKey,
                    'itemKey' => $item->item_key,
                    'customLabel' => $item->custom_label ?? '',
                    'description' => $item->description ?? '',
                    'quantity' => (int) ($item->quantity ?? 1),
                    'sourceMeetingId' => (int) $item->meeting_id,
                    'sourceItemId' => (int) $item->id,
                ]);

                foreach ($itemImages->get($item->id, []) as $image) {
                    // Deduplicate copy-forwarded images by stored file name.
                    $groups[$groupKey]['images'][$image->stored_file_name] = [
                        'id' => (int) $image->id,
                        'url' => $image->file_url,
                        'originalFileName' => $image->original_file_name,
                        'createdAt' => DbDates::formatDateTime($image->created_at),
                        'isSelected' => in_array($image->stored_file_name, $savedSelections[$groupKey] ?? [], true),
                    ];
                }
            }
        }

        $items = array_values(array_map(function ($group) {
            $group['images'] = array_values($group['images']);

            return $group;
        }, $groups));

        return response()->json([
            'data' => [
                'rowKey' => $rowKey,
                'finalization' => $this->finalizationSummary($rowKey),
                'items' => $items,
            ],
        ]);
    }

    public function finalize(Request $request, string $rowKey): JsonResponse
    {
        if (! SheetLookup::isValidRowKey($rowKey)) {
            return response()->json(['message' => 'Invalid client reference.'], 400);
        }

        $employeeId = OfficeAuth::currentId($request);
        $budget = $this->parseBudget($request->input('budget'));
        $rawItems = $request->input('items');
        $rawItems = is_array($rawItems) ? array_slice($rawItems, 0, 60) : [];
        $now = DbDates::nowString();

        DB::transaction(function () use ($rowKey, $rawItems, $budget, $employeeId, $now) {
            $finalizationId = DB::table('client_finalizations')->where('linked_row_key', $rowKey)->value('id');

            if ($finalizationId) {
                DB::table('client_finalizations')->where('id', $finalizationId)->update([
                    'finalized_by' => $employeeId,
                    'finalized_at' => $now,
                    'finalized_budget' => $budget,
                    'updated_at' => $now,
                ]);

                DB::table('client_finalization_items')->where('finalization_id', $finalizationId)->delete();
            } else {
                $finalizationId = DB::table('client_finalizations')->insertGetId([
                    'linked_row_key' => $rowKey,
                    'finalized_by' => $employeeId,
                    'finalized_at' => $now,
                    'finalized_budget' => $budget,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            foreach ($rawItems as $rawItem) {
                $itemKey = (string) ($rawItem['itemKey'] ?? '');

                if (! in_array($itemKey, self::ITEM_KEY_OPTIONS, true)) {
                    continue;
                }

                $customLabel = mb_substr(trim((string) ($rawItem['customLabel'] ?? '')), 0, 160);
                $description = mb_substr(trim((string) ($rawItem['description'] ?? '')), 0, 5000);

                $itemId = DB::table('client_finalization_items')->insertGetId([
                    'finalization_id' => $finalizationId,
                    'item_key' => $itemKey,
                    'custom_label' => $itemKey === 'other' ? $customLabel : null,
                    'description' => $description === '' ? null : $description,
                    'quantity' => $this->parseQuantity($rawItem['quantity'] ?? null),
                    'created_at' => $now,
                ]);

                $imageIds = array_values(array_unique(array_filter(
                    is_array($rawItem['imageIds'] ?? null) ? $rawItem['imageIds'] : [],
                    fn ($id) => SheetLookup::validId($id) !== null
                )));

                if (! $imageIds) {
                    continue;
                }

                // Only images belonging to this client may be finalized.
                $images = DB::table('client_meeting_images as i')
                    ->join('client_meetings as m', 'm.id', '=', 'i.meeting_id')
                    ->whereIn('i.id', $imageIds)
                    ->where('m.linked_row_key', $rowKey)
                    ->get(['i.stored_file_name', 'i.original_file_name', 'i.file_url', 'i.file_size_bytes']);

                foreach ($images as $image) {
                    DB::table('client_finalization_images')->insert([
                        'finalization_item_id' => $itemId,
                        'stored_file_name' => $image->stored_file_name,
                        'original_file_name' => $image->original_file_name,
                        'file_url' => $image->file_url,
                        'file_size_bytes' => $image->file_size_bytes,
                        'created_at' => $now,
                    ]);
                }
            }

            $this->setBookedFromMme($rowKey, true);
        });

        $summary = $this->finalizationSummary($rowKey);

        return response()->json([
            'data' => [
                'rowKey' => $rowKey,
                'finalizedAt' => $summary['finalizedAt'] ?? null,
                'finalizedByName' => $summary['finalizedByName'] ?? null,
                'finalizedBudget' => $summary['finalizedBudget'] ?? null,
            ],
        ]);
    }

    public function finalizationDetail(string $rowKey): JsonResponse
    {
        if (! SheetLookup::isValidRowKey($rowKey)) {
            return response()->json(['message' => 'Invalid client reference.'], 400);
        }

        $finalizationId = DB::table('client_finalizations')->where('linked_row_key', $rowKey)->value('id');
        $items = [];

        if ($finalizationId) {
            $rows = DB::table('client_finalization_items')
                ->where('finalization_id', $finalizationId)
                ->orderBy('id')
                ->get();

            $imagesByItem = DB::table('client_finalization_images')
                ->whereIn('finalization_item_id', $rows->pluck('id'))
                ->orderBy('id')
                ->get()
                ->groupBy('finalization_item_id');

            $items = $rows->map(fn ($row) => [
                'id' => (int) $row->id,
                'itemKey' => $row->item_key,
                'customLabel' => $row->custom_label ?? '',
                'description' => $row->description ?? '',
                'quantity' => (int) ($row->quantity ?? 1),
                'images' => collect($imagesByItem->get($row->id, []))->map(fn ($image) => [
                    'id' => (int) $image->id,
                    'url' => $image->file_url,
                    'originalFileName' => $image->original_file_name,
                ])->values(),
            ])->values()->all();
        }

        return response()->json([
            'data' => [
                'rowKey' => $rowKey,
                'finalization' => $this->finalizationSummary($rowKey),
                'items' => $items,
            ],
        ]);
    }

    // ─── Helpers ───────────────────────────────────────────────────

    private function finalizationSummary(string $rowKey): ?array
    {
        $finalization = DB::table('client_finalizations as f')
            ->leftJoin('employees as e', 'e.id', '=', 'f.finalized_by')
            ->where('f.linked_row_key', $rowKey)
            ->first(['f.finalized_at', 'f.finalized_budget', 'e.full_name as finalized_by_name']);

        if (! $finalization) {
            return null;
        }

        return [
            'finalizedAt' => DbDates::formatDateTime($finalization->finalized_at),
            'finalizedByName' => $finalization->finalized_by_name,
            'finalizedBudget' => $finalization->finalized_budget === null ? null : (float) $finalization->finalized_budget,
        ];
    }

    /** Fixed items group by key; "other" items group by their lowercased label. */
    private function finalizeGroupKey(string $itemKey, ?string $customLabel): string
    {
        return $itemKey === 'other'
            ? 'other:'.strtolower(trim((string) $customLabel))
            : $itemKey;
    }

    /** New meetings inherit the previous meeting's items and images. */
    private function copyForwardFromPreviousMeeting(string $rowKey, int $newMeetingId, ?int $employeeId): void
    {
        $previousMeetingId = DB::table('client_meetings')
            ->where('linked_row_key', $rowKey)
            ->where('id', '!=', $newMeetingId)
            ->orderByDesc('id')
            ->value('id');

        if (! $previousMeetingId) {
            return;
        }

        $now = DbDates::nowString();

        $items = DB::table('meeting_items')->where('meeting_id', $previousMeetingId)->orderBy('id')->get();

        $imagesByItem = DB::table('client_meeting_images')
            ->where('meeting_id', $previousMeetingId)
            ->whereNotNull('item_id')
            ->orderBy('id')
            ->get()
            ->groupBy('item_id');

        foreach ($items as $item) {
            $newItemId = DB::table('meeting_items')->insertGetId([
                'meeting_id' => $newMeetingId,
                'item_key' => $item->item_key,
                'custom_label' => $item->custom_label,
                'description' => $item->description,
                'quantity' => $item->quantity,
                'created_by' => $employeeId,
                'updated_by' => $employeeId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            foreach ($imagesByItem->get($item->id, []) as $image) {
                // Same stored file is reused; only the DB row is duplicated.
                DB::table('client_meeting_images')->insert([
                    'meeting_id' => $newMeetingId,
                    'item_id' => $newItemId,
                    'stored_file_name' => $image->stored_file_name,
                    'original_file_name' => $image->original_file_name,
                    'tag_name' => $image->tag_name,
                    'file_url' => $image->file_url,
                    'file_size_bytes' => $image->file_size_bytes,
                    'uploaded_by' => $employeeId,
                    'created_at' => $now,
                ]);
            }
        }
    }

    private function storeImages(Request $request, array $files, int $meetingId, ?int $itemId, array $tagNames): JsonResponse
    {
        if (count($files) > self::MAX_IMAGES_PER_UPLOAD) {
            return response()->json([
                'message' => 'You can upload up to '.self::MAX_IMAGES_PER_UPLOAD.' images at a time.',
            ], 422);
        }

        foreach ($files as $file) {
            if (! $file->isValid() || ! isset(self::ALLOWED_IMAGE_MIMES[$file->getMimeType()])) {
                return response()->json(['message' => 'Only JPG, PNG, GIF, or WEBP images are allowed.'], 422);
            }

            if ($file->getSize() > self::MAX_IMAGE_BYTES) {
                return response()->json(['message' => 'Each image must be 8MB or smaller.'], 422);
            }
        }

        $employeeId = OfficeAuth::currentId($request);
        $now = DbDates::nowString();
        $created = [];

        foreach (array_values($files) as $index => $file) {
            $storedFileName = Str::uuid().'.'.self::ALLOWED_IMAGE_MIMES[$file->getMimeType()];
            $file->move(OfficeStorage::directory(OfficeStorage::MEETING_IMAGES_DIR), $storedFileName);

            $tagName = trim((string) ($tagNames[$index] ?? ''));
            $tagName = $tagName === '' ? null : mb_substr($tagName, 0, 120);
            $fileUrl = OfficeStorage::publicUrl(OfficeStorage::MEETING_IMAGES_DIR, $storedFileName);

            $imageId = DB::table('client_meeting_images')->insertGetId([
                'meeting_id' => $meetingId,
                'item_id' => $itemId,
                'stored_file_name' => $storedFileName,
                'original_file_name' => mb_substr((string) $file->getClientOriginalName(), 0, 255),
                'tag_name' => $itemId === null ? $tagName : null,
                'file_url' => $fileUrl,
                'file_size_bytes' => File::size(OfficeStorage::meetingImagePath($storedFileName)),
                'uploaded_by' => $employeeId,
                'created_at' => $now,
            ]);

            $payload = [
                'id' => $imageId,
                'originalFileName' => mb_substr((string) $file->getClientOriginalName(), 0, 255),
                'url' => $fileUrl,
                'isFinalSelected' => false,
            ];

            if ($itemId === null) {
                $payload['tagName'] = $tagName ?? '';
            }

            $created[] = $payload;
        }

        return response()->json(['data' => $created], 201);
    }

    /** A stored file is shared by copy-forward, so only delete it when orphaned. */
    private function deleteImageFileIfUnreferenced(?string $storedFileName): void
    {
        if (! $storedFileName) {
            return;
        }

        $referenced = DB::table('client_meeting_images')->where('stored_file_name', $storedFileName)->exists()
            || DB::table('client_finalization_images')->where('stored_file_name', $storedFileName)->exists();

        if (! $referenced) {
            File::delete(OfficeStorage::meetingImagePath($storedFileName));
        }
    }

    private function setBookedFromMme(string $rowKey, bool $value): void
    {
        $sheetId = SheetLookup::defaultSheetId();

        if (! $sheetId) {
            return;
        }

        $rowId = DB::table('sheet_rows')
            ->where('sheet_id', $sheetId)
            ->where('row_key', $rowKey)
            ->value('id');

        $columnId = DB::table('sheet_columns')
            ->where('sheet_id', $sheetId)
            ->where('column_name', 'Event Date')
            ->value('id');

        if (! $rowId || ! $columnId) {
            return;
        }

        $cellId = DB::table('sheet_cells')
            ->where('row_id', $rowId)
            ->where('column_id', $columnId)
            ->value('id');

        if ($cellId) {
            DB::table('sheet_cells')->where('id', $cellId)->update(['booked_from_mme' => $value ? 1 : 0]);
        } else {
            DB::table('sheet_cells')->insert([
                'row_id' => $rowId,
                'column_id' => $columnId,
                'booked_from_mme' => $value ? 1 : 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    private function findClientImage(string $rowKey, int $imageId): ?object
    {
        return DB::table('client_meeting_images as i')
            ->join('client_meetings as m', 'm.id', '=', 'i.meeting_id')
            ->where('i.id', $imageId)
            ->where('m.linked_row_key', $rowKey)
            ->first(['i.id', 'i.is_final_selected', 'i.stored_file_name']);
    }

    private function findItem(string $rowKey, int $meetingId, int $itemId): ?object
    {
        return DB::table('meeting_items as mi')
            ->join('client_meetings as m', 'm.id', '=', 'mi.meeting_id')
            ->where('mi.id', $itemId)
            ->where('mi.meeting_id', $meetingId)
            ->where('m.linked_row_key', $rowKey)
            ->first(['mi.id', 'mi.item_key']);
    }

    private function parseTagNames(mixed $raw): array
    {
        if (is_array($raw)) {
            return $raw;
        }

        $decoded = json_decode((string) $raw, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function parseRequirements(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        $decoded = json_decode((string) $value, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function sanitizeRequirements(mixed $raw): array
    {
        $items = is_array($raw) ? $raw : $this->parseRequirements($raw);

        return array_values(array_map(fn ($item) => [
            'key' => mb_substr(trim((string) ($item['key'] ?? '')), 0, 80),
            'label' => mb_substr(trim((string) ($item['label'] ?? '')), 0, 120),
            'details' => mb_substr(trim((string) ($item['details'] ?? '')), 0, 2000),
        ], array_slice(array_filter($items, 'is_array'), 0, 40)));
    }

    private function parseQuantity(mixed $value): int
    {
        if ($value === null || $value === '') {
            return 1;
        }

        return (int) round(max(0, min((float) $value, 100000)));
    }

    private function parseBudget(mixed $value): ?float
    {
        if ($value === null || $value === '' || ! is_numeric($value)) {
            return null;
        }

        return round(max(0, min((float) $value, 999999999.99)), 2);
    }
}
