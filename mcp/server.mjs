#!/usr/bin/env node
/*
 * MCP server for de Kunst van Werken — mcp.dekunstvanwerken.nl
 * ------------------------------------------------------------------
 * Zero-dependency Node.js implementation of the Model Context Protocol
 * over the Streamable HTTP transport (stateless mode): a single POST
 * endpoint speaking JSON-RPC 2.0. No npm install needed on the server.
 *
 * Exposed tools:
 *   - bereken_opbouwschema   the opbouwschema calculator as a tool
 *   - faq                    the site's FAQ answers
 *   - bedrijfsinfo           services & contact details
 *
 * Extra endpoint (not MCP): POST /aanmelden — stores the website's
 * signup form submissions as JSONL in MCP_STATE_DIR, collected weekly.
 *
 * Run:   node mcp/server.mjs           (defaults to 127.0.0.1:8321)
 *        MCP_PORT=9000 node mcp/server.mjs
 * Check: curl -s http://127.0.0.1:8321/healthz
 */
import { createServer } from 'node:http';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://dekunstvanwerken.nl';
const PORT = Number(process.env.MCP_PORT || 8321);
const HOST = process.env.MCP_HOST || '127.0.0.1';
// Signup submissions are appended here as JSONL; picked up weekly over SSH.
const STATE_DIR = process.env.MCP_STATE_DIR || '/var/lib/dkvw-mcp';

const SERVER_INFO = { name: 'dekunstvanwerken', version: '1.2.0' };
const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

const FAQ = [
  { vraag: 'Is een RI&E verplicht voor mijn bedrijf?',
    antwoord: 'Ja. Iedere werkgever met personeel is op grond van de Arbeidsomstandighedenwet verplicht een Risico-Inventarisatie en -Evaluatie (RI&E) op te stellen, inclusief een plan van aanpak. In de meeste gevallen moet de RI&E ook getoetst worden door een gecertificeerde arbodienst of kerndeskundige. Bedrijven met maximaal 25 werknemers die een erkend branche-instrument gebruiken, zijn van die toetsing vrijgesteld.' },
  { vraag: 'Wanneer moet een zieke werknemer naar de bedrijfsarts?',
    antwoord: 'De Wet verbetering poortwachter schrijft voor dat uiterlijk in week 6 van het verzuim een probleemanalyse door de bedrijfsarts wordt opgesteld, gevolgd door een plan van aanpak in week 8. In de praktijk loont het om veel eerder contact te leggen: hoe sneller duidelijk is wat een werknemer nog wél kan, hoe soepeler de re-integratie verloopt.' },
  { vraag: 'Wat is het verschil tussen een FML en een IZP?',
    antwoord: 'Beide beschrijven de belastbaarheid van een werknemer volgens dezelfde zes rubrieken. De Functionele Mogelijkheden Lijst (FML) is het strikte UWV-instrument dat door een verzekeringsarts wordt ingevuld bij de WIA-beoordeling. Het Inzetbaarheidsprofiel (IZP) wordt door de bedrijfsarts opgesteld, meestal rond de eerstejaarsevaluatie, en biedt meer ruimte voor beschrijving.' },
  { vraag: 'Wat is een opbouwschema bij re-integratie?',
    antwoord: 'Een opbouwschema beschrijft hoe een werknemer stap voor stap meer uren gaat werken, bijvoorbeeld eerst de ochtenden en daarna gelaagd de middagen erbij. Zo blijft er voldoende ruimte voor herstel. Gebruik de tool bereken_opbouwschema of de calculator op ' + SITE + '/opbouwschema.html.' },
  { vraag: 'Wat kost arbodienstverlening?',
    antwoord: 'Dat hangt af van de omvang van de organisatie en de afgenomen diensten: een los consult bij de bedrijfsarts, RI&E-toetsing of volledige verzuimbegeleiding. Omdat klanten bij de Kunst van Werken de verzuimsoftware in eigen beheer houden, betalen zij niet voor een verplicht platform. Offerte via info@dekunstvanwerken.nl.' },
  { vraag: 'Wat is whitelabel arbodienstverlening?',
    antwoord: 'Bij whitelabel arbodienstverlening voeren gecertificeerde kerndeskundigen de arbo-taken uit onder de merknaam van de opdrachtnemer zelf. Die behoudt het klantcontact; de uitvoering is volledig onzichtbaar voor de eindklant. Ideaal voor tussenpersonen, verzekeraars en kleinere arbodiensten.' },
];

