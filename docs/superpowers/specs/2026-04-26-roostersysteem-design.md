# Roostersysteem — Total Tankstation

**Datum:** 2026-04-26
**Status:** Goedgekeurd

## Samenvatting

Een webapplicatie die het maandelijkse Excel-rooster vervangt voor een team van 8–15 medewerkers bij Total Tankstation. De teamleider maakt en publiceert roosters digitaal; medewerkers bekijken hun eigen rooster, geven beschikbaarheid op, vragen vrije dagen aan en kunnen diensten onderling ruilen.

---

## 1. Architectuur

### Stack

| Laag | Technologie |
|------|-------------|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | Node.js + Express + Prisma ORM |
| Database | PostgreSQL 16 |
| Auth | JWT (access token 15 min + refresh token 7 dagen) |
| E-mail | Nodemailer via SMTP |
| Deployment | Docker Compose + nginx op Hetzner VPS |

### Infrastructuur

```
Hetzner VPS
├── nginx (reverse proxy, SSL-terminatie via Let's Encrypt)
├── React frontend (Vite build, geserveerd via nginx)
├── Express API (:3001)
└── PostgreSQL (:5432, intern netwerk)
```

Alles draait in Docker containers via één `docker-compose.yml`. Zodra een domeinnaam beschikbaar is, wordt HTTPS geconfigureerd via Let's Encrypt (Certbot).

---

## 2. Database Model

### Tabellen

```sql
users
  id                    UUID PRIMARY KEY
  email                 TEXT UNIQUE NOT NULL
  password_hash         TEXT NOT NULL
  first_name            TEXT NOT NULL
  last_name             TEXT NOT NULL
  role                  ENUM('MEDEWERKER', 'MANAGER')
  is_active             BOOLEAN DEFAULT true
  employment_start_date DATE
  employment_end_date   DATE  -- ingevuld bij uit dienst
  created_at            TIMESTAMPTZ

shifts  -- geseed bij opstart
  id          UUID PRIMARY KEY
  name        TEXT   -- 'V', 'M', 'A'
  start_time  TIME   -- 06:15 / 09:00 / 17:00
  end_time    TIME   -- 12:00 / 17:00 / 22:00

availability  -- medewerker geeft beschikbaarheid op
  id               UUID PRIMARY KEY
  user_id          UUID REFERENCES users
  year             INT
  month            INT
  available_dates  DATE[]
  notes            TEXT
  submitted_at     TIMESTAMPTZ
  UNIQUE(user_id, year, month)

schedules  -- maandrooster header
  id            UUID PRIMARY KEY
  year          INT
  month         INT
  created_by    UUID REFERENCES users
  published_at  TIMESTAMPTZ  -- NULL = concept
  created_at    TIMESTAMPTZ
  UNIQUE(year, month)

schedule_entries  -- één regel per medewerker per dag
  id           UUID PRIMARY KEY
  schedule_id  UUID REFERENCES schedules
  user_id      UUID REFERENCES users
  date         DATE
  shift_id     UUID REFERENCES shifts

leave_requests  -- vrije-dagenverzoeken
  id           UUID PRIMARY KEY
  user_id      UUID REFERENCES users
  date         DATE
  reason       TEXT
  status       ENUM('PENDING', 'APPROVED', 'DENIED')
  reviewed_by  UUID REFERENCES users
  reviewed_at  TIMESTAMPTZ
  created_at   TIMESTAMPTZ

shift_swaps  -- dienstovername of -ruil tussen collega's
  id                 UUID PRIMARY KEY
  requester_id       UUID REFERENCES users
  target_id          UUID REFERENCES users
  schedule_entry_id  UUID REFERENCES schedule_entries  -- dienst die overgenomen/geruild wordt
  proposed_entry_id  UUID REFERENCES schedule_entries  -- dienst van target (NULL = eenzijdige overname)
  status             ENUM('PENDING', 'ACCEPTED', 'DECLINED')
  created_at         TIMESTAMPTZ

notifications  -- in-app notificaties
  id          UUID PRIMARY KEY
  user_id     UUID REFERENCES users
  type        TEXT  -- 'SCHEDULE_PUBLISHED', 'LEAVE_APPROVED', etc.
  message     TEXT
  is_read     BOOLEAN DEFAULT false
  created_at  TIMESTAMPTZ
```

**Medewerkers uit dienst:** `is_active = false` + `employment_end_date` ingevuld. Historische data blijft bewaard voor terugkijken. Ze zijn niet meer in te roosteren.

---

## 3. API

