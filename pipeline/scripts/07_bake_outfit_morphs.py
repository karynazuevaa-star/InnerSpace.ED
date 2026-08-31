"""
Blender headless script: bake CORRECTIVE shape keys onto each clothing item
so it deforms along with the body's weight/belly/breast sliders, instead of
staying a fixed size while the body underneath grows or shrinks.

Technique: for each body morph target relevant to a given garment, set that
target's influence to 1.0 on the fitting basemesh, ask MPFB2's own
`ClothesService.fit_clothes_to_human` to recompute the garment's vertex
positions against the now-deformed body (the same mechanism it uses for the
initial fit against different body shapes), capture the result, then reset
and move to the next target. Once all targets are captured, build one
Blender shape key per target (named identically to the body's target, so
the frontend can drive both with the same influence value) plus a Basis
matching the neutral body.

Everything here runs once, locally, at asset-build time - the exported glb
files are static, matching the rest of the pipeline (see pipeline/README.md
for why: this project never runs Blender at request time, unlike the
sibling Innerspace project's server-side generator).

Run with:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python \
    pipeline/scripts/07_bake_outfit_morphs.py
"""
import os
import bpy
import bmesh

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # pipeline/
OUT_DIR = os.path.join(ROOT, "out", "outfits")
os.makedirs(OUT_DIR, exist_ok=True)

_EXTENSIONS_ROOT = os.path.expanduser("~/Library/Application Support/Blender/4.2/extensions")
MPFB_TARGETS_DIR = os.environ.get(
    "MPFB_TARGETS_DIR",
    os.path.join(_EXTENSIONS_ROOT, "blender_org", "mpfb", "data", "targets"),
)

# Must match pipeline/scripts/02_generate_body.py exactly - the frontend
# drives body and outfit morph targets by the same names.
CURATED_TARGETS = [
    ("torso/measure-waist-circ-decr.target.gz", "weight_waist_decr"),
    ("torso/measure-waist-circ-incr.target.gz", "weight_waist_incr"),
    ("torso/measure-hips-circ-decr.target.gz", "weight_hips_decr"),
    ("torso/measure-hips-circ-incr.target.gz", "weight_hips_incr"),
    ("torso/torso-scale-horiz-decr.target.gz", "weight_torso_horiz_decr"),
    ("torso/torso-scale-horiz-incr.target.gz", "weight_torso_horiz_incr"),
    ("torso/torso-scale-depth-decr.target.gz", "weight_torso_depth_decr"),
    ("torso/torso-scale-depth-incr.target.gz", "weight_torso_depth_incr"),
    ("arms/measure-upperarm-circ-decr.target.gz", "weight_arm_decr"),
    ("arms/measure-upperarm-circ-incr.target.gz", "weight_arm_incr"),
    ("legs/measure-thigh-circ-decr.target.gz", "weight_thigh_decr"),
    ("legs/measure-thigh-circ-incr.target.gz", "weight_thigh_incr"),
    ("stomach/stomach-pregnant-decr.target.gz", "belly_decr"),
    ("stomach/stomach-pregnant-incr.target.gz", "belly_incr"),
    ("stomach/stomach-tone-decr.target.gz", "belly_soft_decr"),
    ("stomach/stomach-tone-incr.target.gz", "belly_soft_incr"),
    (
        "breast/female-young-averagemuscle-averageweight-mincup-averagefirmness.target.gz",
        "breast_smaller",
    ),
    (
        "breast/female-young-averagemuscle-averageweight-maxcup-averagefirmness.target.gz",
        "breast_bigger",
    ),
    ("buttocks/buttocks-volume-decr.target.gz", "butt_decr"),
    ("buttocks/buttocks-volume-incr.target.gz", "butt_incr"),
    ("cheek/l-cheek-volume-decr.target.gz", "face_l_decr"),
    ("cheek/l-cheek-volume-incr.target.gz", "face_l_incr"),
    ("cheek/r-cheek-volume-decr.target.gz", "face_r_decr"),
    ("cheek/r-cheek-volume-incr.target.gz", "face_r_incr"),
]

LOWER_TARGETS = [
    "weight_waist_decr", "weight_waist_incr",
    "weight_hips_decr", "weight_hips_incr",
    "weight_thigh_decr", "weight_thigh_incr",
    "belly_decr", "belly_incr", "belly_soft_decr", "belly_soft_incr",
    "butt_decr", "butt_incr",
]
UPPER_TARGETS = [
    "weight_torso_horiz_decr", "weight_torso_horiz_incr",
    "weight_torso_depth_decr", "weight_torso_depth_incr",
    "weight_arm_decr", "weight_arm_incr",
    "weight_waist_decr", "weight_waist_incr",
    "belly_decr", "belly_incr", "belly_soft_decr", "belly_soft_incr",
    "breast_bigger", "breast_smaller",
]

