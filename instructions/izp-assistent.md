# IZP-assistent: codes uitgeven en beheren

De IZP concept-tool (`izp.html`) heeft een knop "Vul samen met de assistent in".
Daarachter zit een gesprek met Claude, dat de zes rubrieken langsloopt en een
concepttekst voorstelt. De werknemer kan elk voorstel overnemen of negeren; het
definitieve IZP stelt de bedrijfsarts vast.

Toegang kan alleen met een persoonlijke code die jij uitgeeft.

## Een code uitgeven

    ssh dkvw 'sudo -u www-data node /var/www/dekunstvanwerken.nl/mcp/izp-code.mjs nieuw'

Geeft bijvoorbeeld:

    Code:       IZP-7K3P-Q9
    Geldig tot: 30 september 2026
    Gesprekken: maximaal 3

Standaard 14 dagen geldig en 3 gesprekken. Aan te passen:

    ... izp-code.mjs nieuw --dagen 30 --max 5

**Noteer zelf in het dossier bij wie de code hoort.** Op de server staat alleen
de hash van de code, geen naam. Zo weet de webserver niet wie er praat.

Andere commando's:

    ... izp-code.mjs lijst                    # overzicht (hashes, geen codes)
    ... izp-code.mjs intrekken IZP-7K3P-Q9    # code direct ongeldig maken
    ... izp-code.mjs opschonen                # verlopen en opgebruikte codes weg

## Wat er wel en niet wordt bewaard

| Waar | Wat |
|---|---|
| `/var/lib/dkvw-mcp/izp-codes.json` | hash van de code, verloopdatum, aantal keer gebruikt |
| `/var/lib/dkvw-mcp/izp-consent.jsonl` | per gesprek: hash van de code, tijdstip, versie van de toestemmingstekst |
| geheugen van de service | het lopende gesprek; weg bij sluiten van het venster, na 2 uur, of bij een herstart |
| nergens | de inhoud van het gesprek, de naam van de werknemer, het ingevulde IZP |

Het toestemmingsbewijs is er omdat de AVG (art. 7 lid 1) vraagt dat je kunt
aantonen dát er toestemming was. Er staat geen inhoud in.

Het ingevulde IZP staat alleen in de browser van de werknemer, in de URL na
het `#`-teken. Die URL komt nooit bij de server; delen of printen doet de
werknemer zelf.

## Instellingen op de server

`/etc/dkvw-mcp.env` (rechten 600, eigenaar www-data):

    VERTEX_PROJECT_ID=dkvw-izp
    VERTEX_REGION=<eu-regio>
    GOOGLE_APPLICATION_CREDENTIALS=/etc/dkvw-mcp/vertex-sa.json
    # optioneel:
    # VERTEX_MODEL=claude-opus-5
    # IZP_MAX_BEURTEN=30

Ontbreekt dit bestand of een van de eerste twee regels, dan draait de
MCP-server gewoon door en geeft de assistent netjes "niet beschikbaar".

### Testmodus: rechtstreekse Anthropic-sleutel

Om snel te kunnen proberen zonder het Vertex-project ingericht te hebben,
kan in plaats daarvan één regel:

    ANTHROPIC_API_KEY=sk-ant-...

Staat er geen `VERTEX_PROJECT_ID`/`VERTEX_REGION`, dan gebruikt de assistent
die sleutel. De server logt dan bij het starten een waarschuwing.

**Alleen voor testen met verzonnen gegevens.** Anthropic biedt rechtstreeks
geen EU-regio; de verwerking vindt dan buiten de EER plaats en dat klopt niet
met hoofdstuk 6 en 9 van het privacybeleid. Voor echte werknemers moet de
Vertex-route in een EU-regio aanstaan. Zet de testsleutel daarna weg.

Controleren of de assistent aanstaat:

    curl -s https://mcp.dekunstvanwerken.nl/healthz
    # {"ok":true,...,"izpAssistent":true}

## Inspreken (spraak naar tekst)

De werknemer kan een antwoord inspreken in plaats van typen. De opname gaat
naar onze server en van daar naar Google Cloud Speech-to-Text v2 in de
EU-regio; de tekst komt terug in het invoerveld, zodat de werknemer eerst
ziet wat er verstaan is. De opname wordt nergens bewaard.

Aanzetten in `/etc/dkvw-mcp.env`:

    STT_PROJECT_ID=dkvw-izp        # of leeg laten: dan wordt VERTEX_PROJECT_ID gebruikt
    STT_REGIO=eu                   # EU-datalocatie; endpoint wordt eu-speech.googleapis.com
    GOOGLE_APPLICATION_CREDENTIALS=/etc/dkvw-mcp/vertex-sa.json
    # optioneel: STT_MODEL=chirp_3

In Google Cloud:

- Speech-to-Text API aanzetten in hetzelfde project
- het service account de rol **Speech-to-Text Client** (`roles/speech.client`) geven
- het logging-programma níet aanzetten; standaard bewaart Google de audio niet
  en gebruikt het die niet om modellen te trainen

Ontbreekt de instelling, dan blijft de knop "Antwoord inspreken" verborgen en
werkt alles verder gewoon met typen.

Het voorlezen van antwoorden doet de browser zelf (SpeechSynthesis). Daar komt
geen dienst aan te pas en er verlaat niets het apparaat.

Kosten spraak: ongeveer $0,016 per minuut audio, met 60 gratis minuten per
maand. Een gesprek van twintig ingesproken antwoorden kost een paar cent.
Controleer de actuele prijs op cloud.google.com/speech-to-text/pricing.

## Kosten

Ongeveer $0,30 tot $0,70 per gesprek. Stel in Google Cloud een
budgetwaarschuwing in op het project `dkvw-izp`.

## Grenzen die in de code staan

- maximaal 30 berichten per gesprek
- maximaal 3 (of het ingestelde aantal) gesprekken per code
- maximaal 10 codepogingen per IP-adres per uur
- 4000 tekens per bericht

## Vóór livegang

- [ ] Cloud Data Processing Addendum van Google geaccepteerd
- [ ] regio vastgelegd en gecontroleerd
- [ ] DPIA-toets uitgevoerd
- [ ] verwerkingsregister bijgewerkt
- [ ] privacybeleid getoetst door een privacyadviseur
