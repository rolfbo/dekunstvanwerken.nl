/*
 * IZP-assistent — gespreksmodule voor de IZP concept-tool
 * ------------------------------------------------------------------
 * De werknemer krijgt van de bedrijfsarts een persoonlijke code. Met die
 * code mag hij een gesprek voeren met een taalmodel dat de zes rubrieken
 * van het inzetbaarheidsprofiel langsloopt en een concepttekst voorstelt.
 * De bedrijfsarts beoordeelt dat concept en stelt het IZP vast.
 *
 * Privacy-uitgangspunten (zie privacybeleid.html):
 *   - Het gesprek wordt NIET op schijf bewaard. Het staat alleen in het
 *     geheugen van dit proces en verdwijnt bij het einde van de sessie
 *     of bij een herstart van de service.
 *   - Op schijf komt alleen het toestemmingsbewijs: hash van de code,
 *     tijdstip en de versie van de toestemmingstekst (AVG art. 7 lid 1).
 *   - De naam van de werknemer wordt door de pagina niet meegestuurd.
 *
 * Verwerking gebeurt via Claude op Google Vertex AI in een EU-regio.
 */
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { join } from 'node:path';

// Versie van de toestemmingstekst op izp.html. Verhoog dit nummer zodra
// de tekst inhoudelijk wijzigt; het wordt per toestemming vastgelegd.
export const CONSENT_VERSIE = '2026-09-16.1';

const MODEL = process.env.VERTEX_MODEL || 'claude-opus-5';
const MAX_BEURTEN = Number(process.env.IZP_MAX_BEURTEN || 30);
const SESSIE_MAX_MS = 2 * 60 * 60 * 1000; // 2 uur
const MAX_BERICHT = 4000;                 // tekens per gebruikersbericht

const RUBRIEK_IDS = ['I', 'II', 'III', 'IV', 'V', 'VI'];

const SYSTEEMPROMPT = `Je bent de voorbereidingsassistent van [de Kunst van Werken], een Nederlandse arbodienst. Je voert een gesprek met een werknemer die binnenkort bij de bedrijfsarts komt, en je vult op basis van dat gesprek een concept-inzetbaarheidsprofiel (IZP) in.

JE ROL
- Je stelt vragen en schrijft op. Je beoordeelt niet en je stelt niets vast.
- Het definitieve IZP wordt opgesteld door de bedrijfsarts. Zeg dat ook als de werknemer vraagt of dit "geldig" is.
- Je geeft geen medisch advies, geen diagnose en geen uitspraak over arbeidsongeschiktheid, verzuim of rechten op een uitkering.

GEEN DIAGNOSES IN HET PROFIEL
- Een IZP beschrijft uitsluitend wat iemand in werk wél en niet kan. De werkgever krijgt dit onder ogen; medische gegevens horen er niet in.
- Noemt de werknemer een aandoening, behandeling of medicijn ("hernia", "burn-out", "chemo"), gebruik dat dan alleen om door te vragen naar de gevolgen voor het werk. Zet het nooit in de voorgestelde tekst.
- Fout: "Heeft een hernia, kan daardoor niet lang zitten." Goed: "Kan ongeveer 30 minuten achtereen zitten, daarna afwisseling met staand of lopend werk nodig."
- Gebruik geen namen van personen, werkgevers of collega's in de tekst.

HET GESPREK
- Spreek Nederlands, duidelijk en vriendelijk, zonder jargon. Spreek de werknemer aan met "je".
- Stel één vraag tegelijk en houd je berichten kort (hooguit een paar zinnen).
- Begin met een open vraag over hoe een gewone werkdag eruitziet en wat daarin nu niet lukt.
- Loop daarna de rubrieken langs die nog leeg zijn. Sla rubrieken die duidelijk niet spelen kort over ("Fysieke omgeving zoals hitte, lawaai of stof — speelt dat bij jou een rol?").
- Vraag door naar concrete maten: hoe lang achtereen, hoeveel kilo, hoe vaak per dag, wat helpt.
- Rubriek VI: vraag naar het aantal uren per dag en per week dat op dit moment haalbaar is, en naar nacht-, ploegen- of onregelmatige diensten.
- De werknemer bepaalt het tempo. Wil hij stoppen of iets niet bespreken, dan accepteer je dat zonder aandringen.

DE ZES RUBRIEKEN
I. Persoonlijk functioneren — concentratie, aandacht verdelen, geheugen, inzicht in eigen kunnen, werktempo, zelfstandig werken.
II. Sociaal functioneren — zien, horen, spreken, omgaan met conflicten, samenwerken, klantcontact, omgaan met leiding, vervoer naar werk.
III. Aanpassing aan fysieke omgevingseisen — hitte, koude, tocht, stof, rook, dampen, lawaai, trillingen, irriterende stoffen, beschermingsmiddelen.
IV. Dynamische handelingen — hand- en fijne motoriek, reiken, buigen, tillen, dragen, lopen, trappen, klimmen, knielen, beeldschermwerk, autorijden, fietsen.
V. Statische houdingen — lang zitten, lang staan, geknield of gehurkt werken, gebogen of gedraaid werken, boven schouderhoogte werken.
VI. Werktijden — maximaal aantal uren per dag en per week, nachtdienst, ploegendienst, onregelmatig werk.

HET VOORSTEL
- Roep de tool stel_izp_voor aan zodra je genoeg weet voor één of meer rubrieken, en in elk geval aan het einde van het gesprek. Je mag de tool meerdere keren gebruiken; elk voorstel vervangt het vorige.
- Schrijf per rubriek een paar korte, feitelijke zinnen in de derde persoon, zoals een bedrijfsarts ze zou noteren: "Kan lichte administratieve taken uitvoeren. Tillen boven 5 kg is niet mogelijk. Trappenlopen lukt eenmaal per dag."
- Vul alleen rubrieken in waarover de werknemer daadwerkelijk iets heeft verteld. Verzin niets en vul geen gaten op.
- Is er over een rubriek gezegd dat er geen beperkingen zijn, schrijf dat dan ook zo op ("Geen beperkingen gemeld.").
- Vertel na het voorstel dat de tekst rechts in het formulier verschijnt, dat de werknemer hem zelf kan aanpassen en dat de bedrijfsarts hem beoordeelt.

VEILIGHEID
- Gaat het gesprek ergens anders over dan werk en belastbaarheid, breng het dan terug naar het IZP. Voor andere vragen verwijs je naar info@dekunstvanwerken.nl.
- Hoor je signalen van acute nood, zoals gedachten aan zelfdoding of onveiligheid thuis, stop dan met het invullen. Zeg dat je daar niet de juiste hulp voor bent en verwijs naar de bedrijfsarts, de huisarts, buiten kantooruren de huisartsenpost, of 113 (113.nl, gratis 0800-0113).`;

