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

# HAIR_ASSET picks which raw MHCLO asset to fit - "long01" (the default)
# derives long/medium/short length variants from one flowing hairstyle by
# bisecting it at different heights (see make_variant); "afro01" is a single
# rounded shape that doesn't have a meaningful "length" to cut, so it exports
# as one variant named "afro" instead.
HAIR_ASSET = os.environ.get("HAIR_ASSET", "long01")
HAIR_MHCLO = os.path.join(ROOT, "assets_src", "hair", HAIR_ASSET, f"{HAIR_ASSET}.mhclo")

VARIANTS = {
    "long": 1.0,
    "medium": 0.55,
    "short": 0.28,
} if HAIR_ASSET == "long01" else {
    "afro": 1.0,
}

# Must match 02_generate_body.py's own BODY_RACE - this hairstyle is fit
# (real MHCLO scalp fitting, not just a rigid attach) to ONE specific
# basemesh shape, and race macrodetail changes head/scalp shape enough
# that hair fit to the caucasian head floated above the asian one with a
# visible bald gap at the hairline once actually seen on that body -
# needs its own fit per race, same as the outfits already do.
BODY_RACE = os.environ.get("BODY_RACE", "caucasian")
RACE_MACRO_DETAILS = {
    "caucasian": {"african": 0.0, "asian": 0.0, "caucasian": 1.0},
    "asian": {"african": 0.0, "asian": 1.0, "caucasian": 0.0},
    "african": {"african": 1.0, "asian": 0.0, "caucasian": 0.0},
}
RACE_SUFFIX = "" if BODY_RACE == "caucasian" else f"-{BODY_RACE}"


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
    macro_details["race"] = RACE_MACRO_DETAILS[BODY_RACE]
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


