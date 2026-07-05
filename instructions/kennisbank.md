# Kennisbank (knowledge base)

The knowledge base is **Markdown-first**: the `.md` files in `kennisbank/`
are the single source of truth. Everything else is generated from them.

## Adding or editing an article

1. Create/edit a Markdown file in `kennisbank/`, e.g. `kennisbank/mijn-artikel.md`.
2. Start it with a front-matter block:

   ```
   ---
   title: "De titel van het artikel"
   slug: mijn-artikel            # must match the filename (without .md)
   summary: "Eén of twee zinnen samenvatting voor de listing en meta-description."
   tags: [tag-een, tag-twee]
   date: 2026-07-05
   lang: nl                      # nl or en
   ---

   # De titel van het artikel

   Gewone Markdown hieronder…
   ```

3. Regenerate the site output:

   ```
   node kb-build.mjs
   ```

4. Commit the `.md` **and** the generated files (`kennisbank/*.html`,
   `kennisbank/index.json`, `llms.txt`).

The deploy workflow also runs `node kb-build.mjs` before syncing, so the
published output always matches the Markdown even if you forget step 3.

## What gets generated

- `kennisbank/<slug>.html` — one page per article (SEO + humans, Article JSON-LD)
- `kennisbank/index.html` — searchable listing (client-side filter)
- `kennisbank/index.json` — machine manifest with the **full plain text** of
  every article; this is the entry point for an LLM or a future MCP server
- `llms.txt` (repo root) — LLM discovery file linking the manifest + articles

## Supported Markdown

Headings (`##`–`####`), paragraphs, `**bold**`, `*italic*`, `[links](url)`,
`` `code` ``, bullet lists (`-`), blockquotes (`>`), fenced code blocks
(```` ``` ````), and horizontal rules (`---`). The first level-1 heading
(`# …`) in the body is dropped because the template renders the `title`
front-matter value as the page's single `<h1>`.

## For an MCP server (future)

Point the server at either:
- `https://dekunstvanwerken.nl/kennisbank/index.json` — one request, all
  articles with full text, tags and metadata; or
- the individual `https://dekunstvanwerken.nl/kennisbank/<slug>.md` sources.

Both are deployed (the rsync `*.md` exclusion is anchored to the repo root,
so `kennisbank/*.md` ships).
