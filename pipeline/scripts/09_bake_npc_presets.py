"""
Blender headless script: bake several complete, ready-to-wear background
people for the exposure-practice rooms (see web/src/components/rooms/) -
body + hair + eyes/eyebrows/eyelashes + outfit, all sharing ONE armature,
exported as a single glb per preset, plus a quick front-view PNG preview of
each so they can be reviewed without opening a browser. Unlike the
dressing-room tool's body.glb/hair/*.glb/outfits/*.glb (deliberately
separate files, reassembled and reparented at runtime so the tool can swap
hair/outfit live), these NPCs never change outfit after the page loads -
baking everything into one file at build time sidesteps the runtime
"reparent hair onto this NPC's own head bone" step entirely, which is
where the multi-instance hair bug in NpcAvatar.tsx traced back to.

Female presets' body shape reuses the exact slider formula from
bodyMorphs.ts (applyBodyMorphs) so they read as the same "person" the
dressing-room body represents, just at different points on the sliders.
Male presets use the same target set minus breast (not meaningful on a
male macro-detail body) - MakeHuman's weight/muscle/torso/thigh/etc
targets are shared across both, only breast and the base skin/clothes/
hair differ per gender.

Skin/clothing/hair assets for male presets came from the sibling
"InnerSpace" project's much larger MakeHuman asset library (see
Projects/Новая папка/public/avatar-assets/raw) - this project's own
assets_src only ever had female-fitted pieces. Licenses: skins and the
short01 hairstyle are CC0 (makehuman_system_assets_cc0 /
skins02_cc0); the male jeans, trousers and t-shirt are CC-BY (pants02_ccby
/ shirts03_ccby) and need attribution alongside the landing page's
existing CC-BY credits if these ship - the polo shirt (shirts01_cc0) is
CC0.

Blender's glTF exporter embeds every source texture at its original size
untouched (mostly 2048x2048 PNGs) - fine for one avatar filling the
screen, but a raw export here comes out ~20MB per preset, and several of
those loaded into one scene at once was enough to trigger WebGL context
loss while testing this in a resource-constrained browser. Since these
are small background figures that are never seen up close, every texture
gets downsized to 512x512 and re-encoded as WebP right after export (via
@gltf-transform/cli, run as a subprocess - `npx` must be on PATH), which
took these files down to ~2MB each with no visible quality loss at the
sizes they're actually rendered at. Only textures are touched - geometry,
skinning and morph targets are left exactly as exported, so this step is
safe to skip (pass --no-optimize) if you need to inspect an unmodified
export.

Run with:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python \
    pipeline/scripts/09_bake_npc_presets.py [-- --no-optimize] [--no-preview]
"""
import os
import subprocess
import sys
import bpy
import bmesh
import mathutils

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # pipeline/
OUT_DIR = os.path.join(ROOT, "out", "npc")
PREVIEW_DIR = os.path.join(ROOT, "out", "npc_preview")
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(PREVIEW_DIR, exist_ok=True)

_EXTENSIONS_ROOT = os.path.expanduser("~/Library/Application Support/Blender/4.2/extensions")
MPFB_TARGETS_DIR = os.environ.get(
    "MPFB_TARGETS_DIR",
    os.path.join(_EXTENSIONS_ROOT, "blender_org", "mpfb", "data", "targets"),
)
ASSETS = os.path.join(ROOT, "assets_src")

