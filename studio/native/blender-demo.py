"""A portable CPU proof with a PNG preview and editable Blender scene."""
import os
from pathlib import Path

import bpy

out = Path(os.environ["STUDIO_NATIVE_OUTPUT"])
bpy.ops.wm.read_factory_settings(use_empty=False)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 8
scene.cycles.use_denoising = True
scene.render.threads_mode = "FIXED"
scene.render.threads = 2
scene.render.resolution_x = 480
scene.render.resolution_y = 270
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(out / "blender-preview.png")

cube = bpy.data.objects["Cube"]
bevel = cube.modifiers.new("Soft edges", "BEVEL")
bevel.width = 0.12
bevel.segments = 4
material = bpy.data.materials.new("Teal ceramic")
material.diffuse_color = (0.025, 0.43, 0.38, 1)
cube.data.materials.clear()
cube.data.materials.append(material)

bpy.ops.wm.save_as_mainfile(filepath=str(out / "scene.blend"))
bpy.ops.render.render(write_still=True)