const TOOLS = [
  {
    name: 'stel_izp_voor',
    description:
      'Zet de tot nu toe besproken mogelijkheden en beperkingen in het concept-IZP van de werknemer. ' +
      'Alleen rubrieken opnemen waarover iets is verteld. Nooit diagnoses, namen of medische gegevens.',
    strict: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        rubrieken: {
          type: 'object',
          additionalProperties: false,
          description: 'Per rubriek de voorgestelde tekst. Laat een rubriek weg als er niets over is gezegd.',
          properties: Object.fromEntries(
            RUBRIEK_IDS.map((id) => [id, { type: 'string', description: `Tekst voor rubriek ${id}.` }]),
          ),
          required: [],
        },
        uren_per_dag: {
          type: ['integer', 'null'],
          description: 'Maximaal haalbaar aantal uren per dag, of null als dit niet is besproken.',
        },
        uren_per_week: {
          type: ['integer', 'null'],
          description: 'Maximaal haalbaar aantal uren per week, of null als dit niet is besproken.',
        },
      },
      required: ['rubrieken', 'uren_per_dag', 'uren_per_week'],
    },
  },
];

// ------------------------------------------------------------- codes
const CODES_FILE = (stateDir) => join(stateDir, 'izp-codes.json');
const CONSENT_FILE = (stateDir) => join(stateDir, 'izp-consent.jsonl');

export function hashCode(code) {
  return createHash('sha256').update(String(code).trim().toUpperCase()).digest('hex');
}

export function leesCodes(stateDir) {
  try {
    return JSON.parse(readFileSync(CODES_FILE(stateDir), 'utf8'));
  } catch {
    return {};
  }
}

export function schrijfCodes(stateDir, codes) {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(CODES_FILE(stateDir), JSON.stringify(codes, null, 2) + '\n', { mode: 0o600 });
}