SKIN_MHMAT = {
    "female_caucasian": os.path.join(ASSETS, "skin", "darthfurby_caucasian_female", "darthfurby_caucasian_female_noeyes.mhmat"),
    "male_light": os.path.join(ASSETS, "skin", "toigo_light_skin_male_bronze", "toigo_light_skin_male_bronze.mhmat"),
    "male_dark": os.path.join(ASSETS, "skin", "mindfront_skin_male_african_middleage", "mindfront_skin_male_african_middleage.mhmat"),
}
HAIR_MHCLO = {
    "long01": os.path.join(ASSETS, "hair", "long01", "long01.mhclo"),
    "short01": os.path.join(ASSETS, "hair", "short01", "short01.mhclo"),
    "afro01": os.path.join(ASSETS, "hair", "afro01", "afro01.mhclo"),
    "bob01": os.path.join(ASSETS, "hair", "bob01", "bob01.mhclo"),
    "wavy_bob": os.path.join(ASSETS, "hair", "elvs_wavy_bob", "elvs_wavy_bob.mhclo"),
}
# Only long01 is cut down via cut_hair_length (its own long/medium/short
# variants) - the others are already the shape they're meant to be; a flat
# Z-plane bisect through an afro or bob wasn't designed for and would just
# cut it oddly, so every other style always uses "long" (keep_fraction 1.0,
# a no-op).
EYES_MHCLO = os.path.join(ASSETS, "eyes", "high-poly", "high-poly.mhclo")
EYEBROWS_MHCLO = os.path.join(ASSETS, "eyebrows", "eyebrow002", "eyebrow002.mhclo")
EYELASHES_MHCLO = os.path.join(ASSETS, "eyelashes", "eyelashes01", "eyelashes01.mhclo")
OUTFITS_DIR = os.path.join(ASSETS, "outfits")
OUTFIT_MHCLO = {
    "hoodie": os.path.join(OUTFITS_DIR, "elvs_hooded_sweat_jacket1", "elvs_hooded_sweat_jacket1.mhclo"),
    "croptop": os.path.join(OUTFITS_DIR, "punkduck_sleeveless_crop_top", "punkduck_sleeveless_crop_top.mhclo"),
    "tightjeans": os.path.join(OUTFITS_DIR, "punkduck_female_tight_jeans", "punkduck_female_tight_jeans.mhclo"),
    "bodysuit": os.path.join(OUTFITS_DIR, "punkduck_female_strapless_bodysuit", "punkduck_female_strapless_bodysuit.mhclo"),
    "skinsuit": os.path.join(OUTFITS_DIR, "matcreator_mc-skinsuit_2022", "matcreator_mc-skinsuit_2022.mhclo"),
    "shorts": os.path.join(OUTFITS_DIR, "cortu_jeans_shorts", "cortu_jeans_shorts.mhclo"),
    "male_tshirt": os.path.join(OUTFITS_DIR, "elvs_male_logo_tshirt1", "elvs_male_logo_tshirt1.mhclo"),
    "male_polo": os.path.join(OUTFITS_DIR, "namuhekam_male_polo_shirt", "namuhekam_male_polo_shirt.mhclo"),
    "male_jeans": os.path.join(OUTFITS_DIR, "punkduck_male_classic_jeans", "punkduck_male_classic_jeans.mhclo"),
    "male_trousers": os.path.join(OUTFITS_DIR, "mindfront_male_trousers_1", "mindfront_male_trousers_1.mhclo"),
}

# (rel path under MPFB_TARGETS_DIR, raw target name) - same source list as
# 02_generate_body.py's CURATED_TARGETS, minus the two blink units (handled
# separately below since those stay live, not baked to a fixed value).
BODY_TARGET_FILES = {
    "weight_waist_decr": "torso/measure-waist-circ-decr.target.gz",
    "weight_waist_incr": "torso/measure-waist-circ-incr.target.gz",
    "weight_hips_decr": "torso/measure-hips-circ-decr.target.gz",
    "weight_hips_incr": "torso/measure-hips-circ-incr.target.gz",
    "weight_torso_horiz_decr": "torso/torso-scale-horiz-decr.target.gz",
    "weight_torso_horiz_incr": "torso/torso-scale-horiz-incr.target.gz",
    "weight_torso_depth_decr": "torso/torso-scale-depth-decr.target.gz",
    "weight_torso_depth_incr": "torso/torso-scale-depth-incr.target.gz",
    "weight_arm_decr": "arms/measure-upperarm-circ-decr.target.gz",
    "weight_arm_incr": "arms/measure-upperarm-circ-incr.target.gz",
    "weight_thigh_decr": "legs/measure-thigh-circ-decr.target.gz",
    "weight_thigh_incr": "legs/measure-thigh-circ-incr.target.gz",
    "belly_decr": "stomach/stomach-pregnant-decr.target.gz",
    "belly_incr": "stomach/stomach-pregnant-incr.target.gz",
    "belly_soft_decr": "stomach/stomach-tone-decr.target.gz",
    "belly_soft_incr": "stomach/stomach-tone-incr.target.gz",
    "breast_smaller": "breast/female-young-averagemuscle-averageweight-mincup-averagefirmness.target.gz",
    "breast_bigger": "breast/female-young-averagemuscle-averageweight-maxcup-averagefirmness.target.gz",
    "butt_decr": "buttocks/buttocks-volume-decr.target.gz",
    "butt_incr": "buttocks/buttocks-volume-incr.target.gz",
    "face_l_decr": "cheek/l-cheek-volume-decr.target.gz",
    "face_l_incr": "cheek/l-cheek-volume-incr.target.gz",
    "face_r_decr": "cheek/r-cheek-volume-decr.target.gz",
    "face_r_incr": "cheek/r-cheek-volume-incr.target.gz",
}
BLINK_TARGET_FILES = {
    "eye_left_closure": "expression/units/caucasian/eye-left-closure.target.gz",
    "eye_right_closure": "expression/units/caucasian/eye-right-closure.target.gz",
}


