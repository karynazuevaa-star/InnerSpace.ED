#!/usr/bin/env python3
"""
One-time upload of the heavy static assets (3D models, room audio) from
public/ to a Cloudflare R2 bucket, so they're served from there instead of
counting against Vercel's own bandwidth quota - see src/lib/assetUrl.ts,
which every model/audio path in the app already goes through.

Usage:
    cd web
    export R2_ACCOUNT_ID=...         # Cloudflare dashboard -> R2 -> API -> account id
    export R2_ACCESS_KEY_ID=...      # from the R2 API token you create
    export R2_SECRET_ACCESS_KEY=...  # from that same token
    export R2_BUCKET_NAME=...        # the bucket you created
    pip3 install boto3
    python3 scripts/upload-to-r2.py              # uploads models/, models-legacy/, audio/
    python3 scripts/upload-to-r2.py --dry-run    # lists what would upload, no network writes
    python3 scripts/upload-to-r2.py --force      # re-uploads every file, skipping nothing

Skips any file whose content already matches what's in the bucket (compares
the local file's MD5 against the object's ETag, which R2 sets to the MD5 for
a plain single-part upload like this script does) - safe to re-run after
changing only a few files instead of re-uploading everything each time.

Credentials are read from the environment only - never pass them as
command-line arguments (they'd end up in shell history) and never paste
them into chat with an assistant.
"""
import hashlib
import mimetypes
import os
import sys

DIRS_TO_UPLOAD = ["models", "models-legacy", "audio"]

CONTENT_TYPES = {
    ".glb": "model/gltf-binary",
    ".mp3": "audio/mpeg",
}


def local_md5(path: str) -> str:
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    force = "--force" in sys.argv

    account_id = os.environ.get("R2_ACCOUNT_ID")
    access_key = os.environ.get("R2_ACCESS_KEY_ID")
    secret_key = os.environ.get("R2_SECRET_ACCESS_KEY")
    bucket = os.environ.get("R2_BUCKET_NAME")

    missing = [
        name
        for name, val in [
            ("R2_ACCOUNT_ID", account_id),
            ("R2_ACCESS_KEY_ID", access_key),
            ("R2_SECRET_ACCESS_KEY", secret_key),
            ("R2_BUCKET_NAME", bucket),
        ]
        if not val
    ]
    if missing and not dry_run:
        print(f"Missing required environment variables: {', '.join(missing)}")
        print("See the usage comment at the top of this script.")
        sys.exit(1)

    public_dir = os.path.join(os.path.dirname(__file__), "..", "public")
    public_dir = os.path.abspath(public_dir)

    files = []
    for d in DIRS_TO_UPLOAD:
        base = os.path.join(public_dir, d)
        if not os.path.isdir(base):
            continue
        for root, _dirs, filenames in os.walk(base):
            for name in filenames:
                full_path = os.path.join(root, name)
                key = os.path.relpath(full_path, public_dir).replace(os.sep, "/")
                files.append((full_path, key))

    total_bytes = sum(os.path.getsize(f) for f, _ in files)
    print(f"{len(files)} files, {total_bytes / 1024 / 1024:.1f} MB total")

    if dry_run:
        for _full_path, key in files:
            print(f"  would upload: {key}")
        return

    import boto3  # imported here so --dry-run works without the dependency installed
    from botocore.exceptions import ClientError

    client = boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name="auto",
    )

    uploaded = 0
    skipped = 0
    for i, (full_path, key) in enumerate(files, 1):
        ext = os.path.splitext(key)[1].lower()
        content_type = CONTENT_TYPES.get(ext) or mimetypes.guess_type(key)[0] or "application/octet-stream"
        size_mb = os.path.getsize(full_path) / 1024 / 1024

        if not force:
            try:
                head = client.head_object(Bucket=bucket, Key=key)
                remote_etag = head["ETag"].strip('"')
                if remote_etag == local_md5(full_path):
                    skipped += 1
                    continue
            except ClientError as e:
                if e.response["Error"]["Code"] not in ("404", "NoSuchKey"):
                    raise

        print(f"[{i}/{len(files)}] {key} ({size_mb:.1f} MB, {content_type})")
        client.upload_file(
            full_path,
            bucket,
            key,
            ExtraArgs={
                "ContentType": content_type,
                "CacheControl": "public, max-age=31536000, immutable",
            },
        )
        uploaded += 1

    print(f"Done. {uploaded} uploaded, {skipped} already up to date.")


if __name__ == "__main__":
    main()