const BEDRIJFSINFO = {
  naam: 'de Kunst van Werken B.V.',
  kvk: '94098344',
  website: SITE,
  email_algemeen: 'info@dekunstvanwerken.nl',
  email_medisch: 'medisch@dekunstvanwerken.nl',
  telefoon: '+31 6 38 90 32 64',
  diensten: [
    'Ziekteverzuimbegeleiding (Wet verbetering poortwachter)',
    'RI&E-toetsing',
    'PAGO / PMO (preventief medisch onderzoek)',
    'Aanstellingskeuringen',
    'Toegang tot de bedrijfsarts (open spreekuur)',
    'Preventieadvies',
    'Whitelabel arbodienstverlening voor tussenpersonen en kleinere arbodiensten',
  ],
  tools: [
    { naam: 'Opbouwschema-calculator', url: `${SITE}/opbouwschema.html` },
    { naam: 'FML concept-tool', url: `${SITE}/fml.html` },
    { naam: 'IZP concept-tool', url: `${SITE}/izp.html` },
  ],
  werkwijze: 'Klanten houden de verzuimsoftware in eigen beheer: geen vendor lock-in, maximale controle over eigen werknemersgegevens.',
};

// -------------------------------------------------- opbouw calculator
// Faithful port of the logic in opbouwschema.html.
const DAGDEEL = 4;
const DAY_KEYS = { ma: 'Mon', di: 'Tue', wo: 'Wed', do: 'Thu', vr: 'Fri' };
const DAY_NL = { Mon: 'ma', Tue: 'di', Wed: 'wo', Thu: 'do', Fri: 'vr' };
const r1 = (x) => Math.round(x * 10) / 10;
const fmtN = (x) => (Number.isInteger(x) ? `${x}` : String(x).replace('.', ','));
const fmtU = (x) => fmtN(x) + 'u';

function simulate(dayList, stap, huidig, doel, config) {
  const state = {};
  dayList.forEach((d) => { state[`${d}-am`] = 0; state[`${d}-pm`] = 0; });
  const dayHours = (d) => r1(state[`${d}-am`] + state[`${d}-pm`]);

  function fillDay(d, budget) {
    let added = 0;
    for (const part of ['am', 'pm']) {
      if (added >= budget - 1e-9) break;
      const k = `${d}-${part}`;
      const add = Math.min(budget - added, DAGDEEL - state[k]);
      if (add <= 1e-9) continue;
      state[k] = r1(state[k] + add);
      added = r1(added + add);
    }
    return added;
  }

  function stepOnce(limit) {
    if (config.unit === 'dag') {
      const notFull = dayList.filter((d) => dayHours(d) < 2 * DAGDEEL - 1e-9);
      if (!notFull.length) return 0;
      const targets = config.dagMode === 'gelaagd' ? notFull : [notFull[0]];
      let added = 0;
      for (const d of targets) {
        if (limit !== undefined && added >= limit - 1e-9) break;
        let budget = stap;
        if (limit !== undefined) budget = Math.min(budget, limit - added);
        added = r1(added + fillDay(d, budget));
      }
      return added;
    }
    let dd = null;
    for (const part of config.order) {
      if (dayList.some((d) => state[`${d}-${part}`] < DAGDEEL - 1e-9)) { dd = part; break; }
    }
    if (!dd) return 0;
    const mode = config.modes[dd];
    const targets = mode === 'gelaagd'
      ? dayList.filter((d) => state[`${d}-${dd}`] < DAGDEEL - 1e-9)
      : [dayList.find((d) => state[`${d}-${dd}`] < DAGDEEL - 1e-9)];
    let added = 0;
    for (const d of targets) {
      if (limit !== undefined && added >= limit - 1e-9) break;
      const k = `${d}-${dd}`;
      let add = Math.min(stap, DAGDEEL - state[k]);
      if (limit !== undefined) add = Math.min(add, limit - added);
      if (add <= 1e-9) continue;
      state[k] = r1(state[k] + add);
      added = r1(added + add);
    }
    return added;
  }

  const snapshot = () => {
    const o = {};
    for (const k in state) if (state[k] > 1e-9) o[k] = r1(state[k]);
    return o;
  };

  let total = 0, guard = 0;
  while (total < huidig - 1e-9 && guard++ < 400) {
    const added = stepOnce(huidig - total);
    if (added <= 1e-9) break;
    total = r1(total + added);
  }
  const snaps = [snapshot()];
  guard = 0;
  while (total < doel - 1e-9 && guard++ < 400) {
    const added = stepOnce(doel - total);
    if (added <= 1e-9) break;
    total = r1(total + added);
    snaps.push(snapshot());
  }
  return snaps;
}

