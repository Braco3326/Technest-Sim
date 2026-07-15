"""
gen_asset.py — headless Blender generator (CLI fallback for the Blender MCP).
Builds ONE asset from content/catalog.json and exports a .glb + a thumbnail.

Conventions (blender-pipeline / CLAUDE.md):
  meters 1:1 - origin at the functional point (connectors: mating tip, devices:
  floor center) - mating direction -Y - object name = catalog id - one Empty
  per port named port_<portId> - single neutral PBR material - no brand logos.

Usage:
  blender --background --factory-startup --python tools/blender/gen_asset.py -- \
      --kind device|connector --id <catalog-id> --catalog content/catalog.json \
      --out public/assets/<id>.glb --thumb public/assets/thumbs/<id>.png

Prints "STATS tris=<n> ports=<k>" for the batch driver.
"""
import bpy
import json
import math
import sys


# ── cli ──────────────────────────────────────────────────────────────────────
def arg(name, default=None):
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    return argv[argv.index(name) + 1] if name in argv else default


KIND = arg("--kind")
AID = arg("--id")
CATALOG = arg("--catalog", "content/catalog.json")
OUT = arg("--out")
THUMB = arg("--thumb")

with open(CATALOG, encoding="utf8") as f:
    catalog = json.load(f)

# ── scene reset ──────────────────────────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 1.0

MAT = bpy.data.materials.new("PBR_Neutral")
MAT.use_nodes = True
bsdf = MAT.node_tree.nodes.get("Principled BSDF")


def paint(rgba, rough=0.6, metal=0.0):
    m = MAT.copy()
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = rgba
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    return m


DARK = (0.08, 0.09, 0.11, 1)
STEEL = (0.55, 0.57, 0.6, 1)
BODY = (0.16, 0.18, 0.24, 1)


def link(obj):
    bpy.context.collection.objects.link(obj)
    return obj


def box(name, w, d, h, at=(0, 0, 0), mat=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(at[0], at[1], at[2]))
    o = bpy.context.active_object
    o.name = name
    o.scale = (w / 2, d / 2, h / 2)
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(mat or paint(BODY))
    return o


def cyl(name, r, depth, at=(0, 0, 0), axis="Z", verts=24, mat=None):
    rot = {"Z": (0, 0, 0), "Y": (math.pi / 2, 0, 0), "X": (0, math.pi / 2, 0)}[axis]
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, vertices=verts, location=at, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(mat or paint(STEEL, 0.35, 0.8))
    return o


