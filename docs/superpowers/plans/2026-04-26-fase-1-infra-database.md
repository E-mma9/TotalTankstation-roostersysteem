# Fase 1 — Infrastructuur & Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Project skelet opzetten met Docker Compose, PostgreSQL database via Prisma, en alle Prisma migraties + seed data klaarzetten zodat fase 2 (backend) erop verder kan bouwen.

**Architecture:** Monorepo met `frontend/`, `backend/`, `nginx/` directories. Docker Compose orchestreert PostgreSQL nu, en backend+frontend containers later. Prisma schema definieert alle tabellen uit de spec. Seed-script vult de drie vaste diensten (V/M/A) en een eerste manager-account.

**Tech Stack:** Docker Compose, PostgreSQL 16, Prisma ORM, Node.js 20, bcrypt

**Spec:** `docs/superpowers/specs/2026-04-26-roostersysteem-design.md`

---

## File Structure

```
roostersysteem/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma     # data model
│   │   ├── seed.js           # seed: shifts + eerste manager
│   │   └── migrations/       # auto-generated
│   ├── package.json
│   └── .gitignore
├── frontend/                 # leeg in fase 1, gevuld in fase 3
├── nginx/
│   └── nginx.conf            # reverse proxy config (fase 4 SSL)
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

### Task 1: Repo skelet en .gitignore

**Files:**
- Create: `backend/`, `frontend/`, `nginx/` directories
- Create: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: Maak directories aan**

```bash
mkdir -p backend/prisma frontend nginx
```

- [ ] **Step 2: Schrijf root `.gitignore`**

Bestand: `.gitignore`
```
# Dependencies
node_modules/

# Environment
.env
.env.local
.env.*.local

# Build output
dist/
build/

# Logs
*.log
npm-debug.log*

# Editor
.vscode/
.idea/
*.swp
.DS_Store

# Docker
docker-compose.override.yml

# Prisma
backend/prisma/migrations/dev.db*
```

- [ ] **Step 3: Maak placeholder README**

Bestand: `README.md`
```markdown
# Total Tankstation — Roostersysteem

Webapplicatie voor het maandrooster van Total Tankstation. Vervangt het maandelijkse Excel-bestand.

## Quickstart (lokaal)

```bash
cp .env.example .env
docker-compose up -d
```

Zie `docs/deployment.md` voor productie-deployment op Hetzner.

## Architectuur

Zie `docs/superpowers/specs/2026-04-26-roostersysteem-design.md`.
```

- [ ] **Step 4: Commit**

```bash
git add .gitignore README.md
git commit -m "fase 1: repo skelet"
```

---

### Task 2: Docker Compose met PostgreSQL

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`

- [ ] **Step 1: Schrijf `.env.example`**

Bestand: `.env.example`
```
# === Database ===
POSTGRES_USER=roostersysteem
POSTGRES_PASSWORD=changeme_in_production
POSTGRES_DB=roostersysteem
POSTGRES_PORT=5432

# === Backend ===
DATABASE_URL=postgresql://roostersysteem:changeme_in_production@postgres:5432/roostersysteem
JWT_ACCESS_SECRET=changeme_generate_random_string
JWT_REFRESH_SECRET=changeme_generate_different_random_string
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=3001
NODE_ENV=development

# === Eerste manager (gebruikt door seed) ===
SEED_MANAGER_EMAIL=manager@totaltankstation.nl
SEED_MANAGER_PASSWORD=changeme_at_first_login
SEED_MANAGER_FIRST_NAME=Manager
SEED_MANAGER_LAST_NAME=Tankstation

# === E-mail (SMTP) ===
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=jouw@email.nl
SMTP_PASS=jouw-app-wachtwoord
SMTP_FROM=noreply@totaltankstation.nl

# === Frontend ===
VITE_API_URL=http://localhost:3001
```

- [ ] **Step 2: Schrijf `docker-compose.yml`** (alleen postgres in fase 1)

Bestand: `docker-compose.yml`
```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "${POSTGRES_PORT}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

- [ ] **Step 3: Kopieer .env.example naar .env voor lokaal werken**

```bash
cp .env.example .env
```

- [ ] **Step 4: Start postgres en verifieer**

```bash
docker-compose up -d postgres
docker-compose ps
```
Verwacht: `postgres` container is `healthy`.

```bash
docker-compose exec postgres psql -U roostersysteem -d roostersysteem -c "SELECT version();"
```
Verwacht: PostgreSQL 16.x versie-string.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "fase 1: docker-compose met postgres"
```