### Authenticatie
```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

### Gebruikers (manager only voor mutaties)
```
GET    /api/users
POST   /api/users
GET    /api/users/:id
PATCH  /api/users/:id
```

### Beschikbaarheid
```
GET    /api/availability?year=&month=     (manager: iedereen; medewerker: zichzelf)
POST   /api/availability
PUT    /api/availability/:id
```

### Roosters
```
GET    /api/schedules/:year/:month
POST   /api/schedules                     (manager)
PUT    /api/schedules/:id/entries         (manager)
POST   /api/schedules/:id/publish         (manager)
```

### Vrije-dagenverzoeken
```
GET    /api/leave-requests
POST   /api/leave-requests
PATCH  /api/leave-requests/:id            (manager: goedkeuren/afwijzen)
```

### Dienstruil
```
GET    /api/shift-swaps
POST   /api/shift-swaps
PATCH  /api/shift-swaps/:id               (target: accepteren/afwijzen)
```

### Notificaties
```
GET    /api/notifications
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/read-all
```

---

## 4. Features per rol

### Medewerker
- Eigen maandrooster bekijken inclusief welke collega's dezelfde dag werken
- Beschikbaarheid opgeven (maximaal 2 maanden vooruit)
- Vrije dag aanvragen + status volgen
- Dienst aanbieden aan een collega (eenzijdige overname of wederzijdse ruil)
- Notificaties bekijken (in-app + e-mail)
- Wachtwoord resetten via e-mail

### Manager
- Maandrooster aanmaken, bewerken en publiceren
- Beschikbaarheidsoverzicht van alle medewerkers raadplegen bij het inroosteren
- Vrije-dagenverzoeken goedkeuren of afwijzen
- Dienstovername/ruilverzoeken inzien
- Medewerkers toevoegen, bewerken en uit dienst zetten
- Voormalige medewerkers apart inzien (historisch)

---

## 5. Authenticatie & Beveiliging

- **JWT:** `access_token` (15 min, in geheugen) + `refresh_token` (7 dagen, `httpOnly` cookie)
- **Wachtwoorden:** bcrypt, cost factor 12
- **Rate limiting:** max 5 loginpogingen per minuut per IP
- **CORS:** geconfigureerd op domeinnaam
- **HTTPS:** Let's Encrypt via Certbot zodra domeinnaam beschikbaar
- **Eerste login:** manager maakt account aan, medewerker ontvangt e-mail met tijdelijk wachtwoord (verloopt na 24 uur)
- **Autorisatie:** Express middleware checkt rol bij elke beveiligde route; medewerkers kunnen alleen eigen data muteren

---

## 6. UI-structuur

### Medewerker
```
/login
/dashboard                 — eigen rooster deze maand
/dashboard/collegas        — wie werkt er wanneer (alle namen per dag zichtbaar)
/beschikbaarheid           — beschikbaarheid opgeven per maand
/vrije-dagen               — verzoeken indienen & status bekijken
/dienstruil                — ruilverzoeken sturen en ontvangen
/notificaties              — alle meldingen
```

### Manager
```
/manager/rooster           — maandrooster aanmaken & publiceren
/manager/medewerkers       — teamoverzicht, toevoegen, uit dienst zetten
/manager/verzoeken         — vrije-dagen & dienstruilverzoeken beheren
```

**Styling:** TailwindCSS — clean, functioneel, volledig mobielvriendelijk.

---

## 7. Notificaties

Triggers die een notificatie (in-app + e-mail) versturen:

| Event | Ontvanger |
|-------|-----------|
| Rooster gepubliceerd | Alle actieve medewerkers |
| Herinnering: morgen werken | Medewerker met dienst de volgende dag |
| Vrije-dagenverzoek goedgekeurd/afgewezen | Aanvragende medewerker |
| Overname/ruilverzoek ontvangen | Target medewerker |
| Overname/ruilverzoek geaccepteerd/afgewezen | Aanvragende medewerker |
| Account aangemaakt (tijdelijk wachtwoord) | Nieuwe medewerker |

**Dagelijkse herinnering:** Een cron-job draait elke avond om 18:00 en stuurt iedere medewerker met een dienst voor de volgende dag een notificatie (in-app + e-mail) met het tijdstip van hun dienst.

---

## 8. Deployment

### Vereisten Hetzner VPS
- Ubuntu 22.04 LTS
- Minimaal 2 GB RAM (aanbevolen: 4 GB)
- Docker + Docker Compose geïnstalleerd

### Starten
```bash
cp .env.example .env
# .env invullen (DB wachtwoord, JWT secret, SMTP credentials)
docker-compose up -d
```

### Omgevingsvariabelen (.env.example)
```
# Database
POSTGRES_USER=roostersysteem
POSTGRES_PASSWORD=changeme
POSTGRES_DB=roostersysteem

# Backend
DATABASE_URL=postgresql://roostersysteem:changeme@postgres:5432/roostersysteem
JWT_ACCESS_SECRET=changeme
JWT_REFRESH_SECRET=changeme
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=3001

# E-mail (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=jouw@email.nl
SMTP_PASS=jouw-app-wachtwoord
SMTP_FROM=noreply@totaltankstation.nl

# Frontend
VITE_API_URL=http://localhost:3001
```

---

## 9. Documentatie & Troubleshooting

De volgende bestanden worden meegeleverd:

- `README.md` — projectoverzicht, lokaal draaien, omgevingsvariabelen
- `docs/deployment.md` — stap-voor-stap Hetzner setup (server aanmaken, Docker, SSL, firewall)
- `docs/troubleshooting.md` — veelvoorkomende problemen:
  - Database kan niet verbinden
  - JWT token verlopen / ongeldige token fouten
  - E-mails worden niet verstuurd (SMTP configuratie)
  - nginx 502 Bad Gateway
  - Docker container crasht bij opstarten
  - Prisma migraties falen
- `.env.example` — alle variabelen met uitleg en voorbeeldwaarden

---

## 10. Projectstructuur

```
roostersysteem/
├── frontend/              # React + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── api/           # API client functies
│   │   └── store/         # Auth state
│   └── Dockerfile
├── backend/               # Node.js + Express
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   └── prisma/        # Schema + migraties
│   └── Dockerfile
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
├── .env.example
├── docs/
│   ├── deployment.md
│   └── troubleshooting.md
└── README.md
```
