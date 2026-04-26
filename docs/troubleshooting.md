# Troubleshooting

Veelvoorkomende problemen en oplossingen, gegroepeerd per laag.

## Database

### `Error: P1001: Can't reach database server at postgres:5432`
De backend kan postgres niet bereiken.
- Check `docker compose ps` — staat postgres als `healthy`?
- Bij lokaal werken (backend buiten Docker): in `backend/.env` moet `DATABASE_URL` `localhost` bevatten in plaats van `postgres`.
- Kijk naar `docker compose logs postgres` voor errors.

### `Migration failed` of `database does not exist`
Database is in een rare state, vaak na het wisselen van credentials.

**Lokaal (data weggooien is ok):**
```bash
docker compose down -v
docker compose up -d postgres
cd backend && npx prisma migrate dev
```

**Productie:** NIET `down -v` doen — dat wist alle data. Eerst back-up maken (zie deployment.md), daarna onderzoeken wat de echte fout is via `docker compose logs backend`.

### "permission denied for relation users"
Verkeerde DB-gebruiker of de migrations zijn met een andere gebruiker uitgevoerd. Check `POSTGRES_USER` consistent in `.env` en `DATABASE_URL`.

## Backend

### "JWT_ACCESS_SECRET en JWT_REFRESH_SECRET moeten gezet zijn"
Beide environment variabelen ontbreken. Genereer met:
```bash
openssl rand -hex 32
```

### `401 Unauthorized` op alle endpoints
- Access token verlopen → frontend moet automatisch refreshen via `/api/auth/refresh`. Als dat ook 401 geeft, is de refresh-cookie ongeldig of verlopen → opnieuw inloggen.
- Cookie wordt niet meegestuurd → check dat `withCredentials: true` aan staat in axios én dat je via dezelfde origin werkt (dus via nginx, niet rechtstreeks naar `:3001` met andere host).

### `Refresh token ongeldig of verlopen`
Token is gerouteerd of de DB-record is `revoked`. Loguit + opnieuw inloggen.

### Bcrypt build errors bij `npm install`
Op Alpine of Windows soms een issue. In de Dockerfile staat `apk add python3 make g++` om bcrypt vanaf source te bouwen — als het lokaal misgaat:
```bash
npm install bcrypt --build-from-source
```
Of fallback: vervang `bcrypt` door `bcryptjs` in `package.json` en in de imports.

## E-mails

### "e-mail verzenden mislukt"
- Check `EMAIL_ENABLED=true` in `.env`
- SMTP-credentials kloppen niet — bij Gmail: gebruik een [App Password](https://myaccount.google.com/apppasswords), niet je gewone wachtwoord. Vereist 2FA.
- Poort 587 STARTTLS of 465 SSL — voor 465 wordt `secure: true` gebruikt automatisch.
- Test SMTP los met `swaks` of `nodemailer` script.

### Notificaties komen wel in de app maar niet per mail
- `EMAIL_ENABLED` staat op `false` of niet gezet
- Check backend-logs: `docker compose logs backend | grep email`
- Spam-folder bij ontvanger

## Nginx / Frontend

### `502 Bad Gateway` op alle requests
Backend of frontend container draait niet.
```bash
docker compose ps
docker compose logs backend
docker compose logs frontend
```

### `502` alleen op `/api/*`
Backend is gecrasht. Logs lezen, vaak DB-connectie of een ontbrekende env var.

### Frontend toont witte pagina
- Build is mislukt — check `docker compose logs frontend` of `frontend` Dockerfile build-output
- API URL in build is niet juist → `VITE_API_URL` moet `/api` zijn voor productie
- JS-error in browser console — check daar

### Routing geeft 404 bij refresh op `/dashboard`
Nginx fallback naar `index.html` werkt niet. In `frontend/Dockerfile` staat `try_files $uri /index.html` — die regel moet er zijn.

## Docker

### Container crasht direct na opstart
```bash
docker compose logs <service>
```
Vaakst:
- Verkeerde env vars — controleer `.env`
- Volume permissies (Linux) — `sudo chown -R 999:999 postgres_data` voor postgres
- Port conflicts — `lsof -i :5432` of `lsof -i :80` om te zien wat de poort vasthoudt

### "no space left on device"
Oude images/volumes opruimen:
```bash
docker system prune -a
docker volume prune
```
LET OP: dit kan ongebruikte volumes verwijderen.

## Cron / Notificaties

### Reminders worden niet verstuurd om 18:00
- Container moet draaien op het juiste tijdzone — voeg toe aan `docker-compose.yml` onder backend:
  ```yaml
  environment:
    TZ: Europe/Amsterdam
  ```
- `node-cron` cron-expressie controleren: `0 18 * * *` is 18:00 daily
- Test handmatig in de container:
  ```bash
  docker compose exec backend node -e "import('./src/services/reminderJob.js').then(m => m.sendShiftReminders())"
  ```

## Eerste login

### "Ongeldige inloggegevens" met seed-manager
- `SEED_MANAGER_PASSWORD` is gewijzigd nadat seed al gedraaid heeft → wachtwoord is bevroren in DB. Gebruik 'wachtwoord vergeten' of via `psql`:
  ```bash
  docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB
  DELETE FROM users WHERE email = 'manager@totaltankstation.nl';
  ```
  Daarna container herstarten — seed wordt opnieuw uitgevoerd.

### Manager account ontbreekt na restart
Seed wordt elke keer uitgevoerd maar is idempotent. Check logs `docker compose logs backend | grep seed`. Vaakste oorzaak: seed-env vars ontbreken.
