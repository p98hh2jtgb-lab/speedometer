# APEX · Shpejtësimatësi

**v0.3.0 · shqip · target BeamNG.drive 0.39.4**

Speed HUD numerik për lojë, me panel të vogël dhe të lëvizshëm. Pa survival, damage, boost apo ndryshime të fizikës së veturës.

## ⬇️ [Shkarko APEX Speedometer 0.3.0 ZIP](https://github.com/p98hh2jtgb-lab/speedometer/raw/refs/heads/arena/c4a2d9cd-speedometer/downloads/apex-speedometer-0.3.0.zip)

**Hiqi / çaktivizoji të gjithë ZIP-at e vjetër APEX. Mbaje vetëm versionin e ri aktiv dhe bëj restart të plotë.** Arkivat e vjetër në `downloads/` janë historikë. Mos instalo ZIP-in e gjithë repos.

## Çka sjell v0.3.0

### Paneli nuk ta zë më pamjen

- Paneli standard **340 × 560 px**, më i vogël se versioni i kaluar; numri standard **88 px**.
- **Tërhiq panelin nga titulli** për ta vendosur në cilëndo anë. Pozicioni ruhet në pajisje dhe nuk lëviz speedometrin.
- **− / +** mbledh ose zgjeron panelin. **↔ Largo** e vendos në cepin me mbulim minimal të numrit, kur ka hapësirë.
- Te **Pozicioni**: madhësi dhe X/Y të pavarura për panelin; pozicioni i numrit rregullohet veçmas.
- Paneli dhe HUD-i mbahen brenda ekranit pas ndërrimit të rezolucionit. Në një ekran shumë të vogël mund të mos ketë hapësirë për të dy pa mbivendosje; mblidhe/mbylle panelin në këtë rast.

### Njësitë dhe ngjyrat pa kontrolle native problematike

- **km/h / mph janë butona direkt**, jo dropdown. Ndryshon etiketa **dhe vlera numerike**, menjëherë, pa pritur smoothing.
- Kliko edhe **vetë numrin ose njësinë** në lojë për km/h ↔ mph. Kur numri është i zhbllokuar për drag me panelin hapur, klikimi nuk ndërron njësinë.
- Paletë me dhjetë ngjyra, **HEX + Apliko**, pa varësi nga dialogu native `input[type=color]` i CEF.
- Ngjyra fikse aktivizohet menjëherë nga paleta/HEX. Njësia ka ngjyrën e vet ose ndjek numrin.
- Butonat janë `type=button`, ndalojnë propagimin e klikimit dhe nuk bëjnë submit nëse UI-ja e lojës i vendos brenda një forme. Kontrollet me disa butona nuk mbështillen me një label që mund të aktivizojë pa dashje një input tjetër.

### Spektri 0–100

| Shpejtësia reale | Ngjyra standarde |
| --- | --- |
| 0 km/h | E bardhë |
| 5 km/h | Cyan |
| 20 km/h | Blu |
| 40 km/h | Vjollcë |
| 60 km/h | Rozë |
| 80 km/h | Portokalli |
| 100 km/h e sipër | E kuqe |

Mes pragjeve ngjyrat përzihen gradualisht. Spektri ndjek **km/h reale edhe kur numri shfaq mph**: 100 km/h ≈ 62.14 mph ka të njëjtën ngjyrë. Ngjyrat e çdo pragu ndryshohen veçmas. Ka edhe opsion për një kalim personal me tri ngjyra.

### Stile me dallime të dukshme

| Stili | Pamja / sjellja |
| --- | --- |
| **Racing** | Font Black i pjerrët, vijë teknike dhe tri shenja sportive |
| **Neon** | Font monospaced, glow i rregullueshëm, njësi e ndarë poshtë dhe vijë e ndriçuar |
| **Hyper** | Pllakë këndore, vija anësore, font agresiv, zmadhim sipas shpejtësisë |
| **Minimal** | Font i hollë, numër më i vogël, njësi diskrete poshtë |
| **Clean** | Numër i pastër pa kontur dhe pa efekte |
| **Kontur** | Numër i trashë me kontur për lexim mbi rrugë |
| **Digjital** | Font monospaced dhe sfond i vogël instrumenti |

Stili ndryshon madhësitë, fontin, peshën, pjerrësinë, glow, dekorimin, pozicionin e njësisë dhe sjelljen vizuale. Nuk lëviz numrin/panelin dhe nuk ndryshon burimin/njësinë. Stilet nuk modifikojnë fizikën apo performancën e veturës.

## Instalimi

1. Hiqi ose çaktivizoji versionet APEX **0.1.0, 0.2.0 dhe 0.2.1** te Mod Manager / dosja `mods`.
2. Shkarko `apex-speedometer-0.3.0.zip` nga linku lart.
3. Te BeamNG Launcher: **Manage User Folder → Open in Explorer**. Qite ZIP-in në `mods` të user folder-it aktiv, **pa e shpaketuar**.
4. Bëj restart të plotë të lojës. Nëse mban layout-in e vjetër, mund ta heqësh dhe shtosh përsëri app-in.
5. Free Roam → **UI Apps → Edit Apps → Add App → APEX · Shpejtësimatësi**. Përdor një instancë dhe lëre app-in **full screen**.
6. Dil nga editimi i UI Apps. **⚙ sipër djathtas** hap cilësimet; **X** i mbyll. Nuk ka Ctrl+H dhe nuk ka buton APEX poshtë.
7. Kontrollo versionin **0.3.0** në panel. Nëse shfaq tjetër version, kontrollo ZIP-at aktivë/user folder-in/cache-in e UI-së.

