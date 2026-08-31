"""
Blender headless script: fit clothing items (shorts, bodysuit) to our
basemesh via MPFB2's MHCLO fitting system and export each as its own glb.

Unlike hair/eyes (rigid, single-joint attachment), clothes get a real
armature + interpolated bone weights so they deform with body pose and
(via the basemesh's shape keys) the weight/belly/breast morph targets.

Run with:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python \
    pipeline/scripts/06_assemble_outfits.py
"""
import os
import bpy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # pipeline/

ASSETS = [
    ("shorts", os.path.join(ROOT, "assets_src", "outfits", "cortu_jeans_shorts", "cortu_jeans_shorts.mhclo")),
    ("bodysuit", os.path.join(ROOT, "assets_src", "outfits", "punkduck_female_strapless_bodysuit", "punkduck_female_strapless_bodysuit.mhclo")),
    ("skinsuit", os.path.join(ROOT, "assets_src", "outfits", "matcreator_mc-skinsuit_2022", "matcreator_mc-skinsuit_2022.mhclo")),
    ("tightjeans", os.path.join(ROOT, "assets_src", "outfits", "punkduck_female_tight_jeans", "punkduck_female_tight_jeans.mhclo")),
    ("croptop", os.path.join(ROOT, "assets_src", "outfits", "punkduck_sleeveless_crop_top", "punkduck_sleeveless_crop_top.mhclo")),
    ("hoodie", os.path.join(ROOT, "assets_src", "outfits", "elvs_hooded_sweat_jacket1", "elvs_hooded_sweat_jacket1.mhclo")),
]

# The bodysuit doesn't get paired with a bottom any more (its leg-hole
# opening curves up higher at center-front than any bottom's waistband from
# an unrelated pack could match - see git history for the offset/overlap
# experiments that didn't fully close it). croptop's hem sits well above
# any bottom's waistband instead, so there's nothing to align in the first
# place.
Z_OFFSET = {}


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def create_basemesh(HumanService, TargetService):
    macro_details = TargetService.get_default_macro_info_dict()
    macro_details["gender"] = 0.0
    macro_details["age"] = 0.5
    macro_details["muscle"] = 0.5
    macro_details["weight"] = 0.5
    macro_details["race"] = {"african": 0.0, "asian": 0.0, "caucasian": 1.0}
    basemesh = HumanService.create_human(macro_detail_dict=macro_details)
    HumanService.add_builtin_rig(basemesh, "default", import_weights=True)
    return basemesh


def scale_from_own_center(obj, factor):
    """
    Scale a garment mesh about its OWN bounding-box center (not the body's
    origin near the feet) by `factor`, giving it a uniform margin of extra
    coverage in every direction. Two earlier attempts nudged only the
    topmost vertices - straight up in Z, then inward in X - to close a
    small gap where the crop top's racerback strap falls just short of
    covering the shoulder; neither targeted the right edge (the gap barely
    moved). A small uniform scale-up is less precise but reliably gives
    every boundary of the garment, including whichever edge is actually
    responsible, a bit of slack against the body surface underneath.
    """
    coords = [v.co for v in obj.data.vertices]
    cx = sum(c.x for c in coords) / len(coords)
    cy = sum(c.y for c in coords) / len(coords)
    cz = sum(c.z for c in coords) / len(coords)
    for v in obj.data.vertices:
        v.co.x = cx + (v.co.x - cx) * factor
        v.co.y = cy + (v.co.y - cy) * factor
        v.co.z = cz + (v.co.z - cz) * factor
    obj.data.update()
    print(f"Scaled {len(coords)} verts by {factor} about center ({cx:.3f},{cy:.3f},{cz:.3f})")


def fit_and_export(HumanService, basemesh, out_name, mhclo_path):
    obj = HumanService.add_mhclo_asset(
        mhclo_path, basemesh,
        asset_type="Clothes",
        material_type="MAKESKIN",
        set_up_rigging=True,
        interpolate_weights=True,
        import_subrig=False,
        import_weights=True,
    )
    print(f"Fitted {out_name}:", obj.name, "verts:", len(obj.data.vertices))

    offset = Z_OFFSET.get(out_name, 0.0)
    if offset:
        obj.location.z += offset
        print(f"Applied Z offset {offset} to {out_name}")

    if out_name == "croptop":
        scale_from_own_center(obj, factor=1.035)

    out_dir = os.path.join(ROOT, "out", "outfits")
    os.makedirs(out_dir, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    armature = obj.find_armature()
    if armature:
        armature.select_set(True)
        bpy.context.view_layer.objects.active = armature
    else:
        bpy.context.view_layer.objects.active = obj
    out_path = os.path.join(out_dir, f"{out_name}.glb")
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        use_selection=True,
        export_format="GLB",
        export_yup=True,
        export_apply=False,
    )
    print(f"Exported {out_path}")


def main():
    from bl_ext.blender_org.mpfb.services import HumanService, TargetService

    for out_name, mhclo_path in ASSETS:
        clear_scene()
        basemesh = create_basemesh(HumanService, TargetService)
        fit_and_export(HumanService, basemesh, out_name, mhclo_path)

    print("DONE")


main()