---

### Task 3: Backend Node.js project initialiseren

**Files:**
- Create: `backend/package.json`
- Create: `backend/.gitignore`
- Create: `backend/.env` (gitignored, voor Prisma CLI)

- [ ] **Step 1: Initialiseer npm project**

```bash
cd backend
npm init -y
```

- [ ] **Step 2: Vervang `backend/package.json`**

Bestand: `backend/package.json`
```json
{
  "name": "roostersysteem-backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js",
    "test": "node --experimental-vm-modules node_modules/.bin/jest",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:deploy": "prisma migrate deploy",
    "prisma:seed": "node prisma/seed.js",
    "prisma:studio": "prisma studio"
  },
  "prisma": {
    "seed": "node prisma/seed.js"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "bcrypt": "^5.1.1"
  },
  "devDependencies": {
    "prisma": "^5.22.0"
  }
}
```

- [ ] **Step 3: Backend .gitignore**

Bestand: `backend/.gitignore`
```
node_modules/
.env
.env.local
dist/
*.log
```

- [ ] **Step 4: Backend .env voor Prisma CLI (lokaal)**

Bestand: `backend/.env`
```
DATABASE_URL=postgresql://roostersysteem:changeme_in_production@localhost:5432/roostersysteem
SEED_MANAGER_EMAIL=manager@totaltankstation.nl
SEED_MANAGER_PASSWORD=changeme_at_first_login
SEED_MANAGER_FIRST_NAME=Manager
SEED_MANAGER_LAST_NAME=Tankstation
```
Let op: `localhost` (niet `postgres`) omdat we Prisma CLI buiten Docker draaien.

- [ ] **Step 5: Installeer dependencies**

```bash
cd backend && npm install
```
Verwacht: `node_modules/` aanwezig, geen install errors.

