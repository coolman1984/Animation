"""Rave Studio — stage assets modelled in Blender (bpy 4.5).

Run headless (portable Blender or the `bpy` wheel):
    blender -b -P stage_assets.py -- --out ../assets            # GLB only
    blender -b -P stage_assets.py -- --out ../assets --poster   # GLB + Cycles key-art still

Everything is procedural: no downloaded model, texture or HDRI. Units are metres, Y-up after glTF export.
Every object has a stable name the web app looks up (see README.md "Asset names"). Pivots sit where the
web app rotates them (moving-head yoke and head, crowd shoulders are computed in the app).
"""
import math
import os
import random
import sys

import bpy  # first: with the bpy wheel, bmesh/mathutils exist only after bpy loads
import bmesh
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(argv[argv.index("--out") + 1]) if "--out" in argv else os.path.abspath("assets")
POSTER = "--poster" in argv
SAMPLES = int(argv[argv.index("--samples") + 1]) if "--samples" in argv else 96
RES = argv[argv.index("--res") + 1] if "--res" in argv else "1600x900"
os.makedirs(OUT, exist_ok=True)
random.seed(1984)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
ASSETS = bpy.data.collections.new("assets")
scene.collection.children.link(ASSETS)


# ---------------------------------------------------------------- helpers
def material(name, color, metal=0.0, rough=0.5, emit=None, strength=0.0):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Metallic"].default_value = metal
    p.inputs["Roughness"].default_value = rough
    if emit:
        p.inputs["Emission Color"].default_value = (*emit, 1)
        p.inputs["Emission Strength"].default_value = strength
    return m


M_STEEL = material("steel", (0.32, 0.34, 0.37), metal=1.0, rough=0.42)
M_DARK = material("dark_metal", (0.035, 0.037, 0.042), metal=0.6, rough=0.55)
M_PANEL = material("gate_panel", (0.26, 0.17, 0.11), metal=0.8, rough=0.48)
M_GRILLE = material("grille", (0.015, 0.015, 0.018), rough=0.9)
M_GLOW = material("glow", (1, 0.5, 0.12), emit=(1.0, 0.45, 0.08), strength=30)
M_BULB = material("bulb", (1, 0.6, 0.3), emit=(1.0, 0.5, 0.18), strength=7)
M_LENS = material("lens", (0.8, 0.9, 1), emit=(0.6, 0.85, 1.0), strength=10)
M_STONE = material("monolith", (0.05, 0.05, 0.06), metal=0.2, rough=0.35)
M_SKIN = material("crowd", (0.02, 0.02, 0.025), rough=0.8)


def obj_from_bm(name, bm, mat, smooth=False, bevel=0.0, coll=ASSETS):
    me = bpy.data.meshes.new(name)
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    if smooth:
        for poly in me.polygons:
            poly.use_smooth = True
    o = bpy.data.objects.new(name, me)
    o.data.materials.append(mat)
    coll.objects.link(o)
    if bevel:
        mod = o.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 1
        mod.limit_method = "ANGLE"
        mod.angle_limit = math.radians(40)
        mod.harden_normals = True
    return o


def box(bm, size, loc=(0, 0, 0), rot=None):
    """Add an axis box (Blender Z-up: size = (x, y, z))."""
    m = Matrix.Translation(Vector(loc))
    if rot:
        m = m @ rot
    m = m @ Matrix.Diagonal((*size, 1))
    bmesh.ops.create_cube(bm, size=1.0, matrix=m)


def cyl(bm, a, b, r, segs=6, cap=True):
    """Cylinder between two points."""
    a, b = Vector(a), Vector(b)
    d = b - a
    length = d.length
    if length < 1e-6:
        return
    rot = d.to_track_quat("Z", "Y").to_matrix().to_4x4()
    m = Matrix.Translation((a + b) / 2) @ rot
    bmesh.ops.create_cone(bm, cap_ends=cap, segments=segs, radius1=r, radius2=r, depth=length, matrix=m)


def sphere(bm, loc, r, sub=1):
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r, matrix=Matrix.Translation(Vector(loc)))


