# Aanmeldingen wekelijks ophalen

Het aanmeldformulier op de homepage POST naar
`https://mcp.dekunstvanwerken.nl/aanmelden`. De dkvw-mcp-service slaat
elke aanmelding op als één JSON-regel in:

    /var/lib/dkvw-mcp/aanmeldingen.jsonl

Er wordt geen e-mail verstuurd en er is geen externe partij bij
betrokken; het bestand staat alleen op de eigen server.

## Ophalen (wekelijks)

    # bekijken
    ssh dkvw 'cat /var/lib/dkvw-mcp/aanmeldingen.jsonl'

    # binnenhalen als bestand met datum
    scp dkvw:/var/lib/dkvw-mcp/aanmeldingen.jsonl ./aanmeldingen-$(date +%F).jsonl

    # na het binnenhalen leegmaken (optioneel, zodat je alleen nieuwe ziet)
    ssh dkvw 'sudo truncate -s 0 /var/lib/dkvw-mcp/aanmeldingen.jsonl'

## Omzetten naar leesbare lijst / CSV

    python3 -c "
    import json,sys
    for line in open('aanmeldingen-2026-01-01.jsonl'):
        d=json.loads(line)
        print(f\"{d['ontvangen'][:10]} | {d['bedrijf']} | {d['naam']} | {d['email']} | {d['telefoon']} | {d['bericht'][:60]}\")
    "

## Velden

| Veld | Verplicht | Max |
|---|---|---|
| `ontvangen` | (server-timestamp, ISO) | — |
| `bedrijf` | nee | 200 |
| `naam` | ja | 200 |
| `email` | ja (formaat gecheckt) | 200 |
| `telefoon` | nee | 50 |
| `bericht` | nee | 2000 |

## Spam-bescherming

- Honeypot-veld ("website", onzichtbaar): ingevuld → stilletjes genegeerd.
- Rate-limit: max 5 aanmeldingen per IP per uur.
- AVG: alleen contactgegevens, opslag op eigen server, genoemd in het
  privacybeleid van de site.
