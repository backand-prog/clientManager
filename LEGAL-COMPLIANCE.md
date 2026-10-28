# RutinNapló – adatvédelem és jogi megfelelés

> **Fontos:** ez fejlesztési és terméktervezési összefoglaló, nem jogi tanács és nem teljes körű jogi megfelelőségi igazolás. A nyilvános szolgáltatás indítása előtt magyar adatvédelmi/fogyasztóvédelmi szakértőnek kell ellenőriznie az üzleti modellt és a végleges dokumentumokat.

## Röviden: mely szabályok számítanak?

### EU-s adatvédelem – GDPR (EU) 2016/679

A név, e-mail, edzésnapló, cél, kapcsolatok, képek és értesítések személyes adatok. A GDPR alapján a szolgáltatónak többek között:

- minden célhoz megfelelő jogalapot, célhoz kötöttséget és adatminimalizálást kell meghatároznia (5–6. cikk);
- az adatfelvételkor közérthető adatkezelési tájékoztatást kell adnia, és kezelnie kell a hozzáférés, helyesbítés, törlés, korlátozás, adathordozhatóság és tiltakozás iránti kérelmeket (12–22. cikk);
- alapértelmezett és beépített adatvédelmet, megfelelő hozzáférés-védelmet és incidenskezelést kell biztosítania (25., 32–34. cikk);
- nyilvántartania kell az adatkezelést, írásos adatfeldolgozói szerződést kell kötnie, és fel kell mérnie az adatvédelmi hatásvizsgálat szükségességét (28., 30., 35. cikk);
- EGT-n kívüli adattovábbításnál a V. fejezet szerinti feltételeket és garanciákat kell teljesítenie.

Edzéscél és szabadszöveges megjegyzés egészségügyi adatot fedhet fel. Az egészségügyi adatok a GDPR 9. cikke szerinti különleges adatok. Jelen prototípus nem alkalmas diagnózis, betegség, sérülés, gyógyszerelés vagy biometrikus adat kezelésére; a felhasználókat erre figyelmezteti. Ha ez üzleti igénnyé válik, külön jogalap, kifejezett feltételek, szigorúbb hozzáférések és valószínűleg hatásvizsgálat szükséges.

### Magyar adatvédelmi keret

- **2011. évi CXII. törvény (Infotv.)**: a GDPR melletti magyar kiegészítő szabályok és a NAIH felügyeleti szerepe.
- A magyarországi adatkezelési panaszok felügyeleti hatósága a **Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)**.
- Ha a coach önállóan határozza meg, hogyan és miért kezeli a kliens edzésadatait, adatkezelő lehet; a RutinNapló üzemeltetője a tárhely és szoftver kapcsán adatfeldolgozó is lehet. A platform saját fiók-, számlázási és biztonsági céljaira külön adatkezelő lehet. E szerepeket szerződésben és a valós működéshez igazodva kell tisztázni; a termék jelen állapotában ez még nincs eldöntve.

### Sütik és böngészős tárolás – ePrivacy

Az ePrivacy irányelv (2002/58/EK, 5. cikk (3)) a sütikre és a végberendezésen történő információtárolásra/hozzáférésre terjed ki; ez nem csak a hagyományos HTTP-sütiket jelenti, ezért a `localStorage` és az `IndexedDB` használatát is fel kell mérni. A működéshez szigorúan szükséges tároló mentesülhet az előzetes hozzájárulás alól, de erről is világos tájékoztatást kell adni. Analitika, hirdetés vagy más nem szükséges tárolás csak megfelelő, előzetes hozzájárulás után aktiválható.

A jelenlegi alkalmazás egy tájékoztató sávot és részletes, alkalmazáson belül elérhető tárolóleltárt jelenít meg. A sáv bezárása csak a sávot rejti el az aktuális oldalbetöltés alatt; nem rögzít hozzájárulást. Mivel az app jelenleg nem használ opcionális trackereket, nem kér hamis „elfogadom a sütiket” hozzájárulást, és nincs szükség banner „elutasítás” funkcióra. Ha nem szükséges technológiát vezetünk be, előbb consent-platformot kell megvalósítani: alapértelmezett tiltás, kategóriánkénti választás, az elfogadással azonosan egyszerű elutasítás, visszavonás, verzió/időbélyeg szerinti bizonyítható naplózás, és a címkék tényleges blokkolása hozzájárulásig.

Az alkalmazás leltára jelenleg:

- Supabase Auth munkamenet: a Supabase JS kliens alapértelmezett `localStorage`-tárhelye; bejelentkezési munkamenethez. Lejárata a Supabase Auth beállításaitól függ; kijelentkezéskor törlődik.
- Helyi tesztmód: `form-function-data` és `form-function-session` `localStorage` kulcsok, illetve `form-function-images` IndexedDB adatbázis. Csak `localhost`/`127.0.0.1` alatt; tesztadat és tesztkép céljára.
- Navigációs hash (`#/...`): a nézet útvonala kerül az URL-be; nem cookie és nem hitelesítési token.
- Az alkalmazáskód nem állít be saját HTTP-sütit és jelenleg nincs analitikai, hirdetési vagy közösségi követő.