def sphere(name, r, at=(0, 0, 0), seg=16, mat=None):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=seg, ring_count=max(8, seg // 2), location=at)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(mat or paint(DARK))
    return o


def join_all(name, objs):
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    root = bpy.context.active_object
    root.name = name
    return root


# ── connector recipes (mating tip at origin, plug travels −Y) ────────────────
def connector_recipe(cid):
    mm = 0.001
    parts = []
    if cid.startswith("xlr"):
        n_pins = 5 if "5" in cid else 3
        male = cid.endswith("-m")
        parts.append(cyl("body", 9.5 * mm, 55 * mm, at=(0, 27.5 * mm, 0), axis="Y", mat=paint(DARK, 0.5)))
        parts.append(cyl("collar", 10.5 * mm, 12 * mm, at=(0, 6 * mm, 0), axis="Y"))
        if male:
            for i in range(n_pins):
                a = i * 2 * math.pi / n_pins
                parts.append(cyl(f"pin{i}", 1.2 * mm, 9 * mm, at=(6 * mm * math.cos(a), -4 * mm, 6 * mm * math.sin(a)), axis="Y", verts=10))
    elif cid in ("trs-quarter", "ts-quarter", "tt-bantam", "trs-35mm"):
        r = {"trs-quarter": 3.2, "ts-quarter": 3.2, "tt-bantam": 2.2, "trs-35mm": 1.75}[cid] * mm
        shaft_l = {"trs-quarter": 30, "ts-quarter": 30, "tt-bantam": 22, "trs-35mm": 15}[cid] * mm
        parts.append(cyl("shaft", r, shaft_l, at=(0, shaft_l / 2 - 2 * mm, 0), axis="Y", verts=16))
        parts.append(sphere("tip", r * 1.05, at=(0, -2 * mm, 0), seg=12, mat=paint(STEEL, 0.3, 0.9)))
        parts.append(cyl("body", r * 3.4, 28 * mm, at=(0, shaft_l + 12 * mm, 0), axis="Y", mat=paint(DARK, 0.5)))
    elif cid == "rca":
        parts.append(cyl("tip", 1.6 * mm, 12 * mm, at=(0, 4 * mm, 0), axis="Y", verts=12))
        parts.append(cyl("shield", 4.5 * mm, 8 * mm, at=(0, 6 * mm, 0), axis="Y", verts=16))
        parts.append(cyl("body", 5.5 * mm, 20 * mm, at=(0, 20 * mm, 0), axis="Y", mat=paint(DARK, 0.5)))
    elif cid in ("rj45", "ethercon"):
        parts.append(box("plug", 12 * mm, 20 * mm, 8 * mm, at=(0, 10 * mm, 0), mat=paint((0.75, 0.78, 0.8, 0.9), 0.2)))
        parts.append(box("clip", 6 * mm, 10 * mm, 2 * mm, at=(0, 12 * mm, 5 * mm)))
        if cid == "ethercon":
            parts.append(cyl("shell", 11 * mm, 26 * mm, at=(0, 15 * mm, 0), axis="Y", mat=paint(DARK, 0.5)))
    elif cid.startswith("powercon") or cid == "speakon-nl4":
        col = (0.1, 0.25, 0.7, 1) if cid == "powercon-blue" else (0.12, 0.12, 0.13, 1)
        parts.append(cyl("shell", 12 * mm, 30 * mm, at=(0, 15 * mm, 0), axis="Y", mat=paint(col, 0.5)))
        parts.append(cyl("latch", 13.5 * mm, 8 * mm, at=(0, 26 * mm, 0), axis="Y", mat=paint(DARK)))
        for a in (0, math.pi):
            parts.append(box("tab", 4 * mm, 6 * mm, 3 * mm, at=(13 * mm * math.cos(a), 3 * mm, 13 * mm * math.sin(a))))
    elif cid.startswith("iec-"):
        parts.append(box("shell", 24 * mm, 30 * mm, 16 * mm, at=(0, 15 * mm, 0), mat=paint(DARK, 0.5)))
        if cid == "iec-c14":
            for dx in (-7, 0, 7):
                parts.append(cyl(f"pin{dx}", 1.5 * mm, 8 * mm, at=(dx * mm, -2 * mm, 0), axis="Y", verts=10))
    elif cid.startswith("schuko"):
        parts.append(cyl("face", 18 * mm, 14 * mm, at=(0, 7 * mm, 0), axis="Y", mat=paint((0.9, 0.9, 0.88, 1), 0.4)))
        if cid == "schuko-plug":
            for dx in (-9.5, 9.5):
                parts.append(cyl(f"pin{dx}", 2.4 * mm, 19 * mm, at=(dx * mm, -6 * mm, 0), axis="Y", verts=12))
            parts.append(box("body", 36 * mm, 26 * mm, 40 * mm, at=(0, 24 * mm, 0), mat=paint(DARK, 0.5)))
    elif cid == "bnc":
        parts.append(cyl("barrel", 5.5 * mm, 15 * mm, at=(0, 7.5 * mm, 0), axis="Y", verts=20))
        for a in (0, math.pi):
            parts.append(cyl("bayonet", 1.2 * mm, 4 * mm, at=(6.5 * mm * math.cos(a), 3 * mm, 6.5 * mm * math.sin(a)), axis="X", verts=8))
        parts.append(cyl("body", 6.5 * mm, 18 * mm, at=(0, 22 * mm, 0), axis="Y", mat=paint(DARK, 0.5)))
    elif cid == "dsub25":
        parts.append(box("shell", 47 * mm, 14 * mm, 12 * mm, at=(0, 7 * mm, 0), mat=paint(STEEL, 0.35, 0.7)))
        parts.append(box("hood", 52 * mm, 24 * mm, 16 * mm, at=(0, 24 * mm, 0), mat=paint(DARK, 0.5)))
    elif cid == "toslink":
        parts.append(box("snout", 10 * mm, 12 * mm, 8 * mm, at=(0, 6 * mm, 0)))
        parts.append(box("body", 12 * mm, 22 * mm, 10 * mm, at=(0, 20 * mm, 0), mat=paint(DARK, 0.5)))
    elif cid.startswith("usb-"):
        w, hh = {"usb-a": (12, 4.5), "usb-b": (8, 7), "usb-c": (8.5, 2.5)}[cid]
        parts.append(box("plug", w * mm, 12 * mm, hh * mm, at=(0, 6 * mm, 0), mat=paint(STEEL, 0.3, 0.8)))
        parts.append(box("body", (w + 6) * mm, 24 * mm, (hh + 6) * mm, at=(0, 22 * mm, 0), mat=paint(DARK, 0.5)))
    elif cid == "digilink":
        parts.append(box("shell", 38 * mm, 14 * mm, 11 * mm, at=(0, 7 * mm, 0), mat=paint(STEEL, 0.35, 0.7)))
        parts.append(box("hood", 42 * mm, 26 * mm, 15 * mm, at=(0, 26 * mm, 0), mat=paint(DARK, 0.5)))
    elif cid == "gpio-terminal":
        parts.append(box("block", 30 * mm, 14 * mm, 12 * mm, at=(0, 7 * mm, 0), mat=paint((0.1, 0.45, 0.2, 1), 0.5)))
        for i in range(4):
            parts.append(cyl(f"screw{i}", 1.6 * mm, 4 * mm, at=((i - 1.5) * 7 * mm, 2 * mm, 7 * mm), axis="Z", verts=8))
    else:
        parts.append(box("generic", 15 * mm, 25 * mm, 12 * mm, at=(0, 12.5 * mm, 0)))
    return join_all(cid, parts)


# ── device recipes (floor-center origin, ports on −Y face) ──────────────────
CATEGORY_SIZE = {
    "console": (1.0, 0.55, 0.25),
    "stagebox": (0.48, 0.4, 0.18),
    "microphone": (0.07, 0.07, 0.22),
    "powered-speaker": (0.4, 0.36, 0.62),
    "studio-monitor": (0.2, 0.25, 0.3),
    "accessory": (0.06, 0.06, 1.6),
    "signaling": (0.12, 0.12, 0.28),
    "computer": (0.45, 0.2, 0.45),
    "codec": (0.48, 0.32, 0.09),
    "monitor-controller": (0.26, 0.3, 0.1),
    "mic-preamp": (0.24, 0.26, 0.09),
    "master-clock": (0.48, 0.26, 0.09),
    "patchbay": (0.48, 0.22, 0.14),
    "cable": (0.3, 0.12, 0.06),
}


def device_recipe(dev):
    cat = dev["realWorld"]["category"]
    w, d, h = CATEGORY_SIZE.get(cat, (0.4, 0.3, 0.3))
    parts = []
    if cat == "microphone":
        parts.append(cyl("handle", w * 0.45, h * 0.7, at=(0, 0, h * 0.35), axis="Z", mat=paint(DARK, 0.45)))
        parts.append(sphere("grille", w * 0.62, at=(0, 0, h * 0.82), seg=16, mat=paint(STEEL, 0.4, 0.6)))
    elif cat in ("powered-speaker", "studio-monitor"):
        parts.append(box("cab", w, d, h, at=(0, 0, h / 2), mat=paint(DARK, 0.7)))
        parts.append(cyl("woofer", w * 0.33, 0.02, at=(0, -d / 2 - 0.005, h * 0.38), axis="Y", mat=paint((0.03, 0.03, 0.035, 1), 0.9)))
        parts.append(cyl("horn", w * 0.14, 0.015, at=(0, -d / 2 - 0.005, h * 0.75), axis="Y", mat=paint((0.03, 0.03, 0.035, 1), 0.9)))
    elif cat == "console":
        parts.append(box("chassis", w, d, h * 0.6, at=(0, 0, h * 0.3), mat=paint(DARK, 0.6)))
        parts.append(box("surface", w * 0.96, d * 0.9, h * 0.12, at=(0, -d * 0.02, h * 0.62), mat=paint(BODY, 0.5)))
        parts.append(box("screen", w * 0.35, 0.02, h * 0.5, at=(w * 0.2, d * 0.25, h * 0.85), mat=paint((0.02, 0.05, 0.1, 1), 0.2)))
        for i in range(8):
            parts.append(box(f"fader{i}", 0.012, d * 0.3, 0.012, at=(-w * 0.38 + i * 0.06, -d * 0.2, h * 0.68)))
    elif cat == "accessory":
        parts.append(cyl("pole", 0.015, h, at=(0, 0, h / 2), axis="Z", mat=paint(DARK, 0.4)))
        for a in (0, 2.1, 4.2):
            parts.append(cyl(f"leg{a}", 0.01, 0.5, at=(0.18 * math.cos(a), 0.18 * math.sin(a), 0.12), axis="X", verts=10))
        parts.append(cyl("boom", 0.012, 0.8, at=(0, 0.25, h * 0.98), axis="Y", mat=paint(DARK, 0.4)))
    elif cat == "signaling":
        parts.append(cyl("base", w * 0.5, h * 0.25, at=(0, 0, h * 0.125), axis="Z", mat=paint(DARK)))
        parts.append(cyl("lamp", w * 0.42, h * 0.5, at=(0, 0, h * 0.62), axis="Z", mat=paint((0.8, 0.05, 0.05, 1), 0.3)))
    elif cat == "cable":
        parts.append(box("hood", 0.052, 0.03, 0.02, at=(0, -0.12, 0.02), mat=paint(DARK)))
        for i in range(8):
            parts.append(cyl(f"tail{i}", 0.004, 0.22, at=((i - 3.5) * 0.012, 0.02, 0.02), axis="Y", verts=8))
    else:  # rack units, desktops, computers
        parts.append(box("chassis", w, d, h, at=(0, 0, h / 2), mat=paint(DARK, 0.55)))
        if cat in ("codec", "master-clock", "patchbay", "mic-preamp", "monitor-controller"):
            for i in range(3):
                parts.append(cyl(f"knob{i}", 0.008, 0.01, at=(-w * 0.3 + i * 0.05, -d / 2 - 0.005, h * 0.5), axis="Y", verts=12))
        if cat == "computer":
            parts.append(box("slot", w * 0.7, 0.01, 0.01, at=(0, -d / 2 - 0.004, h * 0.7), mat=paint(STEEL)))

    root = join_all(dev["id"], parts)

    # Port empties on the −Y face — same grid math as the engine placeholders.
    ports = dev["ports"]
    n = len(ports)
    if n:
        cols = min(4, math.ceil(math.sqrt(n)))
        rows = math.ceil(n / cols)
        sx = max(0.04, min(0.1, w / (cols + 1)))
        sz = max(0.045, min(0.1, h / (rows + 1)))
        for i, p in enumerate(ports):
            col, row = i % cols, i // cols
            e = bpy.data.objects.new(f"port_{p['portId']}", None)
            e.empty_display_type = "PLAIN_AXES"
            e.empty_display_size = 0.02
            e.location = ((col - (cols - 1) / 2) * sx, -d / 2, h / 2 + ((rows - 1) / 2 - row) * sz)
            link(e).parent = root
    return root


# ── build ────────────────────────────────────────────────────────────────────
if KIND == "connector":
    root = connector_recipe(AID)
else:
    dev = next((x for x in catalog["devices"] if x["id"] == AID), None)
    if dev is None:
        print(f"ERROR unknown device id {AID}")
        sys.exit(2)
    root = device_recipe(dev)

bpy.ops.object.select_all(action="DESELECT")

# stats
tris = 0
for o in bpy.data.objects:
    if o.type == "MESH":
        o.data.calc_loop_triangles()
        tris += len(o.data.loop_triangles)
n_ports = sum(1 for o in bpy.data.objects if o.type == "EMPTY" and o.name.startswith("port_"))
print(f"STATS tris={tris} ports={n_ports}")

# ── export glb ───────────────────────────────────────────────────────────────
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB")

# ── thumbnail ────────────────────────────────────────────────────────────────
if THUMB:
    dim = max(root.dimensions) or 0.1
    cz = root.dimensions.z / 2 if KIND == "device" else 0.02
    cam_data = bpy.data.cameras.new("cam")
    cam = link(bpy.data.objects.new("cam", cam_data))
    cam.location = (dim * 1.8, -dim * 2.2, cz + dim * 1.2)
    direction = cam.location - (root.location + type(cam.location)((0, 0, cz)))
    cam.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    scene.camera = cam
    sun = link(bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")))
    sun.rotation_euler = (math.radians(50), 0, math.radians(30))
    sun.data.energy = 3
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except Exception:
        scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = scene.render.resolution_y = 512
    scene.render.filepath = THUMB
    bpy.ops.render.render(write_still=True)

print("DONE")
