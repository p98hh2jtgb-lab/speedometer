APEX · Shpejtësimatësi 0.3.3 — version provues në shqip
Target: BeamNG.drive 0.39.4. Testuar në browser/API të simuluara, jo brenda lojës.

Pamja clean e 0.3.1 ruhet; 0.3.3 shton vetëm matësin opsional. 0.3.2 është tërhequr.
Kthimi nga 0.3.2 rikthen një herë ngjyrën fikse, pa prekur pamjen/pozicionet.

INSTALIMI
Hiqi / çaktivizoji TË GJITHË ZIP-at e vjetër APEX, përfshirë 0.3.1 dhe 0.3.2.
Vendose vetëm apex-speedometer-0.3.3.zip në mods të user folder-it aktiv, pa e shpaketuar.
Bëj restart të plotë. Te UI Apps përdor një APEX · Shpejtësimatësi, full screen.
Paneli duhet të tregojë 0.3.3.

PAMJA CLEAN
Font SemiBold, jo Black 900. E bardhë fikse si standard në çdo shpejtësi.
Numri dhe km/h bashkë, afër, në një rresht me të njëjtën ngjyrë/font/trashësi/pjerrësi.
Madhësia rregullon gjithë speedometrin; njësia është 1/4 e madhësisë së numrit.
Pa tregues marshi. Pa RPM. Pa spektër shumëngjyrësh ose pink automatik.
Përditësimi nga versionet e vjetra e vendos një herë pamjen clean/të bardhë,
duke ruajtur njësinë, burimin dhe pozicionet. Fushat e hequra të JSON-it injorohen.

MATËSI 0-100: OFF SI STANDARD
⚙ -> 0–100 -> Aktivizo matësin 0–100.
OFF: nuk matet asgjë në prapavijë; nuk shfaqen sekonda.
ON: ndalo për 0.5 s, nisu dhe arrij 100 km/h. Vetëm atëherë del rezultati,
p.sh. “0–100 km/h 2.20 s”, për 4 s plus daljen e animuar, pastaj zhduket.
Nuk ka numërues live. Fikja anulon matjen dhe fsheh rezultatin menjëherë.

Opsione: kohëzgjatja 1-15 s, madhësia 10-40 px, largësia poshtë, zhvendosja horizontale,
rreshtimi majtas/mes/djathtas, opacity, etiketa ON/OFF, 1/2/3 shifra pas presjes,
ngjyrë që ndjek speedometrin ON/OFF ose paletë/HEX personale, sfond dhe kontur ON/OFF.
Animacion ON/OFF veçmas: Fade / Slide / Pop, kohë 100-900 ms.
Përgatitja automatike pas ndaljes ON/OFF; pritje ndaljeje 0.2-2 s; pastrim manual.
“Provo animacionin” jep shembull të shënuar PROVË, jo rezultat të matur.
Cilësimet ruhen; gjendja e provës dhe rezultatet nuk ruhen midis sesioneve.

Matja përdor lëvizjen reale XYZ dhe dtSim nga Lua, jo gomat/smoothing/orën e browser-it.
Pause nuk numërohet; slow-motion përdor kohën e simulimit. Pragu mbetet 100 km/h edhe në mph.
Pa Lua/kohë simulimi nuk jep rezultat. Reset/ndërrim veture/të dhëna të vjetruara e anulojnë.
Mostrat janë rreth 20 Hz. Ka interpolim në 100 km/h dhe vlerësim nisjeje (tolerancë 0.5 km/h,
ekstrapolim maksimum 100 ms). Numri i shifrave nuk garanton saktësi në milisekonda.
Provat mbi 120 s ose boshllëqet >0.5 s të simulimit anulohen. Duhet ende provë brenda BeamNG.
Animacioni respekton reduced motion. Pamja bazë dhe numri + km/h nuk ndryshojnë.

PANELI DHE SPEEDOMETRI LËVIZIN VEÇMAS
⚙ sipër djathtas hap cilësimet; X mbyll. Nuk ka Ctrl+H dhe as buton APEX poshtë.
Paneli: 340 × 560 px standard. Tërhiq titullin; − mbledh, + zgjeron.
“↔ Largo” zgjedh cepin me më pak mbulim të numrit. Pozicionet/madhësitë ruhen.
Pozicioni -> çaktivizo “Blloko numrin” -> tërhiq speedometrin pa lëvizur panelin.

NJËSITË DHE NGJYRAT
Butonat km/h / mph konvertojnë vlerën dhe etiketën menjëherë.
Kliko edhe numrin/njësinë për ndërrim; gjatë drag-ut kjo nuk aktivizohet.
Paleta ose HEX + Apliko ndryshon ngjyrën e të gjithë speedometrit.
Vetëm nëse zgjedh “Kalimi i lehtë”: bardhë deri 60 km/h -> amber në 100 -> kuqe në 140+.
Pragjet maten në km/h reale edhe kur shfaq mph. Standardi mbetet i bardhë fikse.

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
