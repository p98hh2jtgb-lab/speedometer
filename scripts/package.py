"""Build a directly installable ZIP. No extra wrapper directory inside the archive."""
from pathlib import Path
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'mod'
VERSION = json.loads((SOURCE / 'mod.json').read_text())['version']
OUTPUT = ROOT / 'downloads' / f'apex-speedometer-{VERSION}.zip'

def build():
    for file in SOURCE.rglob('*.json'):
        json.loads(file.read_text())
    OUTPUT.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(OUTPUT, 'w', zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(SOURCE.rglob('*')):
            if file.is_file():
                info = zipfile.ZipInfo(file.relative_to(SOURCE).as_posix(), (2026, 10, 20, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                archive.writestr(info, file.read_bytes())
    with zipfile.ZipFile(OUTPUT) as archive:
        assert archive.testzip() is None
        assert 'ui/modules/apps/ApexSpeedometer/app.json' in archive.namelist()
        assert 'lua/ge/extensions/apexSpeedometer.lua' in archive.namelist()
        assert 'lua/ge/extensions/core/input/actions/apexSpeedometer.json' in archive.namelist()
        assert 'settings/inputmaps/keyboardAPEXSpeedometer.json' in archive.namelist()
        assert 'ui/modules/apps/ApexSpeedometer/fonts/OFL.txt' in archive.namelist()
    print(f'{OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size:,} bytes)')

if __name__ == '__main__':
    build()
