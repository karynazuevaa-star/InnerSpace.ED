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
    python3 scripts/upload-to-r2.py            # uploads models/, models-legacy/, audio/
    python3 scripts/upload-to-r2.py --dry-run  # lists what would upload, no network writes

Credentials are read from the environment only - never pass them as
command-line arguments (they'd end up in shell history) and never paste
them into chat with an assistant.
"""
import mimetypes
import os
import sys

DIRS_TO_UPLOAD = ["models", "models-legacy", "audio"]

CONTENT_TYPES = {
    ".glb": "model/gltf-binary",
    ".mp3": "audio/mpeg",
}


def main() -> None:
    dry_run = "--dry-run" in sys.argv

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

    client = boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name="auto",
    )

    for i, (full_path, key) in enumerate(files, 1):
        ext = os.path.splitext(key)[1].lower()
        content_type = CONTENT_TYPES.get(ext) or mimetypes.guess_type(key)[0] or "application/octet-stream"
        size_mb = os.path.getsize(full_path) / 1024 / 1024
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

    print("Done.")


if __name__ == "__main__":
    main()