function berekenOpbouwschema(args) {
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const huidig = clamp(Number(args.huidige_uren ?? 8), 0.5, 40);
  const stap = clamp(Number(args.stap_uren ?? 1), 0.5, 8);
  const weken = clamp(Math.round(Number(args.weken_per_stap ?? 1)), 1, 8);
  const contract = clamp(Number(args.contract_uren ?? 40), 1, 60);

  const rawDays = Array.isArray(args.werkdagen) && args.werkdagen.length
    ? args.werkdagen : ['ma', 'di', 'wo', 'do', 'vr'];
  const dayList = rawDays.map((d) => DAY_KEYS[String(d).toLowerCase()]).filter(Boolean);
  if (!dayList.length) throw new Error('werkdagen moet dagen bevatten uit: ma, di, wo, do, vr');

  const unit = args.eenheid === 'dag' ? 'dag' : 'dagdeel';
  const config = {
    unit,
    order: args.volgorde === 'middag_eerst' ? ['pm', 'am'] : ['am', 'pm'],
    modes: {
      am: args.ochtend_modus === 'gelaagd' ? 'gelaagd' : 'sequentieel',
      pm: args.middag_modus === 'gelaagd' ? 'gelaagd' : 'sequentieel',
    },
    dagMode: args.dag_modus === 'gelaagd' ? 'gelaagd' : 'sequentieel',
  };

  const capacity = dayList.length * 2 * DAGDEEL;
  const doel = Math.min(contract, capacity);
  const effHuidig = Math.min(huidig, doel);
  const snaps = simulate(dayList, stap, effHuidig, doel, config);

  const stappen = snaps.map((plan, i) => {
    const perDag = {};
    let totaal = 0;
    for (const d of dayList) {
      const u = r1((plan[`${d}-am`] || 0) + (plan[`${d}-pm`] || 0));
      if (u > 0) {
        perDag[DAY_NL[d]] = {
          totaal_uren: u,
          ochtend_uren: plan[`${d}-am`] || 0,
          middag_uren: plan[`${d}-pm`] || 0,
        };
        totaal = r1(totaal + u);
      }
    }
    return {
      stap: i + 1,
      week_vanaf_consult: weken === 1 ? `${i * weken + 1}` : `${i * weken + 1}-${(i + 1) * weken}`,
      totaal_uren: totaal,
      per_dag: perDag,
    };
  });

  // Plain-text report, same style as the website's "Voor in een rapport".
  const cadans = weken === 1 ? 'per week' : weken === 2 ? 'per twee weken' : `per ${weken} weken`;
  const lines = [
    'OPBOUWSCHEMA RE-INTEGRATIE', '',
    `We bouwen ${cadans} op, telkens ${fmtU(stap)} per stap.`,
    'Elke stap hieronder is een volgende opbouwronde, geteld',
    'vanaf het consult; dit zijn geen ziekteweken.', '',
    `Werkdagen: ${dayList.map((d) => DAY_NL[d]).join(', ')}`,
    `Doel: ${fmtU(doel)} per week`, '',
  ];
  for (const s of stappen) {
    const dagen = Object.entries(s.per_dag);
    const allSame = dagen.length === dayList.length &&
      dagen.every(([, v]) => v.totaal_uren === dagen[0][1].totaal_uren);
    const body = allSame
      ? `elke dag ${fmtU(dagen[0][1].totaal_uren)}`
      : dagen.map(([d, v]) => `${d} ${fmtU(v.totaal_uren)}`).join(', ');
    lines.push(`Stap ${s.stap}: ${body}`);
  }
  lines.push('', 'Concept ter voorbereiding van het bedrijfsartsgesprek.',
    'Geen medisch advies; schema altijd op maat.');

  // Shareable calculator URL (same hash format as the site).
  const dayCode = { Mon: 'm', Tue: 'd', Wed: 'w', Thu: 't', Fri: 'v' };
  const params = new URLSearchParams({
    h: String(effHuidig), s: String(stap), w: String(weken), c: String(contract),
    d: dayList.map((d) => dayCode[d]).join(''),
    u: unit === 'dag' ? 'd' : 'p',
    o: config.order[0] === 'pm' ? 'pm' : 'am',
    am: config.modes.am === 'gelaagd' ? 'g' : 's',
    pm: config.modes.pm === 'gelaagd' ? 'g' : 's',
    dg: config.dagMode === 'gelaagd' ? 'g' : 's',
  });

  return {
    invoer: { huidige_uren: effHuidig, stap_uren: stap, weken_per_stap: weken,
      contract_uren: contract, doel_uren: doel,
      werkdagen: dayList.map((d) => DAY_NL[d]), eenheid: unit },
    waarschuwing: contract > capacity
      ? `${contract} uur past niet in ${dayList.length} werkdagen (max ${capacity}u); de opbouw stopt op ${capacity}u.`
      : null,
    aantal_stappen: stappen.length,
    stappen,
    rapport_tekst: lines.join('\n'),
    deel_link: `${SITE}/opbouwschema.html#${params.toString()}`,
    disclaimer: 'Concept ter voorbereiding van het gesprek met werknemer, werkgever en bedrijfsarts; geen medisch advies.',
  };
}