def clamp(v, lo=-1.0, hi=1.0):
    return max(lo, min(hi, v))


def sliders_to_targets(weight=0.0, belly=0.0, waist=0.0, breast=0.0, arms=0.0, legs=0.0, butt=0.0, face=0.0):
    """Mirrors web/src/avatar/bodyMorphs.ts's applyBodyMorphs combination
    formula exactly, so a baked NPC at (weight=0.6, ...) reads as the same
    body the live slider would produce at those values."""
    pairs = {
        "weight_waist": weight + waist + belly * 0.45,
        "weight_hips": min(weight, 0.85),
        "weight_torso_horiz": weight + belly * 0.35,
        "weight_torso_depth": weight + belly * 0.25,
        "weight_arm": weight * 0.7 + arms,
        "weight_thigh": min(weight * 0.8 + legs, 0.85),
        "belly": belly,
        "belly_soft": belly * 0.6,
        "butt": butt,
        "face_l": face,
        "face_r": face,
    }
    out = {}
    for base, signed in pairs.items():
        v = clamp(signed)
        out[f"{base}_incr"] = max(0.0, v)
        out[f"{base}_decr"] = max(0.0, -v)
    out["breast_bigger"] = max(0.0, breast)
    out["breast_smaller"] = max(0.0, -breast)
    return out


FEMALE_MORPHS = dict(weight=0, belly=0, waist=0, arms=0, legs=0, butt=0, breast=0, face=0)
MALE_MORPHS = dict(weight=0, belly=0, waist=0, arms=0, legs=0, butt=0, breast=-1, face=0)  # breast=-1: smallest, closest to a flat male chest


def female(**over):
    d = dict(FEMALE_MORPHS)
    d.update(over)
    return d


def male(**over):
    d = dict(MALE_MORPHS)
    d.update(over)
    return d


