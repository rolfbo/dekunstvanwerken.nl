/*
   Herkenbare maten voor de FML-assistent.

   Niemand weet hoe tien kilo voelt. Iedereen weet of een kratje bier nog lukt.
   Daarom vraagt de assistent nooit naar eenheden maar naar dingen: niet "kun je
   een kilo tillen" maar "kun je een pak suiker tillen". Het omrekenen naar
   kilo's, meters en minuten doet hij zelf, met deze lijst.

   Dezelfde redenering als het dagverhaal: vraag naar iets waarneembaars, laat
   de bezoeker zichzelf niet beoordelen.

   De waarden zijn vuistregels, geen metingen — een kratje bier weegt niet
   overal exact hetzelfde. Ze zijn bedoeld om een orde van grootte vast te
   leggen die een bedrijfsarts kan lezen, niet om een discussie over grammen
   te voeren. De prompt zegt het model dat er ook bij.
*/

export const REFERENTIES = {
  gewicht: {
    eenheid: 'kg',
    toelichting: 'ongeveer, inclusief verpakking',
    items: [
      { naam: 'een pak suiker of rijst', waarde: 1 },
      { naam: 'een pak melk van 1 liter', waarde: 1 },
      { naam: 'een fles wijn', waarde: 1.2 },
      { naam: 'een flesje cola van 1,5 liter', waarde: 1.5 },
      { naam: 'een pak luiers', waarde: 2 },
      { naam: 'een fles melk van 2 liter', waarde: 2 },
      { naam: 'een six-pack bier', waarde: 2.5 },
      { naam: 'een stapel van zes borden', waarde: 3 },
      { naam: 'een laptoptas', waarde: 3 },
      { naam: 'een klinker (straatsteen)', waarde: 3 },
      { naam: 'een pan met eten voor vier personen', waarde: 3 },
      { naam: 'een zak aardappelen', waarde: 5 },
      { naam: 'een stoeptegel van 30 bij 30', waarde: 5 },
      { naam: 'een stofzuiger', waarde: 6 },
      { naam: 'een wasmand met natte was', waarde: 7 },
      { naam: 'een volle boodschappentas', waarde: 8 },
      { naam: 'een volle vuilniszak', waarde: 8 },
      { naam: 'een kind van één jaar', waarde: 10 },
      { naam: 'een emmer water van 10 liter', waarde: 10 },
      { naam: 'een zak kattenbakvulling', waarde: 10 },
      { naam: 'een zak hondenvoer', waarde: 15 },
      { naam: 'een kind van drie jaar', waarde: 15 },
      { naam: 'een vol kratje bier', waarde: 17 },
      { naam: 'een koffer voor een week vakantie', waarde: 18 },
      { naam: 'een zak cement', waarde: 25 },
      { naam: 'een betontegel van 40 bij 60', waarde: 25 },
    ],
  },

  afstand: {
    eenheid: 'meter',
    toelichting: 'ongeveer, een gemiddelde woonwijk',
    items: [
      { naam: 'van de bank naar de keuken', waarde: 10 },
      { naam: 'naar de brievenbus op de hoek', waarde: 100 },
      { naam: 'naar de supermarkt om de hoek', waarde: 500 },
      { naam: 'een rondje om het blok', waarde: 1000 },
      { naam: 'lopend naar het station', waarde: 2000 },
    ],
  },

  duur: {
    eenheid: 'minuten',
    toelichting: 'ongeveer',
    items: [
      { naam: 'een kop koffie drinken', waarde: 10 },
      { naam: 'douchen en aankleden', waarde: 15 },
      { naam: 'de afwas doen', waarde: 15 },
      { naam: 'een boodschappenrondje', waarde: 30 },
      { naam: 'een aflevering van een serie', waarde: 45 },
      { naam: 'een voetbalwedstrijd', waarde: 90 },
      { naam: 'een ochtend werken', waarde: 240 },
    ],
  },

  hoogte: {
    eenheid: 'omschrijving',
    toelichting: 'waar de handen zijn tijdens de handeling',
    items: [
      { naam: 'iets uit de onderste la pakken', waarde: 'bij de grond, gebukt of gehurkt' },
      { naam: 'aanrecht of werkbank', waarde: 'heuphoogte, rug recht' },
      { naam: 'de bovenste plank van de keukenkast', waarde: 'boven schouderhoogte' },
      { naam: 'een lamp vervangen', waarde: 'armen volledig omhoog' },
    ],
  },
};

/* Zoals het in de systeemprompt belandt. */
export function referentieLijst() {
  return Object.entries(REFERENTIES)
    .map(([soort, groep]) => {
      const regels = groep.items
        .map((i) => {
          // Nederlandse komma: het model leest dit en neemt de schrijfwijze over.
          const w = typeof i.waarde === 'number' ? String(i.waarde).replace('.', ',') : i.waarde;
          return `  ${i.naam} = ${w}${groep.eenheid === 'omschrijving' ? '' : ' ' + groep.eenheid}`;
        })
        .join('\n');
      return `${soort.toUpperCase()} (${groep.toelichting})\n${regels}`;
    })
    .join('\n\n');
}
