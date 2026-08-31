"""
Blender headless script: fit the CC0 "long01" hairstyle to our actual
basemesh via MPFB2's own MHCLO fitting system (correct scale/position,
unlike the earlier standalone-OBJ approach which turned out to be in a
different unit scale than the MPFB2 body), then derive long/medium/short
length variants from the FITTED mesh and export each as glb.

Run with:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python \
    pipeline/scripts/03_assemble_hair.py
"""
import os
import bpy
import bmesh

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # pipeline/
OUT_DIR = os.path.join(ROOT, "out", "hair")
os.makedirs(OUT_DIR, exist_ok=True)

HAIR_MHCLO = os.path.join(ROOT, "assets_src", "hair", "long01", "long01.mhclo")

VARIANTS = {
    "long": 1.0,
    "medium": 0.55,
    "short": 0.28,
}


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def create_basemesh(HumanService, TargetService):
    macro_details = TargetService.get_default_macro_info_dict()
    macro_details["gender"] = 0.0
    macro_details["age"] = 0.5
    macro_details["muscle"] = 0.5
    # Fitted at the runtime "weight" slider's max, not the neutral middle -
    # the torso morph targets in bodyMorphs.ts widen well past this
    # macro-weight basemesh at slider=1, and hair (a rigid mesh, no morph
    # targets of its own) can't grow with them. Fitting to the biggest
    # body up front means there's slack to spare instead of a gap to fill
    # at the high end, at the cost of a slightly looser drape at slider=0.
    macro_details["weight"] = 1.0
    macro_details["race"] = {"african": 0.0, "asian": 0.0, "caucasian": 1.0}
    return HumanService.create_human(macro_detail_dict=macro_details)


def fit_hair(HumanService, basemesh):
    hair_obj = HumanService.add_mhclo_asset(
        HAIR_MHCLO, basemesh,
        asset_type="Hair",
        material_type="MAKESKIN",
        set_up_rigging=False,
        interpolate_weights=False,
        import_subrig=False,
        import_weights=False,
    )
    print("Fitted hair object:", hair_obj.name, "verts:", len(hair_obj.data.vertices))
    return hair_obj