Az alkalmazás Supabase JS könyvtárat tölt be a jsDelivr CDN-ről; emiatt a böngésző kapcsolódik a CDN-hez, amely technikai kapcsolatadatokat dolgozhat fel. A Google Fonts hívások eltávolításra kerültek. Az éles tárhelyszolgáltató saját sütijei, naplói, CDN/WAF és botvédelmi beállításai ettől külön rendszert alkothatnak, és a szolgáltató, cél, jogalap, megőrzési idő és szükségesség szerint fel kell venni őket a végleges tájékoztatóba.

### Online szerződés és fizetés

- **2001. évi CVIII. törvény** az elektronikus kereskedelmi és információs társadalommal összefüggő szolgáltatásokról: többek között a szolgáltató azonosítható adatai és az elektronikus szerződéskötés tájékoztatása.
- **45/2014. (II. 26.) Korm. rendelet**, valamint a 2011/83/EU fogyasztói jogokról szóló irányelv: fogyasztói távollévők közötti szerződés, előzetes ár- és szerződési tájékoztatás, elállás/felmondás és digitális szolgáltatás megkezdése. A kivételek és az azonnali teljesítéshez szükséges fogyasztói nyilatkozatok terméktípusonként eltérnek.
- Edzők és kliensek is lehetnek fizetők, de eltérhet, hogy az edző üzleti előfizetést vásárol-e vagy a kliens fogyasztóként edzés-/digitális szolgáltatást. A fizető fél, szerződő szolgáltató, csomag, teljes ár, időszak, megújulás, lemondás és elállás még nincs meghatározva.
- A fizetési szolgáltató még nincs kiválasztva. Kártyaadatot ne tároljon a RutinNapló; fizetést és erős ügyfél-hitelesítést szerződött fizetési szolgáltató kezeljen. Számlázási és adózási kötelezettségekhez könyvelői ellenőrzés is szükséges.

### Marketing és lehetséges további szabályok

- **2008. évi XLVIII. törvény** a gazdasági reklámtevékenységről: hírlevélhez és közvetlen marketinghez külön hozzájárulás és leiratkozási folyamat kell. Jelenleg nem küldünk marketingüzenetet; az értesítések kizárólag a kért alkalmazásfunkcióról szólnak.
- **Digitális Szolgáltatásokról szóló (EU) 2022/2065 rendelet (DSA)**: a coach-profilok és képek tárolása miatt meg kell vizsgálni, hogy a szolgáltatás közvetítő tárhelyszolgáltatásnak minősül-e, és milyen bejelentési, kapcsolattartói vagy moderációs kötelezettség vonatkozik rá. A felhasználói tartalom nyilvánossága és az üzleti szerep döntő.
- **Európai Akadálymentességi Irányelv (EU) 2019/882**: a szolgáltatás terjedelmét és a szolgáltató mikrovállalkozási státuszát ellenőrizni kell; ahol kötelező vagy üzletileg indokolt, a felületet akadálymentesíteni kell.
- A RutinNapló jelenleg nem használ algoritmikus profilalkotást vagy AI-alapú döntést. Új elemzési vagy automatizált döntési funkció bevezetése új jogi és adatvédelmi felülvizsgálatot igényel.

## Amit a kódban most megvalósítottunk

- Nyilvános adatvédelmi, felhasználási és sütitájékoztató **tervezet** érhető el. A hiányzó szolgáltatói adatok és üzleti feltételek nyíltan kitöltendőként szerepelnek.
- A nyilvános, 18+ kliensregisztráció és edzői jelentkezés tesztelésre engedélyezett; a jogi dokumentumok továbbra is tervezetek, ezért ez nem jelent hivatalos vagy jogilag jóváhagyott éles indulást. Az edzőnek jelentkezők e-mail-megerősítés után adminisztrátori elbírálást kapnak, és jóváhagyásig nem használhatják az alkalmazás munkaterét. Kiskorúak bevonását külön jogi és technikai fázisban kell vizsgálni.
- Az indulási terv egy 3–5 edzővel végzett zárt, ingyenes pilot, analitika és marketing nélkül. Későbbi monetizációs hipotézis az edzők előfizetése és a kliensek ingyenes hozzáférése; árak, csomagok és jogi feltételek még nincsenek meghatározva.
- A felhasználó a Beállításokból letöltheti a saját fiókadatait JSON-fájlként, helyesbítheti adatait és kezdeményezheti fiókja törlését. A fióktörlés a coach-profil képeit is eltávolítja a privát tárhelyről.
- A regisztrációs szerepkört az adatbázis nem fogadja el a felhasználó által megadott metaadatból. Edzői jelentkezésnél a profil csak függőben lévő kérelmet kap; az adminisztrátor csak megerősített e-mail-cím után, szerveroldali Edge Functionnel adhat edzői szerepkört.
- A böngészős helyi demo csak `localhost`/`127.0.0.1` alatt használható; valódi személyes adatot ne írj be. Supabase-módban az alkalmazás nem másolja az adatbázis teljes tartalmát saját `localStorage`-kulcsba.
- Eltávolítottuk a Google Fonts hívásokat. Az alkalmazás jelenlegi kódja nem használ marketing/analitikai trackert; helyette tájékoztató sáv és részletes böngészős tárolóleltár érhető el. A sáv bezárása nem hozzájárulás.

