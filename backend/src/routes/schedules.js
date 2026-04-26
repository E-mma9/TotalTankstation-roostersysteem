import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authenticate, requireManager } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound, conflict } from '../utils/httpError.js';
import { notify, notifyMany } from '../services/notificationService.js';

const router = Router();
router.use(authenticate);

router.get(
  '/:year/:month',
  asyncHandler(async (req, res) => {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    if (!year || !month || month < 1 || month > 12) {
      throw badRequest('Ongeldige datum');
    }

    const schedule = await prisma.schedule.findUnique({
      where: { year_month: { year, month } },
      include: {
        entries: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            shift: true,
          },
          orderBy: [{ date: 'asc' }],
        },
      },
    });

    if (!schedule) return res.json(null);

    if (req.user.role !== 'MANAGER' && !schedule.publishedAt) {
      return res.json({ ...schedule, entries: [] });
    }

    res.json(schedule);
  })
);

router.post(
  '/',
  requireManager,
  asyncHandler(async (req, res) => {
    const { year, month } = z
      .object({ year: z.number().int(), month: z.number().int().min(1).max(12) })
      .parse(req.body);

    const existing = await prisma.schedule.findUnique({ where: { year_month: { year, month } } });
    if (existing) throw conflict('Rooster voor deze maand bestaat al');

    const schedule = await prisma.schedule.create({
      data: { year, month, createdById: req.user.id },
    });
    res.status(201).json(schedule);
  })
);

const entriesSchema = z.object({
  entries: z.array(
    z.object({
      id: z.string().optional(),
      userId: z.string(),
      date: z.string(),
      shiftId: z.string(),
      status: z.enum(['WERKEND', 'ZIEK', 'AFWEZIG']).optional(),
      notes: z.string().optional(),
    })
  ),
});

router.put(
  '/:id/entries',
  requireManager,
  asyncHandler(async (req, res) => {
    const schedule = await prisma.schedule.findUnique({ where: { id: req.params.id } });
    if (!schedule) throw notFound('Rooster niet gevonden');

    const { entries } = entriesSchema.parse(req.body);

    await prisma.$transaction(async (tx) => {
      await tx.scheduleEntry.deleteMany({ where: { scheduleId: schedule.id } });
      if (entries.length === 0) return;
      await tx.scheduleEntry.createMany({
        data: entries.map((e) => ({
          scheduleId: schedule.id,
          userId: e.userId,
          date: new Date(e.date),
          shiftId: e.shiftId,
          status: e.status || 'WERKEND',
          notes: e.notes,
        })),
      });
    });

    const updated = await prisma.schedule.findUnique({
      where: { id: schedule.id },
      include: {
        entries: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            shift: true,
          },
        },
      },
    });
    res.json(updated);
  })
);

router.post(
  '/:id/publish',
  requireManager,
  asyncHandler(async (req, res) => {
    const schedule = await prisma.schedule.findUnique({
      where: { id: req.params.id },
      include: { entries: { select: { userId: true } } },
    });
    if (!schedule) throw notFound('Rooster niet gevonden');
    if (schedule.publishedAt) throw badRequest('Rooster is al gepubliceerd');

    await prisma.schedule.update({
      where: { id: schedule.id },
      data: { publishedAt: new Date() },
    });

    const userIds = [...new Set(schedule.entries.map((e) => e.userId))];
    const monthName = new Date(schedule.year, schedule.month - 1).toLocaleString('nl-NL', { month: 'long' });
    await notifyMany(userIds, {
      type: 'SCHEDULE_PUBLISHED',
      message: `Het rooster van ${monthName} ${schedule.year} is gepubliceerd`,
      emailSubject: `Rooster ${monthName} ${schedule.year} beschikbaar`,
      emailBody: `Het rooster voor ${monthName} ${schedule.year} is gepubliceerd. Log in om je diensten te bekijken.`,
    });

    res.json({ success: true });
  })
);

router.get(
  '/shifts/all',
  asyncHandler(async (_req, res) => {
    const shifts = await prisma.shift.findMany({ orderBy: { startTime: 'asc' } });
    res.json(shifts);
  })
);

export default router;
