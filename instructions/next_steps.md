# Volgende stappen website (geschreven 4 september 2026)

Context: portfolio-review van alle zes sites op de server in `_dashboards`. Besluit Rolf:
de website van de Kunst van Werken krijgt **geen bouwtijd** meer; leads komen uit het
netwerk en via white-label-partners, niet uit zoekverkeer. Wel komt er één nieuwe site,
**verzuimdatabase**, puur als leadfunnel voor dKvW.

## Wat de cijfers zeggen (30 dagen t/m 4 sep)

| Metriek | Waarde |
|---|---|
| Menselijke paginaweergaven | 741 |
| Unieke IP's | 192 |
| Echte browsers | 129 |
| Google-verwijzingen | 13 |
| Leads via het formulier | **0** |
| Conversiepagina's | opbouwschema 34, fml 26, izp 21, whitelabel 7 |

De drie tools trekken meer bezoek dan de dienstenpagina's. Whitelabel wordt nauwelijks
bekeken.

## Bij de volgende sessie

1. **Controleer eerst of het formulier werkt**: 0 leads in 30 dagen bij 192 bezoekers kan
   ook een kapotte keten zijn. Eén testinzending, dan `aanmeldingen.jsonl` op de server
   nakijken (zie `instructions/aanmeldingen.md`).
2. Verder niets aan deze site doen. Tijd voor acquisitie gaat naar outreach, niet naar
   de site.
3. Bij het bouwen van verzuimdatabase: leadformulier op élke pagina (niet alleen een
   contactpagina), en vanaf dag één `scripts/stats.sh`/`stats.py` plus een lead-teller,
   zodat de site in het dashboard en in `_dashboards/archive-all.sh` meeloopt.