GARMENTS = [
    ("tightjeans", "outfits/punkduck_female_tight_jeans/punkduck_female_tight_jeans.mhclo", LOWER_TARGETS),
    ("croptop", "outfits/punkduck_sleeveless_crop_top/punkduck_sleeveless_crop_top.mhclo", UPPER_TARGETS),
    ("hoodie", "outfits/elvs_hooded_sweat_jacket1/elvs_hooded_sweat_jacket1.mhclo", UPPER_TARGETS),
]

# Per-garment fudge factors, applied identically to the Basis AND every
# corrective shape key (never just the neutral pose) - otherwise the fix
# only holds at belly/breast=0 and reopens as soon as a slider moves.
#
# scale: uniform inflate from the garment's own bounding-box center - the
# croptop racerback-strap-gap fix (06_assemble_outfits.py).
#
# hem_extend (fraction, offset): pulls only the BOTTOM `fraction` of the
# garment's own height down by `offset` meters (world Z, pre-Y-up-export so
# this is the vertical axis), falling off linearly to zero - so just the hem
# extends to keep overlapping the matching bottom's waistband as the belly
# grows, without dragging the neckline/chest down with it. (An earlier
# attempt offset the WHOLE garment uniformly - that closed the waist gap but
# opened a new one at the neckline, since the top of the garment moved away
# from the chest by the same amount.) Each top is fit to the deformed body
# independently from its matching bottom, so their hems don't necessarily
# stay in step even though both individually track the belly correctly.
GARMENT_FIX = {
    "croptop": {"scale": 1.035, "hem_extend": (0.16, -0.03)},
    "hoodie": {"hem_extend": (0.16, -0.03)},
}


# The corrective shape keys below are each baked at the target's full
# influence (1.0) and linearly interpolated toward Basis at runtime -
# MPFB2's fit_clothes_to_human isn't itself linear, so the interpolated
# garment can sit a hair closer to the body than the true fit at
# in-between influence values (worst around the inner thigh, where skin
# was poking through the jeans at high but not maxed-out weight/legs
# sliders). Pushing just these two corrective targets outward along their
# own vertex normals adds a fixed clearance margin that scales in with the
# influence value like everything else, instead of baking in visible
# bagginess at full influence.
EXTRA_CLEARANCE = {
    "tightjeans": {"weight_thigh_incr": 0.006, "weight_hips_incr": 0.006},
}


def push_along_normals(obj, coords, distance):
    obj.data.vertices.foreach_set("co", [c for co in coords for c in co])
    obj.data.update()
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.normal_update()
    pushed = [tuple(v.co + v.normal * distance) for v in bm.verts]
    bm.free()
    return pushed


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def create_basemesh_with_targets(HumanService, TargetService):
    macro_details = TargetService.get_default_macro_info_dict()
    macro_details["gender"] = 0.0
    macro_details["age"] = 0.5
    macro_details["muscle"] = 0.5
    macro_details["weight"] = 0.5
    macro_details["race"] = {"african": 0.0, "asian": 0.0, "caucasian": 1.0}
    basemesh = HumanService.create_human(macro_detail_dict=macro_details)
    HumanService.add_builtin_rig(basemesh, "default", import_weights=True)
    for rel_path, name in CURATED_TARGETS:
        path = os.path.join(MPFB_TARGETS_DIR, rel_path)
        if not os.path.exists(path):
            print(f"WARNING: target not found: {path}")
            continue
        TargetService.load_target(basemesh, path, weight=0.0, name=name)
    return basemesh


def scale_coords_from_center(coords, factor):
    n = len(coords)
    cx = sum(c[0] for c in coords) / n
    cy = sum(c[1] for c in coords) / n
    cz = sum(c[2] for c in coords) / n
    return [(cx + (x - cx) * factor, cy + (y - cy) * factor, cz + (z - cz) * factor) for x, y, z in coords]


def hem_extend_weights(coords, fraction):
    """Per-vertex weight in [0, 1]: 1.0 at the very bottom of `coords`'
    Z-range, falling off linearly to 0.0 at `fraction` of the way up."""
    zs = [c[2] for c in coords]
    zmin, zmax = min(zs), max(zs)
    band = (zmax - zmin) * fraction
    if band <= 0:
        return [0.0] * len(coords)
    weights = []
    for _, _, z in coords:
        t = (z - zmin) / band
        weights.append(max(0.0, min(1.0, 1.0 - t)))
    return weights


