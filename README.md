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
- Supabase PostgreSQL adattárolás és Supabase Auth, helyi fallbackkel fejlesztéshez

## Adatbázis: Supabase PostgreSQL

A projekt a beállított Supabase PostgreSQL adatbázist és Supabase Auth hitelesítést használja. A `localStorage` csak akkor marad használatban, ha nincs működő Supabase-konfiguráció.

Beállítás:

1. Hozz létre egy Supabase projektet.
2. Futtasd le a `supabase-schema.sql` fájlt a Supabase SQL Editorban.
3. Másold a `supabase-config.example.js` fájlt `supabase-config.js` néven.
4. Írd be a Supabase projekt URL-jét és anon kulcsát a konfigurációba.

A `supabase-config.js` fájlt ne töltsd fel titkos kulcsokkal. Az anon kulcs kliensoldalon használható, a jogosultságokat az RLS szabályok védik.

## Helyi futtatás

Nyisd meg az `index.html` fájlt böngészőben. Nincs szükség build lépésre.

Demo hozzáférések:

- Admin: `admin@formfunction.test` / `admin123`
- Kliens: `maya@example.com` / `client123`

## Fontos

Ez a prototípus a fiókadatokat a böngészőben tárolja, és csak a munkafolyamat ellenőrzésére szolgál. Valós kliensadatok használata előtt szükséges biztonságos backend, szerveroldali hitelesítés, jelszó-hash-elés, jogosultság-ellenőrzés, titkosított adatátvitel és valódi adatbázis.