PRESETS = [
    {
        "name": "npc_thinner",
        "gender": 0.0,
        "age": 0.35,
        "skin": "female_caucasian",
        "morphs": female(weight=-0.6, belly=-0.3, waist=-0.4, arms=-0.3, legs=-0.3, butt=-0.2, breast=-0.1, face=-0.2),
        "muscle": 0.4,
        "hair": "long01", "hair_length": "long",
        "hair_color": (0.10, 0.06, 0.04),
        "top": "hoodie", "bottom": "tightjeans",
    },
    {
        "name": "npc_heavier",
        "gender": 0.0,
        "age": 0.65,
        "skin": "female_caucasian",
        "morphs": female(weight=0.7, belly=0.5, waist=0.5, arms=0.4, legs=0.5, butt=0.4, breast=0.3, face=0.3),
        "muscle": 0.4,
        "hair": "bob01", "hair_length": "long",
        "hair_color": (0.05, 0.04, 0.03),
        "top": "croptop", "bottom": "shorts",
    },
    {
        "name": "npc_average",
        "gender": 0.0,
        "age": 0.5,
        "skin": "female_caucasian",
        "morphs": female(),
        "muscle": 0.5,
        "hair": "wavy_bob", "hair_length": "long",
        "hair_color": (0.35, 0.22, 0.10),
        "top": "skinsuit", "bottom": None,
    },
    {
        "name": "npc_curvier",
        "gender": 0.0,
        "age": 0.4,
        "skin": "female_caucasian",
        "morphs": female(weight=0.2, belly=0.1, waist=0.1, arms=0.0, legs=0.3, butt=0.7, breast=0.5, face=0.1),
        "muscle": 0.45,
        "hair": "long01", "hair_length": "long",
        "hair_color": (0.20, 0.09, 0.28),
        "top": "bodysuit", "bottom": "shorts",
    },
    {
        "name": "npc_lean",
        "gender": 0.0,
        "age": 0.6,
        "skin": "female_caucasian",
        "morphs": female(weight=-0.2, belly=-0.2, waist=-0.1, arms=0.1, legs=0.1, butt=0.1, breast=-0.1, face=-0.1),
        "muscle": 0.6,
        "hair": "afro01", "hair_length": "long",
        "hair_color": (0.05, 0.04, 0.035),
        "top": "hoodie", "bottom": "shorts",
    },
    {
        "name": "npc_male_lean",
        "gender": 1.0,
        "age": 0.35,
        "skin": "male_light",
        "morphs": male(weight=-0.3, waist=-0.3, arms=0.1, legs=0.0),
        "muscle": 0.55,
        "hair": "short01", "hair_length": "long",
        "hair_color": (0.08, 0.06, 0.05),
        "top": "male_tshirt", "bottom": "male_jeans",
    },
    {
        "name": "npc_male_average",
        "gender": 1.0,
        "age": 0.6,
        "skin": "male_dark",
        "morphs": male(),
        "muscle": 0.5,
        "hair": "short01", "hair_length": "long",
        "hair_color": (0.03, 0.02, 0.02),
        "top": "male_polo", "bottom": "male_trousers",
    },
    {
        "name": "npc_male_heavier",
        "gender": 1.0,
        "age": 0.65,
        "skin": "male_light",
        "morphs": male(weight=0.7, belly=0.5, waist=0.4, arms=0.3, legs=0.3),
        "muscle": 0.4,
        "hair": "short01", "hair_length": "long",
        "hair_color": (0.30, 0.20, 0.10),
        "top": "male_tshirt", "bottom": "male_trousers",
    },
    {
        "name": "npc_male_muscular",
        "gender": 1.0,
        "age": 0.4,
        "skin": "male_dark",
        "morphs": male(weight=0.2, arms=0.6, legs=0.4, waist=-0.1),
        "muscle": 0.85,
        "hair": "short01", "hair_length": "long",
        "hair_color": (0.04, 0.03, 0.03),
        "top": "male_polo", "bottom": "male_jeans",
    },
]


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def bake_current_shape_to_basis(basemesh):
    """Same helper as 02_generate_body.py - collapses whatever shape keys
    are currently active into the mesh's real vertex positions and strips
    the shape-key stack back to a bare Basis."""
    if not basemesh.data.shape_keys:
        return
    bpy.context.view_layer.objects.active = basemesh
    mix_key = basemesh.shape_key_add(name="_baked_mix", from_mix=True)
    n = len(basemesh.data.vertices)
    coords = [0.0] * (n * 3)
    mix_key.data.foreach_get("co", coords)
    basis = basemesh.data.shape_keys.key_blocks["Basis"]
    basis.data.foreach_set("co", coords)
    basemesh.data.vertices.foreach_set("co", coords)
    while basemesh.data.shape_keys and len(basemesh.data.shape_keys.key_blocks) > 1:
        for kb in list(basemesh.data.shape_keys.key_blocks):
            if kb.name != "Basis":
                basemesh.shape_key_remove(kb)
                break
    basemesh.data.update()