def apply_hem_extend(coords, weights, offset):
    return [(x, y, z + offset * w) for (x, y, z), w in zip(coords, weights)]


def bake_garment(HumanService, TargetService, ClothesService, Mhclo, out_name, mhclo_rel, target_names):
    clear_scene()
    basemesh = create_basemesh_with_targets(HumanService, TargetService)
    mhclo_path = os.path.join(ROOT, "assets_src", mhclo_rel)
    clothes = HumanService.add_mhclo_asset(
        mhclo_path, basemesh,
        asset_type="Clothes", material_type="MAKESKIN",
        set_up_rigging=True, interpolate_weights=True, import_subrig=False, import_weights=True,
    )
    print(f"[{out_name}] fitted, verts={len(clothes.data.vertices)}")

    # fit_clothes_to_human(mhclo=None) tries to relocate the mhclo file by
    # asset-registry lookup (asset_source metadata + AssetService search
    # paths), which only knows about MPFB's own bundled/user asset dirs -
    # our custom assets_src/ location isn't in it and the lookup throws.
    # Loading the same mhclo file directly and passing it through sidesteps
    # that lookup entirely.
    mhclo = Mhclo()
    mhclo.load(mhclo_path)
    mhclo.clothes = clothes

    basis_coords = [tuple(v.co) for v in clothes.data.vertices]

    key_blocks = basemesh.data.shape_keys.key_blocks
    deformed = {}
    for target_name in target_names:
        if target_name not in key_blocks:
            print(f"[{out_name}] WARNING: basemesh missing target {target_name}, skipping")
            continue
        key_blocks[target_name].value = 1.0
        ClothesService.fit_clothes_to_human(clothes, basemesh, mhclo=mhclo, set_parent=False)
        deformed[target_name] = [tuple(v.co) for v in clothes.data.vertices]
        key_blocks[target_name].value = 0.0
        print(f"[{out_name}] baked corrective for {target_name}")

    extra_clearance = EXTRA_CLEARANCE.get(out_name, {})
    for target_name, distance in extra_clearance.items():
        if target_name not in deformed:
            continue
        deformed[target_name] = push_along_normals(clothes, deformed[target_name], distance)
        print(f"[{out_name}] pushed {target_name} out by {distance}")
    # push_along_normals mutates clothes.data.vertices as a side effect -
    # restore the true basis before the fix/export steps below read it.
    clothes.data.vertices.foreach_set("co", [c for co in basis_coords for c in co])
    clothes.data.update()

    fix = GARMENT_FIX.get(out_name, {})
    scale = fix.get("scale")
    hem_extend = fix.get("hem_extend")
    if scale:
        basis_coords = scale_coords_from_center(basis_coords, scale)
        deformed = {k: scale_coords_from_center(v, scale) for k, v in deformed.items()}
    if hem_extend:
        fraction, offset = hem_extend
        weights = hem_extend_weights(basis_coords, fraction)
        basis_coords = apply_hem_extend(basis_coords, weights, offset)
        deformed = {k: apply_hem_extend(v, weights, offset) for k, v in deformed.items()}

    # restore clothes mesh to the neutral basis before adding shape keys
    for i, co in enumerate(basis_coords):
        clothes.data.vertices[i].co = co
    clothes.data.update()

    clothes.shape_key_add(name="Basis")
    for target_name, coords in deformed.items():
        sk = clothes.shape_key_add(name=target_name)
        for i, co in enumerate(coords):
            sk.data[i].co = co
    print(f"[{out_name}] shape keys: {[k.name for k in clothes.data.shape_keys.key_blocks]}")

    bpy.ops.object.select_all(action="DESELECT")
    clothes.select_set(True)
    armature = clothes.find_armature()
    if armature:
        armature.select_set(True)
        bpy.context.view_layer.objects.active = armature
    else:
        bpy.context.view_layer.objects.active = clothes
    out_path = os.path.join(OUT_DIR, f"{out_name}.glb")
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        use_selection=True,
        export_format="GLB",
        export_yup=True,
        export_apply=False,
        export_morph=True,
    )
    print(f"[{out_name}] exported {out_path}")


def main():
    from bl_ext.blender_org.mpfb.services import HumanService, TargetService, ClothesService
    from bl_ext.blender_org.mpfb.entities.clothes.mhclo import Mhclo

    for out_name, mhclo_rel, target_names in GARMENTS:
        bake_garment(HumanService, TargetService, ClothesService, Mhclo, out_name, mhclo_rel, target_names)

    print("DONE")


main()
