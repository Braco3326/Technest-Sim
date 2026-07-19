"""env_prep.py — prepare a ROOM environment glb (sourcing run, Set-System backdrop).

  blender --background --factory-startup --python env_prep.py -- \
      --in scene.gltf --out room.glb --width 12 --decimate 100000 [--roty 0]

- wipes the factory scene, imports the candidate
- uniform-scales so the room's WIDTH (x span) = --width meters (real-world scale
  so the 1:1 gear sits believably inside)
- optional yaw, grounds min.y to 0, centers X/Z on origin
- decimates toward --decimate total tris (web + weak-PC budget)
"""
import bpy
import math
import sys


def main() -> None:
    argv = sys.argv[sys.argv.index("--") + 1 :]
    args = {argv[i].lstrip("-"): argv[i + 1] for i in range(0, len(argv), 2)}

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.objects):
        for item in list(block):
            block.remove(item)

    bpy.ops.import_scene.gltf(filepath=args["in"])

    roty = float(args.get("roty", "0"))
    if roty:
        bpy.ops.object.select_all(action="SELECT")
        for ob in bpy.data.objects:
            if ob.parent is None:
                ob.rotation_euler[2] += math.radians(roty)
        bpy.ops.object.transform_apply(rotation=True)

    target = int(args.get("decimate", "100000"))
    total = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == "MESH")
    if total > target:
        ratio = max(0.01, target / total)
        for o in list(bpy.data.objects):
            if o.type != "MESH" or len(o.data.polygons) < 16:
                continue
            mod = o.modifiers.new("dec", "DECIMATE")
            mod.ratio = ratio
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.modifier_apply(modifier=mod.name)
        print(f"DECIMATED {total} -> ~{target}")

    import mathutils

    lo = mathutils.Vector((1e9, 1e9, 1e9))
    hi = mathutils.Vector((-1e9, -1e9, -1e9))
    for ob in bpy.data.objects:
        if ob.type != "MESH":
            continue
        for corner in ob.bound_box:
            w = ob.matrix_world @ mathutils.Vector(corner)
            lo = mathutils.Vector(map(min, lo, w))
            hi = mathutils.Vector(map(max, hi, w))
    width = hi.x - lo.x
    scale = float(args["width"]) / width if width > 1e-6 else 1.0
    for ob in bpy.data.objects:
        if ob.parent is None:
            ob.scale = [s * scale for s in ob.scale]
            ob.location = [l * scale for l in ob.location]
    bpy.context.view_layer.update()

    # re-measure after scale, then ground + center
    lo2 = mathutils.Vector((1e9, 1e9, 1e9))
    hi2 = mathutils.Vector((-1e9, -1e9, -1e9))
    for ob in bpy.data.objects:
        if ob.type != "MESH":
            continue
        for corner in ob.bound_box:
            w = ob.matrix_world @ mathutils.Vector(corner)
            lo2 = mathutils.Vector(map(min, lo2, w))
            hi2 = mathutils.Vector(map(max, hi2, w))
    cx, cy = (lo2.x + hi2.x) / 2, (lo2.y + hi2.y) / 2
    for ob in bpy.data.objects:
        if ob.parent is None:
            ob.location.x -= cx
            ob.location.y -= cy
            ob.location.z -= lo2.z

    bpy.ops.export_scene.gltf(filepath=args["out"], export_format="GLB", export_yup=True)
    size = hi2 - lo2
    print(f"ENV_OK scale×{scale:.3f} dims_m=({size.x:.1f},{size.y:.1f},{size.z:.1f})")


main()
