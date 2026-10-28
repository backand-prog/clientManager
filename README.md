# RutinNapló klienskezelő

Első verziós klienskezelő személyi edzők számára.

## Funkciók

- Magyar nyelvű adminisztrátori áttekintő
- Edzői szerepkör adminisztrátori jóváhagyással vagy adminisztrátori fiók-létrehozással
- Több edző hozzárendelése ugyanahhoz a klienshez, kapcsolat leválasztásával
- Klienslista kereséssel, állapottal, teljesítéssel és edzői megjegyzésekkel
- Kliensprofilok hozzáadása és szerkesztése
- Kliensenkénti edzéslista az adminisztrátor számára
- Edzések hozzáadása és szerkesztése dátummal, időponttal, időtartammal, státusszal és edzővel
- A következő edzés automatikusan a legkorábbi jövőbeli, beütemezett alkalomból jelenik meg
- Havi edzésnaptár napválasztással; az adminisztrátorok és edzők a kliensekhez ütemezhetnek, a kliensek a saját edzéseiket tekinthetik át
- Egyéni, edző nélküli edzések naplózása
- Kliens saját profil- és fejlődésnézete; nyilvános, 18+ kliensregisztráció
- Edzői jelentkezés e-mail-megerősítéssel, adminisztrátori elbírálással és jóváhagyásig korlátozott hozzáféréssel
- Kezdőlap szerepkörhöz igazított áttekintéssel, külön kliens- és edzői beállításokkal
- Külön kapcsolati és értesítési oldalak, olvasatlan értesítések előnézetével
- Szerkeszthető edzői bemutatkozás szakterülettel és legfeljebb 5 képpel
- Bejelentkezett kliensek megnyithatják az edzői profilokat, megtekinthetik a bemutatkozást és a képeket, majd kapcsolódási kérést küldhetnek
- Az adminisztrátor külön menüpontban áttekintheti az edzők közzétett profiljait és képeit
- Kliens-edző kapcsolódási kérések regisztrált e-mail-cím alapján, jóváhagyással vagy elutasítással
- Edző által kezdeményezett klienskapcsolat, amelyet a kliens hagy jóvá vagy utasít el
- Kétoldalú, alkalmazáson belüli értesítések a kérésekről és a döntésekről
- Supabase PostgreSQL adattárolás és Supabase Auth, helyi fallbackkel fejlesztéshez

## Adatbázis: Supabase PostgreSQL

A projekt Supabase PostgreSQL adatbázist és Supabase Auth hitelesítést használ. A böngészős `localStorage`-os demo mód kizárólag helyi fejlesztői gépen (`localhost` vagy `127.0.0.1`) használható; éles vagy hálózaton megosztott hoston a Supabase hibája nem kapcsol át demo módra. Supabase-ból betöltött alkalmazásadatokat a kliens nem menti a demo `localStorage` kulcsába.

Beállítás:

1. Hozz létre egy Supabase projektet.
2. Futtasd le a `supabase-schema.sql` fájlt a Supabase SQL Editorban. Meglévő projekt frissítésekor is futtasd le újra, hogy létrejöjjenek a kapcsolódási és coach profil táblák, az ellenőrzött adatbázis-műveletek és a privát képtároló.
3. Másold a `supabase-config.example.js` fájlt `supabase-config.js` néven.
4. Írd be a Supabase projekt URL-jét és anon kulcsát a konfigurációba.
5. A Supabase Dashboardban az Authentication beállításainál kapcsold be a **Confirm email** opciót.
6. Telepítsd az admin fiókkezelő Edge Functiont a Supabase CLI-val: `supabase functions deploy account-admin`.

**Regisztráció és tesztelés:** a felületen jelenleg engedélyezett a nyilvános, 18+ kliensregisztráció és az edzői jelentkezés (`legal-notices.js`). Az edzőnek jelentkezők e-mail-megerősítés után az adminisztrátori Edzői jelentkezések menüpontban bírálhatók el; jóváhagyásig sem kliens-, sem edzői munkateret nem érhetnek el. A szerepkört kizárólag az admin Edge Function adja ki. A jogi tájékoztatók továbbra is tervezetek, és a szolgáltató adatai, illetve a végleges üzleti feltételek hiányoznak, így ez tesztelési lehetőség, nem hivatalos éles indulás vagy jogi megfelelőségi igazolás. Supabase használatakor az Authentication → Providers → Email beállításnál a **Allow new users to sign up** opciónak is engedélyezve kell lennie, a **Confirm email** pedig maradjon bekapcsolva. A frontend-kapcsoló önmagában nem módosítja az API-szintű regisztrációs beállítást. Éles használat előtt töltsd ki és jogilag ellenőriztesd a [LEGAL-COMPLIANCE.md](./LEGAL-COMPLIANCE.md) nyitott pontjait.