# ---------------------------------------------------------------- gate ring (canyon world hero)
# 24 chunky plate blocks around a 6.9 m radius, each its own object so the web app can explode and
# reassemble them along their radial axis. Blender Z is up here; the glTF export turns it into Y-up.
SEGS = 24
for i in range(SEGS):
    bm = bmesh.new()
    a0 = (i / SEGS) * math.tau
    span = math.tau / SEGS * 0.9
    r_in, r_out = 6.25, 7.65
    # A block = 3 stacked sub-plates with slight offsets: reads as heavy riveted metal, not a torus.
    for k in range(3):
        aa = a0 + span * (k / 3) + random.uniform(-0.01, 0.01)
        sub = span / 3 * 0.94
        mid = aa + sub / 2
        rr = (r_in + r_out) / 2 + random.uniform(-0.08, 0.12)
        w = 2 * rr * math.sin(sub / 2)
        depth = 1.5 + random.uniform(-0.15, 0.3)
        thick = (r_out - r_in) + random.uniform(-0.2, 0.15)
        # The ring stands in the XZ plane (faces -Y). Rotating -mid about Y points local X along the radius.
        loc = (math.cos(mid) * rr, random.uniform(-0.1, 0.1), math.sin(mid) * rr)
        tilt = Matrix.Rotation(random.uniform(-0.04, 0.04), 4, "Z")
        box(bm, (thick, depth, w), loc, rot=Matrix.Rotation(-mid, 4, "Y") @ tilt)
    o = obj_from_bm(f"gate_panel_{i:02d}", bm, M_PANEL, bevel=0.035)
    o["angle"] = (i + 0.45) / SEGS * 360

bpy.ops.mesh.primitive_torus_add(major_radius=5.86, minor_radius=0.075, major_segments=128, minor_segments=8,
                                 rotation=(math.pi / 2, 0, 0))
glow = bpy.context.active_object
bpy.ops.object.transform_apply(rotation=True)
glow.name = "gate_glow"
glow.data.materials.append(M_GLOW)
for c in glow.users_collection:
    c.objects.unlink(glow)
ASSETS.objects.link(glow)
bpy.ops.mesh.primitive_torus_add(major_radius=6.16, minor_radius=0.16, major_segments=96, minor_segments=8,
                                 rotation=(math.pi / 2, 0, 0))
frame = bpy.context.active_object
bpy.ops.object.transform_apply(rotation=True)
frame.name = "gate_frame"
frame.data.materials.append(M_DARK)
for c in frame.users_collection:
    c.objects.unlink(frame)
ASSETS.objects.link(frame)

# ---------------------------------------------------------------- box truss segment (2 m, instanced)
bm = bmesh.new()
L, S = 2.0, 0.3
h = S / 2
corners = [(-h, -h), (h, -h), (h, h), (-h, h)]
for (x, y) in corners:
    cyl(bm, (x, y, 0), (x, y, L), 0.024, segs=6)
steps = 5
for f in range(4):
    (x0, y0), (x1, y1) = corners[f], corners[(f + 1) % 4]
    for s in range(steps):
        z0, z1 = L * s / steps, L * (s + 1) / steps
        if s % 2 == 0:
            cyl(bm, (x0, y0, z0), (x1, y1, z1), 0.011, segs=4, cap=False)
        else:
            cyl(bm, (x1, y1, z0), (x0, y0, z1), 0.011, segs=4, cap=False)
obj_from_bm("truss_seg", bm, M_STEEL)

# ---------------------------------------------------------------- line-array speaker element
bm = bmesh.new()
box(bm, (1.1, 0.55, 0.32), (0, 0, 0))
box(bm, (0.04, 0.5, 0.36), (-0.57, 0, 0))  # rigging side plates
box(bm, (0.04, 0.5, 0.36), (0.57, 0, 0))
obj_from_bm("speaker", bm, M_DARK, bevel=0.012)
bm = bmesh.new()
box(bm, (1.0, 0.02, 0.26), (0, -0.28, 0))
obj_from_bm("speaker_grille", bm, M_GRILLE)

# ---------------------------------------------------------------- DJ booth + gear
bm = bmesh.new()
box(bm, (3.8, 1.1, 1.05), (0, 0, 0.525))
box(bm, (4.0, 1.25, 0.06), (0, 0, 1.08))
obj_from_bm("booth", bm, M_DARK, bevel=0.02)
bm = bmesh.new()
for i in range(14):
    x = -1.75 + i * (3.5 / 13)
    box(bm, (0.07, 0.03, 0.85), (x, -0.57, 0.5))
obj_from_bm("booth_slats", bm, M_GLOW)
bm = bmesh.new()
for x in (-1.15, 1.15):
    box(bm, (0.42, 0.48, 0.1), (x, 0.05, 1.16))
    cyl(bm, (x, 0.08, 1.21), (x, 0.08, 1.23), 0.15, segs=24)  # jog wheel
