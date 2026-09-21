/*
   Canonical FML item list for [de Kunst van Werken].
   Single source of truth: imported by fml.html (browser, type="module")
   and by mcp/server.mjs (the assistant endpoint's tool schema).
   Zelf geschreven labels, gebaseerd op de publiek bekende zes-rubrieken-
   structuur van de FML. Wijzig items alleen hier.
*/

export const RUBRIEKEN = [
    {
        id: 'I',
        titel: 'Persoonlijk functioneren',
        items: [
            { id: 'a', label: 'Vasthouden van aandacht', hint: 'Geconcentreerd blijven op één taak.' },
            { id: 'b', label: 'Verdelen van aandacht', hint: 'Meerdere taken tegelijk doen.' },
            { id: 'c', label: 'Onthouden / inprenten', hint: 'Nieuwe informatie onthouden.' },
            { id: 'd', label: 'Inzicht in eigen kunnen', hint: 'Realistisch inschatten wat wel/niet lukt.' },
            { id: 'e', label: 'Doelgericht en planmatig handelen', hint: 'Een werkdag plannen en de planning volgen.' },
            { id: 'f', label: 'Handelingstempo', hint: 'In gangbaar werktempo functioneren.' },
            { id: 'g', label: 'Zelfstandig handelen', hint: 'Zonder voortdurende aansturing werken.' },
            { id: 'h', label: 'Werken zonder verhoogd persoonlijk risico', hint: 'Functies zonder onevenredige veiligheidsrisico’s.' },
        ],
    },
    {
        id: 'II',
        titel: 'Sociaal functioneren',
        items: [
            { id: 'a', label: 'Zien', hint: 'Visueel waarnemen voor het werk.' },
            { id: 'b', label: 'Horen', hint: 'Gehoor voor instructies, alarm, gesprekken.' },
            { id: 'c', label: 'Spreken', hint: 'Mondeling communiceren.' },
            { id: 'd', label: 'Eigen gevoelens uiten', hint: 'Aangeven wat nodig is of niet lukt.' },
            { id: 'e', label: 'Omgaan met conflicten', hint: 'Niet uit balans raken bij wrijving.' },
            { id: 'f', label: 'Samenwerken met collega’s', hint: 'Functioneren in een team.' },
            { id: 'g', label: 'Klantcontact / contact met derden', hint: 'Werken met klanten, patiënten, leveranciers.' },
            { id: 'h', label: 'Werken met leiding en hiërarchie', hint: 'Aanwijzingen accepteren en opvolgen.' },
            { id: 'i', label: 'Vervoer naar werk', hint: 'Zelfstandig reizen naar de werkplek.' },
        ],
    },
    {
        id: 'III',
        titel: 'Aanpassing aan fysieke omgevingseisen',
        items: [
            { id: 'a', label: 'Werken in hitte', hint: 'Hoge temperaturen of warmtebelasting.' },
            { id: 'b', label: 'Werken in koude', hint: 'Lage temperaturen of koudebelasting.' },
            { id: 'c', label: 'Werken in tocht of wind', hint: 'Buiten of in tochtige ruimtes.' },
            { id: 'd', label: 'Huidcontact met irriterende stoffen', hint: 'Reinigingsmiddelen, oliën, etc.' },
            { id: 'e', label: 'Werken met beschermingsmiddelen', hint: 'Mondkapje, handschoenen, gehoorbescherming.' },
            { id: 'f', label: 'Stof, rook, gassen of dampen', hint: 'Werken in ruimtes met luchtbelasting.' },
            { id: 'g', label: 'Werken in lawaai', hint: 'Continu of piekgeluid in de werkomgeving.' },
            { id: 'h', label: 'Werken met trillingen', hint: 'Bv. hand-arm of lichaamstrillingen.' },
        ],
    },
    {
        id: 'IV',
        titel: 'Dynamische handelingen',
        items: [
            { id: 'a', label: 'Hand- en vingergebruik', hint: 'Fijne motoriek, grijpen.' },
            { id: 'b', label: 'Repeterende handelingen', hint: 'Telkens dezelfde beweging maken.' },
            { id: 'c', label: 'Reiken', hint: 'Armen naar voren of opzij strekken.' },
            { id: 'd', label: 'Frequent buigen', hint: 'Voorover buigen tijdens werk.' },
            { id: 'e', label: 'Tillen (incidenteel)', hint: 'Eenmaal iets zwaars optillen.' },
            { id: 'f', label: 'Tillen of dragen (frequent)', hint: 'Regelmatig zware lasten verplaatsen.' },
            { id: 'g', label: 'Lopen', hint: 'Algemeen kunnen lopen.' },
            { id: 'h', label: 'Lopen tijdens het werk', hint: 'Lange perioden of grote afstanden.' },
            { id: 'i', label: 'Trappenlopen', hint: 'Traploop tijdens werk.' },
            { id: 'j', label: 'Klimmen', hint: 'Ladders, steigers, etc.' },
            { id: 'k', label: 'Knielen of hurken', hint: 'In knielende of hurkende houding werken.' },
            { id: 'l', label: 'Hoofd- en nekbewegingen', hint: 'Veel draaien of buigen van de nek.' },
            { id: 'm', label: 'Werken met toetsenbord en muis', hint: 'Beeldschermwerk.' },
            { id: 'n', label: 'Autorijden in het werk', hint: 'Rijden als onderdeel van de functie.' },
            { id: 'o', label: 'Fietsen', hint: 'Naar het werk of in het werk.' },
            { id: 'p', label: 'Openbaar vervoer gebruiken', hint: 'Reizen met OV naar of in het werk.' },
        ],
    },
    {
        id: 'V',
        titel: 'Statische houdingen',
        items: [
            { id: 'a', label: 'Zitten', hint: 'Algemeen kunnen zitten.' },
            { id: 'b', label: 'Langdurig zitten tijdens werk', hint: 'Hele werkdag aan een tafel.' },
            { id: 'c', label: 'Staan', hint: 'Algemeen kunnen staan.' },
            { id: 'd', label: 'Langdurig staan tijdens werk', hint: 'Hele werkdag staand werk.' },
            { id: 'e', label: 'Geknield of gehurkt actief zijn', hint: 'Lang werken in lage houding.' },
            { id: 'f', label: 'Gebogen of gedraaid werken', hint: 'Niet-rechte rughouding.' },
            { id: 'g', label: 'Boven schouderhoogte werken', hint: 'Armen omhoog houden.' },
            { id: 'h', label: 'Hoofd in een bepaalde stand houden', hint: 'Lange tijd in vaste nekhouding.' },
        ],
    },
    {
        id: 'VI',
        titel: 'Werktijden',
        items: [
            { id: 'a', type: 'number', max: 12, label: 'Maximaal aantal uren per dag', hint: 'Laat leeg of 0 als er geen beperking is.' },
            { id: 'b', type: 'number', max: 60, label: 'Maximaal aantal uren per week', hint: 'Laat leeg of 0 als er geen beperking is.' },
            { id: 'c', label: 'Bijzonderheden in werktijden', hint: 'Nachtdienst, ploegendienst, onregelmatig werk.' },
        ],
    },
];

export const SCORE_LABELS = ['—', 'Niet beperkt', 'Beperkt', 'Sterk beperkt'];

/* Vlakke lijst van alle items in vaste volgorde. De volgorde bepaalt de
   positie in de deel-link (#s=...), dus nooit herordenen. */
export const FLAT_ITEMS = RUBRIEKEN.flatMap((r) =>
  r.items.map((it) => ({
    key: `${r.id}.${it.id}`,
    type: it.type || 'score',
    rubriek: r.id,
    rubriekTitel: r.titel,
    label: it.label,
    hint: it.hint || '',
    max: it.max,
  })),
);

export const SCORE_KEYS = FLAT_ITEMS.filter((i) => i.type === 'score').map((i) => i.key);
export const TOTAL_ITEMS = FLAT_ITEMS.length;
