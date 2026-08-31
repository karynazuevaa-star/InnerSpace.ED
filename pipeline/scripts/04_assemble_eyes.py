"""
Blender headless script: fit the CC0 "high-poly" eye mesh (same MakeHuman
CC0 source/author as the original "low-poly" one, just the higher-
resolution sibling asset - see assets_src/eyes/high-poly/high-poly.mhclo's
own header) to our basemesh via MPFB2's MHCLO fitting system (same approach
as hair - see 03_assemble_hair.py) and export eyes.glb. Default material is
brown irises (the asset's own default), matching a plain/neutral look.

Switched from "low-poly" (96 verts, a near-flat faceted disc) after it
proved unfixable: no camera distance/material/texture tweak stopped its
flat facets from showing through, and its lack of real curvature made the
iris read as a flat sticker always facing the viewer from any angle. The
high-poly asset (1064 verts, a real rounded eyeball) doesn't have either
problem.

Run with:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python \
    pipeline/scripts/04_assemble_eyes.py
"""
import os
import bpy
import bmesh
from mathutils import Matrix, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # pipeline/
OUT_DIR = os.path.join(ROOT, "out", "eyes")
os.makedirs(OUT_DIR, exist_ok=True)

EYES_MHCLO = os.path.join(ROOT, "assets_src", "eyes", "high-poly", "high-poly.mhclo")


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
    
    # Inspect the fitted eye's bounds to understand its current orientation.
    # The eye mesh sphere should be centered on the face and looking straight forward.
    # If these bounds show the eye looking downward, we need to rotate it.
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(eyes_obj.data)
    min_z = min(v.co.z for v in bm.verts)
    max_z = max(v.co.z for v in bm.verts)
    min_y = min(v.co.y for v in bm.verts)
    max_y = max(v.co.y for v in bm.verts)
    min_x = min(v.co.x for v in bm.verts)
    max_x = max(v.co.x for v in bm.verts)
    bm.free()
    center_z = (min_z + max_z) / 2
    center_y = (min_y + max_y) / 2
    center_x = (min_x + max_x) / 2
    print(f"Eye mesh bounds: X[{min_x:.4f}, {max_x:.4f}] Y[{min_y:.4f}, {max_y:.4f}] Z[{min_z:.4f}, {max_z:.4f}]")
    print(f"Eye mesh center: ({center_x:.4f}, {center_y:.4f}, {center_z:.4f})")

    # The eye asset is imported with a baked local transform. To keep it from
    # looking like it's drifting/floating relative to the head, bake the object
    # transform into the mesh and reset the object back to identity before
    # export. This is the actual root fix instead of compensating in JS.
    reset_object_transform(eyes_obj)
    recalc_normals(eyes_obj)
    simplify_material_for_export(eyes_obj)
    remove_shape_keys(eyes_obj)
    return eyes_obj


def reset_object_transform(obj):
    """Apply current object transform to mesh and zero the node transform."""
    # Before resetting, examine the fitted eye's current transform.
    print(f"Eye object BEFORE transform apply:")
    print(f"  location: {obj.location}")
    print(f"  rotation_euler: {obj.rotation_euler}")
    print(f"  scale: {obj.scale}")
    
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.context.view_layer.update()
    
    # APPLY the current transform (rotation, location, scale) to the mesh vertices
    # This must happen BEFORE zeroing out the transform values
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.context.view_layer.update()
    obj.data.update()  # Ensure mesh data is updated after transform
    
    # NOW zero out the transform values
    obj.rotation_euler = (0.0, 0.0, 0.0)
    obj.location = (0.0, 0.0, 0.0)
    obj.scale = (1.0, 1.0, 1.0)
    bpy.context.view_layer.update()
    
    print("Applied eye object transform to mesh geometry")
    print(f"Eye object AFTER transform apply:")
    print(f"  location: {obj.location}")
    print(f"  rotation_euler: {obj.rotation_euler}")
    print(f"  scale: {obj.scale}")
    
    # Now check the mesh bounds AFTER the rotation has been baked in
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    min_z = min(v.co.z for v in bm.verts)
    max_z = max(v.co.z for v in bm.verts)
    min_y = min(v.co.y for v in bm.verts)
    max_y = max(v.co.y for v in bm.verts)
    min_x = min(v.co.x for v in bm.verts)
    max_x = max(v.co.x for v in bm.verts)
    bm.free()
    center_x = (min_x + max_x) / 2
    center_y = (min_y + max_y) / 2
    center_z = (min_z + max_z) / 2
    print(f"Eye mesh bounds AFTER transform applied: X[{min_x:.4f}, {max_x:.4f}] Y[{min_y:.4f}, {max_y:.4f}] Z[{min_z:.4f}, {max_z:.4f}]")
    print(f"Eye mesh center AFTER transform: ({center_x:.4f}, {center_y:.4f}, {center_z:.4f})")


def remove_shape_keys(obj):
    """
    Remove all shape keys (morph targets) from the mesh, keeping only the
    Basis shape. This ensures the eyes are completely static and don't have
    any animation/deformation data that might cause them to "float" or move.
    """
    if not obj.data.shape_keys:
        return
    
    # Keep only the Basis key, remove all others
    for key_block in list(obj.data.shape_keys.key_blocks):
        if key_block.name != "Basis":
            obj.shape_key_remove(key_block)
    print("Removed all shape keys except Basis")


def recalc_normals(obj):
    """
    MHCLO fitting deforms the eye sphere per-vertex to match the basemesh's
    eye socket, and that non-uniform deformation can flip the winding of a
    handful of faces (most likely right at the mesh's rim/seam, where the
    deformation is least uniform). A flipped face reads as backface to
    Three.js's FrontSide culling, i.e. rendered inside-out - which read as
    a small, solid, fully-saturated red patch (the iris ring's raw texture
    color with no correct lighting/UV behavior) right at the eyeball's
    silhouette when viewed from a steep/grazing angle - confirmed by
    temporarily forcing THREE.BackSide client-side, which reproduced the
    exact same solid red across the whole eye. Recalculating normals here
    (outside-consistent) fixes the winding at the source instead of fighting
    the symptom client-side.
    """
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def simplify_material_for_export(obj):
    """
    MAKESKIN's node graph feeds the iris texture through a "diffuseIntensity"
    Mix node (Fac=1, so it's a no-op - output is just the texture) before
    Base Color. Blender's glTF exporter only recognizes a direct Image
    Texture -> Base Color link as a baseColorTexture; anything routed
    through an extra Mix node in between - even a no-op one - makes it fall
    back to a flat, wrong color instead (confirmed: the low-poly asset's
    simpler graph, lacking this Mix node, exported fine; this one didn't,
    until rewired here). Bypass the Mix node directly.
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
        links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])


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
