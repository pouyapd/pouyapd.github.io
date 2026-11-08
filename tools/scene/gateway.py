"""
P. DESIGN — hero scene "The Gateway" (Blender / Cycles).

A monumental stone slab with an arched opening stands in a calm sea at dusk.
The low sun shines through the arch and lays a path of light across the water
towards a small figure on a stone causeway. The sky is a CC0 photographic HDRI
from Poly Haven ("Belfast Sunset (Pure Sky)", Greg Zaal / Dimitrios Savva /
Jarod Guest), so the light on the stone, the clouds and their reflections all
come from one real sky. Everything else is modelled here.

    blender -b -P tools/scene/gateway.py -- --variant desktop [--preview] [--samples N]

Inputs:  tools/scene/sky/belfast_sunset_puresky_16k.hdr (or _2k for previews)
         https://polyhaven.com/a/belfast_sunset_puresky  (CC0)
Outputs (tools/scene/out/):
    gateway-<variant>.png        the beauty render (16-bit), source of the hero still
    gateway-<variant>-water.png  a mask of the open water (white), for the shimmer in the hero
`npm run assets` turns them into the site's AVIF/WebP still and mask.
"""

import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SKY_DIR = ROOT / "tools" / "scene" / "sky"
OUT = ROOT / "tools" / "scene" / "out"

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--variant", default="desktop", choices=["desktop", "mobile"])
ap.add_argument("--preview", action="store_true")
ap.add_argument("--samples", type=int, default=0)
ap.add_argument("--scale", type=float, default=1.0, help="resolution scale")
ap.add_argument("--out", default="")
ap.add_argument("--closeup", action="store_true", help="frame the figure from 7 m behind")
ap.add_argument("--dry", action="store_true", help="build the scene and print its layout, no render")
args = ap.parse_args(argv)

# --- the scene's measurements (metres; z up, the camera looks along +y) ----------
SUN_U, SUN_ELEV = 0.6047, 2.0        # where the sun sits in the HDRI (u across, degrees up)
SLAB = dict(w=11.0, h=36.0, d=5.0, arch_w=5.6, arch_spring=17.5, x=16.0, y=100.0, yaw=-24.0)
CAUSEWAY = dict(start=(-5.5, 1.0), width=2.0, top=0.26)
FIGURE = dict(t=0.27, height=1.78)    # position along the causeway (0 start, 1 the slab)
EYE = 1.55

VARIANTS = {
    #           resolution    focal mm   shift y  camera x  yaw (deg, + = left)
    "desktop": ((3200, 2000), 30.0,      0.11,    0.0,      0.0),
    "mobile":  ((1290, 2580), 32.0,      -0.03,   0.0,      -1.6),
}


def clean():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    return m, m.node_tree.nodes, m.node_tree.links


def node(nodes, kind, **kw):
    n = nodes.new(kind)
    for k, v in kw.items():
        if k == "loc":
            n.location = v
        else:
            setattr(n, k, v)
    return n


