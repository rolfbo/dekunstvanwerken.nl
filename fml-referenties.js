/*
   Herkenbare maten voor de FML-assistent.

   Niemand weet hoe tien kilo voelt. Iedereen weet of een kratje bier nog lukt.
   Daarom vraagt de assistent nooit naar eenheden maar naar dingen: niet "kun je
   een kilo tillen" maar "kun je een pak suiker tillen". Het omrekenen naar
   kilo's, meters en minuten doet hij zelf, met deze lijst.

   Dezelfde redenering als het dagverhaal: vraag naar iets waarneembaars, laat
   de bezoeker zichzelf niet beoordelen.

   OPBOUW
   Elke ingang heeft:
     naam     wat je de bezoeker voorlegt, in zijn taal
     waarde   een getal (met de eenheid van de groep) of een omschrijving
     items    de FML-items waar deze ingang iets over zegt
     context  waar het vandaan komt: huishouden, boodschappen, kinderen, tuin,
              klussen, vervoer, vrije tijd, werk
   Door `items` werkt de lijst twee kanten op: van een antwoord naar een score,
   en van een leeg item naar een vraag die erbij past.

   WAARDEN ZIJN VUISTREGELS
   Een kratje bier weegt niet overal exact hetzelfde en een vol café is niet
   altijd precies even luid. Deze getallen leggen een orde van grootte vast die
   een bedrijfsarts kan lezen — ze zijn geen meting, en de prompt zegt het model
   dat het ze als "ongeveer" moet presenteren en er nooit over in discussie moet
   gaan.

   UITBREIDEN
   Een slechte referentie is erger dan geen referentie: een verkeerd gewicht
   maakt elke score eromheen onbetrouwbaar. Voeg alleen toe wat je durft te
   verdedigen tegenover een bedrijfsarts. `node scripts/fml-referenties-check.mjs`
   controleert of alle itemsleutels bestaan en laat zien welke FML-items nog
   geen enkele ingang hebben.
*/

