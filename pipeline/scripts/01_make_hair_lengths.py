"""
Blender headless script: take the CC0 "long01" MakeHuman hairstyle and
derive three length variants (long / medium / short) of the SAME style by
trimming the hair mesh along its root-to-tip axis, so all three read as one
haircut at different lengths. Also renders a quick preview PNG of each for
visual QA, and exports each as a standalone .glb.

Run with:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python \
    pipeline/scripts/01_make_hair_lengths.py
"""
import bpy
import bmesh
import os
import math
import mathutils

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # pipeline/
SRC_OBJ = os.path.join(ROOT, "assets_src", "hair", "long01", "long01.obj")
SRC_TEX = os.path.join(ROOT, "assets_src", "hair", "long01", "long01_diffuse.png")
OUT_DIR = os.path.join(ROOT, "out", "hair")
PREVIEW_DIR = os.path.join(ROOT, "out", "hair_preview")
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(PREVIEW_DIR, exist_ok=True)

# Fraction of the root->tip drop to KEEP, per variant (1.0 = untouched long hair).
VARIANTS = {
    "long": 1.0,
    "medium": 0.55,   # roughly shoulder-length
    "short": 0.28,    # roughly chin-length
}


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_hair():
    bpy.ops.wm.obj_import(filepath=SRC_OBJ)
    obj = bpy.context.selected_objects[0]
    obj.name = "hair_long01"
    for p in obj.data.polygons:
        p.use_smooth = True
    obj.data.update()
    return obj


def build_material(obj):
    mat = bpy.data.materials.new(name="hair_mat")
    mat.use_nodes = True
    mat.blend_method = 'HASHED'
    mat.shadow_method = 'HASHED' if hasattr(mat, 'shadow_method') else 'NONE'
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(SRC_TEX)
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
    obj.data.materials.append(mat)
    return mat


def y_bounds(obj):
    ys = [v.co.y for v in obj.data.vertices]
    return min(ys), max(ys)


def make_variant(base_obj, name, keep_fraction, y_min, y_max):
    if keep_fraction >= 0.999:
        dup = base_obj.copy()
        dup.data = base_obj.data.copy()
        dup.name = f"hair_{name}"
        bpy.context.collection.objects.link(dup)
        return dup

    dup = base_obj.copy()
    dup.data = base_obj.data.copy()
    dup.name = f"hair_{name}"
    bpy.context.collection.objects.link(dup)

    cut_y = y_max - (y_max - y_min) * keep_fraction

    bm = bmesh.new()
    bm.from_mesh(dup.data)
    bmesh.ops.bisect_plane(
        bm,
        geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
        plane_co=(0.0, cut_y, 0.0),
        plane_no=(0.0, 1.0, 0.0),
        clear_inner=True,   # discard geometry below the cut (the tips)
        clear_outer=False,
    )
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(dup.data)
    bm.free()
    for p in dup.data.polygons:
        p.use_smooth = True
    dup.data.update()
    return dup


def render_preview(obj, name, y_min, y_max):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 32
    scene.cycles.device = 'CPU'
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.film_transparent = True

    center = mathutils.Vector((0.0, (y_min + y_max) / 2.0, 0.2))
    target = bpy.data.objects.new("target", None)
    target.location = center
    bpy.context.collection.objects.link(target)

    cam_data = bpy.data.cameras.new("cam")
    cam_data.lens = 50
    cam = bpy.data.objects.new("cam", cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = (0, center.y, 9)
    track = cam.constraints.new('TRACK_TO')
    track.target = target
    track.track_axis = 'TRACK_NEGATIVE_Z'
    track.up_axis = 'UP_Y'
    scene.camera = cam

    light_data = bpy.data.lights.new("sun", type='SUN')
    light_data.energy = 3.0
    light = bpy.data.objects.new("sun", light_data)
    light.location = (2, center.y + 2, 8)
    bpy.context.collection.objects.link(light)
    light2_data = bpy.data.lights.new("sun2", type='SUN')
    light2_data.energy = 1.5
    light2 = bpy.data.objects.new("sun2", light2_data)
    light2.location = (-3, center.y - 1, 4)
    bpy.context.collection.objects.link(light2)

    print(f"[debug] {name}: obj={obj.name} verts={len(obj.data.vertices)} polys={len(obj.data.polygons)} "
          f"loc={obj.location} dims={obj.dimensions} visible={obj.visible_get()} "
          f"hide_render={obj.hide_render} materials={[m.name if m else None for m in obj.data.materials]}")
    print(f"[debug] cam loc={cam.location} rot={cam.matrix_world.to_euler()} target={target.location} "
          f"scene.camera={scene.camera} objects_in_scene={[o.name for o in scene.collection.all_objects]}")

    scene.render.filepath = os.path.join(PREVIEW_DIR, f"{name}.png")
    bpy.ops.render.render(write_still=True)

    bpy.data.objects.remove(cam, do_unlink=True)
    bpy.data.objects.remove(light, do_unlink=True)
    bpy.data.objects.remove(light2, do_unlink=True)
    bpy.data.objects.remove(target, do_unlink=True)


def export_glb(obj, name):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    out_path = os.path.join(OUT_DIR, f"{name}.glb")
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        use_selection=True,
        export_format='GLB',
        export_yup=True,
    )
    print(f"Exported {out_path}")


def main():
    clear_scene()
    base = import_hair()
    build_material(base)
    y_min, y_max = y_bounds(base)
    print(f"long01 Y bounds: {y_min:.3f} .. {y_max:.3f}")

    for name, frac in VARIANTS.items():
        variant_obj = make_variant(base, name, frac, y_min, y_max)
        if name != "long":
            variant_obj.data.materials.append(base.data.materials[0])
        render_preview(variant_obj, name, y_min, y_max)
        export_glb(variant_obj, name)

    print("DONE")


main()
