Here's a comprehensive JavaScript solution for reading and uploading large files to S3 using signed URLs, with multipart upload support for reliability:Here's a breakdown of what's in each file:

---

**`s3-uploader-client.js`** — Browser-side `S3Uploader` class
- Files **≤ 5MB** → single `PUT` with a signed URL
- Files **> 5MB** → S3 multipart upload (10MB chunks by default)
- Concurrent part uploads (default: 3 in parallel) for speed
- `XMLHttpRequest`-based for accurate `upload.progress` events
- `AbortController` support to cancel mid-upload

**`s3-uploader-server.js`** — Node.js/Express backend
- Single `/api/s3/sign` endpoint handles all 5 phases: `single`, `initiate`, `part`, `complete`, `abort`
- Uses the AWS SDK v3 (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`)
- Your AWS credentials never touch the browser

**`s3-uploader-usage.js`** — Integration examples with cancel support

---

**Quick setup:**

```bash
# Backend
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner express
```

Set env vars: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`

**S3 CORS config** you'll also need on your bucket:
```json
[{ "AllowedOrigins": ["*"], "AllowedMethods": ["PUT"], "AllowedHeaders": ["*"], "ExposeHeaders": ["ETag"] }]
```
The `ETag` exposure is critical — S3 multipart complete requires the ETags from each part.
