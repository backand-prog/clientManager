# Form & Function klienskezelő

Első verziós klienskezelő személyi edzők számára.

## Funkciók

- Magyar nyelvű adminisztrátori áttekintő
- Edzői szerepkör és edzői regisztráció
- Több edző hozzárendelése ugyanahhoz a klienshez, kapcsolat leválasztásával
- Klienslista kereséssel, állapottal, teljesítéssel és edzői megjegyzésekkel
- Kliensprofilok hozzáadása és szerkesztése
- Kliensenkénti edzéslista az adminisztrátor számára
- Edzések hozzáadása és szerkesztése dátummal, időponttal, időtartammal, státusszal és edzővel
- Havi edzésnaptár napválasztással; az adminisztrátorok és edzők a kliensekhez ütemezhetnek, a kliensek a saját edzéseiket tekinthetik át
- Egyéni, edző nélküli edzések naplózása
- Kliensregisztráció és saját profil-/fejlődésnézet
- Szerkeszthető edzői bemutatkozás szakterülettel és legfeljebb 5 képpel
- Bejelentkezett kliensek megnyithatják az edzői profilokat, megtekinthetik a bemutatkozást és a képeket, majd kapcsolódási kérést küldhetnek
- Az adminisztrátor külön menüpontban áttekintheti az edzők közzétett profiljait és képeit
- Kliens-edző kapcsolódási kérések regisztrált e-mail-cím alapján, jóváhagyással vagy elutasítással
- Edző által kezdeményezett klienskapcsolat, amelyet a kliens hagy jóvá vagy utasít el
- Kétoldalú, alkalmazáson belüli értesítések a kérésekről és a döntésekről
- Supabase PostgreSQL adattárolás és Supabase Auth, helyi fallbackkel fejlesztéshez

## Adatbázis: Supabase PostgreSQL

A projekt a beállított Supabase PostgreSQL adatbázist és Supabase Auth hitelesítést használja. A `localStorage` csak akkor marad használatban, ha nincs működő Supabase-konfiguráció.

Beállítás:

1. Hozz létre egy Supabase projektet.
2. Futtasd le a `supabase-schema.sql` fájlt a Supabase SQL Editorban. Meglévő projekt frissítésekor is futtasd le újra, hogy létrejöjjenek a kapcsolódási és coach profil táblák, az ellenőrzött adatbázis-műveletek és a privát képtároló.
3. Másold a `supabase-config.example.js` fájlt `supabase-config.js` néven.
4. Írd be a Supabase projekt URL-jét és anon kulcsát a konfigurációba.
5. A Supabase Dashboardban az Authentication beállításainál kapcsold be a **Confirm email** opciót.
6. Telepítsd az admin fiókkezelő Edge Functiont a Supabase CLI-val: `supabase functions deploy account-admin`.

A regisztrációs megerősítő és jelszó-visszaállító e-maileket a Supabase Auth küldi. A linkek az alkalmazás gyökér URL-jére irányítanak, hogy a Supabase kliens a hitelesítési tokeneket a hash-alapú útvonalkezelés mellett is feldolgozhassa. Engedélyezd ezt az URL-t a Supabase Authentication redirect allowlistjében. Valós kézbesítés teszteléséhez állíts be saját SMTP-szolgáltatót az Authentication e-mail beállításainál, és csak olyan e-mail-címet használj, amelynek postafiókjához hozzáférsz. A helyi demo mód nem küld e-mailt.

A `supabase-config.js` fájlt ne töltsd fel titkos kulcsokkal. Az anon kulcs kliensoldalon használható, a jogosultságokat az RLS szabályok védik.

Az Edge Function a `SUPABASE_SERVICE_ROLE_KEY` értéket csak szerveroldalon használja edzők létrehozásához/törléséhez és saját fiók törléséhez. Ezt a kulcsot soha ne tedd a frontend konfigurációjába.

## Helyi futtatás

Nyisd meg az `index.html` fájlt böngészőben. Nincs szükség build lépésre.

Ha nincs Supabase-konfiguráció, vagy a Supabase nem érhető el az alkalmazás indulásakor, az alkalmazás helyi demo módot használ. Ebben a módban az adatok csak az adott böngésző `localStorage` tárhelyére kerülnek.

Helyi demo hozzáférések:

- Admin: `admin@formfunction.test` / `admin123`
- Edző: `anna@formfunction.test` / `trainer123`
- Kliens: `maya@example.com` / `client123`
- Kliens: `sofia@example.com` / `client123`

A kipróbáláshoz jelentkezz be Sofiaként, és küldj kérést az edző `anna@formfunction.test` címére; ezután jelentkezz be edzőként, és hagyd jóvá vagy utasítsd el a kérést. Az ellenkező irány kipróbálásához Anna küldjön kérést Sofia címére. Mindkét fiók a saját nézetében látja az értesítéseket. Helyi módban a kérések és értesítések ugyanabban a böngészőben maradnak meg.

Az alkalmazás az aktuális nézetet az URL-ben is jelzi, például `#/client/coaches` az edzőlistához, `#/client/coaches/trainer-1` egy edző profiljához, illetve `#/coach/calendar` az edzői naptárhoz. Így frissítéskor az oldal ugyanarra a nézetre tér vissza. A helyi demo bejelentkezése szintén megmarad az adott böngészőben; kijelentkezéshez használd a **Kijelentkezés** gombot.

Edzőként a **Bemutatkozásom** menüpontban szerkesztheted a profilodat és tölthetsz fel legfeljebb 5, egyenként legfeljebb 5 MB-os JPG/PNG/WebP képet. Supabase-módban a képek privát Storage bucketben tárolódnak, és csak hitelesített felhasználók láthatják őket. Helyi demo módban a képek az adott böngésző IndexedDB-tárhelyére kerülnek, ezért ugyanabban a böngészőben újratöltés és fiókváltás után is elérhetők; másik böngészőben vagy eszközön nem. Kliensként az **Edzők böngészése** menüpontban jelennek meg a közzétett profilok.

## Fontos

Ez a prototípus a fiókadatokat a böngészőben tárolja, és csak a munkafolyamat ellenőrzésére szolgál. Valós kliensadatok használata előtt szükséges biztonságos backend, szerveroldali hitelesítés, jelszó-hash-elés, jogosultság-ellenőrzés, titkosított adatátvitel és valódi adatbázis.
