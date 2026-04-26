import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const EMPLOYEES = [
  { firstName: 'Filmon', lastName: 'B.', role: 'MANAGER' },
  { firstName: 'Marcia', lastName: 'V.', role: 'MEDEWERKER' },
  { firstName: 'Chay', lastName: 'D.', role: 'MEDEWERKER' },
  { firstName: 'Asse', lastName: 'K.', role: 'MEDEWERKER' },
  { firstName: 'Sanne', lastName: 'M.', role: 'MEDEWERKER' },
  { firstName: 'Karin', lastName: 'P.', role: 'MEDEWERKER' },
  { firstName: 'Esrom', lastName: 'T.', role: 'MEDEWERKER' },
  { firstName: 'Manuel', lastName: 'R.', role: 'MEDEWERKER' },
  { firstName: 'Lisa', lastName: 'B.', role: 'MEDEWERKER' },
  { firstName: 'Sandy', lastName: 'L.', role: 'MEDEWERKER' },
  { firstName: 'Ginge', lastName: 'O.', role: 'MEDEWERKER' },
];

function emailFor(emp) {
  return `${emp.firstName.toLowerCase()}@totaltankstation.nl`;
}

function ymd(d) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

async function ensureEmployees() {
  const passwordHash = await bcrypt.hash('demo1234', 12);
  const created = [];
  for (const emp of EMPLOYEES) {
    const email = emailFor(emp);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      const u = await prisma.user.update({
        where: { id: existing.id },
        data: { role: emp.role, isActive: true },
      });
      created.push(u);
      continue;
    }
    const u = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: emp.firstName,
        lastName: emp.lastName,
        role: emp.role,
        isActive: true,
        mustChangePassword: false,
        employmentStartDate: new Date('2023-01-01'),
      },
    });
    created.push(u);
  }
  const managers = created.filter((u) => u.role === 'MANAGER').length;
  console.log(`demo: ${created.length} demo-gebruikers aanwezig (${managers} manager, ${created.length - managers} medewerkers, wachtwoord: demo1234)`);
  return created;
}

async function buildSchedule(month, year, employees, shifts, publish) {
  const existing = await prisma.schedule.findUnique({
    where: { year_month: { year, month } },
  });

  const manager = await prisma.user.findFirst({ where: { role: 'MANAGER' } });
  if (!manager) throw new Error('geen manager gevonden — draai eerst de hoofdseed');

  let schedule = existing;
  if (!schedule) {
    schedule = await prisma.schedule.create({
      data: { year, month, createdById: manager.id },
    });
  } else {
    await prisma.scheduleEntry.deleteMany({ where: { scheduleId: schedule.id } });
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const entries = [];
  const shiftV = shifts.find((s) => s.name === 'V');
  const shiftM = shifts.find((s) => s.name === 'M');
  const shiftA = shifts.find((s) => s.name === 'A');

  for (let day = 1; day <= daysInMonth; day++) {
    const date = ymd(new Date(year, month - 1, day));
    const slots = [shiftV, shiftM, shiftA];
    const used = new Set();
    for (const slot of slots) {
      let pick = null;
      for (let attempt = 0; attempt < 10; attempt++) {
        const idx = (day * 7 + slot.name.charCodeAt(0) + attempt) % employees.length;
        if (!used.has(employees[idx].id)) {
          pick = employees[idx];
          used.add(pick.id);
          break;
        }
      }
      if (pick) {
        entries.push({
          scheduleId: schedule.id,
          userId: pick.id,
          date,
          shiftId: slot.id,
          status: 'WERKEND',
        });
      }
    }
  }

  await prisma.scheduleEntry.createMany({ data: entries });

  if (publish && !schedule.publishedAt) {
    await prisma.schedule.update({
      where: { id: schedule.id },
      data: { publishedAt: new Date() },
    });
  }

  console.log(
    `demo: rooster ${month}/${year} ${publish ? 'gepubliceerd' : 'concept'}, ${entries.length} diensten`
  );
  return schedule;
}

async function buildAvailability(month, year, employees) {
  const daysInMonth = new Date(year, month, 0).getDate();
  for (const emp of employees) {
    for (let day = 1; day <= daysInMonth; day++) {
      const date = ymd(new Date(year, month - 1, day));
      const dow = new Date(year, month - 1, day).getDay();
      const isAvailable = !((emp.id.charCodeAt(0) + day + dow) % 5 === 0);
      await prisma.availability.upsert({
        where: { userId_date: { userId: emp.id, date } },
        update: { isAvailable },
        create: { userId: emp.id, date, isAvailable },
      });
    }
  }
  console.log(`demo: beschikbaarheid voor ${month}/${year} ingevuld`);
}

async function buildLeaveRequests(employees) {
  const now = new Date();
  const samples = [
    {
      user: employees[0],
      offset: 14,
      reason: 'Familiebezoek',
      status: 'PENDING',
    },
    {
      user: employees[3],
      offset: 21,
      reason: 'Doktersafspraak',
      status: 'APPROVED',
    },
    {
      user: employees[5],
      offset: 7,
      reason: 'Verhuizing',
      status: 'PENDING',
    },
    {
      user: employees[7],
      offset: 30,
      reason: 'Vakantie',
      status: 'APPROVED',
    },
  ];

  const manager = await prisma.user.findFirst({ where: { role: 'MANAGER' } });

  for (const s of samples) {
    const date = ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + s.offset));
    const existing = await prisma.leaveRequest.findFirst({
      where: { userId: s.user.id, date },
    });
    if (existing) continue;
    await prisma.leaveRequest.create({
      data: {
        userId: s.user.id,
        date,
        reason: s.reason,
        status: s.status,
        reviewedById: s.status !== 'PENDING' ? manager.id : null,
        reviewedAt: s.status !== 'PENDING' ? new Date() : null,
      },
    });
  }
  console.log(`demo: ${samples.length} vrije-dagenverzoeken aangemaakt`);
}

