"""
LEGACY comparison build: the "low-poly" eye mesh + pristine (re-downloaded,
never color-edited) brown_eye.png, with none of the later export/material
fixes (no Base-Color rewiring, no normals recalc). This deliberately
reproduces the pre-fix look for the /avatar-legacy comparison page - see
web/src/pages/AvatarToolPageLegacy.tsx for why this build exists.

Run with:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python \
    pipeline/scripts/04_assemble_eyes_legacy.py
"""
import os
import bpy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # pipeline/
OUT_DIR = os.path.join(ROOT, "out_legacy", "eyes")
os.makedirs(OUT_DIR, exist_ok=True)

EYES_MHCLO = os.path.join(ROOT, "assets_src_legacy", "eyes", "low-poly", "low-poly.mhclo")


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def create_basemesh(HumanService, TargetService):
    macro_details = TargetService.get_default_macro_info_dict()
    macro_details["gender"] = 0.0
    macro_details["age"] = 0.5
    macro_details["muscle"] = 0.5
    macro_details["weight"] = 0.5
    macro_details["race"] = {"african": 0.0, "asian": 0.0, "caucasian": 1.0}
    return HumanService.create_human(macro_detail_dict=macro_details)


def fit_eyes(HumanService, basemesh):
    eyes_obj = HumanService.add_mhclo_asset(
        EYES_MHCLO, basemesh,
        asset_type="Eyes",
        material_type="MAKESKIN",
        set_up_rigging=False,
        interpolate_weights=False,
        import_subrig=False,
        import_weights=False,
    )
    print("Fitted eyes object:", eyes_obj.name, "verts:", len(eyes_obj.data.vertices))
    return eyes_obj


def export_glb(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    out_path = os.path.join(OUT_DIR, "eyes.glb")
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        use_selection=True,
        export_format="GLB",
        export_yup=True,
    )
    print(f"Exported {out_path}")


def main():
    clear_scene()
    from bl_ext.blender_org.mpfb.services import HumanService, TargetService

    basemesh = create_basemesh(HumanService, TargetService)
    eyes_obj = fit_eyes(HumanService, basemesh)
    export_glb(eyes_obj)
    print("DONE")


main()