def apply_skin(HumanService, basemesh, skin_key):
    HumanService.set_character_skin(SKIN_MHMAT[skin_key], basemesh, skin_type="MAKESKIN")
    simplify_materials_for_export(basemesh)
    force_opaque_materials(basemesh)


def simplify_materials_for_export(obj):
    for mat in obj.data.materials:
        if not mat or not mat.use_nodes:
            continue
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        tex_node = nodes.get("diffuseTexture")
        bsdf = next((n for n in nodes if n.type == "BSDF_PRINCIPLED"), None)
        if not tex_node or not bsdf:
            continue
        links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])


def force_opaque_materials(obj):
    for mat in obj.data.materials:
        if not mat or not mat.use_nodes:
            continue
        bsdf = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if not bsdf:
            continue
        alpha_input = bsdf.inputs.get("Alpha")
        if alpha_input and alpha_input.links:
            mat.node_tree.links.remove(alpha_input.links[0])
            alpha_input.default_value = 1.0
        mat.blend_method = "OPAQUE"


def set_alpha_mask(obj, threshold=0.5):
    """For alpha-CUTOUT assets (hair cards, eyebrow/eyelash strand sheets) -
    unlike force_opaque_materials above, which is right for skin/eyes/
    clothes. The MAKESKIN material ships as alpha BLEND (mhmat's own
    "transparent True"), which real-blends the whole quad instead of
    discarding the transparent parts - reads as a washed-out grey card
    with sorting artifacts. Forcing OPAQUE instead (what this bake script
    did originally) is worse: it was still filling in the "transparent"
    region with that texture's baked-black padding, which for eyebrows/
    eyelashes sitting right at eye level rendered as solid black blocks
    over the eyes - not simply thicker brows, actual eyeless-looking
    faces. MASK (Blender's CLIP) with a real threshold discards anything
    below it outright: cheap, no sort-order issues, and it actually shows
    the strand pattern instead of a block or a wash.
    """
    for mat in obj.data.materials:
        if not mat or not mat.use_nodes:
            continue
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        tex_node = nodes.get("diffuseTexture")
        bsdf = next((n for n in nodes if n.type == "BSDF_PRINCIPLED"), None)
        if not tex_node or not bsdf:
            continue
        links.new(tex_node.outputs["Alpha"], bsdf.inputs["Alpha"])
        mat.blend_method = "CLIP"
        mat.alpha_threshold = threshold


def tint_material(obj, rgb):
    """Multiply every material's diffuse texture by `rgb` (0..1 floats) -
    same idea as the dressing-room tool's hair recolor, done once at bake
    time instead of via a runtime shader patch."""
    for mat in obj.data.materials:
        if not mat or not mat.use_nodes:
            continue
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        tex_node = nodes.get("diffuseTexture")
        bsdf = next((n for n in nodes if n.type == "BSDF_PRINCIPLED"), None)
        if not tex_node or not bsdf:
            continue
        mix = nodes.new("ShaderNodeMixRGB")
        mix.blend_type = "MULTIPLY"
        mix.inputs["Fac"].default_value = 1.0
        mix.inputs["Color2"].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
        links.new(tex_node.outputs["Color"], mix.inputs["Color1"])
        links.new(mix.outputs["Color"], bsdf.inputs["Base Color"])


def remove_helper_geometry(basemesh):
    body_group = basemesh.vertex_groups.get("body")
    if not body_group:
        print("WARNING: no 'body' vertex group found, skipping helper cleanup")
        return
    body_idx = set()
    for v in basemesh.data.vertices:
        for g in v.groups:
            if g.group == body_group.index:
                body_idx.add(v.index)
                break

    bpy.ops.object.select_all(action="DESELECT")
    basemesh.select_set(True)
    bpy.context.view_layer.objects.active = basemesh

    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.object.mode_set(mode="OBJECT")
    for v in basemesh.data.vertices:
        v.select = v.index not in body_idx
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_mode(type="FACE")
    bpy.ops.mesh.delete(type="FACE")
    bpy.ops.object.mode_set(mode="OBJECT")


