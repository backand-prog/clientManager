# Adatkezelési nyilvántartás (GDPR 30. cikk) – BackPlan

> **VÁZLAT – belső dokumentum.** Verzió: `draft-2026-11-11`. Felelős: [SZOLGÁLTATÓ NEVE / kapcsolattartó]. Utolsó felülvizsgálat: [DÁTUM]. Évente, illetve minden lényeges változáskor frissítendő.

## 1. Adatkezelő adatai

[SZOLGÁLTATÓ NEVE], [CÍM], [ADÓSZÁM], adatvédelmi kapcsolat: [info@backplanfitness.com]. Adatvédelmi tisztviselő: [nincs kinevezve – az ügyvéd megítéli, kell-e].

## 2. Adatkezelési tevékenységek

| # | Tevékenység | Érintettek | Adatkategóriák | Jogalap | Címzettek | Megőrzés | Biztonsági intézkedések |
|---|---|---|---|---|---|---|---|
| 1 | Fiókkezelés, belépés | edzők, kliensek | név, e-mail, jelszóhash, szerepkör | szerződés (6. (1) b)) | Supabase | fiók törléséig | HTTPS, jelszóhash, RLS |
| 2 | Edzői jelentkezés és jóváhagyás | edző jelentkezők | szakterület, állapot, döntés | szerződés előtti lépés | Supabase | fiók törléséig | RLS, admini jogosultság |
| 3 | Munkatér (edzésnapló, naptár, tervek, csoportos edzés, jegyzet) | kliensek, edzők | edzéscél, időpontok, jegyzetek, tervek | szerződés (a klienseknél az edző megbízásából, adatfeldolgozóként) | Supabase; az érintett edző(k); stúdióvezető | fiók/kapcsolat megszűnéséig | RLS, kapcsolatfüggő hozzáférés, hozzárendelési trigger |
| 4 | Nyilvános edzői profil | edzők | bemutatkozás, szakterület, képek | hozzájárulás / szerződés | Supabase tárhely, más felhasználók | profil törléséig | tárolóbucket-policy |
| 5 | Értesítések és kapcsolatok | edzők, kliensek | értesítés szövege, kérések | szerződés | Supabase | fiók törléséig | RLS |
| 6 | Előfizetés | edzők | csomag, állapot, időszak, Stripe-azonosítók | szerződés | Stripe, Supabase | szerződés megszűnéséig | webhook aláírás-ellenőrzés, csak szerveroldali írás |
| 7 | Számlázás | edzők (előfizetők) | számlázási adatok, számla | jogi kötelezettség (6. (1) c)) | Stripe, számlázóprogram, könyvelő | 8 év | hozzáférés korlátozása |
| 8 | Tranzakciós e-mailek | felhasználók | e-mail-cím, levél tartalma (meghívó, jelszó-visszaállítás) | szerződés | Resend (EU), Supabase | a Resend naplózása szerint [30 nap] | SPF/DKIM hitelesítés |
| 9 | Biztonsági és hibanaplók | felhasználók | IP, böngészőadat | jogos érdek (6. (1) f)) | Vercel, Supabase | [30–90 nap] | hozzáférés korlátozása |
| 10 | Ügyfélszolgálat | felhasználók | e-mail, üzenet | jogos érdek / szerződés | e-mail szolgáltatók | [3 év] | – |

## 3. Adatfeldolgozók és adattovábbítás

| Szolgáltató | Szolgáltatás | Adatok helye | EGT-n kívüli továbbítás | Adatfeldolgozói szerződés (DPA) |
|---|---|---|---|---|
| Supabase Inc. | adatbázis, auth, tárhely, Edge Functions | Frankfurt (`eu-central-1`) | támogató hozzáférés USA-ból lehetséges – DPA/SCC | [ ] elfogadva (dátum: ) |
| Vercel Inc. | tárhely, CDN | globális | igen (USA) – DPF/SCC | [ ] elfogadva (dátum: ) |
| Stripe | fizetés | EU/USA | igen – DPF/SCC | [ ] elfogadva (dátum: ) |
| Resend Inc. | e-mail küldés | Írország (`eu-west-1`) | USA-székhelyű cég – DPF/SCC | [ ] elfogadva (dátum: ) |
| jsDelivr | CDN (JS könyvtár) | globális | igen | nem szerződéses; megfontolandó a könyvtár saját tárhelyre vétele |

**Teendő:** minden DPA-t a szolgáltató fiókbeállításaiban el kell fogadni, és a példányt itt, a „Dátum” oszlopban rögzíteni.

## 4. Megőrzési és törlési rend

- Fiók törlése: azonnali törlés az adatbázisból; a mentésekből a mentési ciklus (Supabase Pro: 7 nap) lejártával.
- Számviteli bizonylatok: 8 év.
- Naplók: [30–90 nap].
- Törlési kérelem: 30 napon belül teljesítve; a teljesítés időpontja nyilvántartva.

## 5. Kockázatelemzés (DPIA előszűrés)

| Kérdés | Válasz | Megjegyzés |
|---|---|---|
| Különleges (egészségügyi) adat? | tiltott, de véletlenül bekerülhet | figyelmeztetés + törlési eljárás; az ügyvéd mérlegeli, kell-e DPIA |
| Nagy léptékű kezelés? | induláskor nem | méretnövekedéskor újraértékelendő |
| Sérülékeny érintettek? | 18 év alattiak kizárva | |
| Profilalkotás, automatizált döntés? | nincs | |
