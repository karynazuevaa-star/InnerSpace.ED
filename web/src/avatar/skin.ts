import { assetUrl } from '../lib/assetUrl';

export type Skin = 'caucasian' | 'asian' | 'african';

const SKIN_FILE: Record<Skin, string> = {
  caucasian: 'body',
  asian: 'body-asian',
  african: 'body-african',
};

export function bodyUrl(skin: Skin): string {
  return assetUrl(`/models/${SKIN_FILE[skin]}.glb?v=14`);
}

// Outfits are fit to each race's own body shape (see
// pipeline/scripts/07_bake_outfit_morphs.py's own comment - a garment
// baked against the caucasian basemesh left bare skin showing at the
// neckline on the other two), so every outfit file needs the same suffix
// as its matching body.
export function skinSuffix(skin: Skin): string {
  return skin === 'caucasian' ? '' : `-${skin}`;
}