- [ ] **Step 6: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/.gitignore
git commit -m "fase 1: backend project init"
```

---

### Task 4: Prisma schema definiëren

**Files:**
- Create: `backend/prisma/schema.prisma`

- [ ] **Step 1: Schrijf het schema**

Bestand: `backend/prisma/schema.prisma`
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  MEDEWERKER
  MANAGER
}

enum LeaveStatus {
  PENDING
  APPROVED
  DENIED
}

enum SwapStatus {
  PENDING
  ACCEPTED
  DECLINED
}

model User {
  id                  String    @id @default(uuid())
  email               String    @unique
  passwordHash        String    @map("password_hash")
  firstName           String    @map("first_name")
  lastName            String    @map("last_name")
  role                Role      @default(MEDEWERKER)
  isActive            Boolean   @default(true) @map("is_active")
  employmentStartDate DateTime? @map("employment_start_date") @db.Date
  employmentEndDate   DateTime? @map("employment_end_date") @db.Date
  mustChangePassword  Boolean   @default(false) @map("must_change_password")
  createdAt           DateTime  @default(now()) @map("created_at")

  availability       Availability[]
  scheduleEntries    ScheduleEntry[]
  schedulesCreated   Schedule[]      @relation("CreatedBy")
  leaveRequests      LeaveRequest[]
  leaveReviewed      LeaveRequest[]  @relation("Reviewer")
  swapsRequested     ShiftSwap[]     @relation("Requester")
  swapsTargeted      ShiftSwap[]     @relation("Target")
  notifications      Notification[]
  passwordResets     PasswordReset[]
  refreshTokens      RefreshToken[]

  @@map("users")
}

model Shift {
  id        String   @id @default(uuid())
  name      String   @unique  // 'V', 'M', 'A'
  startTime String   @map("start_time")  // 'HH:MM'
  endTime   String   @map("end_time")    // 'HH:MM'

  scheduleEntries ScheduleEntry[]

  @@map("shifts")
}

model Availability {
  id             String   @id @default(uuid())
  userId         String   @map("user_id")
  year           Int
  month          Int
  availableDates DateTime[] @map("available_dates") @db.Date
  notes          String?
  submittedAt    DateTime @default(now()) @map("submitted_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, year, month])
  @@map("availability")
}

model Schedule {
  id          String    @id @default(uuid())
  year        Int
  month       Int
  createdById String    @map("created_by")
  publishedAt DateTime? @map("published_at")
  createdAt   DateTime  @default(now()) @map("created_at")

  createdBy User            @relation("CreatedBy", fields: [createdById], references: [id])
  entries   ScheduleEntry[]

  @@unique([year, month])
  @@map("schedules")
}

model ScheduleEntry {
  id         String   @id @default(uuid())
  scheduleId String   @map("schedule_id")
  userId     String   @map("user_id")
  date       DateTime @db.Date
  shiftId    String   @map("shift_id")

  schedule Schedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id])
  shift    Shift    @relation(fields: [shiftId], references: [id])

  swapsAsEntry    ShiftSwap[] @relation("SwapEntry")
  swapsAsProposed ShiftSwap[] @relation("SwapProposed")

  @@index([scheduleId])
  @@index([userId, date])
  @@map("schedule_entries")
}

model LeaveRequest {
  id           String      @id @default(uuid())
  userId       String      @map("user_id")
  date         DateTime    @db.Date
  reason       String?
  status       LeaveStatus @default(PENDING)
  reviewedById String?     @map("reviewed_by")
  reviewedAt   DateTime?   @map("reviewed_at")
  createdAt    DateTime    @default(now()) @map("created_at")

  user     User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  reviewer User? @relation("Reviewer", fields: [reviewedById], references: [id])

  @@index([userId])
  @@index([status])
  @@map("leave_requests")
}

model ShiftSwap {
  id              String     @id @default(uuid())
  requesterId     String     @map("requester_id")
  targetId        String     @map("target_id")
  scheduleEntryId String     @map("schedule_entry_id")
  proposedEntryId String?    @map("proposed_entry_id")  // null = eenzijdige overname
  status          SwapStatus @default(PENDING)
  createdAt       DateTime   @default(now()) @map("created_at")

  requester     User           @relation("Requester", fields: [requesterId], references: [id])
  target        User           @relation("Target", fields: [targetId], references: [id])
  scheduleEntry ScheduleEntry  @relation("SwapEntry", fields: [scheduleEntryId], references: [id])
  proposedEntry ScheduleEntry? @relation("SwapProposed", fields: [proposedEntryId], references: [id])

  @@map("shift_swaps")
}

model Notification {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  type      String   // 'SCHEDULE_PUBLISHED', 'LEAVE_APPROVED', 'SHIFT_REMINDER', etc.
  message   String
  isRead    Boolean  @default(false) @map("is_read")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@map("notifications")
}

model PasswordReset {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  token     String   @unique
  expiresAt DateTime @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("password_resets")
}

model RefreshToken {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  token     String   @unique
  expiresAt DateTime @map("expires_at")
  revokedAt DateTime? @map("revoked_at")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("refresh_tokens")
}
```

- [ ] **Step 2: Initial migration aanmaken**

Zorg dat postgres draait (Task 2 step 4), dan:
```bash
cd backend
npx prisma migrate dev --name init
```
Verwacht: `migrations/YYYYMMDDHHMMSS_init/migration.sql` aangemaakt, alle tabellen in DB.

- [ ] **Step 3: Verifieer tabellen in postgres**