def fit_rigid_bodypart(HumanService, basemesh, mhclo_path, asset_type, tint=None, alpha_mask=None, force_opaque=False):
    """Fit a rigid (non-cloth) MHCLO asset - hair/eyes/eyebrows/eyelashes -
    to `basemesh` and bind it to the SAME armature already on `basemesh`
    via weight interpolation, instead of the dressing-room tool's approach
    of exporting it standalone and reparenting it onto a head bone at
    runtime in the browser. Weights interpolated from the basemesh's own
    scalp/face vertices land almost entirely on the "head" bone already
    (that's what those vertices are weighted to), so this reads as a rigid
    head-follow with no extra bone-group bookkeeping needed.

    `alpha_mask` (a 0..1 threshold) is for strand-card assets (hair,
    eyebrows, eyelashes) that need their transparent regions actually
    discarded rather than filled solid - see set_alpha_mask(). Leave both
    `alpha_mask` and `force_opaque` at their defaults (None/False) for an
    asset - eyes - that should be left exactly as MAKESKIN set it up.

    force_opaque_materials() (unlinking the texture's Alpha output from
    the BSDF's Alpha input, then forcing a fixed 1.0) turned out to be
    actively wrong for the eyes: even though its own blend_method write is
    a no-op in this Blender/EEVEE-Next build (confirmed - the material
    stayed "HASHED" before and after), just disconnecting that Alpha link
    was enough on its own to turn the iris solid black, isolated by
    re-running the exact same fit with each piece of that function applied
    separately. Something in this material's graph reads the SAME
    diffuseTexture node's Alpha output for more than transparency, so
    forcing it to a flat 1.0 breaks whatever that is. Eyes don't have any
    actually-transparent region to mask out in the first place, so the
    fix is just to never touch this material's alpha wiring at all.
    """
    obj = HumanService.add_mhclo_asset(
        mhclo_path, basemesh,
        asset_type=asset_type,
        material_type="MAKESKIN",
        set_up_rigging=True,
        interpolate_weights=True,
        import_subrig=False,
        import_weights=False,
    )
    simplify_materials_for_export(obj)
    if alpha_mask is not None:
        set_alpha_mask(obj, alpha_mask)
    elif force_opaque:
        force_opaque_materials(obj)
    if tint:
        tint_material(obj, tint)
    return obj


def fit_outfit(HumanService, basemesh, mhclo_path):
    obj = HumanService.add_mhclo_asset(
        mhclo_path, basemesh,
        asset_type="Clothes",
        material_type="MAKESKIN",
        set_up_rigging=True,
        interpolate_weights=True,
        import_subrig=False,
        import_weights=True,
    )
    simplify_materials_for_export(obj)
    force_opaque_materials(obj)
    return obj


def cut_hair_length(hair_obj, keep_fraction):
    """Same crop as 03_assemble_hair.py's make_variant, applied in-place -
    no recalc_face_normals (see that script's own comment: this hairstyle
    is disconnected strand cards, and that op flips ~40% of them right at
    the cut on the shortest crop)."""
    if keep_fraction >= 0.999:
        return
    zs = [v.co.z for v in hair_obj.data.vertices]
    z_min, z_max = min(zs), max(zs)
    cut_z = z_max - (z_max - z_min) * keep_fraction
    bm = bmesh.new()
    bm.from_mesh(hair_obj.data)
    bmesh.ops.bisect_plane(
        bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
        plane_co=(0.0, 0.0, cut_z), plane_no=(0.0, 0.0, 1.0),
        clear_inner=True, clear_outer=False,
    )
    bm.to_mesh(hair_obj.data)
    bm.free()
    for p in hair_obj.data.polygons:
        p.use_smooth = True
    hair_obj.data.update()


HAIR_LENGTH_FRACTION = {"long": 1.0, "medium": 0.55, "short": 0.28}


