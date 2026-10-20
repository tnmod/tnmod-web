"""Build the LCD atlas shared by Blender and the web renderer."""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/images/lcd'
OUT.mkdir(parents=True, exist_ok=True)
MILESTONES = json.loads((ROOT / 'src/animation/callMilestones.json').read_text())
FONT = dict(zip('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:', [
 '01110 10001 10001 11111 10001 10001 10001',
 '11110 10001 10001 11110 10001 10001 11110',
 '01111 10000 10000 10000 10000 10000 01111',
 '11110 10001 10001 10001 10001 10001 11110',
 '11111 10000 10000 11110 10000 10000 11111',
 '11111 10000 10000 11110 10000 10000 10000',
 '01111 10000 10000 10111 10001 10001 01111',
 '10001 10001 10001 11111 10001 10001 10001',
 '11111 00100 00100 00100 00100 00100 11111',
 '00111 00010 00010 00010 10010 10010 01100',
 '10001 10010 10100 11000 10100 10010 10001',
 '10000 10000 10000 10000 10000 10000 11111',
 '10001 11011 10101 10101 10001 10001 10001',
 '10001 11001 10101 10011 10001 10001 10001',
 '01110 10001 10001 10001 10001 10001 01110',
 '11110 10001 10001 11110 10000 10000 10000',
 '01110 10001 10001 10001 10101 10010 01101',
 '11110 10001 10001 11110 10100 10010 10001',
 '01111 10000 10000 01110 00001 00001 11110',
 '11111 00100 00100 00100 00100 00100 00100',
 '10001 10001 10001 10001 10001 10001 01110',
 '10001 10001 10001 10001 10001 01010 00100',
 '10001 10001 10001 10101 10101 11011 10001',
 '10001 10001 01010 00100 01010 10001 10001',
 '10001 10001 01010 00100 00100 00100 00100',
 '11111 00001 00010 00100 01000 10000 11111',
 '01110 10011 10101 10101 11001 10001 01110',
 '00100 01100 00100 00100 00100 00100 01110',
 '01110 10001 00001 00010 00100 01000 11111',
 '11110 00001 00001 01110 00001 00001 11110',
 '00010 00110 01010 10010 11111 00010 00010',
 '11111 10000 10000 11110 00001 00001 11110',
 '01110 10000 10000 11110 10001 10001 01110',
 '11111 00001 00010 00100 01000 01000 01000',
 '01110 10001 10001 01110 10001 10001 01110',
 '01110 10001 10001 01111 00001 00001 01110',
 '00000 00100 00100 00000 00100 00100 00000',
]))
FONT = {k: v.split() for k, v in FONT.items()}
LIGHT, DARK = (215, 232, 180), (26, 51, 47)

def text(draw, value, x, y, scale=5, color=LIGHT):
    x -= (len(value)*6-1)*scale/2
    for i, ch in enumerate(value):
        for r, row in enumerate(FONT.get(ch, [])):
            for c, bit in enumerate(row):
                if bit == '1':
                    xx, yy = round(x+(i*6+c)*scale), y+r*scale
                    draw.rectangle((xx, yy, xx+scale-2, yy+scale-2), fill=color)

def build(source):
    original = Image.open(source).convert('RGB')
    assert original.size == (1024, 368)
    original.save(OUT / 'incoming.png')
    atlas = Image.new('RGB', (1024, 368*14))
    for index in range(14):
        im = original.copy()
        d = ImageDraw.Draw(im)
        if index == 1:
            d.rectangle((315, 5, 815, 78), fill=(124, 153, 126))
        elif index >= 2:
            ended = index == 13
            d.rectangle((315, 5, 815, 78), fill=(124, 153, 126))
            text(d, 'CALL ENDED' if ended else 'CONNECTED', 615, 30)
            # Connected handset; the ringing arcs disappear after pickup.
            d.line((329, 29, 329, 46, 349, 61, 365, 61), fill=DARK, width=7)
            d.rectangle((322, 25, 338, 37), fill=DARK)
            d.rectangle((356, 53, 370, 66), fill=DARK)
            if ended:
                d.line((322, 64, 369, 25), fill=DARK, width=4)
            # Keep the caller's identity and number, replace the job line.
            im.paste(original.crop((10, 281, 1014, 308)).resize((1004, 65)), (10, 244))
            d = ImageDraw.Draw(im)
            text(d, 'DURATION' if ended else 'TALKING', 365, 259, 4)
            seconds = MILESTONES[-1 if ended else index-2]['seconds']
            text(d, f'{seconds//60:02}:{seconds%60:02}', 665, 254, 6)
            d.rectangle((5, 311, 1018, 362), fill=(140, 167, 137))
            for label, x in zip(('REDIAL', 'BACK', 'CLOSE') if ended else ('MUTE', 'HOLD', 'END CALL'), (160, 512, 864)):
                text(d, label, x, 324, 4, DARK)
        atlas.paste(im, (0, index*368))
    atlas.save(OUT / 'call-states.png')
    (ROOT / 'src/animation/lcdFont.json').write_text(json.dumps(FONT), encoding='utf-8')
    print(OUT / 'call-states.png')

if __name__ == '__main__':
    import sys
    build(sys.argv[1] if len(sys.argv)>1 else OUT / 'incoming.png')
