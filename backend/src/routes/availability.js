import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/httpError.js';

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
    if (req.query.userId && req.user.role === 'MANAGER') where.userId = req.query.userId;

    const rows = await prisma.availability.findMany({
      where,
      orderBy: [{ userId: 'asc' }, { date: 'asc' }],
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
          update: { isAvailable: entry.isAvailable, notes: entry.notes, submittedAt: new Date() },
          create: {
            userId: req.user.id,
            date,
            isAvailable: entry.isAvailable,
            notes: entry.notes,
          },
        });
      })
    );

    res.json({ success: true, count: entries.length });
  })
);

export default router;
