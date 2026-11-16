# 把多張截圖排成一張縮圖表，方便一次看完一整段動作：
#   python3 .claude/skills/gear-design/scripts/sheet.py out.png --cols 6 --scale 0.33 [--every 3] [--from 0] [--to 999] 圖檔...
#   --crop x0,y0,x1,y1  先裁切再縮放（例如只看角色附近）；--best  自動挑火光最多的那一格，前後各取幾張
import sys, glob
from PIL import Image
a = sys.argv[1:]
out = a.pop(0)
opt = {'cols': 6, 'scale': 0.33, 'every': 1, 'from': 0, 'to': 10**9, 'crop': None, 'best': None}
files = []
while a:
    x = a.pop(0)
    if x.startswith('--'):
        k = x[2:]
        opt[k] = a.pop(0) if k != 'best' else int(a.pop(0))
    else:
        files += sorted(glob.glob(x)) or [x]
files = sorted(files)
if opt['best']:
    def score(f):
        im = Image.open(f).convert('RGB').resize((104, 75)); n = 0
        for y in range(75):
            for x in range(104):
                r, g, b = im.getpixel((x, y))
                if r > 200 and 80 < g < 220 and b < 110: n += 1
        return n
    k = max(range(len(files)), key=lambda i: score(files[i])); n = opt['best']
    files = files[max(0, k - n):k + n]
files = files[int(opt['from']):int(opt['to']):int(opt['every'])]
ims = []
for f in files:
    im = Image.open(f).convert('RGB')
    if opt['crop']: im = im.crop(tuple(int(v) for v in opt['crop'].split(',')))
    s = float(opt['scale']); ims.append(im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.NEAREST if s >= 1 else Image.BILINEAR))
cols = int(opt['cols']); rows = (len(ims) + cols - 1) // cols
w, h = ims[0].size
sheet = Image.new('RGB', (w * cols, h * rows), (18, 22, 31))
for i, im in enumerate(ims): sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save(out); print(out, sheet.size, len(ims), 'frames')
