# FML-assistent (prototype)

Een gespreksassistent naast de FML concept-tool: de bezoeker vertelt hoe zijn
werk gaat, de assistent stelt vragen en vult `fml.html` **live in terwijl het
gesprek loopt**. Elk voorgesteld item blijft gemarkeerd tot de bezoeker het zelf
bevestigt of aanpast.

Dit is een prototype om te beoordelen of het idee werkt. **Nog niet live zetten
— zie "Voordat dit live mag".**

## Zelf bekijken

Twee terminals:

```bash
# 1. de server (demomodus: vaste antwoorden, geen AI, geen sleutel nodig)
FML_STUB=1 node mcp/server.mjs

# 2. de site
python3 -m http.server 8080
```

Open <http://127.0.0.1:8080/fml.html> en klik op **Vul samen met de assistent
in**. De demomodus geeft verzonnen antwoorden; het is bedoeld om de interactie
te zien, niet om de kwaliteit van het model te beoordelen.

Met een echte sleutel:

```bash
ANTHROPIC_API_KEY=sk-ant-... node mcp/server.mjs
```

De pagina praat met `127.0.0.1:8321` zodra je hem op localhost opent, en met
`mcp.dekunstvanwerken.nl` daarbuiten. Openen via `file://` werkt niet: de
pagina laadt `fml-items.js` als module en dat vereist http.

## Het dagverhaal

De reden om dit als gesprek te doen en niet als formulier: je kunt vragen naar
dingen die niets met werk te maken hebben. Boodschappen, koken, schoonmaken, de
hond uitlaten, wat iemand 's avonds doet.

Dat is geen omweg maar de kortste route. Vraag je "kun je tien kilo tillen?",
dan krijg je een antwoord over iemands zelfbeeld — de een is bouwvakker en zegt
ja, de ander is ziek en zegt nee. Vraag je "hoe deed je de boodschappen deze
week?", dan krijg je gedrag: *mijn zus haalt ze*, *ik ga twee keer want één
volle tas is te zwaar*, *ik parkeer zo dicht mogelijk bij de deur*. Waarneembaar,
en de bezoeker hoeft zichzelf niet te beoordelen. Het is ook wat een
bedrijfsarts doet in een consult; het dagverhaal is daar een vaste techniek.

Dagelijkse bezigheden leggen bovendien verrassend direct op de rubrieken:
boodschappen raakt tillen, lopen en vervoer; schoonmaken raakt bukken, reiken,
knielen en boven schouderhoogte; een maaltijd koken raakt staan, aandacht
vasthouden en planmatig handelen.

**Maar niet één op één.** Eén tas boodschappen per week is geen "frequent tillen
tijdens werk", en een uur tuinieren op eigen tempo is geen werkdag. Precies op
dat punt gaan echte beoordelingen mis. De prompt bevat daarom een aparte regel:
het dagverhaal is een *aanwijzing*, bij twijfel scoort het model lager of vraagt
het door naar de werksituatie, en iets wat thuis met rustmomenten lukt zegt
weinig over acht uur achtereen.

Elk voorstel draagt daarom een `bron`: `werk` of `dagelijks_leven`. Op het scherm
staat dat erbij ("Voorstel assistent, uit je dagverhaal: …"), zodat zichtbaar
blijft welke scores voorzichtiger gelezen moeten worden.

Twee dingen die de prompt uitdrukkelijk verbiedt: confronteren met
tegenstellingen (wie zegt zich niet te kunnen concentreren maar elke avond leest,
krijgt een neutrale vervolgvraag, geen wedervraag — dit is geen controle), en
doorvragen over privéleven verder dan bezigheden. Geen relaties, geen financiën,
geen huishoudsamenstelling.

## Wat er op de afdruk komt

Het dagverhaal levert onderbouwingen op die over thuis gaan. Die horen bij de
bedrijfsarts thuis en niet per se bij een werkgever, terwijl het dezelfde
uitdraai is. Daarom staat in de actiebalk **Toelichtingen meeprinten**, standaard
uit: zonder vinkje bevat de afdruk alleen de scores. De markering dát een item
van de assistent kwam gaat altijd mee — dat is herkomst, geen privé-inhoud.

## De prompt afstellen

Dat is het eigenlijke werk. Of dit iets wordt hangt niet af van de techniek maar
van de vraag of het model een rommelig Nederlands antwoord op de juiste
rubriek-items weet te leggen — en of het zich inhoudt waar het niets weet.

```bash
node scripts/fml-gesprek-cli.mjs                       # gesprek in de terminal
node scripts/fml-gesprek-cli.mjs --scenario scripts/scenarios/stratenmaker.txt
node scripts/fml-gesprek-cli.mjs --scenario scripts/scenarios/kantoor-burnout.txt
```

Met `--scenario` (één antwoord per regel) draai je na elke promptwijziging
hetzelfde geval opnieuw. Leg een handvol scenario's vast — een stratenmaker, een
kantoormedewerker met burn-outklachten, iemand die vooral vertelt wat er wél
lukt — en kijk wat er verschuift.

Waar je op let:

- Zet het model items die de persoon niet genoemd heeft? Dat is de ergste fout.
- Slaat het een heel cluster aan omdat er één ding werd gezegd?
- Corrigeert het netjes als de bezoeker het tegenspreekt?
- Vraagt het door bij twijfel in plaats van te scoren?
- Blijft het van diagnoses af?
- Stapt het uit zichzelf over op het dagverhaal, of blijft het bij werk hangen?
- Rekent het dagelijkse bezigheden te makkelijk om naar werkbelasting? Zet het
  `bron` eerlijk op `dagelijks_leven`?
