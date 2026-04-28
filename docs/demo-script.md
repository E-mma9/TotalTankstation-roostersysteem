# Demo-script — Total Tankstation Roostersysteem

Bedoeld voor de presentatie aan de manager van het tankstation. ~10–15 minuten.

## Vooraf — opstarten (5 min voor demo)

```bash
# In de repo-root
docker-compose up -d --build
```

Wacht tot containers draaien, dan open `http://localhost`. Inloggen met:
- E-mail: `manager@totaltankstation.nl`
- Wachtwoord: `test`

> Eerste keer? Het systeem vraagt om wachtwoord te wijzigen — kies iets simpels voor de demo (bv. `Welkom123!`).

**Pre-flight checklist:**
- [ ] Eén medewerker-account aangemaakt vóór de demo (via Medewerkers → "+ Nieuwe medewerker"). Open dat account in een 2e browser/incognito-venster zodat je live tussen manager- en medewerker-view kunt schakelen.
- [ ] Een rooster voor de huidige maand alvast aangemaakt en met een paar diensten ingevuld (zo hoef je niet vanaf nul te beginnen).
- [ ] Eén pending vrije-dag-aanvraag klaarzetten (vanuit medewerker-account) — laat zien hoe je goedkeurt.
- [ ] Browser-zoom op 100%, telefoon naast je voor de PWA-demo.

## Demo-flow (manager-view)

### 1. Inloggen → Rooster (1 min)
Open de site, log in. Eerste scherm: **Rooster**. "Dit is wat jij elke maand aanlevert in plaats van de Excel."

Wijs aan:
- Maand-kiezer rechtsboven → wissel even naar volgende maand om te laten zien dat je vooruit kunt plannen.
- Status-pill: **Concept** (oranje) of **Gepubliceerd** (groen). "Medewerkers zien het rooster pas zodra je publiceert."

### 2. Rooster bouwen (3 min)
- Klik op een lege cel → dropdown met diensten (V/M/A).
- Wijs aan: cellen kleuren al automatisch op basis van **beschikbaarheid van de medewerker** (groen = beschikbaar, rood = niet, blauw = goedgekeurd vrij). "Je hoeft de Excel niet meer te checken — de info zit hier."
- Onderaan elke kolom: hoeveel diensten op die dag. Rechts per medewerker: totaal aantal diensten. "Direct zichtbaar of iemand te veel of te weinig staat."
- Klik **Opslaan** → **Publiceren**. Bevestiging-popup met aantal diensten + "medewerkers ontvangen melding".

### 3. Verlof & dienstruil beoordelen (2 min)
Ga naar **Verlof & Dienstruil**. Toon:
- Pending verlofverzoek → klik **Goedkeuren**. "Medewerker krijgt direct een melding (in app + e-mail)."
- Pending dienstruil-verzoek (als die er is). "Eerst keurt de collega het zelf goed, dan jij. Dubbele check."

### 4. Beschikbaarheid medewerkers (1 min)
Ga naar **Beschikbaarheid medewerkers**.
- Wissel tussen medewerkers via dropdown.
- Toon **Alles goedkeuren**-knop (rechtsboven) als shortcut. "Je ziet per dag of iemand wel of niet kan."

### 5. Medewerkers beheren (1 min)
Ga naar **Medewerkers**:
- Klik **+ Nieuwe medewerker** → toon formulier. "Vul naam + e-mail in, ze krijgen automatisch een uitnodiging met een tijdelijk wachtwoord. Geen IT-ticket nodig."
- Wijs **Reset wachtwoord** en **Uit dienst** aan op een bestaande medewerker.

### 6. Notificaties (30 sec)
Klik op de bel rechtsboven → toon recente notificaties. "Elke actie genereert een melding voor de juiste persoon. Klik erop en je gaat direct naar het juiste scherm."

## Bonus: medewerker-view (2 min)

Schakel naar het tweede browser-venster (medewerker-account):
- **Mijn rooster**: kaart-overzicht per dienst, datum + tijden + dienst-letter (V/M/A). Vandaag is duidelijk gemarkeerd.
- **Collega's**: "Wie werkt wanneer" — handig om te weten of iemand jouw shift kan overnemen.
- **Beschikbaarheid**: kalender waar de medewerker per dag aangeeft of hij beschikbaar is.
- **Vrije dagen**: aanvraagformulier.
- **Dienstruil**: dienst aanbieden aan een collega.

## Bonus: installeren als app (PWA) (2 min)

**Op Android (Chrome):** open `https://[jouw-domein]` (of localhost via je telefoon's WiFi met IP) → menu (⋮) → **Installeer app** of **Toevoegen aan startscherm**. Het oranje T-icoon verschijnt op het startscherm. Open het — je krijgt een full-screen app-ervaring zonder browser-balk.

**Op iPhone (Safari):** open de site → deel-knop → **Zet op beginscherm**. Idem.

> "Geen app store, geen download — installeer direct vanaf de website. Werkt offline voor wat je al gezien hebt, hoeft niet bijgewerkt te worden."

## Vragen die waarschijnlijk komen

| Vraag | Antwoord |
|---|---|
| "Kunnen medewerkers het ook op hun telefoon doen?" | Ja — alle pagina's werken op mobiel + installeerbaar als app (zie hierboven). |
| "Wat als ik geen e-mail wil sturen?" | E-mail is optioneel; in-app-meldingen werken altijd. Te configureren via `EMAIL_ENABLED` in `.env`. |
| "En als iemand uit dienst gaat?" | "Uit dienst"-knop bij Medewerkers — historische roosters blijven bewaard, persoon kan niet meer inloggen. |
| "Wie ziet wat?" | Manager ziet alles; medewerkers zien alleen hun eigen gegevens + (gepubliceerde) collega-roosters. |
| "Wat kost dit?" | Hosting + domein (~€5–15/maand). Geen licentie-kosten. |

## Wat is bewust nog niet af

- **Native iOS/Android app** in app stores — nu is het een PWA (installeerbare website). Native app zou maanden werk zijn voor weinig extra waarde.
- **Salaris/uren-export** naar boekhoudsysteem — geen integratie aanwezig, kan later.
- **Meerdere vestigingen** — systeem is op één tankstation gericht.

## Bekende kleine puntjes (intern, niet noemen)

- Eerste keer opstarten met lege database: zorg dat `npx prisma migrate deploy` is gedraaid (gebeurt automatisch in docker-compose).
- Als je geen e-mail wilt configureren: zet `EMAIL_ENABLED=false` in `.env` — anders kraakt het bij notificaties.