Az első tesztelési kör 18 éven felülieknek szól; kiskorúak bevonása későbbi, külön jogi és technikai felülvizsgálatot igényel. A jelenlegi irány egy 3–5 edzővel végzett ingyenes pilot, analitika és marketing nélkül. Későbbi bevételi modellként az edzői előfizetés és ingyenes kliensfiók vizsgálata merült fel, de az árak és feltételek nincsenek eldöntve. Fizetést ne kapcsolj be a jogi/szolgáltatói adatok, a feltételek és a szakértői jóváhagyás előtt. Egészségügyi adat kezelését a jelenlegi termékirány kizárja.

A `supabase-schema.sql` újrafuttatása létrehozza az edzői jelentkezés állapotmezőjét, és lecseréli az Auth felhasználót létrehozó triggert: az önregisztráló fiók adatbázisbeli szerepköre mindig `client`; az edzői jelentkezők hozzáférése az elbírálásig le van tiltva. A felhasználó által küldött metadata nem adhat edzői jogosultságot. Az adminisztrátor az Edge Functionön keresztül bírálja el a megerősített e-mail-című jelentkezőket; jóváhagyáskor ez állítja be a `trainer` szerepkört. Meglévő projektnél futtasd le újra a teljes sémát, majd telepítsd újra az Edge Functiont (`supabase functions deploy account-admin`).

A regisztrációs megerősítő és jelszó-visszaállító e-maileket a Supabase Auth küldi. A linkek az alkalmazás gyökér URL-jére irányítanak, hogy a Supabase kliens a hitelesítési tokeneket a hash-alapú útvonalkezelés mellett is feldolgozhassa. Engedélyezd ezt az URL-t a Supabase Authentication redirect allowlistjében. Valós kézbesítés teszteléséhez állíts be saját SMTP-szolgáltatót az Authentication e-mail beállításainál, és csak olyan e-mail-címet használj, amelynek postafiókjához hozzáférsz. A helyi demo mód nem küld e-mailt.

A `supabase-config.js` fájlt ne töltsd fel titkos kulcsokkal. Az anon kulcs kliensoldalon használható, a jogosultságokat az RLS szabályok védik.

Az alkalmazás tájékoztató sávval és részletes süti-/böngészős tárolási leltárral jelzi a működéshez szükséges tárolókat. A sáv bezárása nem jelent hozzájárulást. Jelenleg nincs analitikai vagy hirdetési tracker, ezért az alkalmazás nem állít be opcionális követőket és nem kér ilyen célú hozzájárulást. Az éles tárhelyszolgáltató saját sütijeit, naplóit és CDN/WAF működését a végleges cookie-tájékoztatóban külön fel kell tüntetni.

Az Edge Function a `SUPABASE_SERVICE_ROLE_KEY` értéket csak szerveroldalon használja edzők létrehozásához/törléséhez és saját fiók törléséhez. Ezt a kulcsot soha ne tedd a frontend konfigurációjába.

## Vercel-bemutató telepítés

Az alkalmazás Vercelre GitHub-projektként telepíthető. A build csak a böngészőnek szánt alkalmazásfájlokat teszi a `dist` könyvtárba; a SQL-séma, dokumentáció és Edge Function nem kerül a nyilvános statikus fájlok közé. A Vercel `/api/runtime-config` függvénye a projekt beállításaiban megadott `VERCEL_SUPABASE_URL` és `VERCEL_SUPABASE_ANON_KEY` értékből állítja elő a klienskonfigurációt. Ezek a böngészőben látható nyilvános Supabase-beállítások, nem titkok; a `service_role` kulcsot soha ne add meg ezek helyett.

