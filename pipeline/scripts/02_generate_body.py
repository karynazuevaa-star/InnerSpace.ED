"""
Blender headless script: build a base body (young adult, female, caucasian)
via MPFB2, expose a curated set of MakeHuman body-shape targets as LIVE
glTF morph targets (weight=0 shape keys, not baked), fit the eyes/eyebrows/
eyelashes onto the SAME armature with real interpolated bone weights (the
same recipe 09_bake_npc_presets.py's fit_rigid_bodypart uses for NPCs), and
export all of it together as one body.glb.

This replaces the previous split (body.glb from this script, eyes.glb from
04_assemble_eyes.py, eyebrows.glb/eyelashes.glb from
05_assemble_brows_lashes.py, each a standalone rigid mesh reparented onto
the head bone at runtime in the browser). That runtime reparenting is
exactly what NPCs deliberately avoid (see 09_bake_npc_presets.py's own
module docstring: "sidesteps the runtime reparent... step entirely, which
is where the multi-instance hair bug in NpcAvatar.tsx traced back to") -
and on the dressing-room avatar it read as the eyes not sitting flush in
the socket, an uncanny "tracking" look, worse than any NPC ever showed.
Binding the eyes to the head bone via real vertex weights INSIDE this file
means the browser never repositions them at all; Three.js's glTF skinning
just carries them along with the skeleton like every other body part.

Hair stays a separate, standalone file (03_assemble_hair.py) and reparented
onto the head bone at runtime, same as before - unlike eyes/eyebrows/
eyelashes, hair genuinely needs to be swappable per session (long/medium/
short, any tint color), which a mesh baked into this file can't be. That
runtime path already uses the correct attachToHead()/attach() helper (see
web/src/avatar/AvatarContext.tsx), not the buggy add()-based one eyes used
to go through, so it doesn't have the tracking problem this rewrite fixes.

The frontend combines several raw targets per UI slider (e.g. "weight"
drives waist/hips/torso girth targets together) - see pipeline/README.md.

Run with:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python \
    pipeline/scripts/02_generate_body.py
"""
import os
import sys
import bpy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # pipeline/
OUT_DIR = os.path.join(ROOT, "out", "body")
os.makedirs(OUT_DIR, exist_ok=True)

_EXTENSIONS_ROOT = os.path.expanduser(
    "~/Library/Application Support/Blender/4.2/extensions"
)
MPFB_TARGETS_DIR = os.environ.get(
    "MPFB_TARGETS_DIR",
    os.path.join(_EXTENSIONS_ROOT, "blender_org", "mpfb", "data", "targets"),
)

# Which ethnicity variant to build - set via BODY_RACE, defaults to the
# original caucasian body so a plain re-run behaves exactly as before.
# asian/african don't have a "_noeyes" retouched skin like the caucasian
# one (see the comment below) - MAKESKIN's stock eyeliner/brow painting on
# those may show through faintly under the real eyebrow/eyelash meshes;
# flagged for a follow-up pass if it reads as visibly doubled once seen on
# the actual avatar, not fixed preemptively.
BODY_RACE = os.environ.get("BODY_RACE", "caucasian")
BODY_OUT_NAME = os.environ.get("BODY_OUT_NAME", "body")

