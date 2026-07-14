# MCP server op mcp.dekunstvanwerken.nl

De MCP-server (`mcp/server.mjs`) stelt de kennisbank, de
opbouwschema-calculator, de FAQ en bedrijfsinfo beschikbaar aan
AI-clients via het Model Context Protocol (Streamable HTTP transport).
Zero dependencies: alleen Node.js ≥ 18 is nodig, geen `npm install`.

## Tools die de server aanbiedt

| Tool | Doet |
|---|---|
| `zoek_kennisbank` | full-text zoeken in de kennisbank |
| `lees_artikel` | één artikel als Markdown |
| `lijst_artikelen` | alle artikelen met metadata |
| `bereken_opbouwschema` | het opbouwschema als tool (zelfde logica als de site, incl. rapporttekst + deel-link) |
| `faq` | de FAQ-antwoorden |
| `bedrijfsinfo` | diensten, contact, tools |

De server leest `kennisbank/index.json` van schijf (elke 60 s ververst),
dus nieuwe artikelen zijn na een deploy automatisch beschikbaar zonder
herstart.

## Eenmalige serverinstallatie

Alles hieronder gebeurt op de `dkvw`-server. De site-bestanden staan er
al via de deploy-workflow (rsync levert ook `mcp/` mee).

### 1. DNS

Voeg een record toe bij je DNS-provider:

    mcp.dekunstvanwerken.nl.  A     <zelfde IP als dekunstvanwerken.nl>
    (of een CNAME naar dekunstvanwerken.nl)

### 2. systemd-service

    sudo cp /var/www/dekunstvanwerken.nl/mcp/dkvw-mcp.service /etc/systemd/system/
    # Check User= en paden in het bestand als je web root anders is
    sudo systemctl daemon-reload
    sudo systemctl enable --now dkvw-mcp
    curl -s http://127.0.0.1:8321/healthz   # → {"ok":true,...}

### 3. nginx + TLS

    sudo cp /var/www/dekunstvanwerken.nl/mcp/nginx-mcp.conf /etc/nginx/sites-available/mcp.dekunstvanwerken.nl
    sudo ln -s /etc/nginx/sites-available/mcp.dekunstvanwerken.nl /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    sudo certbot --nginx -d mcp.dekunstvanwerken.nl

### 4. Controle

    curl -s https://mcp.dekunstvanwerken.nl/healthz
    curl -s -X POST https://mcp.dekunstvanwerken.nl/ \
      -H 'Content-Type: application/json' \
      -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

## Verbinden vanuit een MCP-client

- **Claude (claude.ai / Claude Desktop, custom connector)**: voeg een
  remote MCP-server toe met URL `https://mcp.dekunstvanwerken.nl/`
  (transport: Streamable HTTP, geen authenticatie).
- **Claude Code**: `claude mcp add --transport http dekunstvanwerken https://mcp.dekunstvanwerken.nl/`
- **Andere clients**: elke Streamable-HTTP-client werkt; het endpoint
  is de root-URL, POST met JSON-RPC.

## Na elke deploy

Niets nodig: de server herleest de kennisbank zelf. Alleen als
`mcp/server.mjs` zelf wijzigt is een herstart nodig:

    sudo systemctl restart dkvw-mcp

(De deploy-workflow probeert dit automatisch; als de deploy-gebruiker
geen sudo-recht heeft voor dit ene commando, voeg toe met `visudo`:

    deploy_user ALL=(root) NOPASSWD: /usr/bin/systemctl restart dkvw-mcp

waarbij `deploy_user` de SSH_USER uit de repo-secrets is.)

## Beveiliging

- De server bindt op 127.0.0.1; alleen nginx kan erbij.
- Alle tools zijn read-only (kennisbank lezen, rekenen); er is geen
  state, geen database en geen schrijfpad.
- `lees_artikel` valideert het id (`[a-z0-9-]+`) tegen path traversal.
- Request-body is gemaximeerd op 1 MB.
- Publiek en anoniem by design — er staat niets gevoeligs in.
