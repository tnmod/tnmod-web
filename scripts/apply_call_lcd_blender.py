"""Execute through work/blender_bridge.py while the portfolio scene is open."""
import bpy
import json
from pathlib import Path

ROOT = Path('C:/Users/Administrator/Documents/GitHub/tnmod-web')
milestones = json.loads((ROOT / 'src/animation/callMilestones.json').read_text())
scene = bpy.context.scene
material = bpy.data.objects['LCD_Display'].data.materials[0]
nodes, links = material.node_tree.nodes, material.node_tree.links
nodes['Emission'].inputs['Strength'].default_value = 1.6
# Preserve the original 0.8 emission for illumination and reflections. Only
# camera rays see the stronger backlight, so the phone casing stays unchanged.
light_path = nodes.get('LCD_CAMERA_RAY') or nodes.new('ShaderNodeLightPath')
light_path.name = 'LCD_CAMERA_RAY'
backlight = nodes.get('LCD_BACKLIGHT_ONLY') or nodes.new('ShaderNodeMath')
backlight.name = 'LCD_BACKLIGHT_ONLY'
backlight.operation = 'MULTIPLY_ADD'
backlight.inputs[1].default_value = 0.8
backlight.inputs[2].default_value = 0.8
links.new(light_path.outputs['Is Camera Ray'], backlight.inputs[0])
links.new(backlight.outputs[0], nodes['Emission'].inputs['Strength'])
tex = nodes['LCD_CONTENT']
atlas = bpy.data.images.load(str(ROOT / 'public/images/lcd/call-states.png'), check_existing=True)
atlas.reload()
atlas.pack()
tex.image = atlas
tex.interpolation = 'Closest'
tex.extension = 'EXTEND'
uv = nodes.get('CALL_UV') or nodes.new('ShaderNodeTexCoord')
uv.name = 'CALL_UV'
scale = nodes.get('CALL_ATLAS_SCALE') or nodes.new('ShaderNodeVectorMath')
scale.name = 'CALL_ATLAS_SCALE'
scale.operation = 'MULTIPLY'
scale.inputs[1].default_value = (1, 1/14, 1)
offset = nodes.get('CALL_STATE') or nodes.new('ShaderNodeVectorMath')
offset.name = 'CALL_STATE'
offset.label = 'RING / CONNECTED / CALL ENDED'
offset.operation = 'ADD'
links.new(uv.outputs['UV'], scale.inputs[0])
links.new(scale.outputs['Vector'], offset.inputs[0])
links.new(offset.outputs['Vector'], tex.inputs['Vector'])

def row_at(frame):
    if frame < 127:
        return 0 if (frame-1) % 24 < 14 else 1
    if frame < 375:
        return 2 + max(i for i, m in enumerate(milestones[:-1]) if frame >= m['frame'])
    return 13

previous = None
material.node_tree.animation_data_clear()
for frame in range(1, 400):
    row = row_at(frame)
    if row != previous:
        offset.inputs[1].default_value = (0, (13-row)/14, 0)
        offset.inputs[1].keyframe_insert('default_value', frame=frame)
        previous = row
action = material.node_tree.animation_data.action
for layer in action.layers:
    for strip in layer.strips:
        for bag in strip.channelbags:
            for curve in bag.fcurves:
                for key in curve.keyframe_points:
                    key.interpolation = 'CONSTANT'

for name, frame in [('LCD - ANSWER / CONNECTED', 127), ('LCD - CALL ENDED', 375)]:
    marker = scene.timeline_markers.get(name) or scene.timeline_markers.new(name)
    marker.frame = frame
scene['call_display'] = 'Incoming blink: frames 1-126; connected story milestones: 00:00, 00:48, 01:15, 02:35 ... 05:42; CALL ENDED at frame 375 freezes 05:42. Atlas is packed.'
scene.frame_set(399)
output = Path(bpy.data.filepath).parent / 'portfolio-story-v16-lcd-only-light.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(output))
result = {'saved': str(output), 'atlas_packed': bool(atlas.packed_file), 'answer_frame':127, 'end_frame':375, 'states':[{'frame':f,'row':row_at(f)} for f in [1,15,25,109,127,151,374,375,399]]}