RACE_MACRO_DETAILS = {
    "caucasian": {"african": 0.0, "asian": 0.0, "caucasian": 1.0},
    "asian": {"african": 0.0, "asian": 1.0, "caucasian": 0.0},
    "african": {"african": 1.0, "asian": 0.0, "caucasian": 0.0},
}
RACE_SKIN_MHMAT = {
    "caucasian": os.path.join(
        ROOT, "assets_src", "skin", "darthfurby_caucasian_female",
        # "_noeyes" variant: the stock texture paints eyeliner/lash makeup
        # and eyebrows directly onto the face - redundant and visibly
        # doubled once the real eyes/eyebrows/eyelashes meshes fitted below
        # render on top of it. This variant has those regions painted back
        # to plain skin so only the real meshes show.
        "darthfurby_caucasian_female_noeyes.mhmat",
    ),
    "asian": os.path.join(ROOT, "assets_src", "skin", "young_asian_female", "young_asian_female.mhmat"),
    "african": os.path.join(ROOT, "assets_src", "skin", "young_african_female", "young_african_female.mhmat"),
}
SKIN_MHMAT = RACE_SKIN_MHMAT[BODY_RACE]
EYES_MHCLO = os.path.join(ROOT, "assets_src", "eyes", "high-poly", "high-poly.mhclo")
EYEBROWS_MHCLO = os.path.join(ROOT, "assets_src", "eyebrows", "eyebrow002", "eyebrow002.mhclo")
EYELASHES_MHCLO = os.path.join(ROOT, "assets_src", "eyelashes", "eyelashes01", "eyelashes01.mhclo")