1. Importáld a GitHub-repozitóriumot Vercelbe, a projekt gyökere maradjon a repository gyökere, a framework pedig **Other**.
2. A Vercel **Settings → Environment Variables** részében add meg a `VERCEL_SUPABASE_URL` és `VERCEL_SUPABASE_ANON_KEY` értékeket a staging Supabase-projekt publikus URL-jével és anon/publishable kulcsával, legalább a **Preview** és **Production** környezetre.
3. Ellenőrizd a **Build and Output Settings** részen, hogy a build parancs `node scripts/build-static.mjs`, a kimeneti könyvtár pedig `dist`.
4. Futtasd le a frissített `supabase-schema.sql` sémát a staging Supabase-projekt SQL Editorában, és telepítsd az Edge Functiont: `supabase functions deploy account-admin`.
5. A Vercel által kiosztott domain gyökerét add hozzá a staging projekt Supabase Authentication URL Configuration beállításának **Site URL** és **Redirect URLs** listájához.
6. Deploy után ellenőrizd az e-mail-megerősítést, kliensregisztrációt, edzői jelentkezést és adminisztrátori jóváhagyást a staging környezetben.

Az anon/publishable kulcs böngészőoldali nyilvánosságra hozása tervezett; az adatok védelmét a Supabase RLS adja. Staginghez külön Supabase-projektet használj, és abban ne tárolj éles személyes adatot.

## Helyi futtatás

Indíts egyszerű helyi HTTP-szervert a projekt mappájában (például `py -m http.server 8000`), majd nyisd meg a `http://localhost:8000` címet. Nincs szükség build lépésre. A `file://` megnyitás és a hálózaton megosztott host nem aktiválja a helyi demo módot.

Ha nincs Supabase-konfiguráció, vagy a Supabase nem érhető el az alkalmazás indulásakor, az alkalmazás helyi demo módot használ, de csak a fenti helyi hostokon. Ebben a módban az adatok csak az adott böngésző `localStorage` tárhelyére kerülnek. A demo-fiókok és jelszavak kizárólag helyi tesztadatok; ne használd őket éles telepítésben.

Helyi demo hozzáférések:

- Admin: `admin@formfunction.test` / `admin123`
- Edző: `anna@formfunction.test` / `trainer123`
- Kliens: `maya@example.com` / `client123`
- Kliens: `sofia@example.com` / `client123`

A kipróbáláshoz jelentkezz be Sofiaként, és küldj kérést az edző `anna@formfunction.test` címére; ezután jelentkezz be edzőként, és hagyd jóvá vagy utasítsd el a kérést. Az ellenkező irány kipróbálásához Anna küldjön kérést Sofia címére. Mindkét fiók a saját nézetében látja az értesítéseket. Helyi módban a kérések és értesítések ugyanabban a böngészőben maradnak meg.

Az alkalmazás az aktuális nézetet az URL-ben is jelzi, például `#/client/coaches` az edzőlistához, `#/client/coaches/trainer-1` egy edző profiljához, illetve `#/coach/calendar` az edzői naptárhoz. Így frissítéskor az oldal ugyanarra a nézetre tér vissza. A helyi demo bejelentkezése szintén megmarad az adott böngészőben; kijelentkezéshez használd a **Kijelentkezés** gombot.

Edzőként a **Bemutatkozásom** menüpontban szerkesztheted a profilodat és tölthetsz fel legfeljebb 5, egyenként legfeljebb 5 MB-os JPG/PNG/WebP képet. Supabase-módban a képek privát Storage bucketben tárolódnak, és csak hitelesített felhasználók láthatják őket. Helyi demo módban a képek az adott böngésző IndexedDB-tárhelyére kerülnek, ezért ugyanabban a böngészőben újratöltés és fiókváltás után is elérhetők; másik böngészőben vagy eszközön nem. Kliensként az **Edzők böngészése** menüpontban jelennek meg a közzétett profilok.

## Adatvédelem és jogi státusz

Az alkalmazás Beállítások oldalán elérhető a fiókadatok JSON-exportja, a személyes adatok módosítása és a fiók törlése. A Supabase módban a törlés admin Edge Functionön keresztül történik; a fiókhoz tartozó edzői képek eltávolítása megelőzi a fiók törlését. Az alkalmazás célja nem egészségügyi adatok tárolása: ne rögzíts diagnózist, betegséget, sérülést, gyógyszerelést vagy biometrikus adatot.

A `LEGAL-COMPLIANCE.md` összefoglaló és a felületen megjelenő adatvédelmi/felhasználási szövegek tájékoztató jellegű tervezetek, nem jogi tanácsok és nem tekinthetők éles szolgáltatásra jóváhagyottnak. Éles indulás előtt véglegesítsd a szolgáltatói, adatkezelési, szerződési és fogyasztóvédelmi részleteket, kérj szakértői ellenőrzést, és vizsgáld felül a Supabase szerveroldali regisztráció-beállításait. A Supabase Dashboard állapotát a kód nem tudja automatikusan módosítani.
