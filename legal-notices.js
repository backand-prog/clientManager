window.LEGAL_NOTICES = Object.freeze({
  status: "draft",
  privacyVersion: "draft-2026-10-28",
  termsVersion: "draft-2026-10-28",
  cookiesVersion: "draft-2026-10-28",
  publicRegistrationEnabled: true,
  operator: {
    name: "[A szolgáltató hivatalos neve kitöltendő]",
    address: "[Székhely vagy lakcím kitöltendő]",
    registration: "[Cégjegyzékszám vagy vállalkozói nyilvántartási szám kitöltendő]",
    taxNumber: "[Adószám kitöltendő]",
    email: "[Kapcsolattartási és adatvédelmi e-mail-cím kitöltendő]"
  },
  documents: {
    privacy: {
      title: "Adatkezelési tájékoztató",
      sections: [
        {
          heading: "Tervezet – éles használatra nem kész",
          paragraphs: [
            "Ez a tájékoztató fejlesztési tervezet. A szolgáltató azonosító adatai, a megőrzési idők, a tárhely régiója, a végleges címzetti lista és a fizetési szolgáltató még nincsenek megadva. A nyilvános, 18+ kliensregisztrációt a pilot kipróbálásához bekapcsoltuk, de ez nem jelenti azt, hogy a szolgáltatás jogi vagy üzleti értelemben éles indulásra kész.",
            "Adatkezelő: [szolgáltató hivatalos neve], [postai cím], adatvédelmi kapcsolat: [e-mail-cím]. A végleges tájékoztatót közzététel előtt jogásszal és adatvédelmi szakemberrel kell ellenőriztetni.",
            "A jelenlegi nyitott kliensregisztráció kizárólag 18 éven felülieknek szól; kiskorú nem hozhat létre fiókot és nem használhatja a szolgáltatást. Kiskorúak esetleges későbbi bevonása külön korhatár-, törvényes képviselői jogosultság-ellenőrzési és jóváhagyási folyamatot, valamint jogi felülvizsgálatot igényel."
          ]
        },
        {
          heading: "Milyen adatokat kezelhet a szolgáltatás?",
          paragraphs: [
            "Fiókadatok: név, e-mail-cím és a kiválasztott fióktípus. Edzői jelentkezés esetén a megadott szakterületet, a jelentkezés állapotát és az adminisztrátori döntést is kezeljük. Működési adatok: edzéscélok, edzésidőpontok, edzésnapló és megjegyzések, kliens–edző kapcsolatok és alkalmazáson belüli értesítések. Az edző nyilvános profiljához bemutatkozás, szakterület és feltöltött képek tartozhatnak. Bejelentkezéskor a hitelesítéshez szükséges munkamenet-adatokat is kezeljük.",
            "Ne rögzíts diagnózist, betegséget, sérülést, gyógyszerelést, biometrikus vagy más egészségügyi adatot az edzéscélokban, megjegyzésekben vagy képeken. Az ilyen különleges adatok kezelése külön, kifejezett jogalapot, fokozott biztonsági intézkedéseket és szükség szerint hatásvizsgálatot igényel."
          ]
        },
        {
          heading: "Célok, jogalapok és megőrzés",
          paragraphs: [
            "A tervezett célok a fiók biztosítása, az edzői és kliensfunkciók működtetése, edzői jelentkezések elbírálása, kapcsolati kérések és edzések kezelése, ügyféltámogatás, biztonság, valamint – későbbi fizetős csomag esetén – szerződés és számlázás kezelése. A GDPR szerinti jogalapot és adatmegőrzési időt minden célhoz külön kell véglegesíteni. A megőrzési idők nincsenek még meghatározva.",
            "A fiók törlésekor a kapcsolódó profil és az ahhoz közvetlenül tartozó adatok törlődnek. Más személy által is használt edzés- vagy számlaadatot jogszabályi megőrzési kötelezettség miatt esetleg korlátozni vagy anonimizálni kellhet; ennek szabályait a fizetési modell kialakításakor kell meghatározni."
          ]
        },
        {
          heading: "Adatfeldolgozók és adattovábbítás",
          paragraphs: [
            "A jelenlegi műszaki terv Supabase Auth, adatbázis és tárhely szolgáltatást, valamint a Supabase JavaScript kliens jsDelivr CDN-ről történő betöltését használja. A szolgáltatók pontos jogi neve, az adatközpont régiója, az adatfeldolgozói szerződések és az esetleges EGT-n kívüli továbbítás garanciái még ellenőrzendők. A Supabase projekt régióját és az aktuális adatfeldolgozói feltételeket az élesítés előtt rögzíteni kell.",
            "Kapcsolat létrehozásakor az érintett edző vagy kliens a kapcsolat működtetéséhez szükséges profil- és edzésadatokat láthatja. Az edzők és a platform üzemeltetője eltérő adatkezelői/adatfeldolgozói szerepben lehetnek; ezt a tényleges működés és szerződések alapján kell meghatározni."
          ]
        },
        {
          heading: "Érintetti jogok és panasz",
          paragraphs: [
            "A GDPR feltételei szerint kérhető hozzáférés, helyesbítés, törlés, korlátozás, adathordozhatóság, illetve az adott jogalaptól függően tiltakozás. A fiók Beállítások oldalán személyes adataid letölthetők és a fiók törölhető; további kérelmek: [adatvédelmi kapcsolattartó e-mail-címe].",
            "Panasz tehető a Nemzeti Adatvédelmi és Információszabadság Hatóságnál (NAIH): 1055 Budapest, Falk Miksa utca 9–11., ugyfelszolgalat@naih.hu, naih.hu. Az adatvédelmi incidensek hatósági bejelentésének és az érintettek tájékoztatásának rendjét belső incidenskezelési folyamatban kell rögzíteni."
          ]
        }
      ]
    },
    terms: {
      title: "Felhasználási feltételek",
      sections: [
        {
          heading: "Tervezet – szerződéskötésre nem használható",
          paragraphs: [
            "A szolgáltató hivatalos adatai, a szolgáltatás részletes leírása, az ügyfélszolgálat, a díjak és a fizetési feltételek még nincsenek kitöltve. Ez a szöveg nem végleges szerződés, és jelenleg nem fogad el előfizetést vagy fizetést.",
            "A tervezett termék edzőknek szóló munkatér és kliens-edző edzésnapló. A tényleges online edzést, szakmai tanácsot vagy egészségügyi ellátást nyújtó fél személye, felelőssége és szerződéses szerepe még tisztázandó."
          ]
        },
        {
          heading: "Előfizetés és fogyasztói jogok",
          paragraphs: [
            "A jelenlegi üzleti tervezési irány szerint 3–5 edzővel ingyenes pilotot tesztelünk, analitika és marketing nélkül. A későbbi bevételi modellként az edzők előfizetése, ingyenes kliensfiókkal került megfontolásra; ez még nem végleges döntés vagy ajánlat. A csomagok, árak, számlázás, megújulás, lemondás és elállás feltételei nincsenek meghatározva; fizetési funkciót addig nem szabad bekapcsolni.",
            "A fizetési szolgáltató még nincs kiválasztva. Kártyaadatot az alkalmazás nem kérhet be vagy tárolhat; a fizetést szerződött, megfelelően hitelesített fizetési szolgáltatóra kell bízni. A végleges, fogyasztókra és vállalkozásokra külön alkalmazandó feltételeket jogi felülvizsgálat után lehet közzétenni."
          ]
        },
        {
          heading: "Fiók, tartalom és elfogadható használat",
          paragraphs: [
            "A felhasználó csak a saját vagy jogszerűen megosztható adatokat és képeket töltheti fel, és köteles a fiókját biztonságban tartani. Diagnózis, sérülés, gyógyszerelés, biometrikus adat vagy más különleges személyes adat megadása a jelenlegi prototípusban nem megengedett.",
            "Kiskorúak saját fiókja a jelenlegi prototípusban még nem hozható létre. A tervezett fiókmodell ellenőrzött törvényes képviselői jóváhagyást igényel, de az ehhez szükséges technikai és jogi folyamat még nincs kialakítva.",
            "A kliens és edző közötti edzési vagy szolgáltatási szerződés nem helyettesíthető a platform feltételeivel. A végleges feltételeknek meg kell határozniuk a panaszkezelést, felelősséget, szolgáltatás felfüggesztését, szerződés megszűnését és irányadó jogot."
          ]
        }
      ]
    },
    cookies: {
      title: "Süti- és helyi tárolási tájékoztató",
      sections: [
        {
          heading: "Összefoglaló",
          paragraphs: [
            "Az alkalmazás jelenlegi verziója nem állít be saját analitikai, hirdetési vagy közösségi követő sütit, és nem használ ilyen célú böngészős tárolást. A bejelentkezéshez és az alkalmazás működéséhez szükséges tárolók azonosítását az alábbi lista tartalmazza. Ezek nem opcionális marketing-hozzájárulások.",
            "A tájékoztató elutasítható vagy elfogadható cookie-hozzájárulást nem kér, mert jelenleg nincs nem szükséges tracker. A „Tudomásul vettem” gomb csak a tájékoztató sávot zárja be; nem jelent hozzájárulást. Ha később opcionális analitikát, hirdetést vagy más nem szükséges technológiát vezetünk be, azt előzetes, szabad, konkrét és visszavonható hozzájárulás nélkül nem aktiváljuk."
          ]
        },
        {
          heading: "Tárolók és céljuk",
          paragraphs: [
            "Supabase Auth (localStorage): a hitelesítési munkamenet fenntartása. A Supabase JavaScript kliens a projekt munkamenet-tokenjét a böngésző helyi tárhelyén tárolja; a kulcs a Supabase projekt azonosítójához kötött. A token kijelentkezéskor törlődik, illetve a böngésző helyi adatainak törlésével távolítható el. A lejárat és megújítás a Supabase Auth projektbeállításaitól függ.",
            "Helyi demo (localStorage: form-function-data és form-function-session): kizárólag localhost vagy 127.0.0.1 alatt, tesztadatok és helyi bejelentkezés fenntartására. A böngésző tárhelyének törléséig marad meg; kijelentkezés a munkamenet-azonosítót törli. Ne adj meg benne valódi személyes vagy egészségügyi adatot.",
            "Helyi demó képei (IndexedDB: form-function-images): a helyben feltöltött tesztképek tárolására. Csak helyi demó módban használatos; a képek a felhasználó általi törlésig vagy a böngésző webhelyadatainak törléséig maradhatnak meg.",
            "Az alkalmazás a böngésző URL-jének hash részében is tárolhatja a navigációs útvonalat (például #/client); ez nem cookie és nem hitelesítési adat."
          ]
        },
        {
          heading: "Külső szolgáltatók és szervernaplók",
          paragraphs: [
            "A Supabase JavaScript klienskönyvtár jelenleg a jsDelivr CDN-ről töltődik be. A böngésző ezért kapcsolatot létesít a CDN-nel, amely a kérés technikai adatait – például IP-címet és böngészőadatokat – feldolgozhatja. A Supabase Auth, adatbázis és tárhely kérések a beállított Supabase projekthez kerülnek. A CDN, tárhelyszolgáltató, Supabase projekt régiója, adatfeldolgozói feltételek és megőrzési idők indulás előtt ellenőrzendők.",
            "Az éles tárhelyszolgáltató technikai sütiket vagy naplókat is használhat. Mivel az éles tárhelyszolgáltató és konfiguráció még nincs megadva, ezekről a végleges cookie-tájékoztatóban külön, szolgáltató és megőrzési idő szerint kell beszámolni."
          ]
        },
        {
          heading: "Böngészős tárolók kezelése",
          paragraphs: [
            "A bejelentkezési adatok törléséhez jelentkezz ki; a helyi demo adatai a böngésző webhelyadatainak törlésével is eltávolíthatók. A tárhely törlése kijelentkeztethet, illetve a helyi tesztadatokat és feltöltött képeket végleg eltávolíthatja. A böngésző beállításaiban a sütik és webhelyadatok külön-külön is kezelhetők.",
            "A szükséges tárolók letiltása megakadályozhatja a bejelentkezést és az alkalmazás működését. E tájékoztató és a süti-/tárhely-beállítási hivatkozás minden alkalmazásnézetből elérhető."
          ]
        }
      ]
    }
  }
});
