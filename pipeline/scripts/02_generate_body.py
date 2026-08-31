"""
Blender headless script: build a base body (young adult, female, caucasian)
via MPFB2, expose a curated set of MakeHuman body-shape targets as LIVE
glTF morph targets (weight=0 shape keys, not baked), and export body.glb.

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
SKIN_MHMAT = os.path.join(
    ROOT, "assets_src", "skin", "darthfurby_caucasian_female",
    # "_noeyes" variant: the stock texture paints eyeliner/lash makeup and
    # eyebrows directly onto the face - redundant and visibly doubled once
    # separate eyes.glb/eyebrows.glb meshes render on top of it (see
    # 04_assemble_eyes.py / 05_assemble_brows_lashes.py). This variant has
    # those regions painted back to plain skin so only the real meshes show.
    "darthfurby_caucasian_female_noeyes.mhmat",
)

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
    ("arms/measure-upperarm-circ-decr.target.gz", "weight_arm_decr"),
    ("arms/measure-upperarm-circ-incr.target.gz", "weight_arm_incr"),
    ("legs/measure-thigh-circ-decr.target.gz", "weight_thigh_decr"),
    ("legs/measure-thigh-circ-incr.target.gz", "weight_thigh_incr"),
    # --- "stomach / belly" slider (apple-shape emphasis) ---
    ("stomach/stomach-pregnant-decr.target.gz", "belly_decr"),
    ("stomach/stomach-pregnant-incr.target.gz", "belly_incr"),
    ("stomach/stomach-tone-decr.target.gz", "belly_soft_decr"),
    ("stomach/stomach-tone-incr.target.gz", "belly_soft_incr"),
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


def export_glb(basemesh, armature_obj):
    bpy.ops.object.select_all(action="DESELECT")
    basemesh.select_set(True)
    if armature_obj:
        armature_obj.select_set(True)
        bpy.context.view_layer.objects.active = armature_obj
    else:
        bpy.context.view_layer.objects.active = basemesh
    out_path = os.path.join(OUT_DIR, "body.glb")
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
    macro_details["race"] = {"african": 0.0, "asian": 0.0, "caucasian": 1.0}

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

    remove_helper_geometry(basemesh)

    export_glb(basemesh, armature_obj)
    print("DONE")


main()
