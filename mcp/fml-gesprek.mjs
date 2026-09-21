/*
   FML-assistent — gespreksendpoint voor de FML concept-tool.

   PROTOTYPE. Zie instructions/fml-assistent.md voor wat er nog moet gebeuren
   voordat dit live mag (AVG-grondslag, verwerkersovereenkomst, EU-regio, DPIA).

   Ontwerpuitgangspunten die je niet zomaar moet wijzigen:

   1. STATELOOS. Er wordt niets van het gesprek op schijf geschreven — geen
      transcript, geen scores, geen logregel met inhoud. De browser houdt de
      hele conversatie vast en stuurt hem elke beurt opnieuw mee. Deze server
      is een doorgeefluik, geen dossierhouder. Dat is wat het verschil maakt
      tussen "even vervoeren" en "bijzondere persoonsgegevens bewaren".
   2. GEEN AFHANKELIJKHEDEN. De deploy (rsync) sluit node_modules uit en er
      draait geen npm install op de server, dus geen SDK maar fetch().
   3. EEN API-CALL PER BEURT. Het model schrijft zijn antwoord als tekst en
      roept in diezelfde beurt de tool aan om scores bij te werken. We sturen
      bewust geen tool_result terug: de geschiedenis wordt elke beurt opnieuw
      opgebouwd uit platte tekst, met de actuele stand als context. Dat
      scheelt een tweede round-trip en houdt de geschiedenis eenvoudig.
*/

import { RUBRIEKEN, FLAT_ITEMS, SCORE_KEYS, SCORE_LABELS } from '../fml-items.js';

/* ------------------------------------------------- leverancierskeuze

   De modelleverancier is een instelling, geen aanname in de code. Wat er ook
   gekozen wordt: de bezoeker krijgt de naam, het land en de bewaarafspraak
   letterlijk te zien voordat hij begint. Daarom staan die drie hier naast de
   technische gegevens — ze horen bij elkaar en mogen nooit uit elkaar lopen.

   Kiezen met FML_PROVIDER. Voor alles behalve anthropic is FML_MODEL verplicht:
   modelnamen veranderen te vaak om ze hier te gokken.
*/
const PROVIDERS = {
  anthropic: {
    naam: 'Anthropic (Claude)',
    land: 'Verenigde Staten',
    url: 'https://api.anthropic.com/v1/messages',
    soort: 'anthropic',
    model: 'claude-opus-5',
  },
  xai: {
    naam: 'xAI (Grok)',
    land: 'Verenigde Staten',
    url: 'https://api.x.ai/v1/chat/completions',
    soort: 'openai-compat',
    model: null,
  },
  custom: {
    naam: process.env.FML_LEVERANCIER || 'onbekende leverancier',
    land: process.env.FML_LAND || 'onbekend',
    url: process.env.FML_API_URL || '',
    soort: process.env.FML_SOORT || 'openai-compat',
    model: null,
  },
};

const PROVIDER = PROVIDERS[process.env.FML_PROVIDER || 'anthropic'] || PROVIDERS.anthropic;
const MODEL = process.env.FML_MODEL || PROVIDER.model;
const API_URL = process.env.FML_API_URL || PROVIDER.url;
const API_KEY = process.env.FML_API_KEY || process.env.ANTHROPIC_API_KEY;

// Overschrijfbaar, want dit is wat de bezoeker te lezen krijgt. Staat er een
// EU-regio of een no-train-afspraak in het contract, zet het hier dan recht.
const LEVERANCIER = process.env.FML_LEVERANCIER || PROVIDER.naam;
const LAND = process.env.FML_LAND || PROVIDER.land;
const TRAINT = process.env.FML_TRAINT || 'nee, contractueel vastgelegd';

// Latency/kwaliteit-knop (alleen Anthropic). 'low' houdt een gespreksbeurt
// snel; zet hoger als blijkt dat het model items mist.
const EFFORT = process.env.FML_EFFORT || 'low';

const MAX_BEURTEN = 30;          // gebruikersbeurten per gesprek
const MAX_TEKEN = 2000;          // tekens per bericht
const MAX_PER_UUR = 40;          // verzoeken per IP per uur (~2 gesprekken)

// Aanspreekvorm: tooncalibratie. 'je' is warmer en gangbaar in de arbowereld,
// 'u' sluit aan bij de rest van de site. Eén woord wijzigen volstaat.
const AANSPREEKVORM = 'je';