// ----------------------------------------------------------- MCP tools
const TOOLS = [
  {
    name: 'bereken_opbouwschema',
    description: 'Bereken een gefaseerd opbouwschema voor re-integratie: stap-voor-stap meer uren werken richting de contract-uren. Geeft per stap de uren per dag, een rapport-vriendelijke tekst en een deelbare link naar de web-calculator. Dagdelen zijn 4 uur (ochtend/middag).',
    inputSchema: {
      type: 'object',
      properties: {
        huidige_uren: { type: 'number', description: 'Uren die de werknemer deze week kan werken (0,5–40). Default 8.' },
        stap_uren: { type: 'number', description: 'Uren die er per stap bijkomen (0,5–8). Default 1.' },
        weken_per_stap: { type: 'integer', description: 'Hoeveel weken elke stap duurt (1–8). Default 1.' },
        contract_uren: { type: 'number', description: 'Contract-uren per week; het doel van de opbouw (1–60). Default 40.' },
        werkdagen: { type: 'array', items: { type: 'string', enum: ['ma', 'di', 'wo', 'do', 'vr'] },
          description: 'Werkdagen in opbouwvolgorde. Default alle vijf (ma–vr).' },
        eenheid: { type: 'string', enum: ['dagdeel', 'dag'],
          description: 'Opbouwen per dagdeel (ochtend/middag apart) of per hele dag. Default dagdeel.' },
        volgorde: { type: 'string', enum: ['ochtend_eerst', 'middag_eerst'],
          description: 'Bij eenheid=dagdeel: welk dagdeel eerst wordt opgebouwd. Default ochtend_eerst.' },
        ochtend_modus: { type: 'string', enum: ['dag_voor_dag', 'gelaagd'],
          description: 'Ochtend-opbouw: dag_voor_dag (eerste dag vol, dan volgende) of gelaagd (alle dagen tegelijk +stap). Default dag_voor_dag.' },
        middag_modus: { type: 'string', enum: ['dag_voor_dag', 'gelaagd'],
          description: 'Middag-opbouw, zelfde opties. Default dag_voor_dag.' },
        dag_modus: { type: 'string', enum: ['dag_voor_dag', 'gelaagd'],
          description: 'Bij eenheid=dag: hele-dag-opbouw. Default dag_voor_dag.' },
      },
    },
    handler: (args) => berekenOpbouwschema(args || {}),
  },
  {
    name: 'faq',
    description: 'Veelgestelde vragen over arbodienstverlening (RI&E-plicht, bedrijfsarts-termijnen, FML vs IZP, opbouwschema, kosten, whitelabel) met de antwoorden van de Kunst van Werken.',
    inputSchema: {
      type: 'object',
      properties: { vraag: { type: 'string', description: 'Optioneel filter; laat leeg voor alle vragen.' } },
    },
    handler: ({ vraag } = {}) => {
      if (!vraag) return { aantal: FAQ.length, faq: FAQ };
      const q = String(vraag).toLowerCase();
      const hits = FAQ.filter((f) => (f.vraag + ' ' + f.antwoord).toLowerCase().includes(q));
      return { aantal: hits.length, faq: hits };
    },
  },
  {
    name: 'bedrijfsinfo',
    description: 'Diensten, contactgegevens, tools en werkwijze van de Kunst van Werken B.V. (arbodienstverlening, KVK 94098344).',
    inputSchema: { type: 'object', properties: {} },
    handler: () => BEDRIJFSINFO,
  },
];