def lift_off_scalp(obj, distance=0.008, max_forward=0.003):
    """
    The fitted hair shell sits almost exactly on the scalp surface, which
    z-fights with it in the renderer (worst from steep angles - straight
    down onto the crown, or looking down at the part line - where whole
    sections flicker to "losing" the depth test and showing bare scalp
    through the hair). A THREE.js-side polygonOffset bias was tried
    instead of this: strong enough to actually close the crown gap, it
    also pushed hair strand TIPS in front of geometry they should stay
    behind (the torso, where long hair drapes over the shoulder), which
    read as thin dark lines bleeding through the shirt - a viewport-wide
    screen-space trick has no way to know "close to the scalp" from "far
    out over the chest". Moving the actual geometry a few mm off the
    scalp along each vertex's own normal fixes the root cause instead:
    it only ever separates hair from whatever surface it's already
    touching, so it can't introduce a new conflict with anything else.

    The one place a plain normal-offset backfires: hairline/fringe
    vertices, whose normals point mostly FORWARD (+Y, toward the face -
    confirmed by direct measurement: ~0.92 avg normal.y at the hairline
    vs ~0.19 at the crown) rather than up and away from the scalp. At
    distance=0.02 that pushed those strands ~18mm forward, straight
    through the forehead surface, reading as thin dark stripes on the
    skin. Clamping just the forward (+Y) component of the offset keeps
    the crown's z-fighting fix (which relies on the Z/X component, barely
    touched by this clamp) while stopping hairline strands from poking
    past the face.
    """
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.normal_update()
    for v in bm.verts:
        offset = v.normal * distance
        if offset.y > max_forward:
            offset.y = max_forward
        v.co += offset
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def weld_back_seam(obj, x_thresh=0.035, z_min=1.05, z_max=1.65, merge_dist=0.05):
    """
    The left and right halves of this hairstyle meet down the center of
    the back without being welded together, leaving a thin real gap right
    where the shoulder blades push the shirt closest to the hair - normal-
    based lift_off_scalp can't close it since it moves the whole mesh
    outward uniformly rather than sideways toward each other. Diagnostic
    print first (vertex count in the seam's bounding box) so a rerun with
    adjusted bounds has real numbers to go on instead of another blind
    guess, then remove_doubles actually welds any vertices within
    merge_dist of each other in that region.
    """
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    region_verts = [v for v in bm.verts if abs(v.co.x) < x_thresh and z_min < v.co.z < z_max]
    print(f"[weld_back_seam] {len(region_verts)} verts in seam region "
          f"(x<{x_thresh}, z in [{z_min},{z_max}])")
    if region_verts:
        xs = [v.co.x for v in region_verts]
        ys = [v.co.y for v in region_verts]
        zs = [v.co.z for v in region_verts]
        print(f"[weld_back_seam] x range {min(xs):.4f}..{max(xs):.4f}, "
              f"y range {min(ys):.4f}..{max(ys):.4f}, z range {min(zs):.4f}..{max(zs):.4f}")
    before = len(bm.verts)
    bmesh.ops.remove_doubles(bm, verts=region_verts, dist=merge_dist)
    after = len(bm.verts)
    print(f"[weld_back_seam] merged {before - after} verts")
    bm.normal_update()
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def add_seam_clearance(obj, x_thresh=0.035, z_min=1.05, z_max=1.65, distance=0.01):
    """
    Welding closes the literal hole, but the seam is still thinner coverage
    than the rest of the scalp - at weight=1 the croptop's own corrective
    shape keys (07_bake_outfit_morphs.py, UPPER_TARGETS) grow the back
    enough to poke back through that thin spot even though it's no longer
    an open hole. Push just this region further out along its own vertex
    normals - the same fix as the jeans' inner-thigh clearance
    (EXTRA_CLEARANCE in 07_bake_outfit_morphs.py), applied here to the
    shirt/hair boundary instead of the skin/jeans one.
    """
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.normal_update()
    count = 0
    for v in bm.verts:
        if abs(v.co.x) < x_thresh and z_min < v.co.z < z_max:
            v.co += v.normal * distance
            count += 1
    print(f"[add_seam_clearance] pushed {count} verts by {distance}")
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def z_bounds(obj):
    # Blender's own native Z-up convention applies to MHCLO-fitted meshes
    # (unlike the earlier standalone-OBJ import, which happened to land with
    # Y as up) - confirmed empirically: basemesh Z spans ~-0.03..1.67 (a
    # realistic human height), while its Y span is only ~0.3 (front-to-back
    # depth). Cutting along Y here was silently bisecting hair by depth, not
    # length, producing a bald crown with only face-framing strands left.
    zs = [v.co.z for v in obj.data.vertices]
    return min(zs), max(zs)


def make_variant(base_obj, name, keep_fraction, z_min, z_max):
    dup = base_obj.copy()
    dup.data = base_obj.data.copy()
    dup.name = f"hair_{name}"
    bpy.context.collection.objects.link(dup)
    if keep_fraction >= 0.999:
        return dup

    cut_z = z_max - (z_max - z_min) * keep_fraction
    bm = bmesh.new()
    bm.from_mesh(dup.data)
    bmesh.ops.bisect_plane(
        bm,
        geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
        plane_co=(0.0, 0.0, cut_z),
        plane_no=(0.0, 0.0, 1.0),
        clear_inner=True,
        clear_outer=False,
    )
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(dup.data)
    bm.free()
    for p in dup.data.polygons:
        p.use_smooth = True
    dup.data.update()
    return dup


def export_glb(obj, name):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    out_path = os.path.join(OUT_DIR, f"{name}.glb")
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
    print("Basemesh for fitting:", basemesh.name)

    hair_obj = fit_hair(HumanService, basemesh)
    lift_off_scalp(hair_obj, distance=0.016, max_forward=0.0035)
    weld_back_seam(hair_obj)
    add_seam_clearance(hair_obj)
    z_min, z_max = z_bounds(hair_obj)
    print(f"Fitted hair Z bounds: {z_min:.3f} .. {z_max:.3f}")

    for name, frac in VARIANTS.items():
        variant_obj = make_variant(hair_obj, name, frac, z_min, z_max)
        export_glb(variant_obj, name)

    print("DONE")


main()
