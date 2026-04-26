import cron from 'node-cron';
import { prisma } from '../db.js';
import { notify } from './notificationService.js';

function startOfDay(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function sendShiftReminders() {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const day = startOfDay(tomorrow);
  const next = new Date(day);
  next.setUTCDate(next.getUTCDate() + 1);

  const entries = await prisma.scheduleEntry.findMany({
    where: {
      date: { gte: day, lt: next },
      status: 'WERKEND',
      schedule: { publishedAt: { not: null } },
    },
    include: {
      user: { select: { id: true, firstName: true, isActive: true } },
      shift: true,
    },
  });

  for (const entry of entries) {
    if (!entry.user.isActive) continue;
    const dateStr = entry.date.toLocaleDateString('nl-NL', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
    await notify({
      userId: entry.user.id,
      type: 'SHIFT_REMINDER',
      message: `Herinnering: morgen werk je dienst ${entry.shift.name} (${entry.shift.startTime}–${entry.shift.endTime})`,
      emailSubject: 'Herinnering: morgen werk je',
      emailBody: `Hallo ${entry.user.firstName},\n\nMorgen (${dateStr}) werk je dienst ${entry.shift.name} van ${entry.shift.startTime} tot ${entry.shift.endTime}.\n\nFijne werkdag!`,
    });
  }
  console.log(`reminders verzonden: ${entries.length}`);
}

export async function sendUnpublishedScheduleReminder() {
  const today = new Date();
  const targetMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const daysUntilMonthStart = Math.ceil((targetMonth - today) / (1000 * 60 * 60 * 24));
  // Alleen herinneren op precies 10 en 3 dagen voor maandstart
  if (daysUntilMonthStart !== 10 && daysUntilMonthStart !== 3) return;

  const schedule = await prisma.schedule.findUnique({
    where: { year_month: { year: targetMonth.getFullYear(), month: targetMonth.getMonth() + 1 } },
  });
  if (schedule?.publishedAt) return;

  const monthName = targetMonth.toLocaleString('nl-NL', { month: 'long' });
  const managers = await prisma.user.findMany({
    where: { role: 'MANAGER', isActive: true },
    select: { id: true },
  });

  for (const m of managers) {
    await notify({
      userId: m.id,
      type: 'SCHEDULE_NOT_PUBLISHED',
      message: `Het rooster van ${monthName} is nog niet gepubliceerd (${daysUntilMonthStart} dagen tot maandstart)`,
    });
  }
}

export function startCronJobs() {
  cron.schedule('0 18 * * *', () => {
    sendShiftReminders().catch((e) => console.error('reminder job mislukt:', e));
  });

  cron.schedule('0 9 * * *', () => {
    sendUnpublishedScheduleReminder().catch((e) =>
      console.error('unpublished reminder mislukt:', e)
    );
  });

  console.log('cron jobs gestart: dagelijkse dienst-reminders 18:00, manager-reminder 09:00');
}