// ------------------------------------------------------ JSON-RPC layer
function rpcResult(id, result) { return { jsonrpc: '2.0', id, result }; }
function rpcError(id, code, message) { return { jsonrpc: '2.0', id, error: { code, message } }; }

function handleRpc(msg) {
  const { id, method, params } = msg;
  switch (method) {
    case 'initialize': {
      const requested = params?.protocolVersion;
      const version = PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0];
      return rpcResult(id, {
        protocolVersion: version,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: 'MCP-server van de Kunst van Werken (arbodienstverlening, NL). Gebruik bereken_opbouwschema voor re-integratie-opbouwschema\'s, en faq/bedrijfsinfo voor algemene informatie.',
      });
    }
    case 'ping':
      return rpcResult(id, {});
    case 'tools/list':
      return rpcResult(id, {
        tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
      });
    case 'tools/call': {
      const tool = TOOLS.find((t) => t.name === params?.name);
      if (!tool) return rpcError(id, -32602, `Unknown tool: ${params?.name}`);
      try {
        const out = tool.handler(params?.arguments || {});
        const text = typeof out === 'string' ? out : JSON.stringify(out, null, 2);
        return rpcResult(id, { content: [{ type: 'text', text }], isError: false });
      } catch (e) {
        return rpcResult(id, { content: [{ type: 'text', text: String(e.message || e) }], isError: true });
      }
    }
    default:
      if (method?.startsWith('notifications/')) return null; // fire-and-forget
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

// ------------------------------------------------------- aanmeldingen
// POST /aanmelden stores signup-form submissions as one JSON line each in
// STATE_DIR/aanmeldingen.jsonl. No email, no third parties; the file is
// collected weekly over SSH. Honeypot field + a small per-IP rate limit
// keep casual spam out.
const AANMELD_FILE = () => join(STATE_DIR, 'aanmeldingen.jsonl');
const rateLog = new Map(); // ip -> [timestamps]
function rateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const hits = (rateLog.get(ip) || []).filter((t) => now - t < windowMs);
  hits.push(now);
  rateLog.set(ip, hits);
  if (rateLog.size > 5000) rateLog.clear(); // memory backstop
  return hits.length > 5;
}