def build_preset(HumanService, TargetService, preset):
    clear_scene()
    macro_details = TargetService.get_default_macro_info_dict()
    macro_details["gender"] = preset["gender"]
    macro_details["age"] = 0.5
    macro_details["muscle"] = preset["muscle"]
    macro_details["weight"] = 0.5
    macro_details["race"] = {"african": 0.0, "asian": 0.0, "caucasian": 1.0}
    basemesh = HumanService.create_human(macro_detail_dict=macro_details)
    print(f"[{preset['name']}] basemesh verts:", len(basemesh.data.vertices))

    armature_obj = HumanService.add_builtin_rig(basemesh, "default", import_weights=True)

    apply_skin(HumanService, basemesh, preset["skin"])

    target_weights = sliders_to_targets(**preset["morphs"])
    for shape_name, weight in target_weights.items():
        rel_path = BODY_TARGET_FILES[shape_name]
        path = os.path.join(MPFB_TARGETS_DIR, rel_path)
        if not os.path.exists(path):
            print(f"WARNING: target not found: {path}")
            continue
        TargetService.load_target(basemesh, path, weight=weight, name=shape_name)
    bake_current_shape_to_basis(basemesh)

    # Blink stays a LIVE morph target (idleAnimation.tsx drives it at
    # runtime) - loaded fresh, at weight 0, after the body shape is baked
    # flat so it isn't itself baked away.
    for shape_name, rel_path in BLINK_TARGET_FILES.items():
        path = os.path.join(MPFB_TARGETS_DIR, rel_path)
        TargetService.load_target(basemesh, path, weight=0.0, name=shape_name)

    # Helper-geometry removal must come AFTER every MHCLO fit below, not
    # before: fit_clothes_to_human/interpolate_weights match vertices by
    # INDEX against the basemesh's ORIGINAL (full) topology - stripping
    # helper geometry first leaves those indices pointing past the end of
    # the now-smaller vertex array (confirmed: IndexError, 18731 out of a
    # post-strip 13380). It's still safe to strip after fitting - each
    # fitted object (hair/eyes/outfit) is its own independent mesh with its
    # weights already baked into vertex groups keyed by BONE name, not by
    # basemesh vertex index, so nothing downstream cares that basemesh
    # itself later loses vertices.
    hair_obj = fit_rigid_bodypart(HumanService, basemesh, HAIR_MHCLO[preset["hair"]], "Hair", tint=preset["hair_color"], alpha_mask=0.5)
    if preset["hair"] == "long01":
        cut_hair_length(hair_obj, HAIR_LENGTH_FRACTION[preset["hair_length"]])

    fit_rigid_bodypart(HumanService, basemesh, EYES_MHCLO, "Eyes")
    fit_rigid_bodypart(HumanService, basemesh, EYEBROWS_MHCLO, "Eyebrows", alpha_mask=0.3)
    fit_rigid_bodypart(HumanService, basemesh, EYELASHES_MHCLO, "Eyelashes", alpha_mask=0.3)

    fit_outfit(HumanService, basemesh, OUTFIT_MHCLO[preset["top"]])
    if preset["bottom"]:
        fit_outfit(HumanService, basemesh, OUTFIT_MHCLO[preset["bottom"]])

    remove_helper_geometry(basemesh)

    render_preview(preset["name"], armature_obj)
    export_glb(preset["name"])