export const REFERENTIES = {
  gewicht: {
    eenheid: 'kg',
    toelichting: 'ongeveer, inclusief verpakking',
    vraag: 'Wat is het zwaarste dat nog gaat, en wat is het lichtste dat al niet meer lukt?',
    items: [
      { naam: 'een brief of een tijdschrift', waarde: 0.3, items: ['IV.e'], context: 'huishouden' },
      { naam: 'een pak koffie', waarde: 0.5, items: ['IV.e'], context: 'boodschappen' },
      { naam: 'een brood', waarde: 0.8, items: ['IV.e'], context: 'boodschappen' },
      { naam: 'een pak suiker of rijst', waarde: 1, items: ['IV.e', 'IV.f'], context: 'boodschappen' },
      { naam: 'een pak melk van 1 liter', waarde: 1, items: ['IV.e', 'IV.f'], context: 'boodschappen' },
      { naam: 'een volle waterkoker', waarde: 1.2, items: ['IV.e', 'IV.c'], context: 'huishouden' },
      { naam: 'een fles wijn', waarde: 1.2, items: ['IV.e'], context: 'boodschappen' },
      { naam: 'een flesje cola van 1,5 liter', waarde: 1.5, items: ['IV.e', 'IV.f'], context: 'boodschappen' },
      { naam: 'een laptop', waarde: 1.5, items: ['IV.e'], context: 'werk' },
      { naam: 'een pak luiers', waarde: 2, items: ['IV.e', 'IV.f'], context: 'kinderen' },
      { naam: 'een fles melk van 2 liter', waarde: 2, items: ['IV.e', 'IV.f'], context: 'boodschappen' },
      { naam: 'een six-pack bier', waarde: 2.5, items: ['IV.e', 'IV.f'], context: 'boodschappen' },
      { naam: 'een gevulde koekenpan', waarde: 2.5, items: ['IV.e', 'IV.a'], context: 'huishouden' },
      { naam: 'een stapel van zes borden', waarde: 3, items: ['IV.e', 'IV.c'], context: 'huishouden' },
      { naam: 'een laptoptas met spullen', waarde: 3, items: ['IV.e', 'IV.f'], context: 'werk' },
      { naam: 'een klinker (straatsteen)', waarde: 3, items: ['IV.e', 'IV.f'], context: 'werk' },
      { naam: 'een pan met eten voor vier personen', waarde: 3, items: ['IV.e', 'IV.c'], context: 'huishouden' },
      { naam: 'een krat met papier of dossiers', waarde: 4, items: ['IV.e', 'IV.f'], context: 'werk' },
      { naam: 'een kat in een reismand', waarde: 5, items: ['IV.e', 'IV.f'], context: 'huishouden' },
      { naam: 'een zak aardappelen', waarde: 5, items: ['IV.e', 'IV.f'], context: 'boodschappen' },
      { naam: 'een stoeptegel van 30 bij 30', waarde: 5, items: ['IV.e', 'IV.f'], context: 'werk' },
      { naam: 'een stofzuiger', waarde: 6, items: ['IV.e', 'IV.f'], context: 'huishouden' },
      { naam: 'een wasmand met natte was', waarde: 7, items: ['IV.e', 'IV.f', 'IV.d'], context: 'huishouden' },
      { naam: 'een volle boodschappentas', waarde: 8, items: ['IV.e', 'IV.f'], context: 'boodschappen' },
      { naam: 'een volle vuilniszak', waarde: 8, items: ['IV.e', 'IV.f'], context: 'huishouden' },
      { naam: 'een doos met een nieuwe magnetron', waarde: 10, items: ['IV.e'], context: 'huishouden' },
      { naam: 'een kind van één jaar', waarde: 10, items: ['IV.e', 'IV.f'], context: 'kinderen' },
      { naam: 'een emmer water van 10 liter', waarde: 10, items: ['IV.e', 'IV.f'], context: 'huishouden' },
      { naam: 'een zak kattenbakvulling', waarde: 10, items: ['IV.e', 'IV.f'], context: 'boodschappen' },
      { naam: 'een zak potgrond', waarde: 10, items: ['IV.e', 'IV.f'], context: 'tuin' },
      { naam: 'een gevulde koffer voor een weekend', waarde: 12, items: ['IV.e', 'IV.f'], context: 'vrije tijd' },
      { naam: 'een kind van drie jaar', waarde: 15, items: ['IV.e', 'IV.f'], context: 'kinderen' },
      { naam: 'een zak hondenvoer', waarde: 15, items: ['IV.e', 'IV.f'], context: 'boodschappen' },
      { naam: 'een vol kratje bier', waarde: 17, items: ['IV.e', 'IV.f'], context: 'boodschappen' },
      { naam: 'een koffer voor een week vakantie', waarde: 18, items: ['IV.e', 'IV.f'], context: 'vrije tijd' },
      { naam: 'een volle rolkoffer de trap op', waarde: 18, items: ['IV.f', 'IV.i'], context: 'vrije tijd' },
      { naam: 'een gasfles voor de barbecue', waarde: 20, items: ['IV.e', 'IV.f'], context: 'tuin' },
      { naam: 'een zak cement', waarde: 25, items: ['IV.e', 'IV.f'], context: 'werk' },
      { naam: 'een betontegel van 40 bij 60', waarde: 25, items: ['IV.e', 'IV.f'], context: 'werk' },
      { naam: 'een volwassene ondersteunen bij het opstaan', waarde: 30, items: ['IV.e', 'IV.f'], context: 'werk' },
    ],
  },

  afstand: {
    eenheid: 'meter',
    toelichting: 'ongeveer, een gemiddelde woonwijk',
    vraag: 'Tot waar kom je nog in één keer, zonder onderweg te stoppen?',
    items: [
      { naam: 'van de bank naar de keuken', waarde: 10, items: ['IV.g'], context: 'huishouden' },
      { naam: 'naar de brievenbus op de hoek', waarde: 100, items: ['IV.g'], context: 'huishouden' },
      { naam: 'van de parkeerplaats naar de ingang van de supermarkt', waarde: 200, items: ['IV.g'], context: 'boodschappen' },
      { naam: 'een rondje door de supermarkt', waarde: 400, items: ['IV.g', 'IV.h', 'V.c'], context: 'boodschappen' },
      { naam: 'naar de supermarkt om de hoek', waarde: 500, items: ['IV.g'], context: 'boodschappen' },
      { naam: 'een rondje om het blok', waarde: 1000, items: ['IV.g'], context: 'vrije tijd' },
      { naam: 'de hond uitlaten, klein rondje', waarde: 1000, items: ['IV.g'], context: 'vrije tijd' },
      { naam: 'lopend naar het station', waarde: 2000, items: ['IV.g', 'II.i'], context: 'vervoer' },
      { naam: 'een wandeling van een uur', waarde: 4000, items: ['IV.g'], context: 'vrije tijd' },
      { naam: 'een dag winkelen in de stad', waarde: 6000, items: ['IV.g', 'IV.h', 'V.c'], context: 'vrije tijd' },
    ],
  },

  duur_staan: {
    eenheid: 'minuten',
    toelichting: 'ongeveer, aaneengesloten staan',
    vraag: 'Hoe lang blijf je staan voordat je moet zitten?',
    items: [
      { naam: 'tanden poetsen', waarde: 3, items: ['V.c'], context: 'huishouden' },
      { naam: 'in de rij bij de kassa', waarde: 5, items: ['V.c'], context: 'boodschappen' },
      { naam: 'wachten op de bus', waarde: 10, items: ['V.c', 'II.i'], context: 'vervoer' },
      { naam: 'de afwas doen', waarde: 15, items: ['V.c', 'V.f'], context: 'huishouden' },
      { naam: 'een maaltijd koken', waarde: 30, items: ['V.c', 'V.d', 'I.b'], context: 'huishouden' },
      { naam: 'strijken', waarde: 30, items: ['V.c', 'IV.b'], context: 'huishouden' },
      { naam: 'een boodschappenrondje', waarde: 40, items: ['V.c', 'IV.h'], context: 'boodschappen' },
      { naam: 'een receptie of verjaardag staand', waarde: 90, items: ['V.d', 'II.g'], context: 'vrije tijd' },
      { naam: 'een halve werkdag staand werk', waarde: 240, items: ['V.d'], context: 'werk' },
    ],
  },

  duur_zitten: {
    eenheid: 'minuten',
    toelichting: 'ongeveer, aaneengesloten zitten zonder opstaan',
    vraag: 'Hoe lang zit je voordat je moet verzitten of opstaan?',
    items: [
      { naam: 'een kop koffie drinken', waarde: 10, items: ['V.a'], context: 'huishouden' },
      { naam: 'een maaltijd aan tafel', waarde: 30, items: ['V.a'], context: 'huishouden' },
      { naam: 'een aflevering van een serie', waarde: 45, items: ['V.a', 'I.a'], context: 'vrije tijd' },
      { naam: 'een autorit naar de volgende stad', waarde: 60, items: ['V.a', 'IV.n'], context: 'vervoer' },
      { naam: 'een voetbalwedstrijd uitzitten', waarde: 90, items: ['V.b'], context: 'vrije tijd' },
      { naam: 'een film in de bioscoop', waarde: 120, items: ['V.b', 'I.a'], context: 'vrije tijd' },
      { naam: 'een treinreis naar de andere kant van het land', waarde: 150, items: ['V.b', 'IV.p'], context: 'vervoer' },
      { naam: 'een ochtend achter het bureau', waarde: 240, items: ['V.b', 'IV.m'], context: 'werk' },
    ],
  },

  duur_aandacht: {
    eenheid: 'minuten',
    toelichting: 'ongeveer, aaneengesloten bij de les blijven',
    vraag: 'Waar haak je af — en gebeurt dat op een vast moment van de dag?',
    items: [
      { naam: 'een appje lezen en beantwoorden', waarde: 2, items: ['I.a'], context: 'vrije tijd' },
      { naam: 'een recept volgen', waarde: 20, items: ['I.a', 'I.e'], context: 'huishouden' },
      { naam: 'een krantenartikel uitlezen', waarde: 20, items: ['I.a', 'II.a'], context: 'vrije tijd' },
      { naam: 'een telefoongesprek met een instantie', waarde: 25, items: ['I.a', 'II.c', 'II.g'], context: 'huishouden' },
      { naam: 'een aflevering van een serie volgen', waarde: 45, items: ['I.a'], context: 'vrije tijd' },
      { naam: 'een hoofdstuk van een boek lezen', waarde: 45, items: ['I.a'], context: 'vrije tijd' },
      { naam: 'de administratie of belastingaangifte doen', waarde: 60, items: ['I.a', 'I.e', 'I.b'], context: 'huishouden' },
      { naam: 'een vergadering van een uur volgen', waarde: 60, items: ['I.a', 'II.f'], context: 'werk' },
      { naam: 'een film van begin tot eind', waarde: 120, items: ['I.a'], context: 'vrije tijd' },
    ],
  },

  hoogte: {
    eenheid: 'omschrijving',
    toelichting: 'waar de handen zijn tijdens de handeling',
    vraag: 'Kom je er nog bij, en hoe lang hou je dat vol?',
    items: [
      { naam: 'iets van het aanrecht pakken', waarde: 'heuphoogte, rug recht', items: ['IV.c'], context: 'huishouden' },
      { naam: 'een boek uit de boekenkast op ooghoogte', waarde: 'schouderhoogte, arm gestrekt', items: ['IV.c'], context: 'huishouden' },
      { naam: 'de bovenste plank van de keukenkast', waarde: 'boven schouderhoogte', items: ['IV.c', 'V.g'], context: 'huishouden' },
      { naam: 'de was ophangen aan een droogrek', waarde: 'schouderhoogte, herhaald', items: ['V.g', 'IV.b'], context: 'huishouden' },
      { naam: 'de was ophangen aan een hoge lijn', waarde: 'boven schouderhoogte, herhaald', items: ['V.g', 'IV.b'], context: 'huishouden' },
      { naam: 'ramen zemen', waarde: 'armen omhoog, minuten achtereen', items: ['V.g', 'IV.b'], context: 'huishouden' },
      { naam: 'een lamp vervangen', waarde: 'armen volledig omhoog', items: ['V.g'], context: 'klussen' },
      { naam: 'een plafond schilderen', waarde: 'armen omhoog én hoofd achterover', items: ['V.g', 'V.h', 'IV.l'], context: 'klussen' },
      { naam: 'een koffer in het bagagerek van de trein', waarde: 'boven schouderhoogte met gewicht', items: ['V.g', 'IV.e', 'IV.p'], context: 'vervoer' },
      { naam: 'een doos op de bovenste schap zetten', waarde: 'boven schouderhoogte met gewicht', items: ['V.g', 'IV.e'], context: 'werk' },
    ],
  },

  laag_werken: {
    eenheid: 'omschrijving',
    toelichting: 'houding dicht bij de grond',
    vraag: 'Hoe doe je dat tegenwoordig — en hoe kom je weer omhoog?',
    items: [
      { naam: 'iets van de grond oprapen', waarde: 'eenmalig bukken', items: ['IV.d'], context: 'huishouden' },
      { naam: 'de vaatwasser in- en uitruimen', waarde: 'herhaald bukken', items: ['IV.d', 'IV.b'], context: 'huishouden' },
      { naam: 'de wasmachine vullen', waarde: 'bukken of hurken', items: ['IV.d', 'IV.k'], context: 'huishouden' },
      { naam: 'iets uit de onderste la pakken', waarde: 'gebukt of gehurkt', items: ['IV.k', 'V.e'], context: 'huishouden' },
      { naam: 'schoenveters strikken', waarde: 'voorovergebogen zitten', items: ['IV.d', 'V.f'], context: 'huishouden' },
      { naam: 'een kind aankleden op de grond', waarde: 'geknield, enkele minuten', items: ['V.e', 'IV.k'], context: 'kinderen' },
      { naam: 'stofzuigen onder de bank', waarde: 'gebogen en gedraaid', items: ['V.f', 'IV.d'], context: 'huishouden' },
      { naam: 'dweilen', waarde: 'gebogen, minuten achtereen', items: ['V.f', 'IV.d', 'IV.b'], context: 'huishouden' },
      { naam: 'het bed verschonen', waarde: 'gebogen en reikend', items: ['V.f', 'IV.c', 'IV.d'], context: 'huishouden' },
      { naam: 'onkruid wieden', waarde: 'gehurkt of geknield, langdurig', items: ['V.e', 'IV.k'], context: 'tuin' },
      { naam: 'de vloer schrobben op je knieën', waarde: 'geknield, langdurig', items: ['V.e', 'IV.k', 'IV.b'], context: 'huishouden' },
      { naam: 'onder de gootsteen bij de kraan komen', waarde: 'geknield en gedraaid, hoofd achterover', items: ['V.e', 'V.f', 'V.h'], context: 'klussen' },
    ],
  },

  handen: {
    eenheid: 'omschrijving',
    toelichting: 'fijne motoriek en herhaling',
    vraag: 'Lukt dat nog, en merk je er later op de dag iets van?',
    items: [
      { naam: 'een pot augurken opendraaien', waarde: 'kracht in de hand', items: ['IV.a'], context: 'huishouden' },
      { naam: 'een knoopje dichtdoen', waarde: 'fijne motoriek', items: ['IV.a'], context: 'huishouden' },
      { naam: 'veters strikken', waarde: 'fijne motoriek met twee handen', items: ['IV.a'], context: 'huishouden' },
      { naam: 'een sleutel in het slot omdraaien', waarde: 'kracht in vingers', items: ['IV.a'], context: 'huishouden' },
      { naam: 'groente snijden', waarde: 'grip en herhaling', items: ['IV.a', 'IV.b'], context: 'huishouden' },
      { naam: 'een appje typen op de telefoon', waarde: 'fijne motoriek, kort', items: ['IV.a', 'IV.m'], context: 'vrije tijd' },
      { naam: 'een half uur achter elkaar typen', waarde: 'herhaling, langduriger', items: ['IV.m', 'IV.b'], context: 'werk' },
      { naam: 'breien of haken', waarde: 'fijne motoriek, langdurig herhaald', items: ['IV.a', 'IV.b'], context: 'vrije tijd' },
      { naam: 'een halfuur afwassen met de hand', waarde: 'herhaald, nat en koud', items: ['IV.b', 'III.d'], context: 'huishouden' },
      { naam: 'een puzzel van duizend stukjes', waarde: 'fijne motoriek én aandacht', items: ['IV.a', 'I.a'], context: 'vrije tijd' },
      { naam: 'de hele dag met een muis werken', waarde: 'eenzijdige herhaling', items: ['IV.m', 'IV.b'], context: 'werk' },
    ],
  },

  trappen_klimmen: {
    eenheid: 'omschrijving',
    toelichting: 'hoogteverschil overwinnen',
    vraag: 'Hoe gaat dat — moet je halverwege stoppen, of de leuning vasthouden?',
    items: [
      { naam: 'één trap naar boven in huis', waarde: 'ongeveer 15 treden', items: ['IV.i'], context: 'huishouden' },
      { naam: 'de trap naar de slaapkamer, meerdere keren per dag', waarde: 'herhaald traplopen', items: ['IV.i'], context: 'huishouden' },
      { naam: 'de trap in het station in plaats van de roltrap', waarde: 'twee trappen met bagage', items: ['IV.i', 'IV.f', 'II.i'], context: 'vervoer' },
      { naam: 'op een keukentrapje staan', waarde: 'klimmen, lage hoogte', items: ['IV.j'], context: 'huishouden' },
      { naam: 'op een ladder naar de dakgoot', waarde: 'klimmen op hoogte', items: ['IV.j', 'I.h'], context: 'klussen' },
      { naam: 'op een steiger werken', waarde: 'klimmen en werken op hoogte', items: ['IV.j', 'I.h'], context: 'werk' },
    ],
  },

  nek: {
    eenheid: 'omschrijving',
    toelichting: 'stand en beweging van hoofd en nek',
    vraag: 'Hoe lang hou je dat vol, en waar merk je het?',
    items: [
      { naam: 'over de schouder kijken bij het inparkeren', waarde: 'nek ver draaien', items: ['IV.l', 'IV.n'], context: 'vervoer' },
      { naam: 'oversteken: links en rechts kijken', waarde: 'nek herhaald draaien', items: ['IV.l'], context: 'vervoer' },
      { naam: 'een half uur op je telefoon kijken', waarde: 'hoofd voorovergebogen', items: ['V.h', 'IV.l'], context: 'vrije tijd' },
      { naam: 'een laptop op schoot gebruiken', waarde: 'hoofd langdurig gebogen', items: ['V.h', 'IV.m'], context: 'werk' },
      { naam: 'naar de kapper, hoofd achterover bij de wasbak', waarde: 'hoofd achterover, enkele minuten', items: ['V.h'], context: 'vrije tijd' },
      { naam: 'naar een hoge plank kijken terwijl je zoekt', waarde: 'hoofd achterover, herhaald', items: ['V.h', 'IV.l'], context: 'boodschappen' },
    ],
  },

  zien_horen_spreken: {
    eenheid: 'omschrijving',
    toelichting: 'waarnemen en je verstaanbaar maken',
    vraag: 'In welke situatie merk je dat het niet goed gaat?',
    items: [
      { naam: 'de kleine letters op een medicijndoosje lezen', waarde: 'dichtbij scherp zien', items: ['II.a'], context: 'huishouden' },
      { naam: 'ondertiteling lezen op de televisie', waarde: 'op afstand scherp zien', items: ['II.a'], context: 'vrije tijd' },
      { naam: 'een huisnummer lezen vanaf de overkant', waarde: 'op afstand scherp zien', items: ['II.a'], context: 'vervoer' },
      { naam: 'een gesprek volgen in een stil kamertje', waarde: 'horen zonder achtergrondgeluid', items: ['II.b'], context: 'huishouden' },
      { naam: 'een gesprek volgen in een vol café', waarde: 'horen met achtergrondgeluid', items: ['II.b', 'III.g'], context: 'vrije tijd' },
      { naam: 'de deurbel of een wekker horen', waarde: 'signaalgeluid opmerken', items: ['II.b', 'I.h'], context: 'huishouden' },
      { naam: 'een kwartier aan de telefoon praten', waarde: 'spreken, langer achtereen', items: ['II.c'], context: 'huishouden' },
      { naam: 'boven lawaai uit iets roepen', waarde: 'luid spreken', items: ['II.c', 'III.g'], context: 'werk' },
      { naam: 'aan een tafel met zes mensen het gesprek volgen', waarde: 'horen én aandacht verdelen', items: ['II.b', 'I.b'], context: 'vrije tijd' },
    ],
  },

  sociaal: {
    eenheid: 'omschrijving',
    toelichting: 'omgaan met andere mensen',
    vraag: 'Hoe liep dat af, en hoe voelde je je daarna?',
    items: [
      { naam: 'zeggen dat je ergens geen zin in hebt', waarde: 'grens aangeven bij bekenden', items: ['II.d'], context: 'vrije tijd' },
      { naam: 'aan familie uitleggen hoe het met je gaat', waarde: 'gevoelens benoemen', items: ['II.d'], context: 'huishouden' },
      { naam: 'een kapot product terugbrengen naar de winkel', waarde: 'wrijving met een vreemde', items: ['II.e', 'II.g'], context: 'boodschappen' },
      { naam: 'bellen met een instantie die iets fout deed', waarde: 'conflict uithouden', items: ['II.e', 'II.c'], context: 'huishouden' },
      { naam: 'een meningsverschil thuis', waarde: 'wrijving met naasten', items: ['II.e'], context: 'huishouden' },
      { naam: 'met z\'n vieren iets regelen voor een verjaardag', waarde: 'samen afstemmen', items: ['II.f', 'I.b'], context: 'vrije tijd' },
      { naam: 'een verjaardag met veel mensen', waarde: 'drukte en contact', items: ['II.f', 'II.g', 'I.b'], context: 'vrije tijd' },
      { naam: 'boodschappen doen op een druk tijdstip', waarde: 'drukte verdragen', items: ['II.g', 'I.b'], context: 'boodschappen' },
      { naam: 'een gesprek op school over je kind', waarde: 'formeel gesprek met een gezagsfiguur', items: ['II.h', 'II.d'], context: 'kinderen' },
      { naam: 'iets uitleggen aan de monteur en het laten doen', waarde: 'aanwijzingen geven en loslaten', items: ['II.g', 'I.g'], context: 'huishouden' },
      { naam: 'op visite gaan bij iemand die je niet goed kent', waarde: 'nieuw contact', items: ['II.g'], context: 'vrije tijd' },
    ],
  },

  mentaal: {
    eenheid: 'omschrijving',
    toelichting: 'overzicht, geheugen, tempo en zelfstandigheid',
    vraag: 'Gaat dat nog vanzelf, of kost het je moeite?',
    items: [
      { naam: 'koken terwijl de kinderen iets vragen', waarde: 'twee dingen tegelijk', items: ['I.b'], context: 'kinderen' },
      { naam: 'praten terwijl je de weg zoekt', waarde: 'aandacht verdelen', items: ['I.b', 'IV.n'], context: 'vervoer' },
      { naam: 'drie boodschappen onthouden zonder briefje', waarde: 'kort geheugen', items: ['I.c'], context: 'boodschappen' },
      { naam: 'onthouden wat iemand gisteren vertelde', waarde: 'langer geheugen', items: ['I.c'], context: 'huishouden' },
      { naam: 'een afspraak onthouden zonder herinnering in de telefoon', waarde: 'geheugen in het dagelijks leven', items: ['I.c', 'I.e'], context: 'huishouden' },
      { naam: 'een week vooruit boodschappen plannen', waarde: 'vooruit denken', items: ['I.e'], context: 'boodschappen' },
      { naam: 'een verjaardag organiseren', waarde: 'meerdere stappen plannen', items: ['I.e', 'I.b'], context: 'vrije tijd' },
      { naam: 'een kastje van de bouwmarkt in elkaar zetten', waarde: 'stappenplan volgen', items: ['I.e', 'I.a', 'IV.a'], context: 'klussen' },
      { naam: 'alles kost meer tijd dan vroeger', waarde: 'vertraagd tempo', items: ['I.f'], context: 'huishouden' },
      { naam: '\'s ochtends op gang komen', waarde: 'starten en doortempo', items: ['I.f', 'VI.c'], context: 'huishouden' },
      { naam: 'zelf een afspraak maken en nakomen', waarde: 'zelfstandig handelen', items: ['I.g', 'I.e'], context: 'huishouden' },
      { naam: 'inschatten wat vandaag wel en niet gaat lukken', waarde: 'zicht op eigen grenzen', items: ['I.d'], context: 'huishouden' },
      { naam: 'doorgaan tot je omvalt in plaats van op tijd stoppen', waarde: 'grenzen niet aanvoelen', items: ['I.d', 'VI.c'], context: 'huishouden' },
    ],
  },

  vervoer: {
    eenheid: 'omschrijving',
    toelichting: 'je verplaatsen',
    vraag: 'Hoe kom je tegenwoordig waar je wezen moet?',
    items: [
      { naam: 'zelf naar de supermarkt rijden', waarde: 'korte rit, bekende weg', items: ['IV.n', 'II.i'], context: 'vervoer' },
      { naam: 'een uur achter elkaar autorijden', waarde: 'langere rit', items: ['IV.n', 'V.a'], context: 'vervoer' },
      { naam: 'in het donker of in de regen rijden', waarde: 'rijden met meer belasting', items: ['IV.n', 'II.a', 'I.a'], context: 'vervoer' },
      { naam: 'een kwartier fietsen naar het dorp', waarde: 'korte fietstocht', items: ['IV.o', 'II.i'], context: 'vervoer' },
      { naam: 'een uur fietsen', waarde: 'langere fietstocht', items: ['IV.o'], context: 'vrije tijd' },
      { naam: 'met de bus naar het centrum', waarde: 'openbaar vervoer, kort', items: ['IV.p', 'II.i'], context: 'vervoer' },
      { naam: 'met de trein in de spits', waarde: 'openbaar vervoer met drukte', items: ['IV.p', 'II.g', 'V.c'], context: 'vervoer' },
      { naam: 'overstappen met bagage', waarde: 'openbaar vervoer met tijdsdruk', items: ['IV.p', 'IV.f', 'I.b'], context: 'vervoer' },
    ],
  },

  omgeving: {
    eenheid: 'omschrijving',
    toelichting: 'omstandigheden waarin iemand werkt of leeft',
    vraag: 'Merk je daar iets van, en hoe lang hou je het uit?',
    items: [
      { naam: 'een warme zomerdag buiten', waarde: 'ongeveer 28 graden', items: ['III.a'], context: 'tuin' },
      { naam: 'in de keuken bij de oven of de friteuse', waarde: 'ongeveer 35 graden, plaatselijk', items: ['III.a'], context: 'werk' },
      { naam: 'in een ketelhuis of bakkerij', waarde: 'ongeveer 40 graden', items: ['III.a'], context: 'werk' },
      { naam: 'buiten op een winterdag', waarde: 'rond het vriespunt', items: ['III.b'], context: 'tuin' },
      { naam: 'in de koeling van de supermarkt', waarde: 'ongeveer 4 graden', items: ['III.b'], context: 'werk' },
      { naam: 'in een vriescel', waarde: 'ongeveer 20 graden onder nul', items: ['III.b'], context: 'werk' },
      { naam: 'bij een open deur of laadperron staan', waarde: 'tocht', items: ['III.c'], context: 'werk' },
      { naam: 'op de fiets bij harde wind', waarde: 'wind en kou', items: ['III.c', 'IV.o'], context: 'vervoer' },
      { naam: 'schoonmaakmiddelen gebruiken zonder handschoenen', waarde: 'huidcontact met prikkelende stoffen', items: ['III.d', 'IV.a'], context: 'huishouden' },
      { naam: 'de hele dag handen wassen', waarde: 'huid nat en ontvet', items: ['III.d'], context: 'werk' },
      { naam: 'een mondkapje dragen bij de tandarts', waarde: 'beschermingsmiddel, kort', items: ['III.e'], context: 'vrije tijd' },
      { naam: 'een hele dienst met mondkapje en handschoenen', waarde: 'beschermingsmiddelen, langdurig', items: ['III.e'], context: 'werk' },
      { naam: 'gehoorbescherming dragen', waarde: 'beschermingsmiddel én minder horen', items: ['III.e', 'II.b'], context: 'werk' },
      { naam: 'zagen of schuren in de schuur', waarde: 'stof in de lucht', items: ['III.f'], context: 'klussen' },
      { naam: 'verven in een kleine ruimte', waarde: 'dampen', items: ['III.f'], context: 'klussen' },
      { naam: 'bakken of frituren', waarde: 'rook en walm', items: ['III.f', 'III.a'], context: 'werk' },
      { naam: 'een stofzuiger in dezelfde kamer', waarde: 'ongeveer 70 decibel', items: ['III.g'], context: 'huishouden' },
      { naam: 'een vol café', waarde: 'ongeveer 80 decibel', items: ['III.g', 'II.b'], context: 'vrije tijd' },
      { naam: 'een grasmaaier of bladblazer', waarde: 'ongeveer 90 decibel', items: ['III.g'], context: 'tuin' },
      { naam: 'een drilboor of slijptol', waarde: 'ongeveer 100 decibel', items: ['III.g', 'III.h'], context: 'werk' },
      { naam: 'een schuurmachine in de hand', waarde: 'hand-armtrillingen', items: ['III.h', 'IV.a'], context: 'klussen' },
      { naam: 'een trilplaat of breekhamer', waarde: 'zware hand-armtrillingen', items: ['III.h'], context: 'werk' },
      { naam: 'een hele dag op een heftruck of tractor', waarde: 'lichaamstrillingen', items: ['III.h', 'V.b'], context: 'werk' },
    ],
  },

  veiligheid: {
    eenheid: 'omschrijving',
    toelichting: 'situaties waarin een misstap gevolgen heeft',
    vraag: 'Zou je dat op dit moment aandurven?',
    items: [
      { naam: 'alleen thuis koken met een gasfornuis', waarde: 'risico bij vergeetachtigheid', items: ['I.h', 'I.c'], context: 'huishouden' },
      { naam: 'met de auto de snelweg op', waarde: 'risico bij traag reageren', items: ['I.h', 'IV.n'], context: 'vervoer' },
      { naam: 'op een ladder staan', waarde: 'valrisico', items: ['I.h', 'IV.j'], context: 'klussen' },
      { naam: 'op kleine kinderen passen', waarde: 'verantwoordelijkheid voor een ander', items: ['I.h', 'I.b'], context: 'kinderen' },
      { naam: 'met een cirkelzaag of snijmachine werken', waarde: 'risico bij onoplettendheid', items: ['I.h', 'I.a'], context: 'werk' },
    ],
  },

  herstel_ritme: {
    eenheid: 'omschrijving',
    toelichting: 'wat iets kost en hoe lang het nawerkt',
    vraag: 'En hoe was het de dag erna?',
    items: [
      { naam: 'na een drukke dag een uur op de bank', waarde: 'korte hersteltijd', items: ['VI.a', 'VI.c'], context: 'huishouden' },
      { naam: 'na de boodschappen eerst even liggen', waarde: 'herstel na een gewone bezigheid', items: ['VI.a', 'VI.c'], context: 'boodschappen' },
      { naam: 'de dag na een verjaardag niets kunnen', waarde: 'een dag nawerking', items: ['VI.a', 'VI.b', 'VI.c'], context: 'vrije tijd' },
      { naam: 'in het weekend bijkomen van de week', waarde: 'herstel kost het hele weekend', items: ['VI.b', 'VI.c'], context: 'werk' },
      { naam: '\'s middags een uur slapen', waarde: 'vaste rust overdag nodig', items: ['VI.a', 'VI.c'], context: 'huishouden' },
      { naam: '\'s ochtends pas na twee uur op gang', waarde: 'late start van de dag', items: ['VI.c', 'I.f'], context: 'huishouden' },
      { naam: '\'s avonds niets meer kunnen plannen', waarde: 'dag eindigt vroeg', items: ['VI.a', 'VI.c'], context: 'huishouden' },
      { naam: 'slecht slapen en uitgeput wakker worden', waarde: 'herstel \'s nachts onvoldoende', items: ['VI.c', 'I.f'], context: 'huishouden' },
    ],
  },
};