function handleAanmelding(body, req, res) {
  const reply = (code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json', ...CORS });
    res.end(JSON.stringify(obj));
  };
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    return reply(400, { ok: false, error: 'ongeldige aanvraag' });
  }
  // Honeypot: real users never fill this hidden field. Pretend success.
  if (data.website) return reply(200, { ok: true });

  const clean = (v, max) => String(v ?? '').trim().slice(0, max);
  const aanmelding = {
    ontvangen: new Date().toISOString(),
    bedrijf: clean(data.bedrijf, 200),
    naam: clean(data.naam, 200),
    email: clean(data.email, 200),
    telefoon: clean(data.telefoon, 50),
    bericht: clean(data.bericht, 2000),
  };
  if (!aanmelding.naam || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(aanmelding.email)) {
    return reply(400, { ok: false, error: 'naam en een geldig e-mailadres zijn verplicht' });
  }
  const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '?';
  if (rateLimited(String(ip).split(',')[0].trim())) {
    return reply(429, { ok: false, error: 'te veel aanvragen; probeer het later opnieuw' });
  }
  try {
    mkdirSync(STATE_DIR, { recursive: true });
    appendFileSync(AANMELD_FILE(), JSON.stringify(aanmelding) + '\n');
  } catch (e) {
    console.error('aanmelding opslaan mislukt:', e.message);
    return reply(500, { ok: false, error: 'opslaan mislukt; mail ons op info@dekunstvanwerken.nl' });
  }
  return reply(200, { ok: true });
}

// ---------------------------------------------------------- HTTP layer
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version, Authorization',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id',
};

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    return res.end();
  }

  if (req.method === 'GET' && url.pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
    return res.end(JSON.stringify({ ok: true, server: SERVER_INFO }));
  }

  if (req.method === 'GET') {
    // Streamable HTTP allows servers without a GET event stream to 405 it.
    // Serve a small human/discovery payload on / instead of a bare error.
    if (url.pathname === '/' || url.pathname === '/mcp') {
      res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
      return res.end(JSON.stringify({
        name: SERVER_INFO.name,
        description: 'MCP-server van de Kunst van Werken. Verbind met een MCP-client (Streamable HTTP) op deze URL.',
        transport: 'streamable-http',
        endpoint: 'POST /',
        tools: TOOLS.map((t) => t.name),
        website: SITE,
      }, null, 2));
    }
    res.writeHead(404, { 'Content-Type': 'application/json', ...CORS });
    return res.end(JSON.stringify({ error: 'not found' }));
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { ...CORS, Allow: 'GET, POST, OPTIONS' });
    return res.end();
  }

  let body = '';
  req.setEncoding('utf8');
  req.on('data', (c) => {
    body += c;
    if (body.length > 1_000_000) req.destroy(); // 1 MB cap
  });
  req.on('end', () => {
    if (url.pathname === '/aanmelden') {
      return handleAanmelding(body, req, res);
    }
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json', ...CORS });
      return res.end(JSON.stringify(rpcError(null, -32700, 'Parse error')));
    }
    const messages = Array.isArray(parsed) ? parsed : [parsed];
    const replies = messages.map(handleRpc).filter(Boolean);
    if (!replies.length) {
      res.writeHead(202, CORS); // notifications only
      return res.end();
    }
    const payload = Array.isArray(parsed) ? replies : replies[0];
    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
    res.end(JSON.stringify(payload));
  });
});

server.listen(PORT, HOST, () => {
  console.log(`dekunstvanwerken MCP server listening on http://${HOST}:${PORT} (tools: ${TOOLS.map((t) => t.name).join(', ')})`);
});
