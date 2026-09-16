#!/usr/bin/env node
/*
 * Toegangscodes voor de IZP-assistent
 * ------------------------------------------------------------------
 * Elke werknemer krijgt een eigen code van de bedrijfsarts. Op de server
 * staat alleen de hash van de code, niet de code zelf en geen naam. Welke
 * code bij welke werknemer hoort, noteer je in het dossier.
 *
 * Gebruik (op de server, als de gebruiker van de service):
 *
 *   ssh dkvw 'sudo -u www-data node /var/www/dekunstvanwerken.nl/mcp/izp-code.mjs nieuw'
 *   ssh dkvw 'sudo -u www-data node /var/www/dekunstvanwerken.nl/mcp/izp-code.mjs nieuw --dagen 30 --max 5'
 *   ssh dkvw 'sudo -u www-data node /var/www/dekunstvanwerken.nl/mcp/izp-code.mjs lijst'
 *   ssh dkvw 'sudo -u www-data node /var/www/dekunstvanwerken.nl/mcp/izp-code.mjs intrekken IZP-7K3P-Q9'
 *   ssh dkvw 'sudo -u www-data node /var/www/dekunstvanwerken.nl/mcp/izp-code.mjs opschonen'
 */
import { randomInt } from 'node:crypto';
import { hashCode, leesCodes, schrijfCodes } from './izp-assistent.mjs';

const STATE_DIR = process.env.MCP_STATE_DIR || '/var/lib/dkvw-mcp';

// Zonder 0/O, 1/I/L: voorkomt overtypfouten aan de telefoon.
const ALFABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function nieuweCode() {
  const groep = (n) => Array.from({ length: n }, () => ALFABET[randomInt(ALFABET.length)]).join('');
  return `IZP-${groep(4)}-${groep(2)}`;
}

function arg(naam, standaard) {
  const i = process.argv.indexOf(`--${naam}`);
  if (i === -1 || i === process.argv.length - 1) return standaard;
  const v = Number(process.argv[i + 1]);
  return Number.isFinite(v) ? v : standaard;
}

const commando = process.argv[2] || 'nieuw';
const codes = leesCodes(STATE_DIR);

if (commando === 'nieuw') {
  const dagen = arg('dagen', 14);
  const max = arg('max', 3);
  let code;
  do { code = nieuweCode(); } while (codes[hashCode(code)]);
  const verloopt = new Date(Date.now() + dagen * 24 * 60 * 60 * 1000);
  codes[hashCode(code)] = {
    aangemaakt: new Date().toISOString(),
    verloopt: verloopt.toISOString(),
    gebruikt: 0,
    max,
  };
  schrijfCodes(STATE_DIR, codes);
  console.log(`\n  Code:      ${code}`);
  console.log(`  Geldig tot: ${verloopt.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}`);
  console.log(`  Gesprekken: maximaal ${max}\n`);
  console.log('  Noteer in het dossier bij wie deze code hoort. De code staat');
  console.log('  hier alleen nu op het scherm; op de server staat de hash.\n');
} else if (commando === 'lijst') {
  const rijen = Object.entries(codes);
  if (!rijen.length) {
    console.log('Geen codes.');
  } else {
    console.log('hash (eerste 8)  aangemaakt   verloopt     gebruikt');
    for (const [hash, r] of rijen) {
      const verlopen = r.verloopt && Date.parse(r.verloopt) < Date.now() ? ' (verlopen)' : '';
      console.log(
        `${hash.slice(0, 8)}         ${(r.aangemaakt || '').slice(0, 10)}   ${(r.verloopt || '').slice(0, 10)}   ` +
        `${r.gebruikt || 0}/${r.max || 3}${verlopen}`,
      );
    }
  }
} else if (commando === 'intrekken') {
  const code = process.argv[3];
  if (!code) {
    console.error('Geef de code op: izp-code.mjs intrekken IZP-XXXX-XX');
    process.exit(1);
  }
  const hash = hashCode(code);
  if (!codes[hash]) {
    console.log('Deze code bestaat niet (meer).');
  } else {
    delete codes[hash];
    schrijfCodes(STATE_DIR, codes);
    console.log('Code ingetrokken.');
  }
} else if (commando === 'opschonen') {
  const nu = Date.now();
  let weg = 0;
  for (const [hash, r] of Object.entries(codes)) {
    const verlopen = r.verloopt && Date.parse(r.verloopt) < nu;
    const op = (r.gebruikt || 0) >= (r.max || 3);
    if (verlopen || op) { delete codes[hash]; weg++; }
  }
  schrijfCodes(STATE_DIR, codes);
  console.log(`${weg} code(s) opgeruimd, ${Object.keys(codes).length} over.`);
} else {
  console.error('Onbekend commando. Gebruik: nieuw | lijst | intrekken <code> | opschonen');
  process.exit(1);
}
