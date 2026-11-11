# BackPlan

Éles alkalmazás: [backplan-fitness.vercel.app](https://backplan-fitness.vercel.app/)

Első verziós klienskezelő személyi edzők számára.

## Funkciók

- Magyar nyelvű adminisztrátori áttekintő
- Edzői szerepkör önregisztrációval (adminisztrátori jóváhagyás nélkül) vagy adminisztrátori fiók-létrehozással
- Több edző hozzárendelése ugyanahhoz a klienshez, kapcsolat leválasztásával
- Klienslista kereséssel, állapottal, teljesítéssel és edzői megjegyzésekkel
- Kliensprofilok hozzáadása és szerkesztése
- Kliensenkénti edzéslista az adminisztrátor számára
- Edzések hozzáadása és szerkesztése dátummal, időponttal, időtartammal, státusszal és edzővel
- A következő edzés automatikusan a legkorábbi jövőbeli, beütemezett alkalomból jelenik meg
- Havi edzésnaptár napválasztással; az adminisztrátorok és edzők a kliensekhez ütemezhetnek, a kliensek a saját edzéseiket tekinthetik át
- Admin dashboard heti, havi és éves edzésstatisztikával, teljesített/lemondott edzések grafikonjával és legutóbbi edzésekkel
- Edző által meghirdethető, szerkeszthető és lemondható, férőhelykorlátos csoportos edzések; a kapcsolt kliensek a naptárból vagy a kezdőlapról jelentkezhetnek, illetve a kezdésig leiratkozhatnak; az edző látja a jelentkezettek névsorát
- Edzéslemondáskor az érintett fél (kliens vagy edző) automatikus értesítést kap; csoportos edzés lemondásakor az összes jelentkező, leiratkozáskor az edző kap értesítést
- Olvasatlan értesítések száma piros jelvényen az Értesítések menüponton
- Edzők által készíthető, több edzésnapos tervek gyakorlatokkal, sorozat-, ismétlés- és pihenőadatokkal; megosztás kiválasztott kapcsolt kliensekkel vagy minden bejelentkezett felhasználóval
- Kereshető alapgyakorlat-lista az edzéstervekben; az edzések típusánál edzéskategóriák (pl. Kardio, Súlyzós edzés, CrossFit) közül lehet választani, és egyedi megnevezés is megadható
- Egyéni edzés létrehozásakor vagy szerkesztésekor opcionálisan kiválasztható egy, a kliens számára elérhető edzéstervnap
- Egyéni, edző nélküli edzések naplózása
- Kliens saját profil- és fejlődésnézete; nyilvános, 18+ kliensregisztráció
- Edzői regisztráció e-mail-megerősítéssel, adminisztrátori jóváhagyás nélkül
- Kezdőlap szerepkörhöz igazított áttekintéssel, külön kliens- és edzői beállításokkal
- Külön kapcsolati és értesítési oldalak, olvasatlan értesítések előnézetével
- Szerkeszthető edzői bemutatkozás szakterülettel, elérhetőségekkel (telefon, e-mail), edzéshelyszínnel, vállalt idősávokkal és legfeljebb 5 képpel
- Bejelentkezett kliensek megnyithatják az edzői profilokat, megtekinthetik a bemutatkozást és a képeket, majd kapcsolódási kérést küldhetnek
- Az adminisztrátor külön menüpontban áttekintheti az edzők közzétett profiljait és képeit
- Kliens-edző kapcsolódási kérések regisztrált e-mail-cím alapján, jóváhagyással vagy elutasítással
- Edző által kezdeményezett klienskapcsolat, amelyet a kliens hagy jóvá vagy utasít el
- Edzői csomagok (Free/Pro/Studio): Free csomagban max 3 aktív kliens, csoportos edzés max 6 fővel, legfeljebb 2 edzésterv (tervenként max 3 edzésnap); a korlátokat a szerveroldali RPC-k kényszerítik ki, az admin az Előfizetések menüpontban válthat csomagot
- Kétoldalú, alkalmazáson belüli értesítések a kérésekről és a döntésekről
- Supabase PostgreSQL adattárolás és Supabase Auth hitelesítés
- Bejelentkezett felhasználók számára külön menüpontból elérhető, letölthető felhasználói kézikönyv PDF

## Adatbázis: Supabase PostgreSQL

A projekt Supabase PostgreSQL adatbázist és Supabase Auth hitelesítést használ. Az alkalmazásadatok kizárólag a Supabase projektben tárolódnak; a kliens nem ment alkalmazásadatot a böngésző `localStorage`-ába.

Beállítás:

1. Hozz létre egy Supabase projektet.
2. Futtasd le a `supabase-schema.sql` fájlt a Supabase SQL Editorban. Meglévő projekt frissítésekor is futtasd le újra; ez létrehozza a kapcsolódási, coach profil, csoportos edzés és edzésterv táblákat, az ellenőrzött adatbázis-műveleteket és a privát képtárolót. Az edzésterveket vagy csoportos edzéseket használó frontend kiadása előtt a sémát előbb alkalmazd az adatbázisra.
3. Másold a `supabase-config.example.js` fájlt `supabase-config.js` néven.
4. Írd be a Supabase projekt URL-jét és anon kulcsát a konfigurációba.
5. A Supabase Dashboardban az Authentication beállításainál kapcsold be a **Confirm email** opciót.
6. Telepítsd az admin fiókkezelő Edge Functiont a Supabase CLI-val: `supabase functions deploy account-admin`.

### Első adminfiók és adminvédelem

Az első adminfiókot ne a nyilvános regisztráció automatikusan válassza ki: ez lehetővé tenné, hogy bárki megszerezze az adminjogot. Regisztrálj a saját admin e-mail-címeddel, erősítsd meg azt, majd a Supabase SQL Editorban futtasd le egyszer a `supabase/bootstrap-first-admin.sql` fájlt, miután a benne lévő e-mail-helyőrzőt erre a megerősített címre cserélted. A script csak akkor működik, ha még nincs admin, és a címhez megerősített Auth-fiók tartozik.

A `supabase-schema.sql` adatbázis-triggerrel védi az utolsó adminfiókot: az utolsó admin nem törölhető és nem fokozható le. Meglévő éles projekt frissítésekor futtasd le újra a teljes sémát, és telepítsd újra az Edge Functiont (`supabase functions deploy account-admin`), hogy az alkalmazás felülete még a törlés előtt érthető hibát jelezzen. Admin törlése vagy lefokozása előtt adj adminjogot egy másik ellenőrzött fióknak.

Az adminisztrátorok a bejelentkezett felületen az **Adminisztrátorok** menüpontban adhatnak adminjogot megerősített e-mail-című kliensfiókoknak. A felhasználónak előbb regisztrálnia kell és meg kell erősítenie az e-mail-címét; utána az admin kiválasztja a fiókot a listából. A szerepkör-módosítást hitelesített `account-admin` Edge Function végzi, és az adatbázis-trigger továbbra is megakadályozza az utolsó admin eltávolítását. Az adminisztrátorok azonos jogosultságúak. A módosítás telepítéséhez deployold az Edge Functiont (`supabase functions deploy account-admin`), majd a frontend új Vercel-buildje is szükséges.

**Regisztráció és tesztelés:** a felületen jelenleg engedélyezett a nyilvános, 18+ kliensregisztráció és az edzői regisztráció (`legal-notices.js`). Az edzőnek regisztrálók e-mail-megerősítés után azonnal használhatják az edzői felületet, adminisztrátori jóváhagyás nincs. A jogi tájékoztatók továbbra is tervezetek, és a szolgáltató adatai, illetve a végleges üzleti feltételek hiányoznak, így ez tesztelési lehetőség, nem hivatalos éles indulás vagy jogi megfelelőségi igazolás. Supabase használatakor az Authentication → Providers → Email beállításnál a **Allow new users to sign up** opciónak is engedélyezve kell lennie, a **Confirm email** pedig maradjon bekapcsolva. A frontend-kapcsoló önmagában nem módosítja az API-szintű regisztrációs beállítást. Éles használat előtt töltsd ki és jogilag ellenőriztesd a [LEGAL-COMPLIANCE.md](./LEGAL-COMPLIANCE.md) nyitott pontjait.

Az első tesztelési kör 18 éven felülieknek szól; kiskorúak bevonása későbbi, külön jogi és technikai felülvizsgálatot igényel. A jelenlegi irány egy 3–5 edzővel végzett ingyenes pilot, analitika és marketing nélkül. Későbbi bevételi modellként az edzői előfizetés és ingyenes kliensfiók vizsgálata merült fel, de az árak és feltételek nincsenek eldöntve. Fizetést ne kapcsolj be a jogi/szolgáltatói adatok, a feltételek és a szakértői jóváhagyás előtt. Egészségügyi adat kezelését a jelenlegi termékirány kizárja.

A `supabase-schema.sql` újrafuttatása lecseréli az Auth felhasználót létrehozó triggert: a regisztrációkor választott `trainer` szerepkör közvetlenül érvényesül (adminisztrátori jóváhagyás nincs; az admin szerepkör továbbra is csak az Edge Functionnel adható). A korábban függőben lévő jelentkezők edzők lesznek. Meglévő projektnél futtasd le újra a teljes sémát, majd telepítsd újra az Edge Functiont (`supabase functions deploy account-admin`).

A regisztrációs megerősítő és jelszó-visszaállító e-maileket a Supabase Auth küldi. A linkek az alkalmazás gyökér URL-jére irányítanak, hogy a Supabase kliens a hitelesítési tokeneket a hash-alapú útvonalkezelés mellett is feldolgozhassa. Engedélyezd ezt az URL-t a Supabase Authentication redirect allowlistjében. Valós kézbesítés teszteléséhez állíts be saját SMTP-szolgáltatót az Authentication e-mail beállításainál, és csak olyan e-mail-címet használj, amelynek postafiókjához hozzáférsz. Az e-mail-megerősítés és a visszaállítás a Supabase Auth-on keresztül működik.

A `supabase-config.js` fájlt ne töltsd fel titkos kulcsokkal. Az anon kulcs kliensoldalon használható, a jogosultságokat az RLS szabályok védik.

Az alkalmazás tájékoztató sávval és részletes süti-/böngészős tárolási leltárral jelzi a működéshez szükséges tárolókat. A sáv bezárása nem jelent hozzájárulást. Jelenleg nincs analitikai vagy hirdetési tracker, ezért az alkalmazás nem állít be opcionális követőket és nem kér ilyen célú hozzájárulást. Az éles tárhelyszolgáltató saját sütijeit, naplóit és CDN/WAF működését a végleges cookie-tájékoztatóban külön fel kell tüntetni.

Az Edge Function a `SUPABASE_SERVICE_ROLE_KEY` értéket csak szerveroldalon használja edzők létrehozásához/törléséhez és saját fiók törléséhez. Ezt a kulcsot soha ne tedd a frontend konfigurációjába.

## Vercel-bemutató telepítés

Az alkalmazás Vercelre GitHub-projektként telepíthető. A build a böngészőnek szánt alkalmazásfájlokat és a felhasználói kézikönyv PDF-et teszi a `dist` könyvtárba; a SQL-séma, további dokumentáció és Edge Function nem kerül a nyilvános statikus fájlok közé. A Vercel `/api/runtime-config` függvénye a projekt beállításaiban megadott `SUPABASE_URL` és `SUPABASE_ANON_KEY` értékből állítja elő a klienskonfigurációt. Ezek a böngészőben látható nyilvános Supabase-beállítások, nem titkok; a `service_role` kulcsot soha ne add meg ezek helyett.

1. Importáld a GitHub-repozitóriumot Vercelbe, a projekt gyökere maradjon a repository gyökere, a framework pedig **Other**.
2. A Vercel **Settings → Environment Variables** részében add meg a `SUPABASE_URL` és `SUPABASE_ANON_KEY` értékeket a staging Supabase-projekt publikus URL-jével és anon/publishable kulcsával, legalább a **Preview** és **Production** környezetre.
3. Ellenőrizd a **Build and Output Settings** részen, hogy a build parancs `node scripts/build-static.mjs`, a kimeneti könyvtár pedig `dist`.
4. Futtasd le a frissített `supabase-schema.sql` sémát a staging Supabase-projekt SQL Editorában, mielőtt az edzésterveket vagy csoportos edzéseket használó frontend build kikerül; telepítsd az Edge Functiont is: `supabase functions deploy account-admin`.
5. A Vercel által kiosztott domain gyökerét add hozzá a staging projekt Supabase Authentication URL Configuration beállításának **Site URL** és **Redirect URLs** listájához.
6. Deploy után ellenőrizd az e-mail-megerősítést, kliensregisztrációt, edzői regisztrációt a staging környezetben.

Az anon/publishable kulcs böngészőoldali nyilvánosságra hozása tervezett; az adatok védelmét a Supabase RLS adja. Staginghez külön Supabase-projektet használj, és abban ne tárolj éles személyes adatot.

## Fizetés (Stripe) – környezeti változók

A fizetés két Edge Functionből áll: `create-checkout-session` (JWT-hitelesített, a Stripe Checkoutot indítja) és `stripe-webhook` (a Stripe hívja, JWT nélkül). A számlázás jelenleg szimulált (`mockCreateInvoice`), Billingo / Számlázz.hu kulcs még nem kell. A teljes lista az [.env.example](./.env.example) fájlban van.

| Hol | Változó | Megjegyzés |
|---|---|---|
| Vercel | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Nyilvános; a Stripe-kulcsokat ide soha ne add meg. |
| Supabase secrets | `STRIPE_SECRET_KEY` | `sk_test_...` / `sk_live_...` |
| Supabase secrets | `STRIPE_WEBHOOK_SECRET` | `whsec_...`, a Stripe webhook endpoint aláíró kulcsa |
| Supabase secrets | `STRIPE_PRICE_PRO`, `STRIPE_PRICE_STUDIO` | A Stripe `price_...` azonosítók; az ár `plan` metadata értéke `pro` / `studio` |
| Supabase secrets | `APP_URL` | A Vercel domain gyökere, záró `/` nélkül (a fizetés utáni visszairányításhoz) |

A `SUPABASE_URL`, `SUPABASE_ANON_KEY` és `SUPABASE_SERVICE_ROLE_KEY` az Edge Functionök számára automatikusan elérhető.

```
supabase secrets set --env-file .env
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook --no-verify-jwt
```

A Stripe webhook endpoint: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`, események: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`. A `create-portal-session` a Stripe ügyfélportált nyitja meg (lemondás, csomagváltás, fizetési mód); a portál beállításait a Stripe Dashboardon (Settings → Billing → Customer portal) külön kell menteni, tesztmódban is. A fizetés visszairányítása a `?checkout=success` paramétert használja; az alkalmazás ekkor értesítést jelenít meg, és frissíti a csomagot. A tesztmódú és az éles Stripe-kulcsok külön készletet alkotnak.

## Teszt (staging) környezet

Az éles és a teszt környezet teljesen különálljon, hogy tesztadat ne kerüljön az éles projektbe és fordítva.

1. Hozz létre új Supabase projektet (például `backplan-test`), és ne használd benne az éles adatokat.
2. Futtasd le benne a [supabase-schema.sql](./supabase-schema.sql) fájlt (SQL Editor), majd a [supabase/bootstrap-first-admin.sql](./supabase/bootstrap-first-admin.sql) fájlt a teszt adminhoz.
3. Állítsd be az Edge Function secreteket a teszt projektre, **Stripe teszt kulcsokkal** (`sk_test_...`, teszt `price_...` azonosítók, a teszt webhook `whsec_...` kulcsa, `APP_URL` = a teszt/local cím):
   ```
   supabase link --project-ref <teszt-project-ref>
   supabase secrets set --env-file .env.test
   supabase functions deploy create-checkout-session
   supabase functions deploy create-portal-session
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```
4. Helyi fejlesztéshez a gitignore-olt `supabase-config.js` a teszt projekt URL-jére és anon kulcsára mutasson (a Vercel production környezet változóit ne írd át).
5. Vercel: a Preview környezetnek a teszt projekt `SUPABASE_URL` / `SUPABASE_ANON_KEY` értékét add, csak a Production kapja az éleset.
6. Stripe: teszt módban hozz létre külön webhook endpointot a teszt projekt URL-jére, és használd a `stripe listen` / `stripe trigger` parancsokat a teszteléshez.

A `.env.test` fájlt ne commitold (a `.env*` mintát a `.gitignore` tartalmazza).

### Automata adatbázis-tesztek

```
node tests/db-tests.mjs
```

A teszt projekten (a `.env.test` `SUPABASE_ACCESS_TOKEN` értékével, vagy környezeti változóval; a projekt azonosítója felülírható a `TEST_PROJECT_REF` változóval) futtatja a csomaglimitek, a várólista, a jogosultság-emelés elleni védelem, az edzés-hozzárendelés és a stúdió RLS ellenőrzéseit. Minden forgatókönyv visszagördülő tranzakció, ezért nem marad tesztadat. Az éles projekten a script nem fut. Séma módosítása után előbb töltsd fel a teszt projektre, majd futtasd le a teszteket.

## Helyi futtatás

Indíts egyszerű helyi HTTP-szervert a projekt mappájában (például `py -m http.server 8000`), majd nyisd meg a `http://localhost:8000` címet. Nincs szükség build lépésre. Az alkalmazás Supabase-konfiguráció nélkül nem működik, ezért a `supabase-config.js` beállítása kötelező.

Ha nincs Supabase-konfiguráció, vagy a Supabase nem érhető el, az alkalmazás nem tud adatot betölteni és bejelentkezni. Az adatok kizárólag a Supabase projektben tárolódnak.

Az alkalmazás az aktuális nézetet az URL-ben is jelzi, például `#/client/coaches` az edzőlistához, `#/client/coaches/trainer-1` egy edző profiljához, illetve `#/coach/calendar` az edzői naptárhoz. Így frissítéskor az oldal ugyanarra a nézetre tér vissza. A bejelentkezés a böngészőben megmarad; kijelentkezéshez használd a **Kijelentkezés** gombot.

Edzőként a **Bemutatkozásom** menüpontban szerkesztheted a profilodat és tölthetsz fel legfeljebb 5, egyenként legfeljebb 5 MB-os JPG/PNG/WebP képet. A képek privát Storage bucketben tárolódnak, és csak hitelesített felhasználók láthatják őket. Kliensként az **Edzők böngészése** menüpontban jelennek meg a közzétett profilok.

## Adatvédelem és jogi státusz

Az alkalmazás Beállítások oldalán elérhető a fiókadatok JSON-exportja, a személyes adatok módosítása és a fiók törlése. A Supabase módban a törlés admin Edge Functionön keresztül történik; a fiókhoz tartozó edzői képek eltávolítása megelőzi a fiók törlését. Az alkalmazás célja nem egészségügyi adatok tárolása: ne rögzíts diagnózist, betegséget, sérülést, gyógyszerelést vagy biometrikus adatot.

A `LEGAL-COMPLIANCE.md` összefoglaló és a felületen megjelenő adatvédelmi/felhasználási szövegek tájékoztató jellegű tervezetek, nem jogi tanácsok és nem tekinthetők éles szolgáltatásra jóváhagyottnak. Éles indulás előtt véglegesítsd a szolgáltatói, adatkezelési, szerződési és fogyasztóvédelmi részleteket, kérj szakértői ellenőrzést, és vizsgáld felül a Supabase szerveroldali regisztráció-beállításait. A Supabase Dashboard állapotát a kód nem tudja automatikusan módosítani.