box(bm, (0.5, 0.45, 0.1), (0, 0.05, 1.16))
obj_from_bm("booth_gear", bm, M_STEEL)

# ---------------------------------------------------------------- crowd person (low poly, arms hanging)
# Shoulder pivots at x = ±0.25, z = 1.42. The web app rotates every vertex with |x| > 0.215 and z < 1.47
# about its shoulder, so arms go up on the drop without a skeleton (one InstancedMesh, thousands of people).
bm = bmesh.new()
for x in (-0.095, 0.095):
    box(bm, (0.13, 0.15, 0.86), (x, 0, 0.43))
box(bm, (0.32, 0.2, 0.3), (0, 0, 1.0))
box(bm, (0.4, 0.22, 0.32), (0, 0, 1.3))
box(bm, (0.09, 0.09, 0.08), (0, 0, 1.49))
sphere(bm, (0, 0, 1.62), 0.115, sub=1)
for x in (-0.255, 0.255):
    box(bm, (0.085, 0.09, 0.64), (x, 0, 1.1))
obj_from_bm("crowd_person", bm, M_SKIN)

# ---------------------------------------------------------------- moving head (base / yoke / head / lens)
bm = bmesh.new()
box(bm, (0.42, 0.32, 0.16), (0, 0, 0.08))
obj_from_bm("mh_base", bm, M_DARK, bevel=0.01)
bm = bmesh.new()
box(bm, (0.06, 0.12, 0.36), (-0.19, 0, 0.18))
box(bm, (0.06, 0.12, 0.36), (0.19, 0, 0.18))
box(bm, (0.44, 0.12, 0.05), (0, 0, 0.025))
yoke = obj_from_bm("mh_yoke", bm, M_DARK)
bm = bmesh.new()
cyl(bm, (0, -0.16, 0), (0, 0.2, 0), 0.15, segs=16)
obj_from_bm("mh_head", bm, M_DARK)
bm = bmesh.new()
cyl(bm, (0, 0.2, 0), (0, 0.215, 0), 0.12, segs=16)
obj_from_bm("mh_lens", bm, M_LENS)

# ---------------------------------------------------------------- industrial cage lamp (warehouse)
bm = bmesh.new()
bmesh.ops.create_cone(bm, cap_ends=False, segments=16, radius1=0.22, radius2=0.06, depth=0.16,
                      matrix=Matrix.Translation((0, 0, 0.0)))
for k in range(8):
    a = k / 8 * math.tau
    cyl(bm, (math.cos(a) * 0.2, math.sin(a) * 0.2, -0.08), (math.cos(a) * 0.12, math.sin(a) * 0.12, -0.32), 0.006, 4)
cyl(bm, (0, 0, 0.08), (0, 0, 0.4), 0.015, 6)
obj_from_bm("lamp_cage", bm, M_DARK)
bm = bmesh.new()
sphere(bm, (0, 0, -0.17), 0.1, sub=2)
obj_from_bm("lamp_bulb", bm, M_BULB, smooth=True)

# ---------------------------------------------------------------- blinder (2 x 3 cells, canyon towers)
bm = bmesh.new()
box(bm, (0.95, 0.18, 0.64), (0, 0, 0))
obj_from_bm("blinder", bm, M_DARK, bevel=0.01)
bm = bmesh.new()
for cx in (-0.3, 0, 0.3):
    for cz in (-0.15, 0.15):
        box(bm, (0.24, 0.02, 0.24), (cx, -0.1, cz))
obj_from_bm("blinder_cells", bm, M_BULB)

# ---------------------------------------------------------------- monolith (cosmic temple)
bm = bmesh.new()
box(bm, (1.3, 0.7, 7.0), (0, 0, 3.5))
box(bm, (1.5, 0.9, 0.3), (0, 0, 0.15))
obj_from_bm("monolith", bm, M_STONE, bevel=0.04)
bm = bmesh.new()
for z in (1.2, 2.6, 4.0, 5.4):
    box(bm, (1.0, 0.02, 0.05), (0, -0.36, z))
box(bm, (0.05, 0.02, 5.4), (0, -0.36, 3.6))
obj_from_bm("monolith_lines", bm, M_LENS)

# ---------------------------------------------------------------- export GLB
# The two tori are rebuilt in the web app with THREE.TorusGeometry (same radii): 7k vertices of GLB saved.
for o in scene.objects:
    o.select_set(o.name in ASSETS.objects and o.name not in ("gate_glow", "gate_frame"))
