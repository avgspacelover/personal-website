# Media storage

Application code talks only to the `MediaStorage` interface in `index.ts` (`put`, `get`, `delete`). The database stores **keys** (`<uuid>.jpg`, `<uuid>-800.webp`), never full URLs, and `mediaUrl(key)` builds public URLs. That is why switching storage needs no schema or CMS change.

The default driver (`local.ts`) writes to `MEDIA_DIR` on disk. Use it while you are on a single VPS: keep `MEDIA_DIR` on a persistent path and back it up with the database.

## Moving to S3-compatible storage (AWS S3, Cloudflare R2, Backblaze B2, MinIO, ...)

Do this when you move to a host without persistent disk, run several instances, or want a CDN. Check each provider's current signup terms first; some require a payment method even for free tiers.

### 1. Create a bucket and credentials
- Private bucket. Create an access key limited to that bucket (read, write, delete).
- **Cloudflare R2:** create an R2 bucket, then an API token with *Object Read & Write* on it. Endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, region `auto`.
- **AWS S3:** leave `S3_ENDPOINT` unset and set `S3_REGION` (e.g. `us-east-1`).
- **Others (B2, MinIO, ...):** set `S3_ENDPOINT` to the provider endpoint; set `S3_FORCE_PATH_STYLE=1` if the provider needs path-style URLs.

### 2. Install the SDK and add `s3.ts`
    npm i @aws-sdk/client-s3

Create `src/lib/storage/s3.ts`:

```ts
import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { CONTENT_TYPES } from "./index";
import type { MediaStorage } from "./index";

const client = new S3Client({
  region: process.env.S3_REGION ?? "auto",
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: !!process.env.S3_FORCE_PATH_STYLE,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
});
const Bucket = process.env.S3_BUCKET!;

export const s3Driver: MediaStorage = {
  async put(key, data) {
    await client.send(new PutObjectCommand({ Bucket, Key: key, Body: data, ContentType: CONTENT_TYPES[key.split(".").pop()!], CacheControl: "public, max-age=31536000, immutable" }));
  },
  async get(key) {
    try { return Buffer.from(await (await client.send(new GetObjectCommand({ Bucket, Key: key }))).Body!.transformToByteArray()); }
    catch (e) { if ((e as { name?: string }).name === "NoSuchKey") return null; throw e; }
  },
  async delete(keys) {
    if (keys.length) await client.send(new DeleteObjectsCommand({ Bucket, Delete: { Objects: keys.map((Key) => ({ Key })) } }));
  },
};
```

### 3. Register the driver
In `getStorage()` (`index.ts`) add `if (driver === "s3") return s3Driver;` with `import { s3Driver } from "./s3";`.

### 4. Copy existing files (same keys)
    # from the VPS, with the provider's S3 credentials in the environment
    aws s3 sync "$MEDIA_DIR" "s3://$S3_BUCKET" --endpoint-url "$S3_ENDPOINT"
    # or: rclone sync "$MEDIA_DIR" remote:bucket

Keys are unchanged, so no database update is needed.

### 5. Choose how images are served
- **Through the app (simplest):** keep the bucket private. `/media/<key>` reads via the driver. Leave `MEDIA_PUBLIC_BASE` unset. Every image request passes through your server.
- **Directly from a CDN (recommended):** expose the bucket publicly through a CDN and set `MEDIA_PUBLIC_BASE`. R2: attach a custom domain to the bucket (or enable the `r2.dev` URL for testing). S3: put CloudFront in front. Example: `MEDIA_PUBLIC_BASE=https://media.example.com`. All new and existing pages then use CDN URLs, because URLs are built from keys at render time. `/media/<key>` keeps working as a fallback.

### 6. Environment
    STORAGE_DRIVER=s3
    S3_BUCKET=...
    S3_ACCESS_KEY_ID=...
    S3_SECRET_ACCESS_KEY=...
    S3_ENDPOINT=...            # R2/B2/MinIO; omit for AWS S3
    S3_REGION=auto             # R2: auto; AWS: the bucket region
    S3_FORCE_PATH_STYLE=       # 1 if required
    MEDIA_PUBLIC_BASE=         # optional CDN URL

### 7. Verify
1. Upload an image in `/admin/media`; confirm the object and its `-480/-800/...webp` variants appear in the bucket.
2. Load an existing page with an image and check it renders (this tests the copied files).
3. Delete a test asset; confirm all its objects disappear.
4. Keep the local `MEDIA_DIR` backup for a while before removing it.

### Notes
- The local driver refuses to overwrite a key (`wx`). S3 `put` overwrites silently; keys are random UUIDs so this does not matter in practice.
- Upload validation, EXIF stripping and variant generation happen before `put`, so they are unaffected by the driver.