// Demomodus: FML_STUB=1 draait de hele lus zonder model en zonder sleutel,
// met vaste antwoorden. Bedoeld om de interactie te bekijken en te testen —
// er komt geen enkele AI aan te pas en de teksten zijn verzonnen.
const STUB = process.env.FML_STUB === '1';

export function assistentAan() {
  return STUB || Boolean(API_KEY && API_URL && MODEL);
}

/* Wat de bezoeker te zien krijgt voordat hij iets intypt. De pagina verzint
   hier niets bij: alles komt hiervandaan, zodat de tekst op het scherm niet
   kan verouderen ten opzichte van waar het verkeer werkelijk heen gaat. */
export function assistentHerkomst() {
  if (STUB) {
    return {
      leverancier: 'niemand — demomodus met vaste antwoorden',
      land: 'nergens, dit blijft op deze computer',
      model: 'geen',
      bewaart: 'niets',
      traint: 'nee',
    };
  }
  return {
    leverancier: LEVERANCIER,
    land: LAND,
    model: MODEL,
    bewaart: 'niets — niet op onze server en niet in een dossier',
    traint: TRAINT,
  };
}

export function assistentStub() {
  return STUB;
}

const STUB_BEURTEN = [
  {
    antwoord:
      'Dank je. Dat klinkt als werk waarbij je veel op de been bent. Laten we het even niet over werk hebben: hoe zag gisteren eruit, van opstaan tot naar bed?',
    voorstellen: [
      { key: 'IV.h', score: 2, bron: 'werk', reden: 'veel lopen tijdens het werk, houdt het niet de hele dag vol' },
      { key: 'V.d', score: 2, bron: 'werk', reden: 'langdurig staan gaat moeizaam' },
    ],
  },
  {
    antwoord:
      'Dat is nuttig om te weten. En de boodschappen — hoe heb je die deze week gedaan?',
    voorstellen: [
      { key: 'I.a', score: 2, bron: 'dagelijks_leven', reden: 'kwam er gisteren niet toe om iets af te maken' },
      { key: 'IV.g', score: 1, bron: 'dagelijks_leven', reden: 'loopt elke dag een rondje met de hond' },
    ],
  },
  {
    antwoord:
      'Twee keer gaan omdat één volle tas te zwaar is — dat zegt meer dan een getal. Hoe ging het daarna, diezelfde avond?',
    voorstellen: [
      { key: 'IV.f', score: 3, bron: 'dagelijks_leven', reden: 'één volle tas boodschappen is al te zwaar' },
      { key: 'IV.e', score: 2, bron: 'dagelijks_leven', reden: 'incidenteel iets optillen lukt, met moeite' },
      { key: 'IV.a', score: 1, bron: 'dagelijks_leven', reden: 'handen en vingers werken normaal' },
    ],
  },
  {
    antwoord:
      'We hebben de zes rubrieken nu in grote lijnen gehad. Loop de lijst hiernaast even na en pas aan wat niet klopt — daarna kun je hem printen en meenemen.',
    voorstellen: [
      { key: 'I.f', score: 2, bron: 'dagelijks_leven', reden: 'alles kost meer tijd dan vroeger' },
      { key: 'III.a', score: 1, bron: 'werk', reden: 'hitte speelt geen rol in dit werk' },
    ],
    werktijden: { 'VI.a': 6 },
    klaar: true,
  },
];

function stubAntwoord(beurtNr) {
  const b = STUB_BEURTEN[Math.min(beurtNr, STUB_BEURTEN.length - 1)];
  return {
    ok: true,
    antwoord: b.antwoord,
    voorstellen: (b.voorstellen || []).map((v) => ({ bron: 'werk', ...v })),
    werktijden: b.werktijden || {},
    klaar: b.klaar === true,
  };
}

/* ------------------------------------------------------------ prompt */

function itemLijst() {
  return RUBRIEKEN.map((r) => {
    const items = r.items
      .map((it) => {
        const key = `${r.id}.${it.id}`;
        if (it.type === 'number') return `  ${key} = ${it.label} (getal, max ${it.max})`;
        return `  ${key} = ${it.label}${it.hint ? ` — ${it.hint}` : ''}`;
      })
      .join('\n');
    return `Rubriek ${r.id}. ${r.titel}\n${items}`;
  }).join('\n\n');
}