Për speedometrin: **Pozicioni → çaktivizo “Blloko numrin”** dhe tërhiq numrin. Për panelin: tërhiq titullin. Pozicionet ruhen veçmas. Header-i i fokusuar mund të lëvizet edhe me shigjeta.

Preferencat e versioneve të mëparshme përditësohen një herë me panel më të vogël, numër jo më të madh se 88 px dhe spektrin e ri; ruhen njësia, pozicioni i numrit, ngjyra fikse dhe stilet personale. Ndryshimet e reja ruhen normalisht pas kësaj.

## Burimet dhe opsionet e vozitjes

| Burimi | Sjellja |
| --- | --- |
| **Dinamik** | Përparësi shpejtësisë reale XYZ / Air. Në mungesë, gomat si rezervë me shënim të dukshëm |
| **Air** | Vetëm lëvizja reale. Shfaq `—` nëse të dhënat reale mungojnë, jo zero të shpikur |
| **Gomat** | Vetëm rrotullimi i gomave; frenimi me goma të bllokuara mund të tregojë zero edhe gjatë rrëshqitjes |

Matjet vijnë direkt nga `electrics.airspeed` / `airSpeed` dhe nga një GE Lua bridge i pavarur. “Air” këtu nënkupton shpejtësinë e lëvizjes në botën e lojës, duke përfshirë komponentin vertikal, **jo erën**. Mostrat pa përditësim për 1.8 s konsiderohen të vjetruara. Nëse gomat janë në zero por vetura lëviz 300 km/h, Dinamik/Air vazhdojnë të përdorin lëvizjen reale.

Opsione shtesë:
- **0 / 1 / 2 decimale**, smoothing 0–500 ms, glow 0–40 px dhe zmadhim deri 20% sipas shpejtësisë.
- Trashësi, madhësi, pjerrësi, hapësirë dhe ngjyrë të veçanta për numrin dhe njësinë.
- Opacity, kontur, hije, sfond, fshehje kur ndalet dhe shfaq/fshih HUD-in.
- Maksimum sesioni, paralajmërim me prag në **km/h**, marsh dhe shirit RPM opsional me kufi **manual**.
- Deri 30 stile personale me import/eksport JSON. Maksimumi pastrohet në reset/ndërrim veture ose manualisht, dhe nuk ruhet mes sesioneve.

## Parapamje

![UI reale në browser: panel kompakt dhe i lëvizshëm, Racing me spektër në 65 km/h. Sfondi është i ilustruar, jo screenshot i lojës.](preview/screenshot.png)

Kjo është UI-ja reale e kodit në browser, me sfond CSS të ilustruar dhe të dhëna sintetike, **jo screenshot nga BeamNG**.

```sh
npm run preview
# http://localhost:8080
```

Serveri kërkon vetëm Python standard. Në parapamje: **Vozitja → Shpejtësia provuese** ndryshon të dhënat sintetike. Në lojë ky slider nuk shfaqet dhe nuk injektohen shpejtësi provuese.

## Testet / zhvillimi

```sh
npm ci
npm test
npm run preview                       # terminal tjetër, lëre ndezur
npm run test:browser                   # Chromium Linux x64
python -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/python tests/test_lua.py
npm run package
```

Testet mbulojnë klikimet reale të km/h–mph, konvertimin numerik, paletën/HEX pa dialog native, ngjyrën e renderuar në të shtatë pragjet, qëndrueshmërinë e ngjyrës gjatë ndryshimit të njësive, stilet me computed styles të ndryshme, drag të ndarë panel/HUD, madhësitë, collapse, ruajtjen, simulimin brenda një forme, input-et që mungojnë, frenimin 300 km/h me goma në zero dhe pastrimin e adapterit Angular/Lua.

**Ndryshimet e v0.3 kërkojnë ende provë në BeamNG 0.39.4.** Testet e browser-it dhe API-të e simuluara nuk vërtetojnë sjelljen e CEF/input-it të lojës. Provo sidomos panel drag, klikimet e njësive/ngjyrave, frenimin me goma të bllokuara, fluturimin, pause/slow-motion/replay dhe UI scaling.

## Licencat / struktura

- `mod/` — burimi; ZIP-i ka `lua/`, `ui/` dhe metadata në rrënjë.
- `downloads/` — ZIP-at dhe SHA-256; `preview/`, `scripts/`, `tests/` — vetëm zhvillimi.
- `creatorpack v1.1.zip` — referencë e pandryshuar e palës së tretë; nuk paketohet dhe nuk përfshihet në licencën e projektit.

U përdorën si referenca funksionale **BeamRoyalSpeedHUDMod (1).zip** dhe fotot e përdoruesit; kodi, ikonat dhe fonti i tij nuk kopjohen apo shpërndahen. Kodi/asetet origjinale APEX janë MIT. Fontet **Barlow Condensed** shpërndahen pa ndryshime me SIL OFL te `mod/ui/modules/apps/ApexSpeedometer/fonts/OFL.txt`. Nuk ka tracking, thirrje rrjeti apo fonte të jashtme në runtime; paketat npm/Python nuk përfshihen në mod.
