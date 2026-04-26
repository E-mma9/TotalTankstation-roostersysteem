# Implementatie — fasen overzicht

Het volledige systeem is opgeleverd. Hieronder de fase-indeling die als leidraad diende, met per fase wat er is opgeleverd. Voor latere doorontwikkelingen kunnen deze fasen apart worden opgepakt.

## Fase 1 — Infrastructuur & Database
- `docker-compose.yml` met postgres, backend, frontend en nginx services
- `.env.example` met alle benodigde environment variabelen
- `nginx/nginx.conf` als reverse proxy met gzip en cache headers
- `backend/prisma/schema.prisma` — datamodel met alle tabellen
- `backend/prisma/seed.js` — vaste diensten (V/M/A) en eerste manager-account
- Migraties worden bij eerste opstart automatisch toegepast via `prisma migrate deploy`

## Fase 2 — Backend API
- `backend/src/index.js` + `app.js` — Express server entry
- `backend/src/middleware/` — auth (JWT), errorHandler, requireManager
- `backend/src/routes/` — endpoints voor auth, users, availability, schedules, leave-requests, shift-swaps, notifications
- `backend/src/services/`:
  - `authService.js` — login, refresh-rotatie, password reset/change
  - `emailService.js` — SMTP via nodemailer (stub-modus als `EMAIL_ENABLED=false`)
  - `notificationService.js` — combineert in-app + e-mail notificaties
  - `reminderJob.js` — cron jobs voor dagelijkse dienst-herinneringen en manager-reminder bij ongepubliceerd rooster

## Fase 3 — Frontend
- React 18 + Vite + TailwindCSS, react-router en Zustand voor auth state
- `src/api/` — axios client met automatische refresh-interceptor + resource-modules per endpoint
- `src/pages/`:
  - Auth: Login, ForgotPassword, ResetPassword, ChangePassword
  - Medewerker: Dashboard (eigen rooster), Colleagues, Availability (per dag toggle), LeaveRequests, ShiftSwaps, Notifications
  - Manager: Schedule (kalender-grid met beschikbaarheid-overlay), Employees (CRUD + uit dienst), Requests (vrije dagen + ruil)
- Mobielvriendelijke layout met hamburger-menu

## Fase 4 — Deployment & Documentatie
- `README.md` — quickstart en lokaal ontwikkelen
- `docs/deployment.md` — Hetzner setup, SSL via Let's Encrypt, dagelijkse pg_dump backups + restore
- `docs/troubleshooting.md` — veelvoorkomende problemen per laag
- Production Dockerfiles (backend + frontend) met multi-stage builds

## Wat is niet gebouwd (en waarom)

Bij de review-ronde zijn een aantal voorstellen bewust niet meegenomen:
- **Auto-scheduling endpoint** — manager plant zelf, geen vraag van de klant. Toe te voegen als v2 feature.
- **Manager-goedkeuring op dienstruil** — expliciete wens van de klant: medewerkers regelen onderling.
- **Audit logs** — overkill voor een team van 15.
- **Drag-and-drop in rooster-grid** — eerste versie gebruikt dropdowns; later eventueel uitbreiden.
- **Tijdsgebaseerde shifts (TIMESTAMPTZ)** — drie vaste diensten zijn voldoende; flexibilisering wanneer nodig.