/** Controleert een code zonder te verraden waarom hij niet werkt. */
function controleerCode(stateDir, code) {
  const codes = leesCodes(stateDir);
  const hash = hashCode(code);
  const rec = codes[hash];
  if (!rec) return { ok: false };
  if (rec.verloopt && Date.parse(rec.verloopt) < Date.now()) return { ok: false };
  if ((rec.gebruikt || 0) >= (rec.max || 3)) return { ok: false };
  return { ok: true, hash, codes, rec };
}

// ---------------------------------------------------------- sessies
// Alleen in het geheugen: token -> { codeHash, beurten, transcript, start }
const sessies = new Map();

function opruimen() {
  const nu = Date.now();
  for (const [token, s] of sessies) {
    if (nu - s.start > SESSIE_MAX_MS) sessies.delete(token);
  }
}

function vindSessie(token) {
  opruimen();
  if (typeof token !== 'string' || token.length !== 64) return null;
  const s = sessies.get(token);
  if (!s) return null;
  // Vergelijk in constante tijd om te voorkomen dat tokens te raden zijn.
  const a = Buffer.from(token);
  const b = Buffer.from(s.token);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return s;
}

// ----------------------------------------------------------- model
let clientPromise = null;

/**
 * Twee routes:
 *   'vertex'    Claude via Google Vertex AI in een EU-regio. Dit is de route
 *               voor echt gebruik: de verwerking blijft binnen de EER, zoals
 *               het privacybeleid zegt.
 *   'anthropic' Claude rechtstreeks via een API-sleutel van Anthropic. Handig
 *               om snel te proberen, maar de verwerking vindt buiten de EER
 *               plaats. Alleen gebruiken met verzonnen testgegevens, nooit
 *               met echte werknemers.
 */
export const PROVIDER =
  (process.env.VERTEX_PROJECT_ID && process.env.VERTEX_REGION) ? 'vertex'
  : process.env.ANTHROPIC_API_KEY ? 'anthropic'
  : null;

/** Laadt de client pas bij het eerste gesprek, zodat de MCP-server zonder de
 *  npm-dependencies blijft draaien als de assistent uit staat. */
async function getClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      if (PROVIDER === 'vertex') {
        const { AnthropicVertex } = await import('@anthropic-ai/vertex-sdk');
        return new AnthropicVertex({
          projectId: process.env.VERTEX_PROJECT_ID,
          region: process.env.VERTEX_REGION,
        });
      }
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      return new Anthropic(); // leest ANTHROPIC_API_KEY
    })();
  }
  return clientPromise;
}

export function assistentIngeschakeld() {
  return PROVIDER !== null;
}

if (PROVIDER === 'anthropic') {
  console.warn(
    'izp: TESTMODUS — Claude wordt rechtstreeks bij Anthropic afgenomen, ' +
    'buiten de EER. Niet gebruiken met gegevens van echte werknemers.',
  );
}

function schoonVoorstel(input) {
  const rubrieken = {};
  const bron = (input && input.rubrieken) || {};
  for (const id of RUBRIEK_IDS) {
    const tekst = typeof bron[id] === 'string' ? bron[id].trim().slice(0, 1500) : '';
    if (tekst) rubrieken[id] = tekst;
  }
  const uren = (v, max) => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 && n <= max ? n : null;
  };
  const voorstel = {
    rubrieken,
    ud: uren(input && input.uren_per_dag, 12),
    uw: uren(input && input.uren_per_week, 60),
  };
  const leeg = Object.keys(rubrieken).length === 0 && voorstel.ud === null && voorstel.uw === null;
  return leeg ? null : voorstel;
}

/** Eén beurt: stuurt het gesprek naar het model en geeft tekst + voorstel terug. */
async function vraagModel(transcript) {
  const client = await getClient();
  let voorstel = null;
  let tekst = '';

  // Hooguit twee rondes: eventueel een tool-aanroep, daarna het antwoord.
  for (let ronde = 0; ronde < 2; ronde++) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: 'low' },
      system: [{ type: 'text', text: SYSTEEMPROMPT, cache_control: { type: 'ephemeral' } }],
      messages: transcript,
      tools: TOOLS,
    });

    tekst = res.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    const toolCalls = res.content.filter((b) => b.type === 'tool_use');
    transcript.push({ role: 'assistant', content: res.content });

    if (!toolCalls.length) break;

    for (const call of toolCalls) {
      if (call.name === 'stel_izp_voor') voorstel = schoonVoorstel(call.input) || voorstel;
    }
    transcript.push({
      role: 'user',
      content: toolCalls.map((call) => ({
        type: 'tool_result',
        tool_use_id: call.id,
        content: 'Het voorstel staat nu in het formulier van de werknemer.',
      })),
    });
  }

  return { tekst, voorstel };
}

