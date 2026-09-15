from PIL import Image
from pathlib import Path
import json
checks=[]
for p in Path('public/assets/sequences').glob('*.png'):
 if p.stem in ['speech','environment']:continue
 im=Image.open(p).convert('RGBA')
 cheeks=[a for r,g,b,a in im.getdata() if r>180 and 70<g<205 and 50<b<190 and r-g>25 and g-b>5]
 checks.append({'asset':str(p),'cheekPixels':len(cheeks),'minimumAlpha':min(cheeks),'passed':min(cheeks)==255})
Path('artifacts/sequences/cheek-alpha-check.json').write_text(json.dumps(checks,indent=2))
assert all(c['passed'] for c in checks)
print(f"All {len(checks)} character images retain fully opaque peach cheeks")
