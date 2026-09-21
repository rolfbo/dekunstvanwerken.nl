#!/usr/bin/env node
/*
   Praat met de FML-assistent vanaf de opdrachtregel.

   Hiermee kun je de gespreksprompt afstellen zonder browser: je ziet per beurt
   precies welke items het model zet en waarom. Dat is het werk dat er echt toe
   doet — of het model een rommelig Nederlands antwoord op de juiste rubriek-
   items weet te leggen, en of het zich inhoudt waar het niets weet.

   Gebruik:
       ANTHROPIC_API_KEY=... node mcp/server.mjs &
       node scripts/fml-gesprek-cli.mjs

   Opties:
       --endpoint <url>   standaard http://127.0.0.1:8321
       --scenario <pad>   bestand met één antwoord per regel; speelt dat
                          gesprek af zonder tussenkomst, handig om na een
                          promptwijziging hetzelfde geval opnieuw te draaien.
*/

import { createInterface } from 'node:readline/promises';
import { readFileSync } from 'node:fs';
import { stdin, stdout, argv, exit } from 'node:process';
import { FLAT_ITEMS, SCORE_LABELS } from '../fml-items.js';

const arg = (naam, standaard) => {
  const i = argv.indexOf(naam);
  return i > -1 && argv[i + 1] ? argv[i + 1] : standaard;
};

const ENDPOINT = arg('--endpoint', 'http://127.0.0.1:8321');
const SCENARIO = arg('--scenario', null);

const META = Object.fromEntries(FLAT_ITEMS.map((i) => [i.key, i]));
const dim = (t) => `\x1b[2m${t}\x1b[0m`;
const geel = (t) => `\x1b[33m${t}\x1b[0m`;
const blauw = (t) => `\x1b[36m${t}\x1b[0m`;

const beurten = [];
const scores = {};

async function beurt(tekst) {
  beurten.push({ rol: 'gebruiker', tekst });
  const res = await fetch(ENDPOINT + '/fml-gesprek', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ beurten, scores }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    console.error(`\n[fout ${res.status}] ${data.error || 'onbekend'}\n`);
    return false;
  }

  console.log('\n' + blauw('assistent:'), data.antwoord, '\n');

  for (const v of data.voorstellen || []) {
    const label = META[v.key]?.label || v.key;
    const waarde = v.score === 0 ? 'teruggedraaid' : SCORE_LABELS[v.score];
    console.log(geel(`  ${v.key.padEnd(6)} ${label} → ${waarde}`));
    console.log(dim(`         ${v.reden}`));
    if (v.score === 0) delete scores[v.key];
    else scores[v.key] = v.score;
  }
  for (const [key, uren] of Object.entries(data.werktijden || {})) {
    console.log(geel(`  ${key.padEnd(6)} ${META[key]?.label} → ${uren}`));
    scores[key] = uren;
  }

  const gezet = Object.keys(scores).length;
  console.log(dim(`\n  [${gezet}/${FLAT_ITEMS.length} items ingevuld]`));
  beurten.push({ rol: 'assistent', tekst: data.antwoord });
  if (data.klaar) console.log(dim('  [model geeft aan: rubrieken zijn langsgeweest]'));
  return true;
}

function samenvatting() {
  console.log('\n─── eindstand ───');
  for (const item of FLAT_ITEMS) {
    const v = scores[item.key];
    if (!v) continue;
    const waarde = item.type === 'number' ? String(v) : SCORE_LABELS[v];
    console.log(`  ${item.key.padEnd(6)} ${item.label.padEnd(38)} ${waarde}`);
  }
  console.log(`\n  ${Object.keys(scores).length} van ${FLAT_ITEMS.length} items ingevuld.\n`);
}

const status = await fetch(ENDPOINT + '/fml-gesprek/status')
  .then((r) => r.json())
  .catch(() => null);
if (!status?.enabled) {
  console.error(`Geen assistent op ${ENDPOINT}. Draait de server, en staat ANTHROPIC_API_KEY?`);
  exit(1);
}
if (status.stub) console.log(dim('Let op: server draait in demomodus (FML_STUB=1), geen model.\n'));

console.log(blauw('assistent:'), 'Vertel eens: wat voor werk doe je, en hoe ziet een gewone werkdag eruit?\n');

if (SCENARIO) {
  const regels = readFileSync(SCENARIO, 'utf8').split('\n').map((r) => r.trim()).filter(Boolean);
  for (const regel of regels) {
    console.log(blauw('jij:'), regel);
    if (!(await beurt(regel))) break;
  }
} else {
  const rl = createInterface({ input: stdin, output: stdout });
  while (true) {
    const antwoord = (await rl.question(blauw('jij: '))).trim();
    if (!antwoord || antwoord === '/stop') break;
    if (!(await beurt(antwoord))) break;
  }
  rl.close();
}

samenvatting();