# (relative path under MPFB_TARGETS_DIR, shape-key name we expose to the web)
# Each pair is a decr/incr (or min/max) pair around the neutral average body,
# driven together from -1..1 by one UI slider on the frontend.
CURATED_TARGETS = [
    # --- overall "weight" slider: torso + limb girth ---
    ("torso/measure-waist-circ-decr.target.gz", "weight_waist_decr"),
    ("torso/measure-waist-circ-incr.target.gz", "weight_waist_incr"),
    ("torso/measure-hips-circ-decr.target.gz", "weight_hips_decr"),
    ("torso/measure-hips-circ-incr.target.gz", "weight_hips_incr"),
    ("torso/torso-scale-horiz-decr.target.gz", "weight_torso_horiz_decr"),
    ("torso/torso-scale-horiz-incr.target.gz", "weight_torso_horiz_incr"),
    ("torso/torso-scale-depth-decr.target.gz", "weight_torso_depth_decr"),
    ("torso/torso-scale-depth-incr.target.gz", "weight_torso_depth_incr"),
    # Was a single "measure-upperarm-circ" pair (upper arm only) - reported
    # directly as looking odd at both ends: thinning out in "one small
    # zone" near the elbow (the forearm never moved, so a big change to
    # just the upper arm reads as a pinch where they meet) and looking
    # "pumped" rather than fatter at the top (a raw circumference-measure
    # target, not a fat-specific one, on a mesh whose muscle definition is
    # already baked in). Four dedicated fat targets (both sides, both arm
    # segments) fix both: upper+lower move together for a smooth taper
    # along the whole limb, and "fat" (not the separate "muscle" targets
    # MPFB also ships) reads as soft tissue growing, not flexing.
    ("arms/l-upperarm-fat-decr.target.gz", "weight_arm_upper_l_decr"),
    ("arms/l-upperarm-fat-incr.target.gz", "weight_arm_upper_l_incr"),
    ("arms/r-upperarm-fat-decr.target.gz", "weight_arm_upper_r_decr"),
    ("arms/r-upperarm-fat-incr.target.gz", "weight_arm_upper_r_incr"),
    ("arms/l-lowerarm-fat-decr.target.gz", "weight_arm_lower_l_decr"),
    ("arms/l-lowerarm-fat-incr.target.gz", "weight_arm_lower_l_incr"),
    ("arms/r-lowerarm-fat-decr.target.gz", "weight_arm_lower_r_decr"),
    ("arms/r-lowerarm-fat-incr.target.gz", "weight_arm_lower_r_incr"),
    ("legs/measure-thigh-circ-decr.target.gz", "weight_thigh_decr"),
    ("legs/measure-thigh-circ-incr.target.gz", "weight_thigh_incr"),
    # --- "stomach / belly" slider (apple-shape emphasis) ---
    ("stomach/stomach-pregnant-decr.target.gz", "belly_decr"),
    ("stomach/stomach-pregnant-incr.target.gz", "belly_incr"),
    ("stomach/stomach-tone-decr.target.gz", "belly_soft_decr"),
    ("stomach/stomach-tone-incr.target.gz", "belly_soft_incr"),
    # MakeHuman's target library has no "fat stomach" shape separate from
    # "pregnant" - stomach-pregnant is the only target that projects the
    # belly forward at all. Pulling the navel back IN as the belly grows
    # (a pregnant belly does the opposite - taut skin pushes the navel OUT)
    # is one of the few available counter-cues that reads as fat rather
    # than pregnant; see bodyMorphs.ts's applyBodyMorphs for how this is
    # blended with a de-emphasized pregnant target and more of the general
    # torso/waist girth targets instead.
    ("stomach/stomach-navel-in.target.gz", "belly_navel_in"),
    # --- "breast size" slider ---
    (
        "breast/female-young-averagemuscle-averageweight-mincup-averagefirmness.target.gz",
        "breast_smaller",
    ),
    (
        "breast/female-young-averagemuscle-averageweight-maxcup-averagefirmness.target.gz",
        "breast_bigger",
    ),
    # --- "butt" slider ---
    ("buttocks/buttocks-volume-decr.target.gz", "butt_decr"),
    ("buttocks/buttocks-volume-incr.target.gz", "butt_incr"),
    # --- "face" slider (cheek fullness, both sides driven together) ---
    ("cheek/l-cheek-volume-decr.target.gz", "face_l_decr"),
    ("cheek/l-cheek-volume-incr.target.gz", "face_l_incr"),
    ("cheek/r-cheek-volume-decr.target.gz", "face_r_decr"),
    ("cheek/r-cheek-volume-incr.target.gz", "face_r_incr"),
    # --- blinking (idleAnimation.tsx drives these directly, 0..1, no UI
    # slider) - these live under expression/units, not the eyes/ folder:
    # eyes/ only has eye-SHAPE targets (bag, fold, scale...), this is the
    # actual eyelid-closing blend shape, same one the sibling Innerspace
    # project uses for its own blink. A real mesh deformation instead of
    # posing the eyelid-muscle bones, which never looked right no matter
    # which rotation axis/sign was tried.
    ("expression/units/caucasian/eye-left-closure.target.gz", "eye_left_closure"),
    ("expression/units/caucasian/eye-right-closure.target.gz", "eye_right_closure"),
    # Same deal for talking (idleAnimation.tsx drives this one too, 0..1, no
    # UI slider) - the rig has no jaw bone, so this MakeHuman expression
    # target (a real lip/mouth mesh deformation) stands in for jaw
    # articulation during conversation.
    ("expression/units/caucasian/mouth-open.target.gz", "mouth_open"),
]


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def bake_current_shape_to_basis(basemesh):
    """
    Collapse every shape key MPFB's create_human() added (macrodetail age/
    gender/muscle/weight/race blends) into a single flat Basis, so the mesh
    that follows has NO shape keys at all before we add our own live ones.
    Blender's glTF exporter drops every morph target whenever export_apply
    is combined with existing shape keys, and a huge stack of unused
    macrodetail shape keys would also bloat the export - so bake+strip first.
    """
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


def add_live_targets(TargetService, basemesh):
    added = []
    for rel_path, shape_name in CURATED_TARGETS:
        path = os.path.join(MPFB_TARGETS_DIR, rel_path)
        if not os.path.exists(path):
            print(f"WARNING: target not found: {path}")
            continue
        TargetService.load_target(basemesh, path, weight=0.0, name=shape_name)
        added.append(shape_name)
    print("Loaded live shape keys:", added)
    return added


def apply_skin(HumanService, basemesh):
    if not os.path.exists(SKIN_MHMAT):
        print(f"WARNING: skin not found: {SKIN_MHMAT}")
        return
    HumanService.set_character_skin(SKIN_MHMAT, basemesh, skin_type="MAKESKIN")
    simplify_materials_for_export(basemesh)
    force_opaque_materials(basemesh)
    print("Applied skin:", SKIN_MHMAT)