// -------------------------------------------------------- endpoints
export function handleIzpStart(body, req, res, ctx) {
  const { reply, stateDir, rateLimited, clientIp } = ctx;
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    return reply(400, { ok: false, error: 'ongeldige aanvraag' });
  }
  if (!assistentIngeschakeld()) {
    return reply(503, { ok: false, error: 'de assistent is op dit moment niet beschikbaar' });
  }
  if (rateLimited('izp-start', clientIp, 10)) {
    return reply(429, { ok: false, error: 'te veel pogingen; probeer het later opnieuw' });
  }
  if (data.toestemming !== true) {
    return reply(400, { ok: false, error: 'toestemming is vereist' });
  }
  const check = controleerCode(stateDir, data.code || '');
  if (!check.ok) {
    return reply(403, { ok: false, error: 'deze code werkt niet (meer). Vraag je bedrijfsarts om een nieuwe.' });
  }

  // Toestemmingsbewijs: geen inhoud, alleen dát er toestemming was.
  try {
    mkdirSync(stateDir, { recursive: true });
    appendFileSync(
      CONSENT_FILE(stateDir),
      JSON.stringify({
        tijd: new Date().toISOString(),
        codeHash: check.hash,
        consentVersie: CONSENT_VERSIE,
      }) + '\n',
    );
    check.rec.gebruikt = (check.rec.gebruikt || 0) + 1;
    check.rec.laatst = new Date().toISOString();
    schrijfCodes(stateDir, check.codes);
  } catch (e) {
    console.error('izp: toestemming vastleggen mislukt:', e.message);
    return reply(500, { ok: false, error: 'starten mislukt; probeer het later opnieuw' });
  }

  const token = randomBytes(32).toString('hex');
  sessies.set(token, {
    token,
    codeHash: check.hash,
    beurten: 0,
    transcript: [],
    start: Date.now(),
  });
  return reply(200, { ok: true, token, maxBeurten: MAX_BEURTEN, consentVersie: CONSENT_VERSIE });
}

export async function handleIzpGesprek(body, req, res, ctx) {
  const { reply, rateLimited, clientIp } = ctx;
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    return reply(400, { ok: false, error: 'ongeldige aanvraag' });
  }
  const sessie = vindSessie(data.token);
  if (!sessie) {
    return reply(403, { ok: false, error: 'het gesprek is verlopen. Start opnieuw met je code.' });
  }
  if (rateLimited('izp-beurt', clientIp, 120)) {
    return reply(429, { ok: false, error: 'te veel berichten achter elkaar; wacht even' });
  }
  if (sessie.beurten >= MAX_BEURTEN) {
    return reply(429, {
      ok: false,
      error: 'dit gesprek heeft het maximum aantal berichten bereikt. Neem het concept door met je bedrijfsarts.',
    });
  }
  const bericht = String(data.bericht ?? '').trim().slice(0, MAX_BERICHT);
  if (!bericht) return reply(400, { ok: false, error: 'leeg bericht' });

  // Onthoud hoe lang het transcript was: mislukt de aanroep halverwege een
  // tool-ronde, dan moeten álle regels van deze beurt weg. Anders blijft er
  // een tool_use zonder tool_result staan en weigert de API elke volgende
  // beurt in dit gesprek.
  const vanaf = sessie.transcript.length;
  sessie.beurten += 1;
  sessie.transcript.push({ role: 'user', content: bericht });

  try {
    const { tekst, voorstel } = await vraagModel(sessie.transcript);
    return reply(200, {
      ok: true,
      antwoord: tekst,
      voorstel,
      beurtenOver: Math.max(0, MAX_BEURTEN - sessie.beurten),
    });
  } catch (e) {
    // Alleen de foutsoort loggen, nooit de inhoud van het gesprek.
    console.error('izp: modelaanroep mislukt:', e.status || '', e.name || 'fout');
    sessie.transcript.length = vanaf;
    sessie.beurten -= 1;
    return reply(502, { ok: false, error: 'de assistent is even niet bereikbaar; probeer het zo nog eens' });
  }
}
