# APEX Speedometer

A clean, customizable **numeric speed HUD** for BeamNG.drive. Big numbers over the game, not a dashboard. No damage, survival score, boost or vehicle-physics modifications.

**Version:** 0.1.0 — first test build  
**Target:** BeamNG.drive **0.39.4**. Actual in-game compatibility has **not yet been verified**. Browser UI tests and mocked Lua tests do not replace a BeamNG playtest.

## Download

### [Download APEX Speedometer 0.1.0 ZIP](https://github.com/p98hh2jtgb-lab/speedometer/raw/refs/heads/arena/c4a2d9cd-speedometer/downloads/apex-speedometer-0.1.0.zip)

The ZIP contains `ui/` and `lua/` at its root and is ready to place in the game's mods directory. **Do not install the whole GitHub repository ZIP** or the old reference archive.

## Instalimi / Shqip

1. Shkarko **`apex-speedometer-0.1.0.zip`** prej linkut lart.
2. Përmes BeamNG Launcher hape **Manage User Folder → Open in Explorer** dhe vendose ZIP-in në dosjen **`mods`** të user folder-it aktiv. Mos e shpaketo.
3. Hape lojën dhe kontrollo që modi është aktiv te Mod Manager.
4. Hyr në Free Roam me një veturë. Hape **UI Apps → Edit Apps → Add App** dhe kërko **APEX Speedometer**. Emrat e menyve mund të ndryshojnë pak sipas versionit/gjuhës.
5. App-in lëre **full screen**, pastaj dil prej editimit të UI Apps. Vetëm HUD-i dhe kontrollet e dukshme janë interaktive; pjesa tjetër e overlay-it ka `pointer-events: none`.
6. Shtype butonin e vogël **APEX** poshtë majtas për opsione, ose bëj **right-click mbi numrin**.
7. Te **Layout**, çaktivizo **Lock HUD position**, zhvendose numrin në ekran, dhe shtyp **Done**. Drag punon kur paneli është i hapur.

Nëse app-i nuk shfaqet pas instalimit, provo restart të lojës dhe kontrollo që ZIP-i është te user folder-i aktiv, jo te dosja e instalimit të lojës. Nëse shfaqet `WAITING FOR ... DATA`, nuk ka sample të freskët nga burimi i zgjedhur. Për testin e parë përdor **Wheel speed** dhe një veturë standarde.

**Nëse diçka nuk punon në 0.39.4:** ruaj gabimin nga game console / `beamng.log`, emrin e veturës dhe hapat që e shkaktuan. Mos e merr këtë test build si kompatibilitet të konfirmuar.

## Included

- **Clean / Outline / Race / Digital** numeric styles.
- Independent speed size (32–220 px) and unit size (10–70 px).
- km/h or mph; unit beside, below or hidden.
- Italic toggle, custom main/outline colors, outline width, shadow, opacity and optional dark backing.
- Smooth speed-reactive color blending with configurable middle/high thresholds and colors.
- Drag positioning, center snap, percentage-based positions and screen-boundary clamping.
- Wheel speed, ground velocity, or Auto (fresh ground velocity first, wheel fallback).
- Configurable exponential smoothing; 0 ms for instant response.
- HUD visibility toggle, fade when stopped, session top speed and optional speed-warning underline.
- Optional small gear indicator and RPM line. **RPM maximum is manually configured**, not auto-detected redline.
- Five built-in looks, up to 30 custom looks, JSON import/export, automatic local settings persistence.
- All code/assets for APEX are original; the supplied CreatorPack ZIP is retained solely as an unmodified reference and is **not bundled**.

### Controls

| Action | Control |
| --- | --- |
| Settings | APEX button bottom-left, or right-click the HUD |
| Keyboard settings toggle | Alt + Shift + S **when the game UI has keyboard focus** |
| Close settings | Done, ×, or Escape when the UI has focus |
| Move HUD | Layout → unlock, then drag with settings open |
| Quick position | Layout → Top / Center / Bottom |
| Presets | Presets tab → built-in or custom look |

HUDs hidden with the visibility toggle or stop fade are shown while settings are open so they remain editable. The small APEX settings button remains accessible. Settings and looks are saved in the UI's local storage, not in the ZIP. All instances share saved preferences; a single app instance is recommended.

## Preview

![Actual browser UI screenshot, with simulated speed and an illustrated road — not an in-game screenshot](preview/screenshot.png)

This is a **real screenshot of the included UI running in a browser**, not a generated game screenshot. The road is a CSS illustration. The preview uses synthetic telemetry and never connects to a running game.

```sh
npm run preview
# Open http://localhost:8080
```

No npm dependencies are required to run the preview; it uses Python's standard library. In the preview, **Behavior → Preview speed** changes the simulated speed.

## Development and validation

```sh
npm ci
npm test                       # Numeric/settings/source-selection unit tests
npm run preview                # Leave running in a separate terminal
npm run test:browser            # Chromium integration tests (Linux x64)
python -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/python tests/test_lua.py  # Syntax + mocked GE extension tests
npm run package                # Deterministic installable ZIP
```

Browser tooling is development-only and is not shipped in the mod. On Linux x64 the browser test extracts Chromium's bundled NSS libraries into ignored `.cache/`. The UI itself uses the game's AngularJS adapter, electrics stream, native browser APIs and a small GE Lua extension sampled at 20 Hz. No network calls, external fonts, telemetry tracking or runtime npm packages.

### Still requires in-game testing

- UI app discovery, fullscreen overlay/input pass-through in the game UI and the 0.39.4 Lua API.
- Stock and modded vehicles (manual/automatic/electric transmissions), reverse and wheelspin.
- Pause, slow motion, replay, reset, vehicle switching/despawning, UI reload and career.
- Multiple resolutions/UI scaling and persistence across complete game restarts.

Source selection shows a dash rather than inventing a speed if its last sample is older than 1.8 seconds. Ground speed is the magnitude of world velocity (including vertical velocity), **not aerodynamic airspeed**. Thresholds are expressed in the selected units; switching units does not convert your saved thresholds. Peak resets on player-vehicle reset/switch or manually, and is not saved between sessions. Replay/pause behavior depends on the streams exposed by the game and remains unverified.

## Repository layout

- `mod/` — installable mod source, original code and thumbnail.
- `downloads/` — packaged test build and SHA-256 checksum.
- `preview/` — browser demo and its actual UI screenshot.
- `scripts/` — packaging, thumbnail generation, preview server.
- `tests/` — core, browser/adapter and mocked Lua tests.
- `creatorpack v1.1.zip` — original third-party reference, unchanged; its rights remain with its author. The project license does not apply to this reference archive.
