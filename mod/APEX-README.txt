APEX · Shpejtësimatësi 0.2.1 — version provues në shqip
Target: BeamNG.drive 0.39.4. Ndryshimet e reja ende kërkojnë test brenda lojës.

PËRDITËSIMI
- Hiqi / çaktivizoji ZIP-at e vjetër APEX 0.1.0 dhe 0.2.0. Mbaje vetëm këtë version aktiv.
- Vendose apex-speedometer-0.2.1.zip pa e shpaketuar në mods të user folder-it aktiv.
- Bëj restart të plotë të lojës që të mos mbetet UI-ja e vjetër në memorie.
- Te UI Apps kërko APEX · Shpejtësimatësi. Lëre app-in full screen.

KONTROLLET
Kliko butonin e vogël ⚙ sipër djathtas për t’i hapur cilësimet.
Kliko X në panel për t’i mbyllur. Butoni punon edhe kur numri është i fshehur.
Ctrl+H, komanda Lua dhe binding-u i tij u hoqën nga ky version.
Nuk ka më buton APEX në fund të ekranit.
Nëse ke caktuar manualisht një binding të vjetër në Controls, hiqe edhe atë.
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