def simplify_materials_for_export(basemesh):
    """
    Same fix as 04_assemble_eyes.py's simplify_material_for_export(), applied
    here too: MAKESKIN routes every sub-material's (Human.body, Human.lips,
    Human.nipple, Human.ears...) diffuse texture through a no-op
    "diffuseIntensity" Mix node before Base Color. Blender's glTF exporter
    only recognizes a direct Image Texture -> Base Color link as a
    baseColorTexture; through that extra Mix node it falls back to a flat,
    wrong color instead - confirmed directly: Human.lips exported with only
    a thin sliver of its real color surviving at the UV seam, the rest
    reading as plain skin tone, while the source texture has the whole lip
    area colored. Bypass the Mix node directly, for every material on the
    mesh (not just one, unlike the single-material eyes asset).
    """
    for mat in basemesh.data.materials:
        if not mat or not mat.use_nodes:
            continue
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        tex_node = nodes.get("diffuseTexture")
        bsdf = next((n for n in nodes if n.type == "BSDF_PRINCIPLED"), None)
        if not tex_node or not bsdf:
            continue
        links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])


def force_opaque_materials(basemesh):
    """
    Blender 4.2's material.blend_method="OPAQUE" is a no-op if the shader's
    Alpha input is still wired to something (a texture's alpha channel, a
    Transparent BSDF mix, etc.) - the only reliable fix is unlinking
    whatever feeds Alpha so it falls back to its default of 1.0.
    """
    for mat in basemesh.data.materials:
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


def remove_helper_geometry(basemesh):
    """
    MPFB's basemesh carries internal marker vertices (HelperGeometry,
    JointCubes, eye/teeth/tongue/hair/genital helper groups etc.) that are
    never meant to be visible. Whitelist the "body" vertex group and delete
    everything else via edit-mode face deletion (not a Mask modifier - that
    would need export_apply=True, which silently drops morph targets when
    shape keys are present). Must run AFTER live targets are loaded: the
    .target files index vertices against the full original topology, and
    Blender keeps every shape key's per-vertex data in sync automatically
    when vertices are deleted, but only if the deletion happens once, after
    all target deltas have already been applied to the intact mesh.
    """
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
    print(f"Removed helper geometry, {len(basemesh.data.vertices)} verts remain")


def add_rig(HumanService, basemesh):
    armature_obj = HumanService.add_builtin_rig(basemesh, "default", import_weights=True)
    print("Added rig:", armature_obj.name, "bones:", len(armature_obj.data.bones))
    return armature_obj


def set_alpha_mask(obj, threshold):
    """
    For alpha-CUTOUT strand-card assets (eyebrows/eyelashes) - see
    09_bake_npc_presets.py's own set_alpha_mask, same fix, same reasoning:
    MAKESKIN's material ships as alpha BLEND, which real-blends the whole
    quad (a washed-out card with sort-order artifacts) instead of
    discarding the transparent parts. Forcing OPAQUE instead fills the
    "transparent" region with the texture's baked-black padding - solid
    black blocks over the eyes, not just thicker brows. MASK (Blender's
    CLIP) with a real threshold discards anything below it outright.
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


def fit_rigid_bodypart(HumanService, basemesh, mhclo_path, asset_type, alpha_mask=None):
    """
    Fit a rigid (non-cloth) MHCLO asset - eyes/eyebrows/eyelashes - to
    `basemesh` and bind it to the SAME armature already on `basemesh` via
    interpolated bone weights, instead of exporting it standalone and
    reparenting it onto the head bone at runtime in the browser (the old
    04_assemble_eyes.py / 05_assemble_brows_lashes.py approach). Weights
    interpolated from the basemesh's own scalp/face vertices land almost
    entirely on the "head" bone already (that's what those vertices are
    weighted to), so this reads as a rigid head-follow with no extra bone-
    group bookkeeping needed - and, critically, no runtime reposition step
    that can ever disagree with where the socket actually is. Same recipe
    09_bake_npc_presets.py uses for NPCs, which never showed the "eyes not
    sitting flush in the socket" tracking look the browser-side reparented
    version did here.

    Leave `alpha_mask` at its default (None) for eyes - the asset has no
    real transparent region to mask, and touching its alpha wiring at all
    (even just to force it opaque) turns the iris solid black; see
    09_bake_npc_presets.py's fit_rigid_bodypart docstring for how that was
    isolated. Eyebrows/eyelashes need a real cutout (alpha_mask=0.3, same
    value the NPC bake uses) since they're strand-card textures with a
    genuinely transparent background.
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
    print(f"Fitted {asset_type}:", obj.name, "verts:", len(obj.data.vertices))
    simplify_materials_for_export(obj)
    if alpha_mask is not None:
        set_alpha_mask(obj, alpha_mask)
    return obj


