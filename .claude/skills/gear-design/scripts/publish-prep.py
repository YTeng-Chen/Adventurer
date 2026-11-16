# 準備試玩連結（Artifact）要發佈的檔案：
#   npx vite build --base ./ --outDir <dir> --emptyOutDir
#   python3 .claude/skills/gear-design/scripts/publish-prep.py <dir>
# 會在 <dir> 產生 adventurer.html（拿掉 <html>/<head>/<body> 外殼、腳本移到最後），並印出要一起發佈的 assets 檔名。
import re, sys, os
d = sys.argv[1]
s = open(os.path.join(d, 'index.html')).read()
head = s[s.index('<head>') + 6:s.index('</head>')]
body = s[s.index('<body>') + 6:s.index('</body>')]
for t in ['<meta charset="utf-8">\n', '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n']: head = head.replace(t, '')
scripts = re.findall(r'\s*<script type="module"[^>]*></script>', head)
for sc in scripts: head = head.replace(sc, '')
open(os.path.join(d, 'adventurer.html'), 'w').write(head.strip() + '\n' + body.strip() + '\n' + '\n'.join(x.strip() for x in scripts) + '\n')
for a in re.findall(r'\./(assets/[^"]+)', s): print(a)
