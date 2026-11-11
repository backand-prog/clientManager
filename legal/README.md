# BackPlan – jogi dokumentumcsomag (VÁZLAT, ügyvédi átnézésre)

> **Státusz:** munkavázlat. Nem jogi tanács, és nem használható végleges dokumentumként, amíg jogász / adatvédelmi szakember át nem nézi, és a `[szögletes zárójeles]` mezők ki nincsenek töltve.
> Készült: 2026-11-11. Az alapja a rendszer tényleges, kódban és éles beállításokban ellenőrzött működése.

## Dokumentumok

| Fájl | Tartalom | Közönség |
|---|---|---|
| [01-adatkezelesi-tajekoztato.md](./01-adatkezelesi-tajekoztato.md) | GDPR 13–14. cikk szerinti tájékoztató | felhasználók (edzők, kliensek) |
| [02-aszf.md](./02-aszf.md) | Általános szerződési feltételek, előfizetés, lemondás | edzők (vállalkozók), kliensek |
| [03-suti-tajekoztato.md](./03-suti-tajekoztato.md) | Süti és helyi tárolás | felhasználók |
| [04-adatkezelesi-nyilvantartas.md](./04-adatkezelesi-nyilvantartas.md) | GDPR 30. cikk nyilvántartás, adatfeldolgozók, megőrzési idők | belső |
| [05-incidenskezelesi-szabalyzat.md](./05-incidenskezelesi-szabalyzat.md) | Adatvédelmi incidens kezelése (72 óra) | belső |
| [06-adatfeldolgozoi-megallapodas.md](./06-adatfeldolgozoi-megallapodas.md) | GDPR 28. cikk melléklet az edzőknek | edzők |

## Mit kell kitöltened (a szolgáltatóra vonatkozó adatok)

- [ ] A szolgáltató hivatalos neve és vállalkozási formája: `[SZOLGÁLTATÓ NEVE]`
- [ ] Székhely / levelezési cím: `[CÍM]`
- [ ] Adószám, nyilvántartási szám (cégjegyzékszám vagy egyéni vállalkozói nyilvántartási szám): `[ADÓSZÁM]`, `[NYILVÁNTARTÁSI SZÁM]`
- [ ] Kapcsolattartási és adatvédelmi e-mail: javaslat `info@backplanfitness.com` (a levelek már továbbítva vannak a Gmailre)
- [ ] Tárhelyszolgáltató adatai (a weboldalon kötelező közölni): Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA
- [ ] Panaszkezelés elérhetősége és határideje

## Kérdések, amelyeket az ügyvédnek / adatvédelmi szakembernek fel kell tenni

1. **Szerepek (a legfontosabb):** a kliensek edzési adatainál az edző az adatkezelő és a BackPlan az adatfeldolgozó (a vázlat ezt feltételezi, lásd 06), vagy közös adatkezelés áll fenn? Ez dönti el a dokumentumok szerkezetét.
2. **Egészségügyi adatok:** a rendszer tiltja a diagnózis, betegség, sérülés, gyógyszerelés rögzítését, de a szabad szöveges mezőkben (jegyzet, cél) a felhasználók ezt mégis beírhatják. Elég-e a figyelmeztetés és a szerződéses tiltás, vagy kell DPIA / technikai korlát?
3. **Fogyasztói státusz:** az edző előfizető vállalkozónak minősül-e (B2B), vagy a nem vállalkozó edzők fogyasztók (14 napos elállás, digitális szolgáltatás megkezdéséhez adott kifejezett hozzájárulás)? Mi legyen a lemondás/visszatérítés szabálya?
4. **18 év alatti felhasználók:** a vázlat kizárja őket. Elfogadható-e az önnyilatkozat?
5. **Adattovábbítás az EGT-n kívülre:** a Vercel (USA) és a Stripe, a Resend (EU-régióban konfigurálva, de amerikai cégek) kapcsán melyik átviteli mechanizmus (EU–US Data Privacy Framework, SCC) elég, és kell-e külön átvilágítás?
6. **Jogalap-összeállítás:** szerződés teljesítése (6. cikk (1) b), jogos érdek, jogi kötelezettség (számlák megőrzése) helyes hozzárendelése.
7. **Megőrzési idők:** számviteli megőrzés (8 év), fiók törlése után a mentések, a kliens-edző kapcsolat megszűnése utáni adatok.
8. **Adatvédelmi tisztviselő / DPIA:** kötelező-e egészségközeli adatok nagy léptékű kezelése esetén?
9. **Szerződéskötés módja:** az ÁSZF elfogadásának naplózása (verzió, időpont) – jelenleg a felület ezt nem naplózza, ezt fejlesztenünk kell.
10. **Szolgáltatói felelősség:** a felelősségkorlátozás kikötéseinek érvényessége a magyar jog szerint, valamint a Ptk. szerinti tisztességtelen kikötések kockázata.

## Amit a fejlesztés oldaláról még meg kell csinálni (a jogi átnézés után)

- Az ÁSZF/adatkezelési tájékoztató elfogadásának naplózása (verzió + időpont) regisztrációkor.
- A `legal-notices.js` szövegeinek frissítése a végleges dokumentumokra, `status: "draft"` → `"final"`.
- Az éles `site_url`, redirect URL-ek, valamint a közzétett dokumentumverziók összehangolása.
