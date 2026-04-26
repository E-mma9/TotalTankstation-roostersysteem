import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authenticate, requireManager } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound, forbidden } from '../utils/httpError.js';
import { notify } from '../services/notificationService.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10);
    if (!year || !month || month < 1 || month > 12) {
      throw badRequest('Geldige year en month query-parameters vereist');
    }

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const where = { date: { gte: start, lt: end } };
    if (req.user.role !== 'MANAGER') where.userId = req.user.id;
    if (req.query.userId && req.user.role === 'MANAGER') {
      if (!/^[0-9a-f-]{36}$/.test(req.query.userId)) throw badRequest('Ongeldig userId');
      where.userId = req.query.userId;
    }
    if (req.query.status && req.user.role === 'MANAGER') where.status = req.query.status;

    const rows = await prisma.availability.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ userId: 'asc' }, { date: 'asc' }],
    });
    res.json(rows);
  })
);

// Manager: alle openstaande beschikbaarheidswijzigingen
router.get(
  '/pending',
  requireManager,
  asyncHandler(async (req, res) => {
    const rows = await prisma.availability.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ submittedAt: 'asc' }],
    });
    res.json(rows);
  })
);

const upsertSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  entries: z.array(
    z.object({
      date: z.string(),
      isAvailable: z.boolean(),
      notes: z.string().optional(),
    })
  ),
});

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { year, month, entries } = upsertSchema.parse(req.body);

    const today = new Date();
    const targetMonth = new Date(year, month - 1, 1);
    const maxAllowed = new Date(today.getFullYear(), today.getMonth() + 3, 1);
    if (targetMonth > maxAllowed) {
      throw badRequest('Beschikbaarheid mag max 2 maanden vooruit worden ingevuld');
    }

    await prisma.$transaction(
      entries.map((entry) => {
        const date = new Date(entry.date);
        return prisma.availability.upsert({
          where: { userId_date: { userId: req.user.id, date } },
          update: {
            isAvailable: entry.isAvailable,
            notes: entry.notes,
            submittedAt: new Date(),
            status: 'PENDING',
            reviewedById: null,
            reviewedAt: null,
          },
          create: {
            userId: req.user.id,
            date,
            isAvailable: entry.isAvailable,
            notes: entry.notes,
            status: 'PENDING',
          },
        });
      })
    );

    const managers = await prisma.user.findMany({
      where: { role: 'MANAGER', isActive: true },
      select: { id: true },
    });
    const monthLabel = new Date(year, month - 1, 1).toLocaleString('nl-NL', { month: 'long', year: 'numeric' });
    await Promise.all(
      managers.map((m) =>
        notify({
          userId: m.id,
          type: 'AVAILABILITY_SUBMITTED',
          message: `Beschikbaarheidswijziging ingediend voor ${monthLabel} — wacht op goedkeuring`,
        })
      )
    );

    res.json({ success: true, count: entries.length });
  })
);

const reviewSchema = z.object({
  status: z.enum(['APPROVED', 'DENIED']),
  reason: z.string().optional(),
});

router.patch(
  '/:id',
  requireManager,
  asyncHandler(async (req, res) => {
    const { status, reason } = reviewSchema.parse(req.body);
    const existing = await prisma.availability.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Beschikbaarheidsrecord niet gevonden');

    const updated = await prisma.availability.update({
      where: { id: req.params.id },
      data: { status, reviewedById: req.user.id, reviewedAt: new Date() },
    });

    const verb = status === 'APPROVED' ? 'goedgekeurd' : 'afgewezen';
    const dateLabel = existing.date.toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' });
    const reasonSuffix = reason ? ` — ${reason}` : '';
    await notify({
      userId: existing.userId,
      type: status === 'APPROVED' ? 'AVAILABILITY_APPROVED' : 'AVAILABILITY_DENIED',
      message: `Je beschikbaarheid voor ${dateLabel} is ${verb}${reasonSuffix}`,
    });

    res.json(updated);
  })
);

export default router;
