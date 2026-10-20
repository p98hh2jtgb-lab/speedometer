"""Generate the original in-game app picker thumbnail (requires Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
font_dir = Path('/usr/share/fonts/truetype/dejavu')

def font(size, bold=False):
    try:
        return ImageFont.truetype(str(font_dir / ('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')), size)
    except OSError:
        return ImageFont.load_default(size=size)

im = Image.new('RGB', (512, 288), '#10151b')
d = ImageDraw.Draw(im)
d.rounded_rectangle((18, 18, 494, 270), radius=20, outline='#303a41', width=2)
d.text((40, 35), 'APEX', font=font(23, True), fill='#b8ef73')
d.text((124, 45), '/ SPEEDOMETER', font=font(11), fill='#87949f')
d.text((65, 83), '147', font=font(105, True), fill='#ffffff', stroke_width=2, stroke_fill='#080b10')
d.text((307, 166), 'KM/H', font=font(23, True), fill='#e9edf0')
d.line((42, 222, 469, 222), fill='#283139', width=1)
d.text((42, 238), 'CLEAN  /  OUTLINE  /  RACE  /  DIGITAL', font=font(11), fill='#91a18e')
im.save(ROOT / 'mod/ui/modules/apps/ApexSpeedometer/app.png')
