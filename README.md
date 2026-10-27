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
- Egyéni, edző nélküli edzések naplózása
- Kliensregisztráció és saját profil-/fejlődésnézet
- Kliens-edző kapcsolódási kérések regisztrált e-mail-cím alapján, jóváhagyással vagy elutasítással
- Edző által kezdeményezett klienskapcsolat, amelyet a kliens hagy jóvá vagy utasít el
- Kétoldalú, alkalmazáson belüli értesítések a kérésekről és a döntésekről
- Supabase PostgreSQL adattárolás és Supabase Auth, helyi fallbackkel fejlesztéshez

## Adatbázis: Supabase PostgreSQL

A projekt a beállított Supabase PostgreSQL adatbázist és Supabase Auth hitelesítést használja. A `localStorage` csak akkor marad használatban, ha nincs működő Supabase-konfiguráció.

Beállítás:

1. Hozz létre egy Supabase projektet.
2. Futtasd le a `supabase-schema.sql` fájlt a Supabase SQL Editorban. Meglévő projekt frissítésekor is futtasd le újra, hogy létrejöjjenek a kapcsolódási kérések és értesítések táblái, valamint az ellenőrzött adatbázis-műveletek.
3. Másold a `supabase-config.example.js` fájlt `supabase-config.js` néven.
4. Írd be a Supabase projekt URL-jét és anon kulcsát a konfigurációba.
5. A Supabase Dashboardban az Authentication beállításainál kapcsold be a **Confirm email** opciót.
6. Telepítsd az admin fiókkezelő Edge Functiont a Supabase CLI-val: `supabase functions deploy account-admin`.

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

## Fontos

Ez a prototípus a fiókadatokat a böngészőben tárolja, és csak a munkafolyamat ellenőrzésére szolgál. Valós kliensadatok használata előtt szükséges biztonságos backend, szerveroldali hitelesítés, jelszó-hash-elés, jogosultság-ellenőrzés, titkosított adatátvitel és valódi adatbázis.
