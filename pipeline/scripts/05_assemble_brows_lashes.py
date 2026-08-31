"""
Blender headless script: fit CC0 eyebrows + eyelashes to our basemesh via
MPFB2's MHCLO fitting system (same approach as hair/eyes) and export each
as its own glb.

Run with:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python \
    pipeline/scripts/05_assemble_brows_lashes.py
"""
import os
import bpy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # pipeline/

ASSETS = [
    ("eyebrows", os.path.join(ROOT, "assets_src", "eyebrows", "eyebrow002", "eyebrow002.mhclo"), "Eyebrows"),
    ("eyelashes", os.path.join(ROOT, "assets_src", "eyelashes", "eyelashes01", "eyelashes01.mhclo"), "Eyelashes"),
]


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


def fit_and_export(HumanService, basemesh, out_name, mhclo_path, asset_type):
    obj = HumanService.add_mhclo_asset(
        mhclo_path, basemesh,
        asset_type=asset_type,
        material_type="MAKESKIN",
        set_up_rigging=False,
        interpolate_weights=False,
        import_subrig=False,
        import_weights=False,
    )
    print(f"Fitted {out_name}:", obj.name, "verts:", len(obj.data.vertices))

    out_dir = os.path.join(ROOT, "out", out_name)
    os.makedirs(out_dir, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    out_path = os.path.join(out_dir, f"{out_name}.glb")
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        use_selection=True,
        export_format="GLB",
        export_yup=True,
    )
    print(f"Exported {out_path}")


def main():
    from bl_ext.blender_org.mpfb.services import HumanService, TargetService

    for out_name, mhclo_path, asset_type in ASSETS:
        clear_scene()
        basemesh = create_basemesh(HumanService, TargetService)
        fit_and_export(HumanService, basemesh, out_name, mhclo_path, asset_type)

    print("DONE")


main()
