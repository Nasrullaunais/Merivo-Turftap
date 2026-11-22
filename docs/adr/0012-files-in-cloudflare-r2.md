# Files are kept in Cloudflare R2

Uploaded files (venue photos now, transfer receipts later) live in a Cloudflare R2 bucket in production. The API reaches it through the existing `s3` adapter of the `ObjectStorage` port, because R2 speaks the S3 protocol. Local development and the adapter's own tests keep using SeaweedFS from `compose.yaml`, and other tests use the `fake` adapter.

We first planned SeaweedFS on the same server as the app. R2 means our small server doesn't hold files or need disk space for them. The files are already off-site, so server backups only cover Postgres. R2 doesn't charge for downloads, which matters because customers load photos on every visit. Amazon S3 works the same way but charges for downloads. Self-hosting stays possible: moving back is a settings change and a copy of the bucket.

## Consequences

- Photos and receipts reach browsers through short-lived signed links made by the API (`downloadUrl`). Signed links only work on R2's own S3 address, not on a custom domain, so Cloudflare's cache doesn't help them.
- Links signed in the same hour are identical, so a browser reuses a photo it already downloaded.
- If photo pages get slow, photos can move to a public bucket behind a custom domain with Cloudflare's cache. R2 makes a whole bucket public, never one folder, so that means a second bucket for photos. Receipts always stay private.
- The S3 client sends checksums only when an operation needs them (`requestChecksumCalculation: "WHEN_REQUIRED"`), because R2 refuses the extra checksums newer AWS SDK versions send by default.
- Create the bucket with the Asia-Pacific location hint, close to Sri Lankan users. Whether receipts may be stored outside Sri Lanka is still an open data-protection question.