def export_glb(basemesh, armature_obj, extra_objects=()):
    bpy.ops.object.select_all(action="DESELECT")
    basemesh.select_set(True)
    for obj in extra_objects:
        obj.select_set(True)
    if armature_obj:
        armature_obj.select_set(True)
        bpy.context.view_layer.objects.active = armature_obj
    else:
        bpy.context.view_layer.objects.active = basemesh
    out_path = os.path.join(OUT_DIR, f"{BODY_OUT_NAME}.glb")
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        use_selection=True,
        export_format="GLB",
        export_yup=True,
        export_apply=False,
        export_morph=True,
    )
    print(f"Exported {out_path}")


def main():
    clear_scene()
    from bl_ext.blender_org.mpfb.services import HumanService, TargetService

    macro_details = TargetService.get_default_macro_info_dict()
    macro_details["gender"] = 0.0  # female
    macro_details["age"] = 0.5  # young adult
    macro_details["muscle"] = 0.5  # average
    macro_details["weight"] = 0.5  # average
    macro_details["race"] = RACE_MACRO_DETAILS[BODY_RACE]

    basemesh = HumanService.create_human(macro_detail_dict=macro_details)
    print("Created basemesh:", basemesh.name, "verts:", len(basemesh.data.vertices))

    # Rig first, while the mesh still has its full original topology - the
    # bundled .mhw bone-weight data is indexed against that, same reason
    # live targets must load before helper-geometry removal below.
    armature_obj = add_rig(HumanService, basemesh)

    apply_skin(HumanService, basemesh)

    bake_current_shape_to_basis(basemesh)
    shape_names = add_live_targets(TargetService, basemesh)
    print("Final shape keys:", [k.name for k in basemesh.data.shape_keys.key_blocks])

    # Fitting must happen before helper-geometry removal below: MHCLO
    # fitting/weight-interpolation matches vertices by INDEX against the
    # basemesh's ORIGINAL (full) topology, same reason live targets load
    # before that cleanup too. Each fitted object's own weights are baked
    # into vertex groups keyed by bone name, not by basemesh vertex index,
    # so nothing downstream cares that basemesh itself later loses
    # vertices.
    eyes_obj = fit_rigid_bodypart(HumanService, basemesh, EYES_MHCLO, "Eyes")
    eyebrows_obj = fit_rigid_bodypart(HumanService, basemesh, EYEBROWS_MHCLO, "Eyebrows", alpha_mask=0.3)
    eyelashes_obj = fit_rigid_bodypart(HumanService, basemesh, EYELASHES_MHCLO, "Eyelashes", alpha_mask=0.3)

    remove_helper_geometry(basemesh)

    export_glb(basemesh, armature_obj, extra_objects=[eyes_obj, eyebrows_obj, eyelashes_obj])
    print("DONE")


main()
