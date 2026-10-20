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
d.text((40, 35), 'APEX', font=font(23, True), fill='#75ccff')
d.text((124, 45), '/ SHPEJTËSIMATËSI', font=font(11), fill='#87949f')
hud_font = ImageFont.truetype(str(ROOT / 'mod/ui/modules/apps/ApexSpeedometer/fonts/BarlowCondensed-SemiBold.ttf'), 110)
unit_font = ImageFont.truetype(str(ROOT / 'mod/ui/modules/apps/ApexSpeedometer/fonts/BarlowCondensed-SemiBold.ttf'), 28)
number_width = d.textlength('147', font=hud_font)
width = number_width + 4 + d.textlength('km/h', font=unit_font)
x = (512 - width) / 2
d.text((x, 186), '147', font=hud_font, fill='#ffffff', anchor='ls')
d.text((x + number_width + 4, 186), 'km/h', font=unit_font, fill='#ffffff', anchor='ls')
d.line((42, 222, 469, 222), fill='#283139', width=1)
d.text((42, 238), 'CLEAN  /  KM/H - MPH  /  NGJYRË E PËRBASHKËT', font=font(11), fill='#91a18e')
im.save(ROOT / 'mod/ui/modules/apps/ApexSpeedometer/app.png')
