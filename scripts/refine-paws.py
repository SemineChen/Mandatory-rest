import bpy
c=bpy.data.collections.get('XieYiHui_Mascot')
assert c, 'Mascot collection not found in saved source'
for o in c.objects:
    if o.name.startswith('Pad') and o.parent:o.location.y=-.50
    if o.name.startswith('Toe') and o.parent:o.location.y=-.46
bpy.ops.object.select_all(action='DESELECT')
for o in c.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath='/Users/chenyueping/Desktop/6和figma/public/assets/mascot.glb',use_selection=True,export_format='GLB',export_animations=False)
bpy.ops.wm.save_as_mainfile(filepath='/Users/chenyueping/Desktop/6和figma/public/assets/mascot-source.blend')