def render_preview(name, armature_obj):
    """Two quick EEVEE renders of everything currently in the scene, saved
    as PNGs next to the glb - lets a person pick which presets to use
    without needing a browser (this session's testing kept hitting flaky
    WebGL context loss in the sandboxed browser used for that): a full-body
    shot for silhouette/outfit, and a face close-up, since eyes/brows only
    take up a handful of pixels in the full-body frame at any resolution
    that's still a reasonable file size - small enough that iris/sclera/
    lash detail isn't resolvable and reads as a flat dark smudge, which
    looked exactly like "no eyes, just black circles" but wasn't actually
    that (a dedicated close-up of the same eye showed it rendering
    correctly - iris, sclera, lash line all present)."""
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.film_transparent = False
    scene.world = bpy.data.worlds.new(f"preview_world_{name}")
    scene.world.color = (0.4, 0.39, 0.38)

    key = bpy.data.lights.new(name="preview_key", type="SUN")
    key.energy = 3.0
    key_obj = bpy.data.objects.new("preview_key", key)
    key_obj.location = (2, -3, 4)
    key_obj.rotation_euler = (0.9, 0, 0.5)
    bpy.context.collection.objects.link(key_obj)

    fill = bpy.data.lights.new(name="preview_fill", type="SUN")
    fill.energy = 1.2
    fill_obj = bpy.data.objects.new("preview_fill", fill)
    fill_obj.rotation_euler = (1.0, 0, -2.2)
    bpy.context.collection.objects.link(fill_obj)

    # Straight-on, aimed level (not steeply down like key/fill above) - eye
    # sockets and other concave face detail render as solid black shadow in
    # EEVEE's simple lighting without this, regardless of the eyeball mesh.
    cam_light = bpy.data.lights.new(name="preview_cam_light", type="SUN")
    cam_light.energy = 1.5
    cam_light_obj = bpy.data.objects.new("preview_cam_light", cam_light)
    cam_light_obj.rotation_euler = (1.5708, 0, 0)
    bpy.context.collection.objects.link(cam_light_obj)

    full_cam_data = bpy.data.cameras.new(name="preview_cam_full")
    full_cam = bpy.data.objects.new("preview_cam_full", full_cam_data)
    bpy.context.collection.objects.link(full_cam)
    full_cam.location = (0, -2.6, 1.05)
    full_cam.rotation_euler = (mathutils.Euler((1.5708, 0, 0)))
    full_cam_data.lens = 50

    head_z = 1.55
    pose_bone = armature_obj.pose.bones.get("head") if armature_obj else None
    if pose_bone:
        head_z = (armature_obj.matrix_world @ pose_bone.head).z
    face_cam_data = bpy.data.cameras.new(name="preview_cam_face")
    face_cam = bpy.data.objects.new("preview_cam_face", face_cam_data)
    bpy.context.collection.objects.link(face_cam)
    face_cam.location = (0, -0.55, head_z + 0.02)
    face_cam.rotation_euler = (mathutils.Euler((1.5708, 0, 0)))
    face_cam_data.lens = 85

    scene.render.resolution_x = 512
    scene.render.resolution_y = 768
    scene.camera = full_cam
    out_path = os.path.join(PREVIEW_DIR, f"{name}.png")
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print(f"Rendered preview {out_path}")

    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.camera = face_cam
    face_out_path = os.path.join(PREVIEW_DIR, f"{name}_face.png")
    scene.render.filepath = face_out_path
    bpy.ops.render.render(write_still=True)
    print(f"Rendered preview {face_out_path}")


def export_glb(name):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.data.objects:
        if obj.type in {"MESH", "ARMATURE"}:
            obj.select_set(True)
    out_path = os.path.join(OUT_DIR, f"{name}.glb")
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        use_selection=True,
        export_format="GLB",
        export_yup=True,
        export_apply=False,
        export_morph=True,
    )
    print(f"Exported {out_path}")
    if "--no-optimize" not in sys.argv:
        optimize_textures(out_path)


def optimize_textures(glb_path):
    """Downsize every texture to 512x512 and re-encode as WebP via
    @gltf-transform/cli, in place - see the module docstring. Geometry,
    skinning and morph targets pass through untouched (this never calls
    `optimize`/`simplify`, which would risk the eye_left_closure/
    eye_right_closure blink shape keys)."""
    tmp_path = glb_path + ".tmp.glb"
    subprocess.run(
        ["npx", "--yes", "@gltf-transform/cli", "resize", glb_path, tmp_path, "--width", "512", "--height", "512"],
        check=True,
    )
    subprocess.run(
        ["npx", "--yes", "@gltf-transform/cli", "webp", tmp_path, glb_path, "--effort", "80"],
        check=True,
    )
    os.remove(tmp_path)
    print(f"Optimized {glb_path}")


def main():
    from bl_ext.blender_org.mpfb.services import HumanService, TargetService

    only = [a for a in sys.argv if a.startswith("--only=")]
    names = only[0].split("=", 1)[1].split(",") if only else None

    for preset in PRESETS:
        if names and preset["name"] not in names:
            continue
        build_preset(HumanService, TargetService, preset)

    print("DONE")


main()
