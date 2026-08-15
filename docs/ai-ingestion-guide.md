# AI Content Generator Ingestion Guide

Complete reference manual for automated AI content generation pipelines submitting short-form video and carousel posts into PublishFast.

---

## 1. Authentication

All AI ingestion endpoints require a machine **Bearer Token** with admin privileges.

Include the token in the `Authorization` HTTP header of every request:

```http
Authorization: Bearer <YOUR_API_TOKEN>
```

### How to obtain an API Token:
- **Via Admin UI**: Log in as an admin ➔ Go to `/admin` ➔ **API Tokens** ➔ Generate a new token (e.g., `ai-content-generator`).
- **Via Admin API**:
  ```bash
  POST /api/admin/tokens
  Authorization: Bearer <EXISTING_ADMIN_TOKEN>
  Content-Type: application/json

  { "name": "ai-video-generator" }
  ```

---

## 2. Ingestion Lifecycle and Best Practices

To avoid publishing incomplete posts while media files are still uploading, follow the **3-Step Ingestion Lifecycle**:

```
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│ 1. Create Content Item │ ──▶  │ 2. Upload Media Assets │ ──▶  │  3. Set Status READY   │
│     (status: DRAFT)    │      │    (Video or Carousel) │      │  (Available for claim) │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘
```

1. **Create the post metadata** with `status: "DRAFT"` (hidden from KOL queues).
2. **Upload media assets** (`.mp4` video or multiple `.jpg`/`.png` carousel slides).
3. **Set status to `READY`** via `PATCH /api/ingest/contents/:id` so KOLs receive push notifications and can immediately claim the post.

---

## 3. How to Assign Content to a Specific KOL

PublishFast supports both **Shared Queue** (any KOL can claim) and **Direct Assignment** (targeted exclusively to one KOL):

| Strategy | `assignedUserId` Field | Behavior |
| :--- | :--- | :--- |
| **Open Pool (Default)** | `null` or omitted | Any available KOL in the queue can view and claim the post. |
| **Direct KOL Assignment** | `"user-uuid-here"` | **Only** that specific KOL can see and claim the post. Hidden from all other creators. |

### How to find User IDs for assignment:
Query the users endpoint:
```http
GET /api/admin/users
Authorization: Bearer <YOUR_API_TOKEN>
```
Response:
```json
{
  "users": [
    {
      "id": "c7a8e56b-4567-4890-a123-456789abcdef",
      "username": "yoga",
      "displayName": "Yoga Creator",
      "role": "kol",
      "active": true
    }
  ]
}
```

---

## 4. Ingestion Workflows

### A. Submitting a Short-Form Video Post

#### Step 1: Create Content Entry
```http
POST /api/ingest/contents
Authorization: Bearer <YOUR_API_TOKEN>
Content-Type: application/json

{
  "code": "TKT-VID-20260815-01",
  "title": "5 Morning Habits for Peak Focus",
  "caption": "Start your day with these 5 scientifically proven habits! ☕✨ #focus #productivity #morningroutine",
  "contentType": "video",
  "status": "DRAFT",
  "assignedUserId": "c7a8e56b-4567-4890-a123-456789abcdef"
}
```

Response (`201 Created`):
```json
{
  "content": {
    "id": "e4f8d9b1-1234-4567-89ab-cdef01234567",
    "code": "TKT-VID-20260815-01",
    "title": "5 Morning Habits for Peak Focus",
    "caption": "Start your day with these 5 scientifically proven habits! ☕✨ #focus #productivity #morningroutine",
    "contentType": "video",
    "status": "DRAFT",
    "assignedUserId": "c7a8e56b-4567-4890-a123-456789abcdef",
    "createdAt": "2026-08-15T13:30:00.000Z"
  }
}
```

#### Step 2: Upload Video File
Upload the generated `.mp4` / `.mov` file via `multipart/form-data`:

```bash
curl -X POST https://your-domain.com/api/ingest/contents/e4f8d9b1-1234-4567-89ab-cdef01234567/assets \
  -H "Authorization: Bearer <YOUR_API_TOKEN>" \
  -F "file=@output_video.mp4;type=video/mp4"
```

#### Step 3: Make Content Ready for KOLs
```http
PATCH /api/ingest/contents/e4f8d9b1-1234-4567-89ab-cdef01234567
Authorization: Bearer <YOUR_API_TOKEN>
Content-Type: application/json

{
  "status": "READY"
}
```

---

### B. Submitting an Image Carousel Post

For multi-slide Instagram/TikTok carousels:

#### Step 1: Create Content Entry
```http
POST /api/ingest/contents
Authorization: Bearer <YOUR_API_TOKEN>
Content-Type: application/json

{
  "code": "IG-CAR-20260815-02",
  "title": "Top 4 Grammar Hacks for IELTS 8.0+",
  "caption": "Swipe left for 4 essential inversion grammar structures with real exam examples! 📖 Slide 4 is a game-changer. #ielts #grammar #studygram",
  "contentType": "carousel",
  "status": "DRAFT",
  "assignedUserId": null
}
```

#### Step 2: Upload Carousel Slides in Order
Upload all image slides in a single `multipart/form-data` request. The order of parts defines the slide order (`1`, `2`, `3`, `4`):