## Élesítés előtt kötelezően kitöltendő / ellenőrizendő

1. A szolgáltató hivatalos neve, székhelye, nyilvántartási adata, adószáma, valós ügyfélszolgálati és adatvédelmi elérhetősége.
2. Üzleti és szerződéses szerepek: ki nyújt edzést, ki szerződik a klienssel, ki fizet kinek, a coachok adatkezelői/adatfeldolgozói minősége.
3. Coachokkal kötendő GDPR 28. cikk szerinti adatfeldolgozói feltételek, ha a RutinNapló az ő utasításaik alapján tárol adatot.
4. Supabase-projekt régiója, Supabase és tárhely/CDN szolgáltatók szerződései, al-adatfeldolgozói listája, adattovábbítási garanciák, és pontosan közölt adatkezelők.
5. Minden adatcsoporthoz cél, jogalap, címzett, megőrzési idő; törlési, biztonsági mentési és incidenskezelési eljárás; szükség esetén adatkezelési nyilvántartás és DPIA.
6. Előfizetésnél: fizetési szolgáltató, pontos ár és adók, számlázás, ismétlődő terhelés, lemondás/elállás, panaszkezelés és a digitális szolgáltatás megkezdéséhez szükséges fogyasztói nyilatkozatok.
7. Az első tesztelési kör 18+ korhatárral működik, életkor-nyilatkozattal. Hivatalos indulás előtt jogásszal ellenőrizd az életkor-nyilatkozat és szerződéskötés megfelelő módját. A kiskorúak jövőbeli bevonásához külön korosztályi kapu, képviseleti jogosultság ellenőrzés, szülői tájékoztatás/hozzájárulás, gyermekeknek szóló adatvédelmi tájékoztató és szerződéses modell kell; ezt most ne építsük be az első indulásba.
8. A felhasználó kifejezetten azt választotta, hogy egészségügyi adatot ne kezeljünk. Ezt műszakilag is tartsd be: szabad szöveges mezők minimalizálása, figyelmeztetés, incidens- és törlési eljárás; egészségügyi adatot ne használj edzői ajánláshoz vagy döntéshez.
9. A javasolt B2B modell – edzői előfizetés, kliensek ingyenes hozzáférése – véglegesítése könyvelővel és jogásszal; számlázás, ÁFA/adózás, csomag, ár, próbaidő, automatikus megújulás, lemondás, panasz és fogyasztói státusz meghatározása.
10. DSA- és akadálymentességi hatályvizsgálat, független biztonsági ellenőrzés, naplózási/mentési beállítások és a tényleges éles URL Supabase Auth redirect allowlistbe vétele. A kiválasztott tárhelyen állíts be HTTPS-kényszerítést és megfelelő szerveroldali biztonsági fejléceket (többek között CSP, HSTS, nosniff, Referrer-Policy, frame-ancestors és indokolt Permissions-Policy), majd ellenőrizd a CSP-t a használt Supabase/CDN végpontokkal.
11. A tényleges tárhelyszolgáltató, CDN, DNS, WAF, e-mail és hibakövető konfigurációjának ellenőrzése; a szolgáltatói technikai sütik, IP-naplók és megőrzési idők dokumentálása.
12. Hivatalos indulás előtt végezd el a dokumentumok jogi felülvizsgálatát, verziózását és közzétételét. Külön ellenőrizd a szerveroldali regisztrációs beállítást és a feltételek elfogadásának naplózását; a jelenlegi felület ezt a naplózást nem biztosítja.

## Hivatalos források

- [GDPR – (EU) 2016/679 rendelet](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- [ePrivacy – 2002/58/EK irányelv](https://eur-lex.europa.eu/eli/dir/2002/58/oj)
- [Fogyasztói jogokról szóló 2011/83/EU irányelv](https://eur-lex.europa.eu/eli/dir/2011/83/oj)
- [Digitális Szolgáltatásokról szóló (EU) 2022/2065 rendelet](https://eur-lex.europa.eu/eli/reg/2022/2065/oj)
- [Európai Akadálymentességi Irányelv (EU) 2019/882](https://eur-lex.europa.eu/eli/dir/2019/882/oj)
- [2011. évi CXII. törvény (Infotv.) – Nemzeti Jogszabálytár](https://njt.jog.gov.hu/jogszabaly/2011-112-00-00)
- [2001. évi CVIII. törvény – Nemzeti Jogszabálytár](https://njt.jog.gov.hu/jogszabaly/2001-108-00-00)
- [45/2014. (II. 26.) Korm. rendelet – Nemzeti Jogszabálytár](https://njt.jog.gov.hu/jogszabaly/2014-45-20-22)
- [2008. évi XLVIII. törvény – Nemzeti Jogszabálytár](https://njt.jog.gov.hu/jogszabaly/2008-48-00-00)
- [NAIH – Nemzeti Adatvédelmi és Információszabadság Hatóság](https://www.naih.hu/)
