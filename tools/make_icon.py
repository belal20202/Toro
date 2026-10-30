# خالد — builds the app icon (open book + golden star) into assets/ — run in CI before capacitor-assets
import math, os
from PIL import Image, ImageDraw

N = 1024
os.makedirs('assets', exist_ok=True)

def background():
    im = Image.new('RGB', (N, N))
    d = ImageDraw.Draw(im)
    for y in range(N):
        t = y / N
        d.line([(0, y), (N, y)], fill=(int(22 + 24 * t), int(84 + 64 * t), int(96 + 52 * t)))
    return im

def star(d, cx, cy, r, fill):
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.42
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    d.polygon(pts, fill=fill)

def art(img):
    glow = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([402, 190, 622, 410], fill=(255, 255, 255, 38))
    img.alpha_composite(glow)
    d = ImageDraw.Draw(img)
    gold, white = (245, 200, 100, 255), (255, 255, 255, 255)
    shade, line = (214, 232, 229, 255), (110, 165, 160, 255)
    d.polygon([(512, 450), (512, 790), (292, 745), (292, 405)], fill=white)
    d.polygon([(512, 450), (512, 790), (732, 745), (732, 405)], fill=shade)
    d.line([(512, 450), (512, 790)], fill=(180, 208, 203, 255), width=8)
    for i in range(4):
        y = 495 + i * 52
        d.line([(332, y), (478, y + 14)], fill=line, width=10)
        d.line([(546, y + 14), (692, y)], fill=line, width=10)
    star(d, 512, 300, 112, gold)

bg = background()
only = bg.convert('RGBA')
art(only)
only.save('assets/icon-only.png')
fg = Image.new('RGBA', (N, N), (0, 0, 0, 0))
art(fg)
fg.save('assets/icon-foreground.png')
bg.save('assets/icon-background.png')
print('icon ok')
