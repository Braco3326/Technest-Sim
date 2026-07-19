"""rig_empties.py — sourcing rig pass (spec docs/TekPractice_3D-Model-Sourcing.md §rig).

Imports public/assets/<id>.glb, adds `port_<portId>` empties at FUNCTIONAL I/O
positions (per-device placement spec passed as JSON), re-exports WITH the
empties. Run headless:

  blender --background --factory-startup --python rig_empties.py -- \
      --in <in.glb> --out <out.glb> --spec '{"ports":{"out-xlr":{"f":"bottom","u":0.5,"v":0.5}}}'

Placement space is glTF (x right, y up, -z = camera-facing I/O panel);
conversion to Blender space (x, -z_g, y_g) happens here. Faces:
  -z  front panel   x=(u-.5)*w  y=v*h        z=-d/2-0.012
  +z  rear panel    x=(u-.5)*w  y=v*h        z=+d/2+0.012
  bottom            x=(u-.5)*w  y=-0.006     z=(v-.5)*d
The exporter includes empties because nothing is selection-filtered — the scene
is wiped first (headless factory scene ships a default cube: purged).
"""
import bpy
import json
import sys


def main() -> None:
    argv = sys.argv[sys.argv.index("--") + 1 :]
    args = {argv[i].lstrip("-"): argv[i + 1] for i in range(0, len(argv), 2)}
    src, dst = args["in"], args["out"]
    spec = json.loads(args["spec"])

    # Wipe EVERYTHING (factory scene has Cube/Camera/Light — the old pipeline's
    # "exported the user's Cube" pitfall).
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.objects):
        for item in list(block):
            block.remove(item)

    bpy.ops.import_scene.gltf(filepath=src)

    # Combined world bounds of every imported mesh.
    import mathutils

    lo = mathutils.Vector((1e9, 1e9, 1e9))
    hi = mathutils.Vector((-1e9, -1e9, -1e9))
    for ob in bpy.data.objects:
        if ob.type != "MESH":
            continue
        for corner in ob.bound_box:
            world = ob.matrix_world @ mathutils.Vector(corner)
            lo = mathutils.Vector(map(min, lo, world))
            hi = mathutils.Vector(map(max, hi, world))
    size = hi - lo
    center = (hi + lo) / 2

    # Blender axes: x right, y depth (−y is what glTF sees as −z... exporter
    # +Y-up maps Blender (x, y, z) → glTF (x, z, −y)). So a target glTF point
    # (xg, yg, zg) is authored in Blender at (xg, −zg, yg).
    w, d, h = size.x, size.y, size.z  # Blender: y is depth, z is up

    made = []
    for port_id, p in spec["ports"].items():
        f, u, v = p["f"], p["u"], p["v"]
        xg = center.x + (u - 0.5) * w
        if f == "-z":  # glTF −z (camera-facing panel) == Blender +y
            pos = (xg, hi.y + 0.012, lo.z + v * h)
        elif f == "+z":  # glTF +z (rear panel) == Blender −y
            pos = (xg, lo.y - 0.012, lo.z + v * h)
        elif f == "bottom":
            pos = (xg, center.y + (v - 0.5) * d, lo.z - 0.006)
        else:
            raise ValueError(f"unknown face {f}")

        empty = bpy.data.objects.new(f"port_{port_id}", None)
        empty.empty_display_type = "PLAIN_AXES"
        empty.empty_display_size = 0.02
        empty.location = pos
        bpy.context.scene.collection.objects.link(empty)
        made.append(port_id)

    bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", export_yup=True)
    print(f"RIG_OK ports={len(made)} [{', '.join(made)}] bounds_blender=({w:.3f},{d:.3f},{h:.3f})")


main()
