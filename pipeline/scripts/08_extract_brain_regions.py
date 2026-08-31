"""
Blender headless script: extract a lightweight, web-ready brain model from
the Z-Anatomy open anatomy atlas for the Psychoeducation brain viewer
(web/src/components/BrainViewer.tsx).

Z-Anatomy is a free, open-licensed (CC BY-SA 4.0) human anatomy atlas built
on top of BodyParts3D (CC BY-SA 2.1 Japan) - a real, separately-modeled
mesh per anatomical structure, keyed to Terminologia Anatomica names. It is
NOT bundled in assets_src/ (the source .blend alone is ~300MB, versus
~80MB for everything else in assets_src/ combined) - download it yourself:

  1. https://github.com/Z-Anatomy/Models-of-human-anatomy -> Z-Anatomy.zip
  2. Unzip it - inside is Z-Anatomy/Startup.blend
  3. Run this script with ZANATOMY_BLEND pointing at that Startup.blend:

     ZANATOMY_BLEND=/path/to/Z-Anatomy/Startup.blend \
       /Applications/Blender.app/Contents/MacOS/Blender --background \
       --python pipeline/scripts/08_extract_brain_regions.py

Attribution (required by the CC BY-SA license - shown in the app's brain
panel, see BRAIN_ATTRIBUTION in content/brain.ts):
  "BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan"
  "Z-Anatomy - The libre 3D atlas of anatomy - CC-BY-SA 4.0"

What this does:
  - Pulls 7 real anatomical structures out of the atlas as individually
    named objects (region_hypothalamus, region_insula, region_amygdala,
    region_ofc, region_striatum, region_acc, region_dlpfc) - these are the
    ones content/brain.ts has psychoeducation text for. Where Terminologia
    Anatomica has no exact match for a functional-neuroscience term (there
    is no TA entry for "orbitofrontal cortex" or "dlPFC"), the closest
    standard gross-anatomy structure is used instead (documented inline
    below and in content/brain.ts's region text - never claimed to be a
    precise functional segmentation).
  - Merges the rest of both cerebral hemispheres + cerebellum + brainstem
    (all their gyri/sulci/nuclei/ventricle meshes, minus the two huge
    "white matter" meshes which are purely internal and not visually
    useful here) into one "brain_shell" mesh for visual context, decimated
    to ~40k verts for real-time web rendering.
  - Fixes one data quirk found in the source: the "Hypothalamus" mesh has
    a single stray vertex ~0.46m from the rest of its own (tightly
    clustered, ~2cm) geometry - not real anatomy, almost certainly leftover
    junk data - which would otherwise blow out the scene's bounding box.
  - Recenters and rescales the whole assembly (source is life-sized, in
    meters) to roughly the footprint the app's BrainViewer camera/lighting
    expects, and exports everything as one GLB.
"""

import os
import bmesh
import bpy
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # pipeline/
OUT_DIR = os.path.join(ROOT, "out")
os.makedirs(OUT_DIR, exist_ok=True)
OUT_PATH = os.path.join(OUT_DIR, "brain.glb")

ZANATOMY_BLEND = os.environ.get(
    "ZANATOMY_BLEND",
    os.path.expanduser("~/Downloads/Z-Anatomy/Startup.blend"),
)

# Bilateral (.l/.r) structures get merged into one object per region so the
# app can treat each as a single selectable/highlightable mesh.
REGION_OBJECTS = {
    "hypothalamus": ["Hypothalamus"],
    "insula": [
        "Insula (Subcentral gyrus and ant. and post. sulci*).l",
        "Insula (Subcentral gyrus and ant. and post. sulci*).r",
    ],
    "amygdala": ["Amygdaloid body.l", "Amygdaloid body.r"],
    # No TA entry for "orbitofrontal cortex" - the orbital-surface frontal
    # gyri are its standard gross-anatomy equivalent.
    "ofc": ["Orbital gyri.l", "Orbital gyri.r", "Straight gyrus (Gyrus rectus).l", "Straight gyrus (Gyrus rectus).r"],
    # No separate "nucleus accumbens" mesh in this atlas; putamen + caudate
    # (the rest of the striatum) stand in for the broader reward circuit.
    "striatum": ["Putamen.l", "Putamen.r", "Caudate nucleus.l", "Caudate nucleus.r"],
    "acc": [
        "Cingulate gyrus and sulcus (Middle anterior part).l",
        "Cingulate gyrus and sulcus (Middle anterior part).r",
    ],
    # No TA entry for "dorsolateral prefrontal cortex" (a functional-
    # neuroscience term, not a TA gyrus name) - middle frontal gyrus is its
    # standard anatomical correlate (~BA9/46).
    "dlpfc": ["Middle frontal gyrus.l", "Middle frontal gyrus.r"],
}

SHELL_COLLECTIONS = ["Left cerebral hemisphere", "Right cerebal hemisphere", "Cerebellum", "Brainstem"]
SHELL_EXCLUDE_SUBSTRINGS = ["white matter"]

SHELL_DECIMATE_RATIO = 0.22
TARGET_WIDTH = 1.3  # rough footprint the app's camera/lighting was tuned for
HYPOTHALAMUS_OUTLIER_DISTANCE = 0.05  # meters


def get_obj(name):
    o = bpy.data.objects.get(name)
    if o is None:
        print(f"MISSING OBJECT: {name}")
    return o