const SYSTEEM = `Je bent de gespreksassistent van [de Kunst van Werken], een arbodienst. Je helpt iemand die (deels) niet kan werken om zijn mogelijkheden en beperkingen op een rij te zetten, als voorbereiding op het gesprek met de bedrijfsarts. Je voert dat gesprek in het Nederlands en spreekt de persoon aan met "${AANSPREEKVORM}".

WAT JE WEL DOET
- Je stelt één korte vraag tegelijk en vraagt door op wat iemand vertelt.
- Je vraagt naar concrete situaties: hoe een gewone werkdag eruitziet, wat er gisteren wel en niet lukte, waar iemand tegenaan loopt. Uit die verhalen leid je af welke items uit de lijst hieronder aan de orde zijn.
- Je houdt je antwoorden kort: twee tot vier zinnen, gewone taal, geen vaktermen zonder uitleg.
- Je werkt de lijst bij met de tool stel_scores_voor, in dezelfde beurt als je tekstantwoord.

HET DAGVERHAAL — DE KERN VAN DIT GESPREK
Vraag net zo goed naar gewone dagelijkse dingen als naar werk: boodschappen doen, koken, het huis schoonmaken, de was, de hond uitlaten, kinderen naar school brengen, een verjaardag, wat iemand 's avonds doet. Dat is geen small talk maar de beste manier om te zien wat iemand aankan.

Waarom dat werkt: vraag je "kun je tien kilo tillen?", dan krijg je een antwoord over iemands zelfbeeld. Vraag je "hoe deed je de boodschappen deze week?", dan krijg je gedrag — "mijn zus haalt ze", "ik ga twee keer want één volle tas is te zwaar", "ik parkeer zo dicht mogelijk bij de deur". Dat is waarneembaar, en de bezoeker hoeft zichzelf niet te beoordelen.

Zo doe je dat:
- Loop een gewone dag langs: opstaan, ochtend, middag, avond. Vraag wat iemand die dag daadwerkelijk heeft gedaan, niet wat hij denkt te kunnen.
- Vraag ook naar wat wél lukt en naar wat iemand leuk vindt. Een hobby, de tuin, sporten, gamen: dat zegt evenveel over belastbaarheid als de dingen die niet gaan.
- Vraag hoe iets ging, niet of het ging. "Hoe was dat de volgende dag?" haalt herstelbehoefte boven water die iemand zelf niet noemt.
- Merk je een tegenstelling — iemand zegt zich niet te kunnen concentreren maar leest elke avond een uur — dan confronteer je daar niet mee. Je vraagt neutraal door ("hoe gaat dat lezen?") en noteert beide. Je bent geen controleur; je zoekt naar wat er nog wél kan.

VAN DAGELIJKS LEVEN NAAR EEN SCORE — VOORZICHTIG
De items gaan over werk, en werk is iets anders dan thuis. Eén keer per week een tas boodschappen is geen "frequent tillen tijdens werk"; een uur tuinieren op je eigen tempo is geen werkdag. Je rekent dagelijkse activiteiten dus niet één op één om naar werkbelasting.
- Gebruik het dagverhaal als aanwijzing. Is die aanwijzing sterk genoeg voor een score, dan geef je hem met bron "dagelijks_leven". Is hij dat niet, dan vraag je door naar de werksituatie.
- Bij twijfel scoor je lager dan je geneigd bent, of je scoort niet en vraagt door.
- Iets wat thuis in eigen tempo en met rustmomenten lukt, zegt weinig over acht uur achter elkaar met een baas erbij. Houd dat verschil vast.

WAT JE NIET DOET
- Je stelt geen diagnose, geeft geen medisch advies en vraagt niet naar ziektebeelden, klachten of behandelingen. Het gaat over functioneren — in werk en in het dagelijks leven — nooit over wat iemand mankeert. Als iemand zelf een diagnose noemt, ga je er niet op in en leid je er geen beperkingen uit af; je vraagt wat er concreet niet lukt.
- Je beoordeelt niet en je bepaalt niets. Een formele FML kan alleen een verzekeringsarts van het UWV opmaken, een inzetbaarheidsprofiel alleen de bedrijfsarts. Wat hier ontstaat is een concept dat de persoon zelf meeneemt naar dat gesprek.
- Je stuurt niet. Vraag nooit "dat zal wel zwaar zijn, of niet?" maar "hoe ging dat?". Je scoort alleen wat iemand zelf heeft verteld — nooit wat je aanneemt, en nooit een heel cluster items omdat er één ding werd genoemd.
- Je gaat niet mee in onderwerpen die niets met functioneren te maken hebben. Dagelijkse bezigheden horen er juist wél bij; een vraag over het nieuws of een verzoek om huiswerk niet — dan breng je het gesprek vriendelijk terug.
- Je vraagt niet naar iemands privéleven verder dan wat hij doet op een dag. Geen relaties, geen financiën, geen huishoudsamenstelling. Alleen bezigheden.

SCOREN
De schaal per item is: 1 = niet beperkt, 2 = beperkt, 3 = sterk beperkt. Score 0 betekent "onbekend / nog niet besproken" en gebruik je ook om een eerdere score in te trekken als de persoon je corrigeert.
- Twijfel je? Dan stel je geen score voor maar vraag je door.
- Zegt iemand dat iets juist wél goed gaat, dan is dat een 1 — dat is even nuttig als een beperking en de bedrijfsarts wil dat ook weten.
- Werkt iemand je tegen op een eerdere score ("nee, tillen gaat prima"), dan werk je die score direct bij.
- uren_per_dag en uren_per_week vul je alleen als de persoon zelf een aantal uren heeft genoemd. Anders laat je ze null.
- Zet klaar op true zodra de zes rubrieken in grote lijnen langs zijn geweest. Je zegt er dan bij dat de lijst nog nagelopen en aangepast kan worden, en dat die daarna geprint of meegenomen kan worden naar de bedrijfsarts.

OPBOUW VAN HET GESPREK
Begin bij het werk zelf ("wat voor werk doe ${AANSPREEKVORM === 'u' ? 'u' : 'je'}, en hoe ziet een gewone werkdag eruit?"). Stap daarna over op een gewone dag thuis — dat is vaak het moment waarop het gesprek losser wordt en er meer boven tafel komt dan bij vragen over werk. Wissel daarna af tussen beide.

Laat de rubrieken volgen uit wat er verteld wordt. Loop de lijst niet af als een vragenlijst — dat is precies wat het formulier al doet, en waarom iemand met jou praat in plaats van met het formulier. Mist er aan het eind een rubriek die er echt toe doet, dan vraag je daar gericht naar.

ALS HET ZWAAR WORDT
Merk je dat iemand het emotioneel moeilijk heeft, dan erken je dat en laat je de lijst even los. Gaat het over zelfdoding of acute nood, dan stop je met scoren en wijs je op 113 Zelfmoordpreventie (113 of 0800-0113) of de eigen huisarts.

DE ITEMS
Gebruik uitsluitend deze sleutels:

${itemLijst()}`;

