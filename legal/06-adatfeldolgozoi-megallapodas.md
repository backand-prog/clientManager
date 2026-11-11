# Adatfeldolgozói megállapodás edzőknek (GDPR 28. cikk) – BackPlan

> **VÁZLAT** – jogászi átnézés szükséges. Verzió: `draft-2026-11-11`. Feltételezés: az edző a kliensei adatainak **adatkezelője**, a Szolgáltató az **adatfeldolgozója**. (Ha az ügyvéd közös adatkezelést állapít meg, a dokumentum cserélendő.)

A megállapodás az ÁSZF elfogadásával jön létre az edző (a továbbiakban: **Adatkezelő**) és a [SZOLGÁLTATÓ NEVE] (a továbbiakban: **Adatfeldolgozó**) között.

## 1. Tárgy és időtartam

Az Adatfeldolgozó a BackPlan szolgáltatás nyújtása során az Adatkezelő megbízásából tárolja és feldolgozza a kliensek személyes adatait. A megállapodás az előfizetés / fiók fennállásáig tart.

## 2. A feldolgozás jellege, célja

| Elem | Tartalom |
|---|---|
| Cél | az edzői munka támogatása: naptár, edzésnapló, edzéstervek, csoportos edzések |
| Műveletek | tárolás, megjelenítés, módosítás, törlés, exportálás |
| Adatkategóriák | név, e-mail-cím, edzéscél, edzésidőpontok, edzésnapló, jegyzetek, edzésterv |
| Érintettek | az Adatkezelő kliensei |
| Különleges adatok | **nem** engedélyezett (lásd 3.5) |

## 3. Az Adatkezelő kötelezettségei

1. Az Adatkezelő felel azért, hogy a kliensei adatait **jogszerűen** (jogalap, tájékoztatás) rögzíti.
2. Az Adatkezelő utasításait az alkalmazás funkciói jelentik; további utasítás e-mailben adható.
3. Az Adatkezelő felel a kliensei érintetti kérelmeinek megválaszolásáért; az Adatfeldolgozó ebben közreműködik.
4. Az Adatkezelő köteles a kliensei felé megfelelő adatkezelési tájékoztatást nyújtani.
5. Az Adatkezelő **nem rögzíthet** diagnózist, betegséget, sérülést, gyógyszerelést vagy más különleges személyes adatot.

## 4. Az Adatfeldolgozó kötelezettségei

1. Csak az Adatkezelő **dokumentált utasításai** szerint, a szolgáltatás nyújtásához szükséges mértékben kezeli az adatokat.
2. Biztosítja, hogy az adatokhoz hozzáférő személyek **titoktartásra** kötelezettek.
3. **Műszaki és szervezési intézkedéseket** alkalmaz (HTTPS, sorszintű hozzáférés-szabályozás, hozzáférés-korlátozás, mentések).
4. **Alfeldolgozókat** vehet igénybe (lásd 6.). Az alfeldolgozók cseréjéről az Adatkezelőt [30 nappal] előre értesíti; az Adatkezelő kifogást emelhet.
5. Segíti az Adatkezelőt az érintetti kérelmek teljesítésében, a biztonsági és incidens-értesítési kötelezettségekben.
6. **Adatvédelmi incidens** esetén indokolatlan késedelem nélkül, legkésőbb [48 órán] belül értesíti az Adatkezelőt.
7. A szerződés megszűnésekor az adatokat az Adatkezelő választása szerint **törli vagy visszaadja** (export), kivéve, ha jogszabály megőrzést ír elő.
8. Rendelkezésre bocsátja a megfelelés igazolásához szükséges információkat, és lehetővé teszi az auditot ([ésszerű előzetes értesítéssel]).

## 5. Adattovábbítás

Az adatokat az Adatfeldolgozó az EGT-n belül (Frankfurt) tárolja. Az amerikai székhelyű alfeldolgozók esetében a továbbítás jogalapja a DPF vagy SCC.

## 6. Alfeldolgozók (jelenlegi)

| Alfeldolgozó | Szolgáltatás | Hely |
|---|---|---|
| Supabase Inc. | adatbázis, hitelesítés, tárhely | Frankfurt, EU |
| Vercel Inc. | alkalmazás kiszolgálása | globális CDN |
| Resend Inc. | tranzakciós e-mailek | Írország, EU |
| Stripe | fizetés (az edző számlázási adatai) | EU/USA |

## 7. Stúdió csomag (csapatkezelés)

A Studio csomag vezetője a stúdióhoz tartozó beosztott edzők és azok klienseinek adatait **megtekintheti és szerkesztheti**. A vezető és a beosztott edző közötti adatkezelési viszonyt (pl. munkaszerződés, közös adatkezelés) a stúdió rendezi. A beosztott edzőt a stúdióvezetői meghívásakor tájékoztatni kell erről. [Az ügyvéd ellenőrzi.]

## 8. Felelősség

A felelősségre az ÁSZF 10. pontja és a GDPR 82. cikke az irányadó.
