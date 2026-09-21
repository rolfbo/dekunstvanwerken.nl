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

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.FML_MODEL || 'claude-opus-5';
// Latency/kwaliteit-knop. 'low' houdt een gespreksbeurt snel; zet hoger als
// blijkt dat het model items mist. Zie instructions/fml-assistent.md.
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
  return STUB || Boolean(process.env.ANTHROPIC_API_KEY);
}

export function assistentStub() {
  return STUB;
}

const STUB_BEURTEN = [
  {
    antwoord:
      'Dank je. Dat klinkt als werk waarbij je veel op de been bent. Wat ging er gisteren niet zoals je wilde?',
    voorstellen: [
      { key: 'IV.h', score: 2, reden: 'veel lopen tijdens het werk, houdt het niet de hele dag vol' },
      { key: 'V.d', score: 2, reden: 'langdurig staan gaat moeizaam' },
    ],
  },
  {
    antwoord:
      'Helder. En hoe gaat het met tillen en bukken — zijn dat dingen die je nog doet op een dag?',
    voorstellen: [
      { key: 'IV.f', score: 3, reden: 'zwaar tillen lukt niet meer' },
      { key: 'IV.d', score: 2, reden: 'frequent bukken geeft klachten' },
      { key: 'IV.a', score: 1, reden: 'handen en vingers werken normaal' },
    ],
  },
  {
    antwoord:
      'Dat noteer ik. Even iets anders: hoe gaat het met de concentratie en het overzicht op een werkdag?',
    voorstellen: [
      { key: 'I.a', score: 2, reden: 'aandacht vasthouden kost moeite in de middag' },
      { key: 'I.f', score: 2, reden: 'werktempo ligt lager dan voorheen' },
      { key: 'II.f', score: 1, reden: 'samenwerken met collega’s gaat goed' },
    ],
  },
  {
    antwoord:
      'We hebben de zes rubrieken nu in grote lijnen gehad. Loop de lijst hiernaast even na en pas aan wat niet klopt — daarna kun je hem printen en meenemen.',
    voorstellen: [{ key: 'III.a', score: 1, reden: 'hitte speelt geen rol in dit werk' }],
    werktijden: { 'VI.a': 6 },
    klaar: true,
  },
];

function stubAntwoord(beurtNr) {
  const b = STUB_BEURTEN[Math.min(beurtNr, STUB_BEURTEN.length - 1)];
  return {
    ok: true,
    antwoord: b.antwoord,
    voorstellen: b.voorstellen || [],
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

WAT JE NIET DOET
- Je stelt geen diagnose, geeft geen medisch advies en vraagt niet naar ziektebeelden, klachten of behandelingen. Het gaat uitsluitend over functioneren in werk. Als iemand zelf een diagnose noemt, ga je er niet op in en leid je er geen beperkingen uit af — je vraagt wat er in het werk niet lukt.
- Je beoordeelt niet en je bepaalt niets. Een formele FML kan alleen een verzekeringsarts van het UWV opmaken, een inzetbaarheidsprofiel alleen de bedrijfsarts. Wat hier ontstaat is een concept dat de persoon zelf meeneemt naar dat gesprek.
- Je stuurt niet. Vraag nooit "dat zal wel zwaar zijn, of niet?" maar "hoe ging dat?". Je scoort alleen wat iemand zelf heeft verteld — nooit wat je aanneemt, en nooit een heel cluster items omdat er één ding werd genoemd.
- Je praat niet over andere onderwerpen dan dit. Bij een vraag die er niets mee te maken heeft breng je het gesprek vriendelijk terug.

SCOREN
De schaal per item is: 1 = niet beperkt, 2 = beperkt, 3 = sterk beperkt. Score 0 betekent "onbekend / nog niet besproken" en gebruik je ook om een eerdere score in te trekken als de persoon je corrigeert.
- Twijfel je? Dan stel je geen score voor maar vraag je door.
- Zegt iemand dat iets juist wél goed gaat, dan is dat een 1 — dat is even nuttig als een beperking en de bedrijfsarts wil dat ook weten.
- Werkt iemand je tegen op een eerdere score ("nee, tillen gaat prima"), dan werk je die score direct bij.
- uren_per_dag en uren_per_week vul je alleen als de persoon zelf een aantal uren heeft genoemd. Anders laat je ze null.
- Zet klaar op true zodra de zes rubrieken in grote lijnen langs zijn geweest. Je zegt er dan bij dat de lijst nog nagelopen en aangepast kan worden, en dat die daarna geprint of meegenomen kan worden naar de bedrijfsarts.

OPBOUW VAN HET GESPREK
Begin bij het werk zelf ("wat voor werk doe ${AANSPREEKVORM === 'u' ? 'u' : 'je'}, en hoe ziet een gewone werkdag eruit?") en laat de rubrieken volgen uit wat er verteld wordt. Loop de lijst niet af als een vragenlijst — dat is precies wat het formulier al doet. Mist er aan het eind een rubriek die er echt toe doet, dan vraag je daar gericht naar.

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
          },
          required: ['key', 'score', 'reden'],
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

  let antwoord;
  try {
    const res2 = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        thinking: { type: 'adaptive' },
        output_config: { effort: EFFORT },
        system: [
          { type: 'text', text: SYSTEEM, cache_control: { type: 'ephemeral' } },
        ],
        tools: [TOOL],
        messages,
      }),
    });
    if (!res2.ok) {
      // Bewust geen responsebody loggen: daar kan gespreksinhoud in staan.
      console.error(`fml-gesprek: API gaf ${res2.status}`);
      return reply(502, { ok: false, error: 'De assistent is even niet bereikbaar.' });
    }
    antwoord = await res2.json();
  } catch (e) {
    console.error('fml-gesprek: netwerkfout:', e.name);
    return reply(502, { ok: false, error: 'De assistent is even niet bereikbaar.' });
  }

  if (antwoord.stop_reason === 'refusal') {
    return reply(200, {
      ok: true,
      antwoord:
        'Hier kan ik niet op ingaan. Zullen we teruggaan naar wat er in je werk wel en niet lukt?',
      voorstellen: [],
      klaar: false,
    });
  }

  const blokken = Array.isArray(antwoord.content) ? antwoord.content : [];
  const tekst = blokken
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  const call = blokken.find((b) => b.type === 'tool_use' && b.name === TOOL.name);
  const invoer = call?.input || {};

  const voorstellen = (Array.isArray(invoer.items) ? invoer.items : [])
    .filter((i) => SCORE_KEYS.includes(i?.key) && Number.isInteger(i?.score) && i.score >= 0 && i.score <= 3)
    .map((i) => ({ key: i.key, score: i.score, reden: schoon(i.reden, 300) }));

  const werktijden = {};
  if (Number.isInteger(invoer.uren_per_dag) && invoer.uren_per_dag > 0) {
    werktijden['VI.a'] = Math.min(12, invoer.uren_per_dag);
  }
  if (Number.isInteger(invoer.uren_per_week) && invoer.uren_per_week > 0) {
    werktijden['VI.b'] = Math.min(60, invoer.uren_per_week);
  }

  // Alleen tellers, nooit inhoud.
  console.log(
    `fml-gesprek: beurt ok (in ${antwoord.usage?.input_tokens ?? '?'}, uit ${
      antwoord.usage?.output_tokens ?? '?'
    }, voorstellen ${voorstellen.length})`,
  );

  return reply(200, {
    ok: true,
    antwoord: tekst || 'Vertel eens verder?',
    voorstellen,
    werktijden,
    klaar: invoer.klaar === true,
  });
}