def merge_to_new_object(objs, new_name):
    """Merge the world-space geometry of `objs` into one new mesh object.

    Deliberately NOT bpy.ops.object.join(): most collections in this atlas
    are excluded from the view layer by default (it's built for progressive
    show/hide/isolate), so obj.select_set(True) silently no-ops on anything
    not currently in an active, included collection - join() then only
    keeps whichever one object happened to still be selected. Merging mesh
    data directly via bmesh needs no selection/visibility state at all.
    """
    objs = [o for o in objs if o is not None and o.type == 'MESH' and o.data is not None]
    if not objs:
        return None

    bm = bmesh.new()
    for o in objs:
        mesh_copy = o.data.copy()
        mesh_copy.transform(o.matrix_world)
        bm.from_mesh(mesh_copy)
        bpy.data.meshes.remove(mesh_copy)

    result_mesh = bpy.data.meshes.new(new_name)
    bm.to_mesh(result_mesh)
    bm.free()

    result_obj = bpy.data.objects.new(new_name, result_mesh)
    bpy.context.scene.collection.objects.link(result_obj)
    result_obj.data.update()
    return result_obj


def main():
    bpy.ops.wm.open_mainfile(filepath=ZANATOMY_BLEND)

    region_result_names = {}
    for region_id, obj_names in REGION_OBJECTS.items():
        objs = [get_obj(n) for n in obj_names]
        result = merge_to_new_object(objs, f"region_{region_id}")
        if result:
            region_result_names[region_id] = result.name
            print(f"REGION {region_id}: merged {len(obj_names)} source objects -> {result.name} ({len(result.data.vertices)} verts)")

    # Several regions (insula, ACC, OFC, dlPFC) are cortical-surface gyri
    # that also live inside the hemisphere collections the shell is built
    # from - exclude their source objects by name so the shell doesn't end
    # up with a duplicate, z-fighting copy of geometry we're already
    # pulling out as its own highlighted region.
    region_source_names = {n for names in REGION_OBJECTS.values() for n in names}

    shell_objs = []
    for col_name in SHELL_COLLECTIONS:
        col = bpy.data.collections.get(col_name)
        if not col:
            print(f"MISSING COLLECTION: {col_name}")
            continue
        for obj in col.objects:
            if obj.type != 'MESH' or obj.data is None:
                continue
            if obj.name in region_source_names:
                continue
            if obj.name.endswith('.g') or obj.name.endswith('.j'):
                continue
            if any(s in obj.name.lower() for s in SHELL_EXCLUDE_SUBSTRINGS):
                continue
            shell_objs.append(obj)

    shell = merge_to_new_object(shell_objs, "brain_shell")
    print(f"SHELL: merged {len(shell_objs)} source objects -> {len(shell.data.vertices)} verts")

    keep_names = {shell.name, *region_result_names.values()}
    to_delete = [o for o in bpy.data.objects if o.name not in keep_names]
    for o in to_delete:
        bpy.data.objects.remove(o, do_unlink=True)
    for _ in range(3):
        bpy.ops.outliner.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)

    regions = [bpy.data.objects[n] for n in region_result_names.values()]
    all_objs = [shell] + regions

    # Drop the hypothalamus's stray outlier vertex (see module docstring).
    hypo = bpy.data.objects.get("region_hypothalamus")
    if hypo:
        zs = sorted(v.co.z for v in hypo.data.vertices)
        median_z = zs[len(zs) // 2]
        bm = bmesh.new()
        bm.from_mesh(hypo.data)
        bm.verts.ensure_lookup_table()
        stray = [v for v in bm.verts if abs(v.co.z - median_z) > HYPOTHALAMUS_OUTLIER_DISTANCE]
        print(f"Removing {len(stray)} stray hypothalamus vertices")
        bmesh.ops.delete(bm, geom=stray, context='VERTS')
        bm.to_mesh(hypo.data)
        bm.free()
        hypo.data.update()

    mod = shell.modifiers.new(name="Decimate", type='DECIMATE')
    mod.ratio = SHELL_DECIMATE_RATIO
    bpy.context.view_layer.objects.active = shell
    bpy.ops.object.modifier_apply(modifier=mod.name)
    print(f"Shell decimated -> {len(shell.data.vertices)} verts, {len(shell.data.polygons)} polys")

    # Center/scale from the shell's own bounding box only - it reliably
    # represents the whole brain envelope, unlike any single region mesh.
    mins = Vector((1e9, 1e9, 1e9))
    maxs = Vector((-1e9, -1e9, -1e9))
    for corner in shell.bound_box:
        c = shell.matrix_world @ Vector(corner)
        mins.x, mins.y, mins.z = min(mins.x, c.x), min(mins.y, c.y), min(mins.z, c.z)
        maxs.x, maxs.y, maxs.z = max(maxs.x, c.x), max(maxs.y, c.y), max(maxs.z, c.z)
    center = (mins + maxs) / 2
    scale = TARGET_WIDTH / max((maxs - mins).x, (maxs - mins).y, (maxs - mins).z)
    print(f"Shell bbox size={tuple(maxs - mins)}, scale={scale}")

    for obj in all_objs:
        obj.location -= center
        obj.scale = (obj.scale[0] * scale, obj.scale[1] * scale, obj.scale[2] * scale)
        obj.location = obj.location * scale

    # One clean, textureless material slot per object - the app assigns its
    # own materials at runtime (same pattern OutfitPiece.tsx uses for
    # clothing meshes), this just gives glTF export something valid to write.
    plain_mat = bpy.data.materials.new(name="plain")
    plain_mat.use_nodes = True
    for obj in all_objs:
        obj.data.materials.clear()
        obj.data.materials.append(plain_mat)

    bpy.ops.object.select_all(action='DESELECT')
    for obj in all_objs:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = shell

    bpy.ops.export_scene.gltf(
        filepath=OUT_PATH,
        use_selection=True,
        export_format='GLB',
        export_yup=True,
        export_apply=True,
    )
    print(f"EXPORTED {OUT_PATH}")


main()