# --- world: the HDRI sky, turned so the sun stands behind the arch ---------------
def world(sun_dir_az):
    w = bpy.data.worlds.new("Sky")
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    coord = node(nt.nodes, "ShaderNodeTexCoord")
    mapping = node(nt.nodes, "ShaderNodeMapping")
    env = node(nt.nodes, "ShaderNodeTexEnvironment")
    bg = node(nt.nodes, "ShaderNodeBackground")
    out = node(nt.nodes, "ShaderNodeOutputWorld")
    name = "belfast_sunset_puresky_2k.hdr" if args.preview else "belfast_sunset_puresky_16k.hdr"
    env.image = bpy.data.images.load(str(SKY_DIR / name))
    env.interpolation = "Cubic"
    # Blender's lookup: u = 0.5 - atan2(y, x) / 2pi. The mapping turns the lookup vector by phi about z,
    # so a world direction at angle beta reads u = 0.5 - (beta + phi) / 2pi. Choose phi so the
    # HDRI's sun (at SUN_U) lands on sun_dir_az (measured from +y towards +x).
    beta = math.atan2(math.cos(sun_dir_az), math.sin(sun_dir_az))
    mapping.inputs["Rotation"].default_value = (0, 0, (0.5 - SUN_U) * 2 * math.pi - beta)
    bg.inputs["Strength"].default_value = 1.0
    nt.links.new(coord.outputs["Generated"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], env.inputs["Vector"])
    nt.links.new(env.outputs["Color"], bg.inputs["Color"])
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])
    # the HDRI's sun is low and partly veiled: a matching sun lamp gives the crisp warm light
    # through the arch and the glitter path on the water
    sun = bpy.data.lights.new("Sun", "SUN")
    sun.energy = 2.2
    sun.color = (1.0, 0.7, 0.46)
    sun.angle = math.radians(0.7)
    o = bpy.data.objects.new("Sun", sun)
    link(o)
    el = math.radians(SUN_ELEV)
    d = Vector((math.sin(sun_dir_az) * math.cos(el), math.cos(sun_dir_az) * math.cos(el), math.sin(el)))
    o.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()