glb = os.path.join(OUT, "stage.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_apply=True,
                          export_yup=True, export_texcoords=False, export_normals=True,
                          export_materials="EXPORT", export_extras=True)
print("GLB", glb, os.path.getsize(glb), "bytes,", len(ASSETS.objects), "objects")

if not POSTER:
    sys.exit(0)

# ---------------------------------------------------------------- key-art still (Cycles, CPU)
# A canyon-at-dusk festival built from the same assets: the image that greets the web app.
ASSETS.hide_render = True
SHOT = bpy.data.collections.new("shot")
scene.collection.children.link(SHOT)


def place(src_name, loc, rot=None, scale=1.0):
    src = bpy.data.objects[src_name]
    o = src.copy()
    o.location = loc
    if rot is not None:
        o.rotation_euler = rot
    o.scale = (scale, scale, scale)
    SHOT.objects.link(o)
    return o


for o in list(ASSETS.objects):
    if o.name.startswith("gate_"):
        place(o.name, (0, 22, 8.6))

for x in (-11.5, 11.5):
    for k in range(6):
        place("truss_seg", (x, 22, k * 2.0))
    for k in range(3):
        b = place("blinder", (x - math.copysign(0.0, x), 21.75, 3.0 + k * 2.6))
        place("blinder_cells", b.location.copy())
    for k in range(9):
        place("speaker", (x * 0.82, 21.0, 9.5 - k * 0.34), rot=(math.radians(-2 * k), 0, 0))
place("booth", (0, 20.4, 0.6))
place("booth_slats", (0, 20.4, 0.6))
place("booth_gear", (0, 20.4, 0.6))
place("crowd_person", (0.0, 20.9, 0.6), rot=(0, 0, math.pi))  # the DJ

# stage deck
bm = bmesh.new()
box(bm, (30, 9, 0.6), (0, 23, 0.3))
obj_from_bm("deck", bm, M_DARK, coll=SHOT)

# crowd: linked duplicates
for i in range(420):
    x = random.uniform(-16, 16)
    y = random.uniform(0.5, 17)
    if y > 15.5 and abs(x) < 6:
        continue
    o = place("crowd_person", (x, y, 0), rot=(0, 0, random.uniform(-0.4, 0.4) + math.pi), scale=random.uniform(0.92, 1.08))

# canyon walls: subdivided planes, scale applied, two displacement octaves, sandstone strata in the shader
rock = bpy.data.materials.new("sandstone")
rock.use_nodes = True
rn = rock.node_tree
rp = rn.nodes["Principled BSDF"]
rp.inputs["Roughness"].default_value = 0.95
tc = rn.nodes.new("ShaderNodeTexCoord")
wave = rn.nodes.new("ShaderNodeTexWave")
wave.bands_direction = "Z"
wave.inputs["Scale"].default_value = 0.09
wave.inputs["Distortion"].default_value = 6.0
wave.inputs["Detail"].default_value = 4.0
ramp = rn.nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].color = (0.30, 0.09, 0.035, 1)
ramp.color_ramp.elements[1].color = (0.62, 0.25, 0.11, 1)
rn.links.new(tc.outputs["Object"], wave.inputs["Vector"])
rn.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
rn.links.new(ramp.outputs["Color"], rp.inputs["Base Color"])
for side, (sx, sy, yaw) in ((-1, (-30, 40, 58)), (1, (31, 22, -64))):
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=220, y_subdivisions=120, size=1)
    w = bpy.context.active_object
    w.scale = (110, 55, 1)
    bpy.ops.object.transform_apply(scale=True)
    for c in w.users_collection:
        c.objects.unlink(w)
    SHOT.objects.link(w)
    w.name = f"cliff_{side}"
    w.rotation_euler = (math.pi / 2, 0, math.radians(yaw))
    w.location = (sx, sy, 22)
    for scale, strength in ((22.0, 9.0), (4.0, 2.2), (1.1, 0.5)):
        t = bpy.data.textures.new(f"rock{scale}", "CLOUDS")
        t.noise_scale = scale
        t.noise_depth = 3
        d = w.modifiers.new(f"disp{scale}", "DISPLACE")
        d.texture = t
        d.strength = strength
        d.texture_coords = "LOCAL"
    w.data.materials.append(rock)

