#!/usr/bin/env node
/*
 * Knowledge-base build for dekunstvanwerken.nl
 * ------------------------------------------------------------------
 * Single source of truth = the Markdown files in kennisbank/*.md.
 * This script regenerates, from those sources:
 *   - kennisbank/<slug>.html   (one human/SEO page per article)
 *   - kennisbank/index.html    (searchable listing)
 *   - kennisbank/index.json    (machine manifest: full text, for LLM/MCP)
 *   - llms.txt                 (root; LLM discovery)
 *
 * No runtime dependencies and no third-party npm packages: the tiny
 * Markdown converter below covers exactly the syntax the articles use.
 *
 * Usage:  node kb-build.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const KB = join(ROOT, 'kennisbank');
const SITE = 'https://dekunstvanwerken.nl';
const BUILD_DATE = '2026-07-05';

// ---------- helpers ----------
const esc = (s) => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// For values placed inside a double-quoted HTML attribute.
const escAttr = (s) => esc(s).replace(/"/g, '&quot;');

function inline(text) {
  // Escape first, then apply inline markdown → HTML.
  let t = esc(text);
  t = t.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) =>
    `<a href="${url}">${label}</a>`);
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  return t;
}

// Minimal block-level Markdown → HTML. Returns { html, plain }.
function mdToHtml(md) {
  const lines = md.split('\n');
  const out = [];
  const plain = [];
  let i = 0;
  const flushList = (buf, tag) => {
    if (!buf.length) return;
    out.push(`<${tag}>`);
    buf.forEach((li) => { out.push(`<li>${inline(li)}</li>`); plain.push(li); });
    out.push(`</${tag}>`);
    buf.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i];

    // fenced code block
    if (/^```/.test(line)) {
      const code = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; }
      i++; // closing fence
      out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
      plain.push(code.join(' '));
      continue;
    }
    // horizontal rule
    if (/^---\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
    // headings (skip level-1: template supplies the <h1>)
    let m = line.match(/^(#{1,4})\s+(.*)$/);
    if (m) {
      const level = m[1].length;
      const text = m[2].trim();
      if (level === 1) { i++; continue; }
      out.push(`<h${level}>${inline(text)}</h${level}>`);
      plain.push(text);
      i++;
      continue;
    }
    // blockquote (possibly multi-line)
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, '')); i++;
      }
      out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`);
      plain.push(buf.join(' '));
      continue;
    }
    // unordered list
    if (/^[-*]\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^[-*]\s+/, '')); i++;
      }
      flushList(buf, 'ul');
      continue;
    }
    // blank line
    if (/^\s*$/.test(line)) { i++; continue; }
    // paragraph (gather until blank)
    const buf = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) &&
           !/^(#{1,4}\s|[-*]\s|>\s?|```|---\s*$)/.test(lines[i])) {
      buf.push(lines[i]); i++;
    }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
    plain.push(buf.join(' '));
  }
  return { html: out.join('\n'), plain: plain.join('\n') };
}

function parseFrontMatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('missing front matter');
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    let [, k, v] = kv;
    v = v.trim();
    if (/^\[.*\]$/.test(v)) {
      meta[k] = v.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
    } else {
      meta[k] = v.replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"');
    }
  }
  return { meta, body: m[2] };
}

// ---------- shared HTML chrome ----------
const NAV = `
    <nav>
        <div class="container">
            <a href="../index.html#hero" class="logo" aria-label="de Kunst van Werken — home">
                <svg class="logo-mark" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
                    <rect width="40" height="40" rx="8" fill="var(--color-primary)"/>
                    <path d="M14 10 V30 M14 20 L26 10 M14 20 L26 30" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                    <path d="M10 33 Q20 35.5 30 33" stroke="var(--color-accent)" stroke-width="2.2" stroke-linecap="round" fill="none"/>
                </svg>
                <span class="logo-text">de Kunst van Werken</span>
            </a>
            <button class="nav-toggle" aria-expanded="false" aria-controls="primary-nav" aria-label="Menu openen">
                <span class="nav-toggle-bar"></span>
            </button>
            <ul class="nav-links" id="primary-nav">
                <li><a href="../index.html#hero">Home</a></li>
                <li><a href="../index.html#services">Diensten</a></li>
                <li><a href="../index.html#whitelabel">Whitelabel</a></li>
                <li><a href="./">Kennisbank</a></li>
                <li class="has-dropdown">
                    <button class="nav-dropdown-trigger" type="button" aria-expanded="false" aria-haspopup="true" aria-controls="tools-menu">
                        Tools <span class="caret" aria-hidden="true">&#9662;</span>
                    </button>
                    <ul class="nav-dropdown" id="tools-menu">
                        <li><a href="../opbouwschema.html">Opbouwschema</a></li>
                        <li><a href="../fml.html">FML concept</a></li>
                        <li><a href="../izp.html">IZP concept</a></li>
                    </ul>
                </li>
                <li><a href="../index.html#contact">Contact</a></li>
            </ul>
        </div>
    </nav>`;

const FOOTER = `
    <footer>
        <div class="container">
            <p>&copy; 2026 de Kunst van Werken B.V. Alle rechten voorbehouden.</p>
            <div class="footer-links" style="margin-top: 1rem;">
                <a href="../klachten.html">Klachtenregeling</a>
                <a href="../privacybeleid.html">Privacybeleid</a>
                <a href="../voorwaarden.html">Algemene Voorwaarden</a>
            </div>
            <p style="font-size: 0.8rem; color: #bdc3c7; margin-top: 1rem;">
                de Kunst van Werken B.V. | KVK: 94098344
            </p>
        </div>
    </footer>`;

const NAV_SCRIPT = `
    <script>
    (function () {
        const toggle = document.querySelector('.nav-toggle');
        const menu = document.getElementById('primary-nav');
        if (toggle && menu) {
            toggle.addEventListener('click', () => {
                const open = menu.classList.toggle('open');
                toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
                toggle.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
            });
            menu.addEventListener('click', (e) => { if (e.target.tagName === 'A') menu.classList.remove('open'); });
        }
        const dt = document.querySelector('.nav-dropdown-trigger');
        if (dt) {
            dt.addEventListener('click', (e) => { e.stopPropagation();
                dt.setAttribute('aria-expanded', dt.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'); });
            document.addEventListener('click', (e) => { if (!e.target.closest('.has-dropdown')) dt.setAttribute('aria-expanded', 'false'); });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dt.setAttribute('aria-expanded', 'false'); });
        }
    })();
    </script>`;

const HEAD_LINKS = `
    <link rel="icon" type="image/svg+xml" href="../favicon.svg">
    <meta name="theme-color" content="#004a99">
    <link rel="stylesheet" href="../brand-variables.css">
    <link rel="stylesheet" href="../style.css">
    <link rel="stylesheet" href="./kennisbank.css">`;

// ---------- article page ----------
function articlePage(a) {
  const url = `${SITE}/kennisbank/${a.slug}.html`;
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.summary,
    inLanguage: a.lang || 'nl',
    datePublished: a.date,
    dateModified: a.date,
    keywords: (a.tags || []).join(', '),
    mainEntityOfPage: url,
    author: { '@type': 'Organization', name: 'de Kunst van Werken B.V.' },
    publisher: {
      '@type': 'Organization',
      name: 'de Kunst van Werken B.V.',
      logo: { '@type': 'ImageObject', url: `${SITE}/favicon.svg` },
    },
  };
  const tagsHtml = (a.tags || []).map((t) => `<span class="kb-tag">${esc(t)}</span>`).join(' ');
  return `<!DOCTYPE html>
<html lang="${a.lang || 'nl'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(a.title)} | Kennisbank | De Kunst van Werken</title>
    <meta name="description" content="${escAttr(a.summary)}">
    <meta name="author" content="de Kunst van Werken B.V.">
    <meta name="robots" content="index,follow">
    <link rel="canonical" href="${url}">
    <link rel="alternate" type="text/markdown" href="${SITE}/kennisbank/${a.slug}.md">

    <meta property="og:type" content="article">
    <meta property="og:site_name" content="de Kunst van Werken">
    <meta property="og:url" content="${url}">
    <meta property="og:title" content="${escAttr(a.title)}">
    <meta property="og:description" content="${escAttr(a.summary)}">
    <meta property="og:image" content="${SITE}/og-image.png">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escAttr(a.title)}">
    <meta name="twitter:description" content="${escAttr(a.summary)}">
    <meta name="twitter:image" content="${SITE}/og-image.png">
${HEAD_LINKS}
    <script type="application/ld+json">
${JSON.stringify(jsonld, null, 2)}
    </script>
</head>
<body>
${NAV}
    <section id="kb-article">
        <div class="container">
            <nav class="kb-breadcrumb" aria-label="Kruimelpad">
                <a href="../index.html#hero">Home</a> &rsaquo;
                <a href="./">Kennisbank</a> &rsaquo;
                <span>${esc(a.title)}</span>
            </nav>
            <article class="kb-article">
                <h1>${esc(a.title)}</h1>
                <p class="kb-meta"><time datetime="${a.date}">${a.date}</time> &middot; ${tagsHtml}</p>
                ${a.html}
                <p class="kb-back"><a href="./">&larr; Terug naar de kennisbank</a></p>
            </article>
        </div>
    </section>
${FOOTER}
${NAV_SCRIPT}
</body>
</html>
`;
}

// ---------- index page ----------
function indexPage(articles) {
  const cards = articles.map((a) => `
                <li class="kb-card" data-search="${escAttr((a.title + ' ' + a.summary + ' ' + (a.tags || []).join(' ') + ' ' + a.plain).toLowerCase().replace(/\s+/g, ' '))}">
                    <h2><a href="${a.slug}.html">${esc(a.title)}</a></h2>
                    <p>${esc(a.summary)}</p>
                    <p class="kb-card-tags">${(a.tags || []).map((t) => `<span class="kb-tag">${esc(t)}</span>`).join(' ')}</p>
                </li>`).join('');
  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Kennisbank | de Kunst van Werken',
    url: `${SITE}/kennisbank/`,
    inLanguage: 'nl',
    hasPart: articles.map((a) => ({
      '@type': 'Article',
      headline: a.title,
      url: `${SITE}/kennisbank/${a.slug}.html`,
    })),
  };
  return `<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kennisbank | De Kunst van Werken</title>
    <meta name="description" content="Kennisbank van de Kunst van Werken: doorzoekbare artikelen over werk, gezondheid, focus en re-integratie.">
    <meta name="author" content="de Kunst van Werken B.V.">
    <meta name="robots" content="index,follow">
    <link rel="canonical" href="${SITE}/kennisbank/">
    <link rel="alternate" type="application/json" href="${SITE}/kennisbank/index.json" title="Kennisbank manifest">

    <meta property="og:type" content="website">
    <meta property="og:site_name" content="de Kunst van Werken">
    <meta property="og:url" content="${SITE}/kennisbank/">
    <meta property="og:title" content="Kennisbank | De Kunst van Werken">
    <meta property="og:description" content="Doorzoekbare artikelen over werk, gezondheid, focus en re-integratie.">
    <meta property="og:image" content="${SITE}/og-image.png">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Kennisbank | De Kunst van Werken">
    <meta name="twitter:description" content="Doorzoekbare artikelen over werk, gezondheid, focus en re-integratie.">
    <meta name="twitter:image" content="${SITE}/og-image.png">
${HEAD_LINKS}
    <script type="application/ld+json">
${JSON.stringify(collectionLd, null, 2)}
    </script>
</head>
<body>
${NAV}
    <section id="kb-index">
        <div class="container">
            <div class="section-title">
                <h1>Kennisbank</h1>
                <p>Doorzoekbare artikelen over werk, gezondheid, focus en re-integratie.</p>
            </div>
            <div class="kb-search-wrap">
                <input type="search" id="kb-search" class="kb-search" placeholder="Zoek in de kennisbank…" aria-label="Zoek in de kennisbank" autocomplete="off">
            </div>
            <ul class="kb-cards" id="kb-cards">${cards}
            </ul>
            <p class="kb-empty" id="kb-empty" hidden>Geen artikelen gevonden.</p>
            <p class="kb-api">Voor ontwikkelaars &amp; AI: de volledige inhoud is machineleesbaar beschikbaar als <a href="index.json">index.json</a>; elk artikel ook als Markdown (<code>.md</code>).</p>
        </div>
    </section>
${FOOTER}
${NAV_SCRIPT}
    <script>
    (function () {
        const input = document.getElementById('kb-search');
        const cards = [...document.querySelectorAll('.kb-card')];
        const empty = document.getElementById('kb-empty');
        input.addEventListener('input', () => {
            const q = input.value.trim().toLowerCase();
            let shown = 0;
            cards.forEach((c) => {
                const hit = !q || c.dataset.search.includes(q);
                c.hidden = !hit;
                if (hit) shown++;
            });
            empty.hidden = shown !== 0;
        });
    })();
    </script>
</body>
</html>
`;
}

// ---------- build ----------
const files = readdirSync(KB).filter((f) => f.endsWith('.md'));
const articles = files.map((f) => {
  const raw = readFileSync(join(KB, f), 'utf8');
  const { meta, body } = parseFrontMatter(raw);
  const { html, plain } = mdToHtml(body);
  return { ...meta, html, plain, file: f };
}).sort((a, b) => (a.date < b.date ? 1 : -1));

for (const a of articles) {
  writeFileSync(join(KB, `${a.slug}.html`), articlePage(a));
}
writeFileSync(join(KB, 'index.html'), indexPage(articles));

const manifest = {
  site: 'de Kunst van Werken',
  url: `${SITE}/kennisbank/`,
  description: 'Kennisbank van de Kunst van Werken: artikelen over werk, gezondheid, focus en re-integratie.',
  generated: BUILD_DATE,
  count: articles.length,
  articles: articles.map((a) => ({
    id: a.slug,
    title: a.title,
    url: `${SITE}/kennisbank/${a.slug}.html`,
    source_markdown: `${SITE}/kennisbank/${a.slug}.md`,
    summary: a.summary,
    tags: a.tags || [],
    lang: a.lang || 'nl',
    date: a.date,
    content: a.plain,
  })),
};
writeFileSync(join(KB, 'index.json'), JSON.stringify(manifest, null, 2) + '\n');

// llms.txt at repo root (LLM discovery convention)
const llms = `# de Kunst van Werken

> Professionele Nederlandse arbodienstverlening: verzuimbegeleiding, RI&E-toetsing,
> PAGO/PMO, aanstellingskeuringen, bedrijfsarts en whitelabel-diensten.

## Kennisbank
De volledige, machineleesbare inhoud staat in ${SITE}/kennisbank/index.json
(JSON met per artikel titel, samenvatting, tags en volledige tekst).

${articles.map((a) => `- [${a.title}](${SITE}/kennisbank/${a.slug}.html): ${a.summary} (Markdown: ${SITE}/kennisbank/${a.slug}.md)`).join('\n')}

## Tools
- [Opbouwschema-calculator](${SITE}/opbouwschema.html): gefaseerd opbouwschema bij re-integratie.
- [FML concept-tool](${SITE}/fml.html): 6-rubrieken Functionele Mogelijkheden Lijst (concept).
- [IZP concept-tool](${SITE}/izp.html): 6-rubrieken Inzetbaarheidsprofiel (concept).
`;
writeFileSync(join(ROOT, 'llms.txt'), llms);

console.log(`Built ${articles.length} article(s): ${articles.map((a) => a.slug).join(', ')}`);
