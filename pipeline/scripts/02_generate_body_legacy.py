"""
LEGACY comparison build: same body/rig/morph-target setup as
02_generate_body.py, but using the pre-fix skin texture (eyebrows removed
only - no mole/areola touch-ups) and without the later diffuseIntensity
Base-Color rewiring fix. Deliberately reproduces the pre-fix look for the
/avatar-legacy comparison page - see
web/src/pages/AvatarToolPageLegacy.tsx for why this build exists.

Run with:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python \
    pipeline/scripts/02_generate_body_legacy.py
"""
import os
import bpy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # pipeline/
OUT_DIR = os.path.join(ROOT, "out_legacy", "body")
os.makedirs(OUT_DIR, exist_ok=True)

_EXTENSIONS_ROOT = os.path.expanduser(
    "~/Library/Application Support/Blender/4.2/extensions"
)
MPFB_TARGETS_DIR = os.environ.get(
    "MPFB_TARGETS_DIR",
    os.path.join(_EXTENSIONS_ROOT, "blender_org", "mpfb", "data", "targets"),
)
SKIN_MHMAT = os.path.join(
    ROOT, "assets_src_legacy", "skin", "darthfurby_caucasian_female",
    "darthfurby_caucasian_female_noeyes.mhmat",
)

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
    ("expression/units/caucasian/eye-left-closure.target.gz", "eye_left_closure"),
    ("expression/units/caucasian/eye-right-closure.target.gz", "eye_right_closure"),
]


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def bake_current_shape_to_basis(basemesh):
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
    force_opaque_materials(basemesh)
    print("Applied skin:", SKIN_MHMAT)


def force_opaque_materials(basemesh):
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
    macro_details["gender"] = 0.0
    macro_details["age"] = 0.5
    macro_details["muscle"] = 0.5
    macro_details["weight"] = 0.5
    macro_details["race"] = {"african": 0.0, "asian": 0.0, "caucasian": 1.0}

    basemesh = HumanService.create_human(macro_detail_dict=macro_details)
    print("Created basemesh:", basemesh.name, "verts:", len(basemesh.data.vertices))

    armature_obj = add_rig(HumanService, basemesh)

    apply_skin(HumanService, basemesh)

    bake_current_shape_to_basis(basemesh)
    shape_names = add_live_targets(TargetService, basemesh)
    print("Final shape keys:", [k.name for k in basemesh.data.shape_keys.key_blocks])

    remove_helper_geometry(basemesh)

    export_glb(basemesh, armature_obj)
    print("DONE")


main()
