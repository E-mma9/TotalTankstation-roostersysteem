# Deployment op Hetzner

Stap-voor-stap voor productie-deployment van het roostersysteem op een Hetzner Cloud Server.

## 1. Server aanmaken

1. Log in op [Hetzner Cloud Console](https://console.hetzner.cloud/).
2. Maak een nieuw project + nieuwe server:
   - Image: **Ubuntu 22.04 LTS**
   - Type: minimaal **CX22** (4 GB RAM, 2 vCPU) — voor 8-15 medewerkers ruim voldoende
   - Locatie: dichtstbijzijnd datacenter (Falkenstein/Nürnberg/Helsinki)
   - SSH key: voeg je publieke sleutel toe (anders krijg je het wachtwoord via e-mail)
   - Naam: `roostersysteem`

3. Wacht tot de server beschikbaar is, noteer het IPv4 adres.

## 2. Eerste login + basisbeveiliging

```bash
ssh root@<server-ip>

# Update systeem
apt update && apt upgrade -y

# Niet-root gebruiker aanmaken
adduser deploy
usermod -aG sudo deploy

# SSH-key kopiëren
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# UFW firewall aanzetten
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

Wijzig `/etc/ssh/sshd_config` om wachtwoord-login uit te zetten:
```
PasswordAuthentication no
PermitRootLogin no
```
Daarna: `systemctl restart sshd`. Vanaf nu inloggen als `deploy@<server-ip>`.

## 3. Docker installeren

```bash
sudo apt install -y docker.io docker-compose-plugin git
sudo usermod -aG docker deploy
# Uitloggen en opnieuw inloggen zodat docker-rechten actief worden
exit
ssh deploy@<server-ip>
docker --version
docker compose version
```

## 4. Code uitchecken en .env invullen

```bash
cd ~
git clone <jouw-git-url> roostersysteem
cd roostersysteem
cp .env.example .env
nano .env
```

Belangrijk om aan te passen:
- `POSTGRES_PASSWORD` → sterk wachtwoord
- `DATABASE_URL` → zelfde wachtwoord verwerkt in de URL
- `JWT_ACCESS_SECRET` en `JWT_REFRESH_SECRET` → genereer met `openssl rand -hex 32`
- `SEED_MANAGER_EMAIL` / `SEED_MANAGER_PASSWORD`
- SMTP-instellingen + `EMAIL_ENABLED=true`
- `APP_URL=https://rooster.totaltankstation.nl` (of jouw domein)
- `COOKIE_SECURE=true` (alleen in productie, vereist HTTPS)
- `NODE_ENV=production`
- `VITE_API_URL=/api`

## 5. Eerste keer opstarten

```bash
docker compose up -d --build
docker compose logs -f backend
```
Bij de eerste start draait de backend `prisma migrate deploy` + `prisma seed` automatisch en start daarna de API. Check dat er geen errors verschijnen.

Test in de browser: `http://<server-ip>` — je hoort de loginpagina te zien.

## 6. Domeinnaam & HTTPS via Let's Encrypt

Wanneer je domein DNS-A-record naar het server-IP wijst:

```bash
sudo apt install -y certbot
docker compose stop nginx
sudo certbot certonly --standalone -d rooster.totaltankstation.nl --agree-tos -m jouw@email.nl --no-eff-email
docker compose start nginx
```

Pas dan `nginx/nginx.conf` aan om SSL te gebruiken. Vervang het `server { listen 80; ... }` blok door:

```nginx
server {
  listen 80;
  server_name rooster.totaltankstation.nl;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name rooster.totaltankstation.nl;

  ssl_certificate /etc/letsencrypt/live/rooster.totaltankstation.nl/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/rooster.totaltankstation.nl/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;

  location /api/ {
    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  location / {
    proxy_pass http://frontend;
    proxy_set_header Host $host;
  }
}
```

En mount de certificaten in `docker-compose.yml` onder de nginx service:
```yaml
  nginx:
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
```

Daarna: `docker compose up -d nginx`.

### Certificaat automatisch verlengen

```bash
sudo crontab -e
```
Voeg toe:
```
0 3 * * * certbot renew --pre-hook "docker compose -f /home/deploy/roostersysteem/docker-compose.yml stop nginx" --post-hook "docker compose -f /home/deploy/roostersysteem/docker-compose.yml start nginx"
```

## 7. Database backups

Maak een backup-script:

```bash
sudo mkdir -p /var/backups/roostersysteem
sudo chown deploy:deploy /var/backups/roostersysteem
nano ~/backup-db.sh
```

```bash
#!/bin/bash
set -e
DATE=$(date +%Y-%m-%d)
DEST=/var/backups/roostersysteem
docker compose -f /home/deploy/roostersysteem/docker-compose.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$DEST/db-$DATE.sql.gz"

# Backups ouder dan 14 dagen verwijderen
find "$DEST" -name "db-*.sql.gz" -mtime +14 -delete
```

```bash
chmod +x ~/backup-db.sh
crontab -e
```
Voeg toe:
```
0 2 * * * /home/deploy/backup-db.sh >> /home/deploy/backup.log 2>&1
```

### Restore-procedure

```bash
gunzip -c /var/backups/roostersysteem/db-2026-04-26.sql.gz | \
  docker compose exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB
```

## 8. Updates uitrollen

```bash
cd ~/roostersysteem
git pull
docker compose up -d --build
```
De backend voert eventuele nieuwe Prisma-migraties automatisch uit bij opstart.

## 9. Monitoring (optioneel)

- `docker compose ps` — status van containers
- `docker compose logs -f backend` — live logs
- `docker stats` — resource gebruik
- Voor langere termijn monitoring: overweeg [Uptime Kuma](https://github.com/louislam/uptime-kuma) op een aparte poort.