def lift_off_scalp(obj, distance=0.008, max_forward=0.003, hairline_distance=None, hairline_threshold=0.5,
                    hairline_down=0.0, hairline_forward_extra=0.0):
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

    That clamp only limits the FORWARD component though - the X/Z part of
    the offset still scales with `distance` even at the hairline, moving
    those strands up/sideways too. Fine on the caucasian head this was
    tuned against, but reported directly on asian/african: the fringe
    read as sitting lower/denser across the forehead, more of the face
    covered, once `distance` was raised from 0.012 to 0.02 to fix the
    crown (see that commit) - the same bigger push was carrying the
    fringe further from its fitted position too. `hairline_distance`
    (defaults to `distance`, so callers that don't pass it keep the old
    single-distance behavior) lets the two regions move independently:
    full distance where z-fighting actually needs it, a much smaller one
    at the hairline where any extra movement just relocates the fringe.

    Separately: the MHCLO fit itself (before any of the above) lands the
    hairline noticeably higher than the eyebrows - a widow's-peak silhouette
    with a tall bare forehead underneath, confirmed by direct render
    comparison against the actual skinned body (not just the raw basemesh).
    That gap is in the FITTED position, not something the normal-offset
    above ever touches (it only pushes geometry away from the scalp along
    its own normal, which for hairline verts is mostly +Y/forward - it
    can't move them -Z/down toward the brows). `hairline_down`/
    `hairline_forward_extra` do that as a flat translation on top of the
    normal-offset, hairline verts only, so the crown's z-fighting fix above
    is untouched. Tuned by rendering the actual body+hair combo (not just
    hair alone) at several values - 0.02 down / 0.006 forward brought the
    hairline to sit just above the brows without visibly thinning the
    crown's coverage; pushing further (0.022/0.01) barely changed the
    render, so there's no benefit to going higher.

    First version applied hairline_down/hairline_forward_extra as a flat
    per-vertex ON/OFF step at hairline_threshold - fine for `distance` vs
    `hairline_distance` above (both scaled along each vertex's own normal,
    which varies smoothly across the surface, so neighbors on either side
    of the threshold still land close together), but a flat Z/Y
    translation has no such continuity: verts just past the threshold
    jumped by the full amount while their immediate neighbors just before
    it got none, tearing a literal gap in the mesh at that seam - reported
    directly as a bald wedge cutting into the hairline. Ramping the shift
    0->1 over (hairline_threshold, blend_end) with a smoothstep instead of
    a step fixes that: the extra shift fades in gradually so the seam
    stays contiguous.
    """
    if hairline_distance is None:
        hairline_distance = distance
    blend_end = max(hairline_threshold + 0.001, 0.85)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.normal_update()
    for v in bm.verts:
        is_hairline = v.normal.y > hairline_threshold
        d = hairline_distance if is_hairline else distance
        offset = v.normal * d
        if offset.y > max_forward:
            offset.y = max_forward
        v.co += offset
        if is_hairline:
            t = max(0.0, min(1.0, (v.normal.y - hairline_threshold) / (blend_end - hairline_threshold)))
            t = t * t * (3 - 2 * t)
            v.co.z -= hairline_down * t
            v.co.y += hairline_forward_extra * t
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
    # No recalc_face_normals here (there used to be one) - this hairstyle is
    # hundreds of separate thin strand cards, not one continuous shell, and
    # that op's "which way is outside" heuristic needs a coherent volume to
    # work from. On this geometry it silently flipped ~40% of the faces
    # right around the cut on "short" (verified: sampled normals pointing
    # into the head instead of away from it) - invisible on "medium" and
    # "long", where the flipped patch stays low enough on the head to sit
    # under a thick drape of still-intact hair above it, but on "short" that
    # patch IS most of the visible crown, and unlit-from-inside faces read
    # as a solid black gap when viewed from above. bisect_plane's own split
    # faces already inherit their parent's (correct) normal, so recalculating
    # anything here was never actually necessary.
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
    out_path = os.path.join(OUT_DIR, f"{name}{RACE_SUFFIX}.glb")
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
    # 0.03 was tuned specifically against the caucasian head (see this
    # function's own docstring - a real measured normal.y split between
    # hairline and crown on THAT head shape). On asian/african: a single
    # shared distance couldn't satisfy the crown (needs the full 0.03 to
    # avoid z-fighting) and the hairline (0.03 opened a jagged gap; 0.02,
    # the first fix, closed the gap but pushed the fringe low/dense enough
    # across the forehead to read as covering more of the face) at the
    # same time - two different regions wanting two different amounts of
    # movement. hairline_distance now drives them independently: full
    # distance at the crown, a small one at the hairline.
    #
    # hairline_down/hairline_forward_extra (all races, see lift_off_scalp's
    # docstring): the fitted hairline sits well above the eyebrows with a
    # bare, too-tall forehead underneath - reported on the caucasian variant
    # specifically, so this isn't a race-specific fit issue, it's the base
    # MHCLO fit itself. Applies uniformly on top of whichever branch below.
    if HAIR_ASSET != "long01":
        # afro01 is a thick, mostly-rigid shell (not thin strand cards like
        # long01), fits close to the brow line on its own, and its visible
        # "cap band" across the forehead is baked into the source texture -
        # present even on the raw, unlifted fit (checked directly). None of
        # long01's hairline-specific tuning applies here; a plain, modest
        # lift is enough to clear z-fighting on the crown.
        lift_off_scalp(hair_obj, distance=0.015, max_forward=0.006)
    elif BODY_RACE == "caucasian":
        lift_off_scalp(hair_obj, distance=0.03, max_forward=0.008,
                        hairline_down=0.02, hairline_forward_extra=0.006)
    else:
        lift_off_scalp(hair_obj, distance=0.03, hairline_distance=0.008, max_forward=0.008,
                        hairline_down=0.02, hairline_forward_extra=0.006)
    # weld_back_seam/add_seam_clearance close a gap specific to long01's
    # construction (separate L/R halves meeting down the back) - tuned
    # against that geometry, and afro01 doesn't share it (a single rounded
    # shell, no center-back seam), so skip for other assets rather than
    # running region bounds tuned for a different mesh against this one.
    if HAIR_ASSET == "long01":
        weld_back_seam(hair_obj)
        add_seam_clearance(hair_obj)
    z_min, z_max = z_bounds(hair_obj)
    print(f"Fitted hair Z bounds: {z_min:.3f} .. {z_max:.3f}")

    for name, frac in VARIANTS.items():
        variant_obj = make_variant(hair_obj, name, frac, z_min, z_max)
        export_glb(variant_obj, name)

    print("DONE")


main()
