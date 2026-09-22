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
- Böngészőben tárolt adatok `localStorage` segítségével

## Helyi futtatás

Nyisd meg az `index.html` fájlt böngészőben. Nincs szükség build lépésre.

Demo hozzáférések:

- Admin: `admin@formfunction.test` / `admin123`
- Kliens: `maya@example.com` / `client123`

## Fontos

Ez a prototípus a fiókadatokat a böngészőben tárolja, és csak a munkafolyamat ellenőrzésére szolgál. Valós kliensadatok használata előtt szükséges biztonságos backend, szerveroldali hitelesítés, jelszó-hash-elés, jogosultság-ellenőrzés, titkosított adatátvitel és valódi adatbázis.
