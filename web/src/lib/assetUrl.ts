// Every heavy binary asset (.glb models, room audio) is requested through
// this helper instead of a bare "/models/..." string, so the whole set can
// be pointed at an external host (Cloudflare R2) in one place. The R2
// bucket is a mirror of public/models, public/models-legacy and
// public/audio (see scripts/upload-to-r2.py for the one-time upload) - only
// production builds use it. Local dev always reads the local /public
// folder, both because that needs no network round-trip and because it
// keeps working with a file that was only just added locally and not
// uploaded yet.
// Cloudflare R2 bucket "innerspace-assets" (Public Development URL). Do not
// deploy this until scripts/upload-to-r2.py has actually run against this
// bucket - until then every model/audio request in production would 404.
const R2_BASE_URL = 'https://pub-7e542a679d1c4864969768edbc3d93c5.r2.dev';
export const ASSET_BASE_URL = import.meta.env.PROD ? R2_BASE_URL : '';

export function assetUrl(path: string): string {
  return `${ASSET_BASE_URL}${path}`;
}
