import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound, forbidden } from '../utils/httpError.js';
import { notify } from '../services/notificationService.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const where = {};
    if (req.user.role !== 'MANAGER') {
      where.OR = [{ requesterId: req.user.id }, { targetId: req.user.id }];
    }
    const swaps = await prisma.shiftSwap.findMany({
      where,
      include: {
        requester: { select: { id: true, firstName: true, lastName: true } },
        target: { select: { id: true, firstName: true, lastName: true } },
        scheduleEntry: { include: { shift: true } },
        proposedEntry: { include: { shift: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(swaps);
  })
);

const createSchema = z.object({
  scheduleEntryId: z.string(),
  targetId: z.string(),
  proposedEntryId: z.string().nullable().optional(),
});

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { scheduleEntryId, targetId, proposedEntryId } = createSchema.parse(req.body);

    const entry = await prisma.scheduleEntry.findUnique({ where: { id: scheduleEntryId } });
    if (!entry) throw notFound('Dienst niet gevonden');
    if (entry.userId !== req.user.id) throw forbidden('Dit is niet jouw dienst');

    if (proposedEntryId) {
      const proposed = await prisma.scheduleEntry.findUnique({ where: { id: proposedEntryId } });
      if (!proposed) throw notFound('Voorgestelde dienst niet gevonden');
      if (proposed.userId !== targetId) throw badRequest('Voorgestelde dienst hoort niet bij target');
    }

    const swap = await prisma.shiftSwap.create({
      data: {
        requesterId: req.user.id,
        targetId,
        scheduleEntryId,
        proposedEntryId: proposedEntryId || null,
      },
      include: {
        scheduleEntry: { include: { shift: true } },
        proposedEntry: { include: { shift: true } },
        requester: { select: { firstName: true, lastName: true } },
      },
    });

    const date = swap.scheduleEntry.date.toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: 'long',
    });
    const type = proposedEntryId ? 'ruil' : 'overname';
    await notify({
      userId: targetId,
      type: 'SWAP_REQUEST',
      message: `${swap.requester.firstName} vraagt een dienst${type === 'ruil' ? '' : ''}-${type} aan voor ${date} (${swap.scheduleEntry.shift.name})`,
      emailSubject: `Nieuwe dienst-${type} aanvraag`,
      emailBody: `${swap.requester.firstName} ${swap.requester.lastName} vraagt of je een dienst kunt overnemen op ${date}.`,
    });

    res.status(201).json(swap);
  })
);

const respondSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED']),
});

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { status } = respondSchema.parse(req.body);
    const swap = await prisma.shiftSwap.findUnique({
      where: { id: req.params.id },
      include: {
        scheduleEntry: true,
        proposedEntry: true,
        target: { select: { firstName: true, lastName: true } },
      },
    });
    if (!swap) throw notFound('Verzoek niet gevonden');
    if (swap.targetId !== req.user.id) throw forbidden('Dit verzoek is niet aan jou gericht');
    if (swap.status !== 'PENDING') throw badRequest('Verzoek is al beoordeeld');

    if (status === 'ACCEPTED') {
      await prisma.$transaction(async (tx) => {
        await tx.scheduleEntry.update({
          where: { id: swap.scheduleEntryId },
          data: { userId: swap.targetId },
        });
        if (swap.proposedEntryId) {
          await tx.scheduleEntry.update({
            where: { id: swap.proposedEntryId },
            data: { userId: swap.requesterId },
          });
        }
        await tx.shiftSwap.update({
          where: { id: swap.id },
          data: { status: 'ACCEPTED' },
        });
      });
    } else {
      await prisma.shiftSwap.update({ where: { id: swap.id }, data: { status: 'DECLINED' } });
    }

    const verb = status === 'ACCEPTED' ? 'geaccepteerd' : 'afgewezen';
    await notify({
      userId: swap.requesterId,
      type: status === 'ACCEPTED' ? 'SWAP_ACCEPTED' : 'SWAP_DECLINED',
      message: `${swap.target.firstName} heeft je dienst-aanvraag ${verb}`,
      emailSubject: `Dienst-aanvraag ${verb}`,
      emailBody: `Je dienst-aanvraag is ${verb} door ${swap.target.firstName} ${swap.target.lastName}.`,
    });

    res.json({ success: true });
  })
);

export default router;
