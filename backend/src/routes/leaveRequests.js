import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authenticate, requireManager } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { notify } from '../services/notificationService.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const where = {};
    if (req.user.role !== 'MANAGER') where.userId = req.user.id;
    if (req.query.status) where.status = req.query.status;

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  })
);

const createSchema = z.object({
  date: z.string(),
  reason: z.string().optional(),
});

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { date, reason } = createSchema.parse(req.body);
    const day = new Date(date);
    if (Number.isNaN(day.getTime())) throw badRequest('Ongeldige datum');

    const created = await prisma.leaveRequest.create({
      data: { userId: req.user.id, date: day, reason },
    });

    const managers = await prisma.user.findMany({
      where: { role: 'MANAGER', isActive: true },
      select: { id: true },
    });
    const formatted = day.toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' });
    const employeeName = `${req.user.firstName} ${req.user.lastName}`;
    await Promise.all(
      managers.map((m) =>
        notify({
          userId: m.id,
          type: 'LEAVE_REQUEST_NEW',
          message: `${employeeName} vraagt een vrije dag aan op ${formatted}`,
        })
      )
    );

    res.status(201).json(created);
  })
);

const reviewSchema = z.object({
  status: z.enum(['APPROVED', 'DENIED']),
});

router.patch(
  '/:id',
  requireManager,
  asyncHandler(async (req, res) => {
    const { status } = reviewSchema.parse(req.body);
    const existing = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Verzoek niet gevonden');
    if (existing.status !== 'PENDING') throw badRequest('Verzoek is al beoordeeld');

    const updated = await prisma.leaveRequest.update({
      where: { id: req.params.id },
      data: { status, reviewedById: req.user.id, reviewedAt: new Date() },
    });

    const formatted = existing.date.toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const verb = status === 'APPROVED' ? 'goedgekeurd' : 'afgewezen';
    await notify({
      userId: existing.userId,
      type: status === 'APPROVED' ? 'LEAVE_APPROVED' : 'LEAVE_DENIED',
      message: `Je vrije-dagenverzoek voor ${formatted} is ${verb}`,
      emailSubject: `Vrije-dagenverzoek ${verb}`,
      emailBody: `Je verzoek voor ${formatted} is ${verb}.`,
    });

    res.json(updated);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Verzoek niet gevonden');
    if (existing.userId !== req.user.id && req.user.role !== 'MANAGER') {
      throw badRequest('Geen toegang tot dit verzoek');
    }
    if (existing.status !== 'PENDING') throw badRequest('Alleen openstaande verzoeken kunnen worden ingetrokken');
    await prisma.leaveRequest.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  })
);

export default router;
