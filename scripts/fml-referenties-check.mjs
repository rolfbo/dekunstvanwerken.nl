#!/usr/bin/env node
/*
   Controleert fml-referenties.js tegen fml-items.js.

   Twee dingen die stilletjes misgaan als je de lijst uitbreidt:
   een itemsleutel die niet bestaat (de referentie doet dan niets), en een
   FML-item waar geen enkele referentie naar verwijst (daar heeft de assistent
   dan geen gewone-taal-vraag voor, en valt hij terug op het formulier-jargon).

   Gebruik:
       node scripts/fml-referenties-check.mjs          # samenvatting
       node scripts/fml-referenties-check.mjs --items  # per item wat er is
*/

import { FLAT_ITEMS } from '../fml-items.js';
import { ALLE_REFERENTIES, REFERENTIES, referentieLijst, referentiesVoorItem } from '../fml-referenties.js';
import { argv, exit } from 'node:process';

const geldig = new Set(FLAT_ITEMS.map((i) => i.key));
const label = Object.fromEntries(FLAT_ITEMS.map((i) => [i.key, i.label]));

let fouten = 0;

// 1. Verwijzen alle referenties naar bestaande items?
for (const r of ALLE_REFERENTIES) {
  if (!Array.isArray(r.items) || !r.items.length) {
    console.error(`FOUT  "${r.naam}" (${r.soort}) verwijst naar geen enkel item`);
    fouten++;
    continue;
  }
  for (const key of r.items) {
    if (!geldig.has(key)) {
      console.error(`FOUT  "${r.naam}" (${r.soort}) verwijst naar onbekend item ${key}`);
      fouten++;
    }
  }
}

// 2. Welke FML-items hebben nog geen enkele referentie?
const zonder = FLAT_ITEMS.filter((i) => i.type !== 'number' && !referentiesVoorItem(i.key).length);

if (argv.includes('--items')) {
  let r = '';
  for (const item of FLAT_ITEMS) {
    if (item.rubriek !== r) { r = item.rubriek; console.log(`\n${r}. ${item.rubriekTitel}`); }
    const refs = referentiesVoorItem(item.key);
    const merk = refs.length ? String(refs.length).padStart(2) : ' -';
    console.log(`  ${merk}  ${item.key.padEnd(6)} ${item.label}`);
    for (const ref of refs) console.log(`        · ${ref.naam}`);
  }
  console.log();
}

const perSoort = Object.entries(REFERENTIES)
  .map(([soort, g]) => `${soort} ${g.items.length}`)
  .join(', ');

console.log(`referenties:  ${ALLE_REFERENTIES.length} in ${Object.keys(REFERENTIES).length} groepen`);
console.log(`              ${perSoort}`);
console.log(`items gedekt: ${FLAT_ITEMS.length - zonder.length - 2} van de ${FLAT_ITEMS.length - 2} scoorbare items`);
console.log(`promptomvang: ${referentieLijst().length} tekens (~${Math.round(referentieLijst().length / 3.5)} tokens)`);

if (zonder.length) {
  console.log(`\nzonder referentie (${zonder.length}):`);
  for (const i of zonder) console.log(`  ${i.key.padEnd(6)} ${label[i.key]}`);
}

if (fouten) {
  console.error(`\n${fouten} fout(en) gevonden.`);
  exit(1);
}
console.log('\nGeen fouten.');