```bash
docker-compose exec postgres psql -U roostersysteem -d roostersysteem -c "\dt"
```
Verwacht: 9 tabellen: `users`, `shifts`, `availability`, `schedules`, `schedule_entries`, `leave_requests`, `shift_swaps`, `notifications`, `password_resets`, `refresh_tokens` + `_prisma_migrations`.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "fase 1: prisma schema en initial migration"
```

---

### Task 5: Seed script — diensten en eerste manager

**Files:**
- Create: `backend/prisma/seed.js`

- [ ] **Step 1: Schrijf seed script**

Bestand: `backend/prisma/seed.js`
```javascript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Diensten seeden (V/M/A) — idempotent via upsert op unieke 'name'
  const shifts = [
    { name: 'V', startTime: '06:15', endTime: '12:00' },
    { name: 'M', startTime: '09:00', endTime: '17:00' },
    { name: 'A', startTime: '17:00', endTime: '22:00' },
  ];

  for (const shift of shifts) {
    await prisma.shift.upsert({
      where: { name: shift.name },
      update: { startTime: shift.startTime, endTime: shift.endTime },
      create: shift,
    });
  }
  console.log('✓ Diensten geseed (V, M, A)');

  // Eerste manager — alleen aanmaken als hij nog niet bestaat
  const email = process.env.SEED_MANAGER_EMAIL;
  const password = process.env.SEED_MANAGER_PASSWORD;
  const firstName = process.env.SEED_MANAGER_FIRST_NAME;
  const lastName = process.env.SEED_MANAGER_LAST_NAME;

  if (!email || !password || !firstName || !lastName) {
    throw new Error('Seed manager environment variables ontbreken (zie .env.example)');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✓ Manager ${email} bestaat al, overgeslagen`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role: 'MANAGER',
      mustChangePassword: true,
      employmentStartDate: new Date(),
    },
  });
  console.log(`✓ Manager aangemaakt: ${email}`);
  console.log('  → Inloggen met het wachtwoord uit SEED_MANAGER_PASSWORD');
  console.log('  → Bij eerste login moet wachtwoord gewijzigd worden');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Voer seed uit**

```bash
cd backend && npm run prisma:seed
```
Verwacht output:
```
✓ Diensten geseed (V, M, A)
✓ Manager aangemaakt: manager@totaltankstation.nl
```

- [ ] **Step 3: Verifieer in DB**

```bash
docker-compose exec postgres psql -U roostersysteem -d roostersysteem -c "SELECT name, start_time, end_time FROM shifts ORDER BY start_time;"
```
Verwacht:
```
 name | start_time | end_time
------+------------+----------
 V    | 06:15      | 12:00
 M    | 09:00      | 17:00
 A    | 17:00      | 22:00
```

```bash
docker-compose exec postgres psql -U roostersysteem -d roostersysteem -c "SELECT email, role FROM users;"
```
Verwacht: één rij met manager email en rol `MANAGER`.

- [ ] **Step 4: Test idempotentie — seed nog een keer**

```bash
cd backend && npm run prisma:seed
```
Verwacht: `Manager ... bestaat al, overgeslagen`. Geen errors. Geen dubbele shifts.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/seed.js
git commit -m "fase 1: seed script (diensten + eerste manager)"
```

---

### Task 6: Nginx placeholder config

**Files:**
- Create: `nginx/nginx.conf`

- [ ] **Step 1: Schrijf nginx config (HTTP-only voor nu — SSL komt in fase 4)**

Bestand: `nginx/nginx.conf`
```nginx
events {
  worker_connections 1024;
}

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;

  upstream backend {
    server backend:3001;
  }

  upstream frontend {
    server frontend:80;
  }

  server {
    listen 80;
    server_name _;

    # API requests → Express backend
    location /api/ {
      proxy_pass http://backend;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Alles anders → React frontend (SPA)
    location / {
      proxy_pass http://frontend;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add nginx/nginx.conf
git commit -m "fase 1: nginx reverse proxy config"
```

---

## Self-Review Checklist

Loop deze door voor je fase 1 als af beschouwt:

- [ ] `docker-compose up -d postgres` start zonder errors en `healthcheck` passeert
- [ ] `npx prisma migrate dev` heeft alle tabellen aangemaakt
- [ ] Seed script is idempotent (twee keer uitvoeren = geen errors, geen duplicates)
- [ ] Manager kan via `psql` worden teruggevonden met `role=MANAGER` en `must_change_password=true`
- [ ] Drie shifts staan in de DB met juiste tijden
- [ ] `.env` staat in `.gitignore` — `git status` toont hem niet als untracked

## Troubleshooting

**`Error: P1001: Can't reach database server`** — Postgres draait niet of `DATABASE_URL` is verkeerd. Check `docker-compose ps`. Voor Prisma CLI vanuit `backend/` moet je `localhost` gebruiken in `backend/.env`, niet `postgres`.

**`Migration failed`** — Vaak doordat de DB al state heeft van eerdere pogingen. Reset met:
```bash
cd backend && npx prisma migrate reset
```
Let op: dit wist ALLE data. Daarna `npm run prisma:seed`.

**`bcrypt installation failed`** — Op Windows soms een issue. Oplossing: `npm install bcrypt --build-from-source`. Alternatief: gebruik `bcryptjs` (pure JS) — pas dan ook `seed.js` import aan.

**Postgres container blijft `unhealthy`** — Bekijk logs: `docker-compose logs postgres`. Vaak een wachtwoord-mismatch: stop met `docker-compose down -v` (wist data!) en herstart.

---

## Definition of Done

Fase 1 is af wanneer:
1. `docker-compose up -d postgres` draait een gezonde database
2. `cd backend && npm run prisma:migrate && npm run prisma:seed` voltooit zonder errors
3. De shifts en manager staan in de database
4. Alle bestanden zijn gecommit