- Confronteert het met tegenstellingen? Dat mag niet.

Knoppen in `mcp/fml-gesprek.mjs`: `SYSTEEM` (de prompt), `AANSPREEKVORM`
(`je`/`u` — tooncalibratie, nu `je`), en via de omgeving `FML_EFFORT`
(`low` is snel, hoger als het model items mist) en `FML_MODEL`.

## Hoe het in elkaar zit

```
fml-items.js          de 52 items, één bron voor pagina én server
fml.html              formulier + gesprekspaneel (type="module")
mcp/fml-gesprek.mjs   het endpoint: prompt, tool-schema, validatie
mcp/server.mjs        routes: POST /fml-gesprek, GET /fml-gesprek/status
```

Drie keuzes die je niet per ongeluk moet terugdraaien:

**Stateloos.** Er wordt niets van het gesprek weggeschreven — geen transcript,
geen scores, geen logregel met inhoud. De browser houdt de conversatie vast en
stuurt hem elke beurt opnieuw mee. Daarmee is de server een doorgeefluik en geen
dossierhouder, en dat is precies het verschil dat de AVG-last klein houdt.
Alleen tellers gaan naar het log (tokens, aantal voorstellen).

**Geen afhankelijkheden.** De deploy sluit `node_modules` uit en er draait geen
`npm install` op de server, dus geen SDK maar `fetch()`.

**Eén API-call per beurt.** Het model schrijft zijn antwoord én roept in
dezelfde beurt de tool aan. We sturen bewust geen `tool_result` terug: de
geschiedenis wordt elke beurt opnieuw opgebouwd uit platte tekst, met de
actuele stand van de lijst als systeemregel erachter. Dat scheelt een tweede
round-trip per beurt.

De assistent-knop staat op `hidden` en komt alleen tevoorschijn als
`GET /fml-gesprek/status` meldt dat de server een sleutel heeft. Zonder sleutel
is `fml.html` exact de pagina die hij altijd was — dat is getest.

## Productie

De sleutel hoort niet in de repo. Op de server:

```bash
sudo tee /etc/dkvw-mcp.env >/dev/null <<'EOF'
ANTHROPIC_API_KEY=sk-ant-...
EOF
sudo chmod 600 /etc/dkvw-mcp.env
sudo systemctl restart dkvw-mcp
```

`dkvw-mcp.service` leest dat bestand optioneel in (`EnvironmentFile=-`), dus
zonder dat bestand start de service gewoon en blijft de assistent uit.

## Voordat dit live mag

Het bouwen was het kleine deel. Dit is het grote:

1. **Grondslag.** Een gesprek over beperkingen levert gezondheidsgegevens op:
   bijzondere persoonsgegevens, AVG artikel 9. Voor een publieke zelfbedienings-
   tool is uitdrukkelijke toestemming (9 lid 2 sub a) de realistische route;
   9 lid 2 sub h kan niet, want dat vereist verwerking onder verantwoordelijk-
   heid van een arts.
2. **Verwerkersovereenkomst** met de modelleverancier, plus de toezegging dat er
   niet op getraind wordt.
3. **EU-regio.** Het privacybeleid zegt nu dat er niets buiten de EER gaat.
   De `inference_geo`-parameter van de Claude API biedt alleen `us` en `global`,
   dus EU-residency betekent via Bedrock in een EU-regio of Vertex met regio
   `eu`. Dat is een clientkeuze, geen vinkje achteraf.
4. **Privacybeleid bijwerken** (`privacybeleid.html`): hoofdstuk 2, 6 en 8
   kloppen niet meer zodra dit aanstaat.
5. **DPIA-toets** en een regel in het verwerkingsregister.
6. **Misbruik.** Een open endpoint wordt gevonden. Nu: 30 beurten per gesprek,
   2000 tekens per bericht, 40 verzoeken per IP per uur. Zet daarnaast een harde
   maandlimiet bij de leverancier.

Kosten zijn bij dit verkeer geen punt: een heel gesprek is in de orde van
15.000–25.000 tokens, dus centen. Het risico zit in misbruik, niet in gebruik.

## Wat er bewust nog niet in zit

- **Spraak.** De volgende stap, en losgekoppeld van het live invullen: dat komt
  uit de tool-calls en werkt straks net zo met spraak als met tekst. Push-to-talk
  met transcriptie (eventueel op de eigen server) houdt het tekst-ijkpunt in het
  midden intact; realtime spraak-naar-spraak levert dat ijkpunt in en zet de
  microfoon continu open.
- **Streaming.** Nu verschijnen de voorstellen per beurt in plaats van per woord.
  Voor de demo maakt dat weinig uit; het is later een optie.
- **`izp.html`.** Zelfde structuur, kan dezelfde assistent gebruiken.
- **Een spreekknop per vraag.** Een tussenvorm: het formulier stelt de vraag, de
  bezoeker antwoordt met een knop "inspreken". Goedkoop zodra er transcriptie is,
  en de veilige uitwijk voor wie geen gesprek wil. Maar het levert alleen
  dictaat van het formulier op — het dagverhaal hierboven krijg je er niet mee,
  en dáár zit de waarde. Aanvulling dus, geen vervanging.
- **Een strengere regel voor werktijden.** `VI.a`/`VI.b` worden nu net als de
  rest als voorstel gemarkeerd. Dat zijn de meest ingrijpende getallen op de
  pagina en die verdienen waarschijnlijk een expliciete bevestiging.