/* Platte lijst, handig voor controle en opzoeken. */
export const ALLE_REFERENTIES = Object.entries(REFERENTIES).flatMap(([soort, groep]) =>
  groep.items.map((i) => ({ ...i, soort, eenheid: groep.eenheid })),
);

/* Welke referenties zeggen iets over dit FML-item? Hiermee werkt de lijst ook
   andersom: van een nog leeg item naar een vraag die erbij past. */
export function referentiesVoorItem(key) {
  return ALLE_REFERENTIES.filter((r) => r.items.includes(key));
}

function toonWaarde(waarde) {
  // Nederlandse komma: het model leest dit en neemt de schrijfwijze over.
  return typeof waarde === 'number' ? String(waarde).replace('.', ',') : waarde;
}

/* Zoals het in de systeemprompt belandt. */
export function referentieLijst() {
  return Object.entries(REFERENTIES)
    .map(([soort, groep]) => {
      const kop = `${soort.replace(/_/g, ' ').toUpperCase()} — ${groep.toelichting}\n  Peilvraag: ${groep.vraag}`;
      const regels = groep.items
        .map((i) => {
          const w = toonWaarde(i.waarde);
          const eenheid = groep.eenheid === 'omschrijving' ? '' : ' ' + groep.eenheid;
          return `  ${i.naam} = ${w}${eenheid}  [${i.items.join(' ')}]`;
        })
        .join('\n');
      return `${kop}\n${regels}`;
    })
    .join('\n\n');
}