/* -------------------------------------------------------------- tool */

const TOOL = {
  name: 'stel_scores_voor',
  description:
    'Werk de FML-conceptlijst bij op grond van wat de persoon zojuist heeft verteld. Roep dit aan in dezelfde beurt als je tekstantwoord, en alleen voor items die daadwerkelijk aan de orde kwamen.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'Items die je wilt bijwerken. Leeg als er niets te scoren viel.',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string', enum: SCORE_KEYS, description: 'Itemsleutel, bv. IV.f' },
            score: {
              type: 'integer',
              enum: [0, 1, 2, 3],
              description: '0 = intrekken/onbekend, 1 = niet beperkt, 2 = beperkt, 3 = sterk beperkt',
            },
            reden: {
              type: 'string',
              description:
                'Korte onderbouwing in de woorden van de persoon zelf, één zin. Wordt aan de gebruiker getoond.',
            },
            bron: {
              type: 'string',
              enum: ['werk', 'dagelijks_leven'],
              description:
                'Waar de aanwijzing vandaan komt: uit wat iemand over zijn werk vertelde, of uit het dagverhaal. Maakt zichtbaar wanneer een score op dagelijkse bezigheden berust en dus voorzichtiger gelezen moet worden.',
            },
          },
          required: ['key', 'score', 'reden', 'bron'],
          additionalProperties: false,
        },
      },
      uren_per_dag: {
        type: ['integer', 'null'],
        description: 'Maximaal aantal uren per dag, alleen als de persoon dit zelf noemde. Anders null.',
      },
      uren_per_week: {
        type: ['integer', 'null'],
        description: 'Maximaal aantal uren per week, alleen als de persoon dit zelf noemde. Anders null.',
      },
      klaar: {
        type: 'boolean',
        description: 'true zodra de zes rubrieken in grote lijnen besproken zijn.',
      },
    },
    required: ['items', 'uren_per_dag', 'uren_per_week', 'klaar'],
    additionalProperties: false,
  },
};