# --- materials --------------------------------------------------------------------
def stone():
    m, n, l = mat("Stone")
    bsdf = n["Principled BSDF"]
    coord = node(n, "ShaderNodeTexCoord")
    # large, soft tonal variation + fine grain + faint vertical weathering streaks
    big = node(n, "ShaderNodeTexNoise", noise_dimensions="3D")
    big.inputs["Scale"].default_value = 0.08
    big.inputs["Detail"].default_value = 4
    fine = node(n, "ShaderNodeTexNoise")
    fine.inputs["Scale"].default_value = 6.0
    fine.inputs["Detail"].default_value = 8
    streak_map = node(n, "ShaderNodeMapping")
    streak_map.inputs["Scale"].default_value = (1.6, 1.6, 0.05)
    streak = node(n, "ShaderNodeTexNoise")
    streak.inputs["Scale"].default_value = 2.2
    streak.inputs["Detail"].default_value = 6
    l.new(coord.outputs["Object"], big.inputs["Vector"])
    l.new(coord.outputs["Object"], fine.inputs["Vector"])
    l.new(coord.outputs["Object"], streak_map.inputs["Vector"])
    l.new(streak_map.outputs["Vector"], streak.inputs["Vector"])
    tone = node(n, "ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY")
    ramp = node(n, "ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.3
    ramp.color_ramp.elements[0].color = (0.20, 0.195, 0.19, 1)
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = (0.34, 0.325, 0.31, 1)
    l.new(big.outputs["Fac"], ramp.inputs["Fac"])
    sramp = node(n, "ShaderNodeValToRGB")
    sramp.color_ramp.elements[0].position = 0.42
    sramp.color_ramp.elements[0].color = (0.82, 0.82, 0.82, 1)
    sramp.color_ramp.elements[1].position = 0.62
    sramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    l.new(streak.outputs["Fac"], sramp.inputs["Fac"])
    tone.inputs["Factor"].default_value = 1.0
    l.new(ramp.outputs["Color"], tone.inputs["A"])
    l.new(sramp.outputs["Color"], tone.inputs["B"])
    l.new(tone.outputs["Result"], bsdf.inputs["Base Color"])
    rough = node(n, "ShaderNodeMapRange")
    rough.inputs["To Min"].default_value = 0.42
    rough.inputs["To Max"].default_value = 0.68
    l.new(fine.outputs["Fac"], rough.inputs["Value"])
    l.new(rough.outputs["Result"], bsdf.inputs["Roughness"])
    bump = node(n, "ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.12
    bump.inputs["Distance"].default_value = 0.02
    l.new(fine.outputs["Fac"], bump.inputs["Height"])
    l.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return m


def water():
    m, n, l = mat("Water")
    bsdf = n["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.006, 0.009, 0.012, 1)
    bsdf.inputs["Roughness"].default_value = 0.012
    bsdf.inputs["IOR"].default_value = 1.333
    coord = node(n, "ShaderNodeTexCoord")
    # long, low swells across the view (stretched along x) + finer wind ripples
    def layer(scale, stretch, detail, dist):
        mp = node(n, "ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (stretch[0], stretch[1], 1)
        tx = node(n, "ShaderNodeTexNoise")
        tx.inputs["Scale"].default_value = scale
        tx.inputs["Detail"].default_value = detail
        tx.inputs["Distortion"].default_value = dist
        l.new(coord.outputs["Object"], mp.inputs["Vector"])
        l.new(mp.outputs["Vector"], tx.inputs["Vector"])
        return tx
    swell = layer(0.06, (0.25, 1.0), 2, 0.4)
    ripple = layer(0.55, (0.35, 1.0), 4, 0.6)
    add = node(n, "ShaderNodeMath", operation="MULTIPLY_ADD")
    add.inputs[1].default_value = 0.45
    l.new(ripple.outputs["Fac"], add.inputs[0])
    l.new(swell.outputs["Fac"], add.inputs[2])
    bump = node(n, "ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.16
    bump.inputs["Distance"].default_value = 0.12
    l.new(add.outputs["Value"], bump.inputs["Height"])
    l.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return m


def figure_mat():
    m, n, _ = mat("Coat")
    bsdf = n["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.025, 0.024, 0.026, 1)
    bsdf.inputs["Roughness"].default_value = 0.7
    bsdf.inputs["Sheen Weight"].default_value = 0.4
    return m


# --- geometry ---------------------------------------------------------------------
def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def box(name, size, loc, material):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    return o


def bevel(o, width, segments=3):
    b = o.modifiers.new("Bevel", "BEVEL")
    b.width = width
    b.segments = segments
    b.limit_method = "ANGLE"


def slab(material):
    s = SLAB
    o = box("Slab", (s["w"], s["d"], s["h"]), (0, 0, s["h"] / 2 - 1.0), material)
    # the arched opening: a box for the jambs and a cylinder for the round head
    r = s["arch_w"] / 2
    cut = box("ArchCut", (s["arch_w"], s["d"] * 3, s["arch_spring"] + 2), (0, 0, s["arch_spring"] / 2 - 1.0), material)
    bpy.ops.mesh.primitive_cylinder_add(vertices=128, radius=r, depth=s["d"] * 3, location=(0, 0, s["arch_spring"]),
                                        rotation=(math.pi / 2, 0, 0))
    head = bpy.context.active_object
    for c in (cut, head):
        m = o.modifiers.new("Arch", "BOOLEAN")
        m.object = c
        m.operation = "DIFFERENCE"
        m.solver = "EXACT"
    bpy.context.view_layer.objects.active = o
    for mod in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for c in (cut, head):
        bpy.data.objects.remove(c, do_unlink=True)
    bevel(o, 0.06)
    o.location = (s["x"], s["y"], s["h"] / 2 - 1.0)
    o.rotation_euler = (0, 0, math.radians(s["yaw"]))
    # a low plinth the slab stands on, just breaking the water
    p = box("Plinth", (s["w"] + 3.0, s["d"] + 3.0, 1.2), (s["x"], s["y"], -0.45), material)
    p.rotation_euler = o.rotation_euler
    bevel(p, 0.08)
    return o


def causeway(material):
    sx, sy = CAUSEWAY["start"]
    ex, ey = SLAB["x"] - 2.2, SLAB["y"] - SLAB["d"] / 2 - 2.0
    length = math.hypot(ex - sx, ey - sy)
    ang = math.atan2(ex - sx, ey - sy)
    c = box("Causeway", (CAUSEWAY["width"], length, 1.0), ((sx + ex) / 2, (sy + ey) / 2, CAUSEWAY["top"] - 0.5), material)
    c.rotation_euler = (0, 0, -ang)
    bevel(c, 0.04)
    return (sx, sy), (ex, ey), ang


def figure(at, facing, material):
    """A small standing figure in a long coat, seen from behind. Simple solids (ellipsoids and
    tapered cylinders) are merged by a voxel remesh into one smooth form, then softened."""
    k = FIGURE["height"] / 1.78
    parts = []

    def ellipsoid(co, r):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, radius=1, location=Vector(co) * k)
        o = bpy.context.active_object
        o.scale = Vector(r) * k
        parts.append(o)

    def limb(top, bottom, r_top, r_bottom):
        top, bottom = Vector(top) * k, Vector(bottom) * k
        bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=r_bottom * k, radius2=r_top * k, depth=(top - bottom).length,
                                        location=(top + bottom) / 2)
        o = bpy.context.active_object
        o.rotation_euler = (top - bottom).to_track_quat("Z", "Y").to_euler()
        parts.append(o)

    ellipsoid((0, 0, 1.655), (0.088, 0.1, 0.115))         # head
    limb((0, 0, 1.58), (0, 0, 1.47), 0.05, 0.06)           # neck
    ellipsoid((0, 0, 1.385), (0.19, 0.115, 0.085))         # shoulders, sloping
    limb((0, 0, 1.42), (0, 0, 0.6), 0.15, 0.215)           # the coat, flaring to just below the knee
    ellipsoid((0, -0.01, 1.5), (0.075, 0.07, 0.05))       # turned-up collar
    ellipsoid((0, 0, 1.18), (0.175, 0.118, 0.26))          # back
    for side in (-1, 1):
        limb((side * 0.2, 0.0, 1.38), (side * 0.235, 0.03, 0.86), 0.055, 0.045)   # arm, in its sleeve
        ellipsoid((side * 0.237, 0.035, 0.84), (0.04, 0.035, 0.05))               # hand
        limb((side * 0.08, 0, 0.66), (side * 0.085, 0, 0.06), 0.06, 0.045)        # leg
        ellipsoid((side * 0.085, 0.05, 0.035), (0.045, 0.11, 0.04))               # shoe
    bpy.ops.object.select_all(action="DESELECT")
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = "Figure"
    # bake every part's placement into the mesh, so the origin is at the feet
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    rm = o.modifiers.new("Merge", "REMESH")
    rm.mode = "VOXEL"
    rm.voxel_size = 0.012 * k
    sm = o.modifiers.new("Soften", "SMOOTH")
    sm.factor = 0.6
    sm.iterations = 6
    o.location = (at[0], at[1], CAUSEWAY["top"])
    o.rotation_euler = (0, 0, facing)
    o.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    return o


def haze():
    """A thin, even haze in a box around the scene (a world volume would swallow the sky at infinity):
    aerial perspective on the slab and soft light shafts through the arch."""
    m, n, l = mat("Haze")
    n.remove(n["Principled BSDF"])
    vol = node(n, "ShaderNodeVolumePrincipled")
    vol.inputs["Density"].default_value = 0.00035
    vol.inputs["Color"].default_value = (0.92, 0.86, 0.82, 1)
    vol.inputs["Anisotropy"].default_value = 0.72
    l.new(vol.outputs["Volume"], n["Material Output"].inputs["Volume"])
    o = box("Haze", (900, 520, 140), (0, 230, 69.5), m)
    o.visible_shadow = False
    return o


def sea(material):
    bpy.ops.mesh.primitive_plane_add(size=24000, location=(0, 9000, 0))
    o = bpy.context.active_object
    o.name = "Sea"
    o.data.materials.append(material)
    o.pass_index = 1
    return o


# --- camera, render ---------------------------------------------------------------
def camera(variant):
    (w, h), focal, shift_y, cam_x, yaw = VARIANTS[variant]
    cam = bpy.data.cameras.new("Camera")
    cam.lens = focal
    cam.sensor_fit = "HORIZONTAL" if w >= h else "VERTICAL"
    cam.sensor_width = 36
    cam.sensor_height = 36
    cam.shift_y = shift_y
    o = bpy.data.objects.new("Camera", cam)
    link(o)
    o.location = (cam_x, 0, EYE)
    o.rotation_euler = (math.radians(90), 0, math.radians(yaw))
    bpy.context.scene.camera = o
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = int(w * args.scale), int(h * args.scale)
    return o


def render_settings():
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    cy = sc.cycles
    cy.device = "CPU"
    cy.samples = args.samples or (48 if args.preview else 384)
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.02 if args.preview else 0.008
    cy.use_denoising = True
    cy.denoiser = "OPENIMAGEDENOISE"
    cy.max_bounces = 6
    cy.glossy_bounces = 4
    cy.volume_bounces = 0
    cy.volume_step_rate = 4.0
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    cy.blur_glossy = 0.5
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
    sc.view_settings.exposure = -1.3
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_depth = "16"
    sc.render.film_transparent = False
    vl = sc.view_layers[0]
    vl.use_pass_object_index = True


def compositor_mask(out_mask):
    """Write a mask of the open water (object index 1) next to the beauty render."""
    sc = bpy.context.scene
    sc.use_nodes = True
    nt = sc.node_tree
    nt.nodes.clear()
    rl = nt.nodes.new("CompositorNodeRLayers")
    comp = nt.nodes.new("CompositorNodeComposite")
    nt.links.new(rl.outputs["Image"], comp.inputs["Image"])
    idm = nt.nodes.new("CompositorNodeIDMask")
    idm.index = 1
    idm.use_antialiasing = True
    nt.links.new(rl.outputs["IndexOB"], idm.inputs["ID value"])
    fo = nt.nodes.new("CompositorNodeOutputFile")
    fo.base_path = str(out_mask.parent)
    fo.file_slots[0].path = out_mask.stem + "-"
    fo.format.file_format = "PNG"
    fo.format.color_mode = "BW"
    fo.format.color_depth = "8"
    nt.links.new(idm.outputs["Alpha"], fo.inputs[0])


def main():
    clean()
    sc = bpy.context.scene
    sc.frame_set(1)
    # the sun stands exactly behind the arch, as seen from the camera
    sun_az = math.atan2(SLAB["x"], SLAB["y"])
    world(sun_az)
    st = stone()
    slab(st)
    start, end, ang = causeway(st)
    t = FIGURE["t"]
    at = (start[0] + (end[0] - start[0]) * t + 0.15, start[1] + (end[1] - start[1]) * t)
    figure(at, -ang + math.radians(4), figure_mat())
    sea(water())
    haze()
    cam = camera(args.variant)
    if args.closeup:
        cam.location = (at[0] - 1.2, at[1] - 7.0, 1.2)
        cam.data.lens = 50
        cam.data.shift_y = 0
        cam.rotation_euler = (math.radians(88), 0, math.radians(-9))
    render_settings()
    OUT.mkdir(parents=True, exist_ok=True)
    name = args.out or (f"gateway-{args.variant}" + ("-preview" if args.preview else ""))
    beauty = OUT / f"{name}.png"
    compositor_mask(OUT / f"{name}-water.png")
    sc.render.filepath = str(beauty)
    if args.dry:
        for o in sc.objects:
            print("OBJ", o.name, [round(v, 1) for v in o.location], [round(math.degrees(v), 1) for v in o.rotation_euler],
                  [round(v, 1) for v in o.dimensions])
        return
    bpy.ops.render.render(write_still=True)
    # the file output node appends the frame number: give the mask its plain name
    for f in OUT.glob(f"{name}-water-*.png"):
        f.replace(OUT / f"{name}-water.png")
    print("wrote", beauty)


main()
