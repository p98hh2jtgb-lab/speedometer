APEX · Shpejtësimatësi 0.2.0 — version provues në shqip
Target: BeamNG.drive 0.39.4. Ndryshimet e reja ende kërkojnë test brenda lojës.

PËRDITËSIMI
- Hiqe / çaktivizoje apex-speedometer-0.1.0.zip para instalimit të këtij versioni.
- Vendose apex-speedometer-0.2.0.zip pa e shpaketuar në mods të user folder-it aktiv.
- Bëj restart të plotë të lojës që të ngarkohen edhe komandat e tastierës.
- Te UI Apps kërko APEX · Shpejtësimatësi. Lëre app-in full screen.

KONTROLLET
Ctrl+H hap / mbyll cilësimet edhe kur je duke vozitur (komandë native e lojës).
Nuk ka më buton APEX në fund të ekranit.
Nëse Ctrl+H ka konflikt, te Settings -> Controls kërko APEX dhe cakto Ctrl+H.
Right-click mbi numrin mbetet si mënyrë alternative.
Pozicioni -> çaktivizo Blloko pozicionin për ta zhvendosur me panelin hapur.

BURIMET
Dinamik (standard): përdor shpejtësinë reale të lëvizjes, jo rrotullimin e gomave.
Lexon electrics.airspeed / airSpeed dhe ka edhe rrugë të pavarur përmes GE Lua.
Kur gomat bllokohen, shpejtësia nuk bëhet 0 nëse vetura ende lëviz.
Air: vetëm shpejtësia reale; shfaq — nëse të dhënat mungojnë.
Gomat: vetëm rrotullimi i gomave, sipas dëshirës.
Në Dinamik, nëse të dy burimet reale mungojnë, përdoren gomat me paralajmërim REZERVË.
Air këtu do të thotë lëvizja në botën e lojës (përfshirë lëvizjen vertikale), jo era.

NGJYRAT DHE PAMJA
Ngjyra fikse: përdor paletën, fushën HEX ose zgjedhësin e ngjyrës.
Zgjedhja e ngjyrës kryesore çaktivizon kalimin automatik që ngjyra të duket menjëherë.
Aktivizo Ngjyra sipas shpejtësisë për kalime graduale mes ngjyrave/pragjeve.
Hapësira numër – njësi dhe Hapësira mes shifrave rregullohen veçmas te Pamja.
Shiriti RPM ka kufi manual; nuk zbulon automatikisht redline-in.

Nuk ka survival, damage, boost ose ndryshime të fizikës së veturës.
Cilësimet ruhen lokalisht. Eksporto stilin nga Stilet për kopje rezervë.
Fontet Barlow Condensed shpërndahen me licencën SIL OFL te dosja fonts.

Kodi dhe udhëzimet:
https://github.com/p98hh2jtgb-lab/speedometer/tree/arena/c4a2d9cd-speedometer