/* ------------------------------------------------------------- stand */

function standTekst(scores) {
  const gezet = FLAT_ITEMS.filter((i) => {
    const v = scores[i.key];
    return typeof v === 'number' && v > 0;
  });
  if (!gezet.length) return 'Er staat nog niets ingevuld.';
  return gezet
    .map((i) => {
      const v = scores[i.key];
      if (i.type === 'number') return `${i.key} ${i.label}: ${v}`;
      return `${i.key} ${i.label}: ${SCORE_LABELS[v]}`;
    })
    .join('\n');
}

/* ------------------------------------------------------- rate limiting */

const rateLog = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const hits = (rateLog.get(ip) || []).filter((t) => now - t < 3600_000);
  hits.push(now);
  rateLog.set(ip, hits);
  if (rateLog.size > 5000) rateLog.clear();
  return hits.length > MAX_PER_UUR;
}

/* ---------------------------------------------------------- adapters

   Twee vormen dekken vrijwel de hele markt: de Messages API van Anthropic, en
   de OpenAI-compatibele chat/completions die onder meer xAI aanbiedt. Beide
   geven hetzelfde terug: { tekst, invoer, geweigerd }. De rest van dit bestand
   weet niet welke leverancier er draait — en de validatie hieronder gaat er
   sowieso van uit dat het antwoord onbetrouwbaar is.
*/

async function roepModelAan(messages) {
  return PROVIDER.soort === 'anthropic'
    ? viaAnthropic(messages)
    : viaOpenAiCompat(messages);
}