```bash
curl -X POST https://your-domain.com/api/ingest/contents/IG-CAR-20260815-02/assets \
  -H "Authorization: Bearer <YOUR_API_TOKEN>" \
  -F "slide1=@slide1_cover.jpg;type=image/jpeg" \
  -F "slide2=@slide2_content.jpg;type=image/jpeg" \
  -F "slide3=@slide3_examples.jpg;type=image/jpeg" \
  -F "slide4=@slide4_summary.jpg;type=image/jpeg"
```

#### Step 3: Publish to Queue
```http
PATCH /api/ingest/contents/IG-CAR-20260815-02
Authorization: Bearer <YOUR_API_TOKEN>
Content-Type: application/json

{
  "status": "READY"
}
```

---

## 5. Ready-to-Use Code Examples

### Python (using `requests`)

```python
import os
import requests

API_BASE = os.getenv("PF_API_BASE", "https://publishfast.example.com")
API_TOKEN = os.getenv("PF_API_TOKEN", "pf_your_token_here")
HEADERS = {"Authorization": f"Bearer {API_TOKEN}"}

def ingest_video_post(code: str, title: str, caption: str, video_path: str, kol_user_id: str = None):
    # 1. Create content entry in DRAFT
    payload = {
        "code": code,
        "title": title,
        "caption": caption,
        "contentType": "video",
        "status": "DRAFT",
        "assignedUserId": kol_user_id
    }
    r = requests.post(f"{API_BASE}/api/ingest/contents", json=payload, headers=HEADERS)
    r.raise_for_status()
    content_id = r.json()["content"]["id"]

    # 2. Upload video file
    with open(video_path, "rb") as f:
        files = {"file": (os.path.basename(video_path), f, "video/mp4")}
        r = requests.post(f"{API_BASE}/api/ingest/contents/{content_id}/assets", files=files, headers=HEADERS)
        r.raise_for_status()

    # 3. Mark READY
    r = requests.patch(f"{API_BASE}/api/ingest/contents/{content_id}", json={"status": "READY"}, headers=HEADERS)
    r.raise_for_status()
    print(f"✓ Post {code} ({content_id}) successfully ingested and ready for posting!")
    return content_id

def ingest_carousel_post(code: str, title: str, caption: str, image_paths: list[str], kol_user_id: str = None):
    # 1. Create carousel entry
    payload = {
        "code": code,
        "title": title,
        "caption": caption,
        "contentType": "carousel",
        "status": "DRAFT",
        "assignedUserId": kol_user_id
    }
    r = requests.post(f"{API_BASE}/api/ingest/contents", json=payload, headers=HEADERS)
    r.raise_for_status()
    content_id = r.json()["content"]["id"]

    # 2. Upload all slides in order
    files = []
    opened_files = []
    try:
        for idx, img_path in enumerate(image_paths):
            f = open(img_path, "rb")
            opened_files.append(f)
            files.append((f"file_{idx}", (os.path.basename(img_path), f, "image/jpeg")))

        r = requests.post(f"{API_BASE}/api/ingest/contents/{content_id}/assets", files=files, headers=HEADERS)
        r.raise_for_status()
    finally:
        for f in opened_files:
            f.close()

    # 3. Mark READY
    r = requests.patch(f"{API_BASE}/api/ingest/contents/{content_id}", json={"status": "READY"}, headers=HEADERS)
    r.raise_for_status()
    print(f"✓ Carousel {code} ({content_id}) with {len(image_paths)} slides ingested and ready!")
    return content_id
```

---

### Node.js / TypeScript (Native `fetch` + `FormData`)

```typescript
import fs from 'node:fs'
import path from 'node:path'

const API_BASE = process.env.PF_API_BASE || 'https://publishfast.example.com'
const API_TOKEN = process.env.PF_API_TOKEN || 'pf_your_token_here'

interface IngestOptions {
  code: string
  title?: string
  caption?: string
  assignedUserId?: string
}

export async function ingestVideo(options: IngestOptions, videoFilePath: string) {
  // 1. Create content metadata
  const createRes = await fetch(`${API_BASE}/api/ingest/contents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code: options.code,
      title: options.title,
      caption: options.caption,
      contentType: 'video',
      status: 'DRAFT',
      assignedUserId: options.assignedUserId || null,
    }),
  })
  const { content } = await createRes.json()

  // 2. Upload video file
  const form = new FormData()
  const fileBuffer = fs.readFileSync(videoFilePath)
  const blob = new Blob([fileBuffer], { type: 'video/mp4' })
  form.append('file', blob, path.basename(videoFilePath))

  await fetch(`${API_BASE}/api/ingest/contents/${content.id}/assets`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_TOKEN}` },
    body: form,
  })

  // 3. Mark READY
  await fetch(`${API_BASE}/api/ingest/contents/${content.id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'READY' }),
  })

  console.log(`✓ Video post ${options.code} successfully ingested (ID: ${content.id})`)
  return content.id
}
```

---

## 6. Error Reference

| HTTP Status | Reason | Resolution |
| :--- | :--- | :--- |
| `401 Unauthorized` | Invalid or missing Bearer token | Verify the `Authorization: Bearer <TOKEN>` header. |
| `409 Conflict` | `code` already exists | The `code` field is a unique constraint. Use a unique naming scheme (e.g. prefix with timestamp or UUID). |
| `413 Payload Too Large` | Media file exceeds `MAX_UPLOAD_BYTES` | Check server upload limits in environment configuration (default 150MB). |
| `404 Not Found` | Content ID does not exist | Ensure you are using the `id` returned from Step 1 (`POST /api/ingest/contents`). |
