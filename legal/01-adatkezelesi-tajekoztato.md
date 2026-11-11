# Adatkezelési tájékoztató – BackPlan

> **VÁZLAT** – közzététel előtt jogászi átnézés szükséges. Verzió: `draft-2026-11-11`.

## 1. Az adatkezelő

**Adatkezelő:** [SZOLGÁLTATÓ NEVE] (a továbbiakban: „Szolgáltató”)
**Székhely:** [CÍM]
**Adószám / nyilvántartási szám:** [ADÓSZÁM] / [NYILVÁNTARTÁSI SZÁM]
**Adatvédelmi kapcsolat:** [info@backplanfitness.com]

A BackPlan egy online munkatér személyi edzők és kliensek számára (edzésnapló, edzésnaptár, edzéstervek, csoportos edzések, előfizetés). Ez a tájékoztató azt ismerteti, hogyan kezeljük a személyes adataidat.

**Fontos szerepmegosztás:** a regisztrációs, bejelentkezési, számlázási és működtetési adatok kezelésénél a Szolgáltató az adatkezelő. A kliensek edzési adatait (edzésnapló, jegyzetek, edzéstervek) az az edző kezeli adatkezelőként, akihez a kliens kapcsolódott. A Szolgáltató ezeket az edző megbízásából, adatfeldolgozóként tárolja (lásd: Adatfeldolgozói megállapodás).

## 2. Mely adatokat kezeljük, és miért?

| Adatkör | Adatok | Cél | Jogalap (GDPR 6. cikk) | Megőrzés |
|---|---|---|---|---|
| Fiók | név, e-mail-cím, jelszó (titkosított hash), szerepkör (edző/kliens) | fiók létrehozása és biztosítása, belépés | szerződés teljesítése (1) b) | a fiók törléséig |
| Edzői regisztráció | szakterület, fióktípus | edzői fiók létrehozása | szerződés megkötését megelőző lépés (1) b) | a fiók törléséig |
| Munkatér | edzéscélok, edzésidőpontok, edzésnapló, megjegyzések, edzéstervek, csoportos edzések és jelentkezések, kliens–edző kapcsolatok, értesítések | a szolgáltatás nyújtása | szerződés teljesítése (1) b) | a fiók törléséig, illetve a kapcsolat megszűnéséig |
| Nyilvános edzői profil | bemutatkozás, szakterület, feltöltött képek | az edző megtalálhatósága | az edző döntése/hozzájárulása (1) a) és szerződés (1) b) | a profil törléséig |
| Előfizetés | csomag, állapot, időszak vége, Stripe-ügyfél- és előfizetés-azonosító | előfizetés kezelése, hozzáférés szabályozása | szerződés teljesítése (1) b) | a szerződés megszűnéséig, majd 8 évig a számviteli adatokra |
| Számlázás | számlázási név és cím, számla adatai (a fizetési szolgáltatónál és a számlázóprogramban) | számlakiállítás, adózás | jogi kötelezettség (1) c) | 8 év (Szvtv. 169. §) |
| Technikai és biztonsági naplók | IP-cím, böngészőadat, hibanaplók | biztonság, hibaelhárítás | jogos érdek (1) f) | legfeljebb [30–90 nap] |
| Kapcsolattartás | e-mail, üzenet tartalma | ügyfélszolgálat, panaszkezelés | jogos érdek (1) f) / szerződés | [3 év, az igényérvényesítési határidő] |

Kártyaadatot **nem** kezelünk és nem tárolunk: a fizetést a Stripe, mint önálló adatkezelő intézi.

## 3. Különleges (egészségügyi) adatok

A BackPlan **nem alkalmas** egészségügyi adatok kezelésére. Kérjük, ne rögzíts diagnózist, betegséget, sérülést, gyógyszerelést, biometrikus vagy más különleges személyes adatot az edzéscélokban, megjegyzésekben vagy képeken. Ha ilyen mégis bekerül, kérésre töröljük, és a vonatkozó incidenskezelési szabályok szerint járunk el.

## 4. Kik kaphatják meg az adataidat? (Címzettek, adatfeldolgozók)

| Szolgáltató | Szerep | Mire használjuk | Adatok helye |
|---|---|---|---|
| Supabase Inc. | adatfeldolgozó | adatbázis, hitelesítés, tárhely, szerveroldali függvények | EU (Frankfurt, `eu-central-1`) |
| Vercel Inc. | adatfeldolgozó | az alkalmazás kiszolgálása | globális CDN, USA-székhelyű szolgáltató |
| Stripe Payments Europe Ltd. | önálló adatkezelő / adatfeldolgozó (a fizetésnél) | előfizetés és fizetés lebonyolítása | EU / USA |
| Resend Inc. | adatfeldolgozó | tranzakciós e-mailek küldése | EU (Írország, `eu-west-1`) |
| jsDelivr (CDN) | technikai szolgáltató | a Supabase JavaScript kliens betöltése | globális |

Az **edződ** látja a hozzá kapcsolódott kliensek munkatér-adatait. Az adatokat marketing célra nem adjuk át, és nem értékesítjük.

## 5. Adattovábbítás az EGT-n kívülre

Egyes szolgáltatók amerikai székhelyűek. Az adattovábbítás jogalapja az Európai Bizottság megfelelőségi határozata (EU–US Data Privacy Framework), vagy standard szerződéses kikötések (SCC). [Az ügyvéd ellenőrzi, szolgáltatónként rögzíti.]

## 6. Adatbiztonság

Az adatok titkosított kapcsolaton (HTTPS) mennek, az adatbázisban sorszintű hozzáférés-szabályozás (Row Level Security) érvényesül, a jelszavakat nem tároljuk visszafejthető formában. A hozzáférések szerepkör- és kapcsolatfüggők. Adatvédelmi incidens esetén a vonatkozó szabályok szerint járunk el (lásd: Incidenskezelési szabályzat).

## 7. Az érintetti jogaid

Kérheted: tájékoztatást és hozzáférést (15. cikk), helyesbítést (16.), törlést (17.), korlátozást (18.), adathordozhatóságot (20.), tiltakozhatsz a jogos érdeken alapuló kezelés ellen (21.). Hozzájárulás esetén azt bármikor visszavonhatod.

- **Gyors út:** az alkalmazás **Beállítások** oldalán az adataidat letöltheted, és a fiókodat törölheted.
- **Egyéb kérelmek:** [info@backplanfitness.com]. A kérelmedre 30 napon belül válaszolunk.
- **Panasz, jogorvoslat:** Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH), 1055 Budapest, Falk Miksa utca 9–11., ugyfelszolgalat@naih.hu, naih.hu. Bírósághoz is fordulhatsz.

## 8. Fiók törlése

A fiók törlésekor a profilod és a hozzá közvetlenül kapcsolódó adataid törlődnek. A jogszabályi megőrzési kötelezettség alá eső adatokat (pl. számlák) a törvényi határidőig megőrizzük, a mentésekből az adatok a mentési ciklus lejártával tűnnek el.

## 9. Korhatár

A szolgáltatás **18 éven felülieknek** szól. Kiskorúak nem hozhatnak létre fiókot.

## 10. Módosítás

A tájékoztatót módosíthatjuk. A lényeges változásokról a bejelentkezéskor és e-mailben is tájékoztatunk. A korábbi verziók kérésre elérhetők.
