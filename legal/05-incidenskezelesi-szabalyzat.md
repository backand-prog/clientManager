# Adatvédelmi incidenskezelési szabályzat – BackPlan

> **VÁZLAT – belső dokumentum.** Verzió: `draft-2026-11-11`.

## 1. Mi az adatvédelmi incidens?

Minden olyan esemény, amely személyes adatok jogosulatlan hozzáféréséhez, elvesztéséhez, megsemmisüléséhez, módosításához vagy közzétételéhez vezet. Példák: kiszivárgott hozzáférési kulcs, hibás jogosultság miatt más kliens adatainak megjelenése, jogosulatlan belépés, elveszett eszköz, tévesen elküldött e-mail.

## 2. Felelős és elérhetőség

Incidenskezelő: [NÉV, e-mail, telefon]. Bejelentés belső és külső forrásból: [info@backplanfitness.com].

## 3. Lépések

| Lépés | Határidő | Teendő |
|---|---|---|
| 1. Észlelés és jelentés | azonnal | A felfedező jelezze az incidenskezelőnek. |
| 2. Elsődleges elhárítás | azonnal | Hozzáférések visszavonása, kulcsok cseréje (Supabase, Stripe, Resend, Vercel, GitHub), érintett funkció letiltása. |
| 3. Értékelés | 24 órán belül | Mi történt, mely adatok és hány érintett, milyen kockázat? Naplók mentése. |
| 4. Hatósági bejelentés | **az észleléstől számított 72 órán belül**, ha az incidens valószínűleg kockázattal jár | NAIH: naih.hu (online bejelentő). |
| 5. Érintettek értesítése | indokolatlan késedelem nélkül | Ha az incidens **valószínűleg magas kockázattal** jár a személyek jogaira. |
| 6. Javítás és megelőzés | [14 napon belül] | A hiba okának javítása, tesztek bővítése. |
| 7. Dokumentálás | mindig | Minden incidens bejegyzése a nyilvántartásba (akkor is, ha nem kellett bejelenteni). |

## 4. Értesítés tartalma

Az incidens jellege, érintettek köre és száma, valószínű következmények, az elhárításra tett és tervezett intézkedések, kapcsolattartó. Az edzők felé (akiknek adatfeldolgozóként tárolunk adatot) az észleléstől számított [24–48 órán] belül jelzünk.

## 5. Incidensnyilvántartás

| Dátum | Leírás | Érintett adatok / személyek | Intézkedés | Bejelentve (NAIH / érintettek) | Lezárva |
|---|---|---|---|---|---|
| | | | | | |

## 6. Gyors ellenőrzőlista kulcskiszivárgáshoz

1. Töröld/forgasd az érintett kulcsot (Supabase Dashboard → Settings / Access Tokens, Stripe, Resend, Vercel, GitHub).
2. Nézd át az érintett szolgáltatás naplóit a jogosulatlan használatra.
3. Ha személyes adat érhető el, indítsd a 3. pont szerinti folyamatot.
