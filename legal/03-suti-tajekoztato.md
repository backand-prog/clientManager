# Süti- és helyi tárolási tájékoztató – BackPlan

> **VÁZLAT** – közzététel előtt ellenőrizendő. Verzió: `draft-2026-11-11`.

## 1. Összefoglaló

A BackPlan **kizárólag az üzemeléshez szükséges** böngészős tárolást használja. **Nem használunk** analitikai, hirdetési vagy követő sütiket, ezért hozzájárulást sem kérünk. A „Tudomásul vettem” gomb csak a tájékoztató sávot zárja be.

Ha a jövőben nem szükséges technológiát (pl. analitika) vezetünk be, azt csak előzetes, szabad, konkrét hozzájárulás után kapcsoljuk be, és ezt a tájékoztatót frissítjük.

## 2. Tárolók és céljuk

| Név / forrás | Típus | Cél | Lejárat |
|---|---|---|---|
| Supabase Auth munkamenet (`sb-…-auth-token`) | localStorage | bejelentkezett állapot fenntartása | kijelentkezésig, illetve a token lejártáig (a Supabase Auth beállítása szerint) |
| `backplan-appearance` | localStorage | megjelenési beállítások (téma, betűméret, kontraszt, mozgáscsökkentés) | törlésig |
| Süti-tájékoztató sáv | nincs tárolás | a „Tudomásul vettem” gomb csak a munkamenet idejére zárja be a sávot, nem ír a böngészőbe | – |
| URL hash (`#/…`) | nem tárolás, csak az URL része | navigáció az alkalmazáson belül | – |

## 3. Külső szolgáltatók

- **jsDelivr CDN:** a Supabase JavaScript klienskönyvtárat innen töltjük be. A böngésződ ezért kapcsolatot létesít a CDN-nel, amely a kérés technikai adatait (IP-cím, böngészőadatok) feldolgozhatja.
- **Stripe:** fizetéskor átirányítunk a Stripe oldalára; ott a Stripe saját sütiket használhat, saját tájékoztatója szerint.
- **Vercel (tárhely):** technikai naplókat készíthet a kérésekről.

## 4. Kezelés

A böngésző beállításaiban a tárolt adatok törölhetők. A szükséges tárolók letiltása megakadályozhatja a bejelentkezést és az alkalmazás működését.
