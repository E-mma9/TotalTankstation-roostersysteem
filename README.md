# Total Tankstation — Roostersysteem

Webapplicatie die het maandelijkse Excel-rooster vervangt. Medewerkers bekijken hun rooster en collega's, geven beschikbaarheid op, vragen vrije dagen aan en kunnen diensten ruilen. De manager bouwt het rooster in een kalender-grid en publiceert het.

## Stack

- **Frontend:** React 18 + Vite + TailwindCSS + Zustand
- **Backend:** Node.js 20 + Express + Prisma ORM
- **Database:** PostgreSQL 16
- **Auth:** JWT (access 15 min + httpOnly refresh-cookie 7 dagen, met rotatie)
- **Deployment:** Docker Compose + nginx

## Quickstart (lokaal)

```bash
cp .env.example .env
# .env aanpassen — minimaal JWT_ACCESS_SECRET en JWT_REFRESH_SECRET zetten op willekeurige strings
docker-compose up -d --build
```

Open http://localhost en log in met de manager-account uit `SEED_MANAGER_EMAIL` / `SEED_MANAGER_PASSWORD`. Je wordt direct gevraagd het wachtwoord te wijzigen.

## Lokaal ontwikkelen (zonder volle Docker stack)

Postgres in Docker, backend en frontend lokaal:

```bash
docker-compose up -d postgres

cd backend
npm install
npx prisma migrate dev
npm run prisma:seed
npm run dev   # API op http://localhost:3001

cd ../frontend
npm install
npm run dev   # frontend op http://localhost:5173 (proxy naar :3001)
```

> Voor lokaal werken: in `backend/.env` `DATABASE_URL` met `localhost` i.p.v. `postgres`.

## Documentatie

- [`docs/deployment.md`](docs/deployment.md) — productie-deployment op Hetzner (server, SSL, backups)
- [`docs/troubleshooting.md`](docs/troubleshooting.md) — veelvoorkomende problemen
- [`docs/superpowers/specs/2026-04-26-roostersysteem-design.md`](docs/superpowers/specs/2026-04-26-roostersysteem-design.md) — volledig ontwerpdocument
- [`docs/fasen-overzicht.md`](docs/fasen-overzicht.md) — fase-indeling van de implementatie

## Standaard accounts

Bij eerste opstart wordt automatisch een manager-account aangemaakt op basis van `SEED_MANAGER_*` in `.env`. Daarna voegt de manager medewerkers toe via de UI; zij ontvangen een e-mail met een tijdelijk wachtwoord.

## Notificaties

Notificaties verschijnen in de app (belletje rechtsboven) en worden ook per e-mail verstuurd zodra `EMAIL_ENABLED=true` is gezet en SMTP-credentials kloppen.

Cron jobs:
- elke dag 18:00 — herinnering aan medewerkers met dienst de volgende dag
- elke dag 09:00 — manager-reminder als rooster van volgende maand <10 dagen vooruit nog niet gepubliceerd is