async function haal(url, headers, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API gaf ${res.status}`);
  return res.json();
}

async function viaAnthropic(messages) {
  const data = await haal(
    API_URL,
    { 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
    {
      model: MODEL,
      max_tokens: 4000,
      thinking: { type: 'adaptive' },
      output_config: { effort: EFFORT },
      system: [{ type: 'text', text: SYSTEEM, cache_control: { type: 'ephemeral' } }],
      tools: [TOOL],
      messages,
    },
  );
  if (data.stop_reason === 'refusal') return { geweigerd: true };

  const blokken = Array.isArray(data.content) ? data.content : [];
  const call = blokken.find((b) => b.type === 'tool_use' && b.name === TOOL.name);
  logVerbruik(data.usage?.input_tokens, data.usage?.output_tokens);
  return {
    tekst: blokken.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim(),
    invoer: call?.input || {},
  };
}

async function viaOpenAiCompat(messages) {
  const data = await haal(
    API_URL,
    { authorization: `Bearer ${API_KEY}` },
    {
      model: MODEL,
      max_tokens: 4000,
      messages: [{ role: 'system', content: SYSTEEM }, ...messages],
      tools: [
        {
          type: 'function',
          function: {
            name: TOOL.name,
            description: TOOL.description,
            parameters: TOOL.input_schema,
          },
        },
      ],
      tool_choice: 'auto',
    },
  );

  const bericht = data.choices?.[0]?.message || {};
  if (data.choices?.[0]?.finish_reason === 'content_filter') return { geweigerd: true };

  const call = (bericht.tool_calls || []).find((c) => c.function?.name === TOOL.name);
  let invoer = {};
  if (call?.function?.arguments) {
    // Argumenten komen als string terug en kunnen afgekapt of ongeldig zijn.
    try {
      invoer = JSON.parse(call.function.arguments);
    } catch {
      console.error('fml-gesprek: tool-argumenten niet te lezen, beurt zonder voorstellen');
    }
  }
  logVerbruik(data.usage?.prompt_tokens, data.usage?.completion_tokens);
  return { tekst: String(bericht.content || '').trim(), invoer };
}

function logVerbruik(inTok, uitTok) {
  // Alleen tellers, nooit inhoud.
  console.log(`fml-gesprek: beurt ok (in ${inTok ?? '?'}, uit ${uitTok ?? '?'})`);
}

/* ----------------------------------------------------------- handler */

function schoon(v, max) {
  return String(v ?? '').trim().slice(0, max);
}

export async function handleGesprek(body, req, res, CORS) {
  const reply = (code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json', ...CORS });
    res.end(JSON.stringify(obj));
  };

  if (!assistentAan()) {
    return reply(503, { ok: false, error: 'De assistent staat uit op deze server.' });
  }
  if (!MODEL) {
    console.error(`fml-gesprek: FML_MODEL ontbreekt voor provider ${PROVIDER.naam}`);
    return reply(503, { ok: false, error: 'De assistent is niet volledig ingesteld.' });
  }

  let data;
  try {
    data = JSON.parse(body);
  } catch {
    return reply(400, { ok: false, error: 'ongeldige aanvraag' });
  }

  const ip = String(
    req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '?',
  )
    .split(',')[0]
    .trim();
  if (rateLimited(ip)) {
    return reply(429, { ok: false, error: 'Te veel verzoeken. Probeer het over een uur opnieuw.' });
  }

  const beurten = Array.isArray(data.beurten) ? data.beurten : [];
  if (STUB) {
    const n = beurten.filter((b) => b?.rol === 'gebruiker').length - 1;
    return reply(200, stubAntwoord(Math.max(0, n)));
  }
  if (!beurten.length) return reply(400, { ok: false, error: 'geen bericht ontvangen' });
  if (beurten.filter((b) => b?.rol === 'gebruiker').length > MAX_BEURTEN) {
    return reply(400, {
      ok: false,
      error: 'Dit gesprek is lang genoeg — loop de lijst na en print hem, of begin opnieuw.',
    });
  }

  const messages = beurten
    .map((b) => ({
      role: b?.rol === 'assistent' ? 'assistant' : 'user',
      content: schoon(b?.tekst, MAX_TEKEN),
    }))
    .filter((m) => m.content);
  // De geschiedenis moet met de gebruiker beginnen én eindigen: de stand
  // hieronder is een system-bericht en dat mag alleen ná een gebruikersbeurt.
  if (!messages.length || messages[0].role !== 'user' || messages.at(-1).role !== 'user') {
    return reply(400, { ok: false, error: 'ongeldige gespreksgeschiedenis' });
  }

  // De actuele stand als losse systeemregel achter de geschiedenis: het model
  // ziet wat er nu op het scherm staat zonder dat we tool_use-blokken hoeven
  // te herhalen, en de gecachete prefix hierboven blijft intact.
  const scores = data.scores && typeof data.scores === 'object' ? data.scores : {};
  messages.push({
    role: 'system',
    content: `Stand van de lijst op dit moment:\n${standTekst(scores)}`,
  });

  let ruw;
  try {
    ruw = await roepModelAan(messages);
  } catch (e) {
    // Bewust geen responsebody loggen: daar kan gespreksinhoud in staan.
    console.error('fml-gesprek: model onbereikbaar:', e.message);
    return reply(502, { ok: false, error: 'De assistent is even niet bereikbaar.' });
  }

  if (ruw.geweigerd) {
    return reply(200, {
      ok: true,
      antwoord: 'Hier kan ik niet op ingaan. Zullen we teruggaan naar hoe je dagen gaan?',
      voorstellen: [],
      werktijden: {},
      klaar: false,
    });
  }

  const tekst = ruw.tekst;
  const invoer = ruw.invoer || {};

  const voorstellen = (Array.isArray(invoer.items) ? invoer.items : [])
    .filter((i) => SCORE_KEYS.includes(i?.key) && Number.isInteger(i?.score) && i.score >= 0 && i.score <= 3)
    .map((i) => ({
      key: i.key,
      score: i.score,
      reden: schoon(i.reden, 300),
      bron: i.bron === 'dagelijks_leven' ? 'dagelijks_leven' : 'werk',
    }));

  const werktijden = {};
  if (Number.isInteger(invoer.uren_per_dag) && invoer.uren_per_dag > 0) {
    werktijden['VI.a'] = Math.min(12, invoer.uren_per_dag);
  }
  if (Number.isInteger(invoer.uren_per_week) && invoer.uren_per_week > 0) {
    werktijden['VI.b'] = Math.min(60, invoer.uren_per_week);
  }

  return reply(200, {
    ok: true,
    antwoord: tekst || 'Vertel eens verder?',
    voorstellen,
    werktijden,
    klaar: invoer.klaar === true,
  });
}