# black backdrop inside the gate so the haze reads against darkness
bpy.ops.mesh.primitive_cylinder_add(radius=6.2, depth=0.2, vertices=64, location=(0, 23.4, 8.6), rotation=(math.pi / 2, 0, 0))
bd = bpy.context.active_object
for c in bd.users_collection:
    c.objects.unlink(bd)
SHOT.objects.link(bd)
bd.data.materials.append(M_GRILLE)

# ground
bm = bmesh.new()
box(bm, (200, 200, 0.1), (0, 20, -0.05))
obj_from_bm("ground", bm, material("sand", (0.18, 0.1, 0.06), rough=1.0), coll=SHOT)

# lights: warm key from the gate, blue beam spots, sky
def light(kind, loc, target, energy, color, size=0.3, spot=None):
    ld = bpy.data.lights.new(f"L{len(bpy.data.lights)}", kind)
    ld.energy = energy
    ld.color = color
    if kind == "SPOT":
        ld.spot_size = spot or math.radians(6)
        ld.spot_blend = 0.3 if (spot or 1) < 0.2 else 1.0
        ld.shadow_soft_size = 0.05
    elif kind == "AREA":
        ld.size = size
    else:
        ld.shadow_soft_size = size
    lo = bpy.data.objects.new(ld.name, ld)
    lo.location = loc
    if target is not None:
        lo.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    SHOT.objects.link(lo)
    return lo


light("AREA", (0, 22.8, 8.6), (0, 0, 8.6), 900, (1.0, 0.42, 0.1), size=9)  # behind the gate, facing us
light("POINT", (0, 21.5, 3), None, 1800, (1.0, 0.5, 0.15), size=1.5)
for k in range(10):
    x = -10 + k * (20 / 9)
    tx = x * 3 + random.uniform(-25, 25)
    light("SPOT", (x, 21, 1.2), (tx, random.uniform(-30, 0), random.uniform(18, 40)), 5e5, (0.15, 0.4, 1.0),
          spot=math.radians(2.4))
for side in (-1, 1):
    light("SPOT", (side * 11.5, 21.6, 5.6), (side * 9, 0, 1.5), 1500, (1.0, 0.55, 0.2), spot=math.radians(40))
light("SPOT", (-20, -10, 45), (34, 34, 14), 2.5e6, (1.0, 0.42, 0.16), spot=math.radians(24))  # warm grazing wash, right cliff
light("SPOT", (20, -10, 45), (-34, 40, 14), 6e5, (1.0, 0.4, 0.15), spot=math.radians(20))

world = bpy.data.worlds.new("dusk")
scene.world = world
world.use_nodes = True
nt = world.node_tree
sky = nt.nodes.new("ShaderNodeTexSky")
sky.sky_type = "NISHITA"
sky.sun_elevation = math.radians(-2.5)
sky.sun_rotation = math.radians(180)
sky.altitude = 400
bg = nt.nodes["Background"]
bg.inputs["Strength"].default_value = 1.6
nt.links.new(sky.outputs["Color"], bg.inputs["Color"])
# haze: a volume box around the stage so beams read
bm = bmesh.new()
box(bm, (36, 18, 13), (0, 20, 6.5))
vol_mat = bpy.data.materials.new("haze")
vol_mat.use_nodes = True
vn = vol_mat.node_tree
vn.nodes.remove(vn.nodes["Principled BSDF"])
pv = vn.nodes.new("ShaderNodeVolumePrincipled")
pv.inputs["Density"].default_value = 0.012
pv.inputs["Anisotropy"].default_value = 0.35
vn.links.new(pv.outputs["Volume"], vn.nodes["Material Output"].inputs["Volume"])
obj_from_bm("haze", bm, vol_mat, coll=SHOT)

cam_data = bpy.data.cameras.new("cam")
cam_data.lens = 22
cam = bpy.data.objects.new("cam", cam_data)
cam.location = (4.5, -3.0, 1.9)
cam.rotation_euler = (Vector((-2.5, 22, 8.5)) - cam.location).to_track_quat("-Z", "Y").to_euler()
SHOT.objects.link(cam)
scene.camera = cam

w, h = (int(v) for v in RES.split("x"))
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
scene.cycles.volume_step_rate = 4.0
scene.cycles.max_bounces = 4
scene.render.resolution_x = w
scene.render.resolution_y = h
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Punchy"
scene.render.image_settings.file_format = "JPEG"
scene.render.image_settings.quality = 86
scene.render.filepath = os.path.join(OUT, "poster.jpg")
bpy.ops.render.render(write_still=True)
print("POSTER", scene.render.filepath)
