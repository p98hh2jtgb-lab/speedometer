APEX · Shpejtësimatësi 0.3.2 — version provues në shqip
Target: BeamNG.drive 0.39.4. Testuar në browser/API të simuluara, jo brenda lojës.

INSTALIMI
Hiqi / çaktivizoji TË GJITHË ZIP-at e vjetër APEX, përfshirë 0.3.0 dhe 0.3.1.
Vendose vetëm apex-speedometer-0.3.2.zip në mods të user folder-it aktiv, pa e shpaketuar.
Bëj restart të plotë. Te UI Apps përdor një APEX · Shpejtësimatësi, full screen.
Paneli duhet të tregojë 0.3.2.

PAMJA CLEAN
Font SemiBold, jo Black 900. Ngjyra ndjek shpejtësinë si standard.
Numri dhe km/h bashkë, afër, në një rresht me të njëjtën ngjyrë/font/trashësi/pjerrësi.
Madhësia rregullon gjithë speedometrin; njësia është 1/4 e madhësisë së numrit.
Pa tregues marshi. Pa RPM. Pa spektër shumëngjyrësh ose pink automatik.
Përditësimi nga 0.3.1 aktivizon një herë ngjyrat e reja pa prekur fontin, madhësinë,
njësinë, burimin apo pozicionet. Versionet më të vjetra marrin edhe pamjen clean.
Fushat e hequra të JSON-it injorohen.

PANELI DHE SPEEDOMETRI LËVIZIN VEÇMAS
⚙ sipër djathtas hap cilësimet; X mbyll. Nuk ka Ctrl+H dhe as buton APEX poshtë.
Paneli: 340 × 560 px standard. Tërhiq titullin; − mbledh, + zgjeron.
“↔ Largo” zgjedh cepin me më pak mbulim të numrit. Pozicionet/madhësitë ruhen.
Pozicioni -> çaktivizo “Blloko numrin” -> tërhiq speedometrin pa lëvizur panelin.

NJËSITË DHE NGJYRAT
Butonat km/h / mph konvertojnë vlerën dhe etiketën menjëherë.
Kliko edhe numrin/njësinë për ndërrim; gjatë drag-ut kjo nuk aktivizohet.
Paleta ose HEX + Apliko ndryshon ngjyrën e të gjithë speedometrit.
Standardi “Sipas shpejtësisë”: 0 bardhë -> gradualisht gjelbër në 10 km/h.
10-50 km/h mbetet gjelbër; 50-100 kalon gradualisht në kuqe, përmes të verdhës.
Në 100 km/h dhe më lart: krejt kuqe (#ff0000), edhe numri edhe njësia.
Pragjet maten në km/h edhe kur shfaq mph. Paleta/HEX aktivizon ngjyrën fikse.
Ndërrimi i stilit nuk ndryshon zgjedhjen fikse/sipas shpejtësisë.

BURIMET
Dinamik / Air matin lëvizjen reale edhe me goma të bllokuara.
Dinamik përdor gomat vetëm si rezervë të shënuar nëse mungojnë matjet reale.
Air është lëvizja XYZ e lojës, jo era. Të dhënat që mungojnë shfaqen si —.
Gomat është opsion eksplicit dhe mund të tregojë zero gjatë rrëshqitjes me frena.

Stilet Clean/Kontur/Racing/Neon/Hyper/Minimal/Digjital mbajnë gjithmonë numrin dhe njësinë inline.
Opsione: decimale, zbutje, kontur, hije, sfond, glow, maksimum sesioni,
paralajmërim shpejtësie, fshehje kur ndalet dhe stile personale/import/eksport JSON.
Pa survival, damage, boost apo ndryshime të fizikës.
Fontet Barlow Condensed shpërndahen me SIL OFL te fonts/OFL.txt.
Kodi: https://github.com/p98hh2jtgb-lab/speedometer/tree/arena/c4a2d9cd-speedometer