async function buildSwap(employees, schedule) {
  const entries = await prisma.scheduleEntry.findMany({
    where: { scheduleId: schedule.id },
    orderBy: { date: 'asc' },
  });
  if (entries.length < 2) return;

  const requesterEntry = entries[5];
  const target = employees.find((e) => e.id !== requesterEntry.userId);
  if (!target) return;

  const existing = await prisma.shiftSwap.findFirst({
    where: { requesterId: requesterEntry.userId, scheduleEntryId: requesterEntry.id },
  });
  if (existing) return;

  await prisma.shiftSwap.create({
    data: {
      requesterId: requesterEntry.userId,
      targetId: target.id,
      scheduleEntryId: requesterEntry.id,
      proposedEntryId: null,
      status: 'PENDING',
    },
  });
  console.log('demo: 1 dienstovername-verzoek aangemaakt');
}

async function buildNotifications(employees) {
  const monthName = new Date().toLocaleString('nl-NL', { month: 'long' });
  const samples = [
    { user: employees[0], type: 'SCHEDULE_PUBLISHED', message: `Het rooster van ${monthName} is gepubliceerd` },
    { user: employees[1], type: 'SCHEDULE_PUBLISHED', message: `Het rooster van ${monthName} is gepubliceerd` },
    { user: employees[2], type: 'LEAVE_APPROVED', message: 'Je vrije-dagenverzoek is goedgekeurd' },
  ];
  for (const s of samples) {
    const exists = await prisma.notification.findFirst({
      where: { userId: s.user.id, type: s.type },
    });
    if (exists) continue;
    await prisma.notification.create({
      data: { userId: s.user.id, type: s.type, message: s.message },
    });
  }
  console.log(`demo: ${samples.length} notificaties aangemaakt`);
}

async function main() {
  const shifts = await prisma.shift.findMany();
  if (shifts.length < 3) {
    throw new Error('Diensten ontbreken — draai eerst de hoofdseed (`npm run prisma:seed`)');
  }

  const employees = await ensureEmployees();

  const now = new Date();
  const currentSchedule = await buildSchedule(now.getMonth() + 1, now.getFullYear(), employees, shifts, true);

  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  await buildSchedule(next.getMonth() + 1, next.getFullYear(), employees, shifts, false);

  await buildAvailability(next.getMonth() + 1, next.getFullYear(), employees);
  await buildLeaveRequests(employees);
  await buildSwap(employees, currentSchedule);
  await buildNotifications(employees);

  console.log('\ndemo data klaar.');
  console.log('Inloggen kan met:');
  console.log('  - manager: zie SEED_MANAGER_EMAIL in .env');
  console.log('  - medewerkers: <voornaam>@totaltankstation.nl / demo1234');
  console.log('    bijv. filmon@totaltankstation.nl, sanne@totaltankstation.nl, ...');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
