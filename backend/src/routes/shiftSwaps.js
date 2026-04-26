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
        requester: { select: { firstName: true, lastName: true } },
      },
    });

    const date = swap.scheduleEntry.date.toLocaleDateString('nl-NL', { day: '2-digit', month: 'long' });
    await notify({
      userId: targetId,
      type: 'SWAP_REQUEST',
      message: `${swap.requester.firstName} ${swap.requester.lastName} vraagt of je een dienst kunt overnemen op ${date} (dienst ${swap.scheduleEntry.shift.name})`,
      emailSubject: 'Nieuwe dienstruil-aanvraag',
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
    const isManager = req.user.role === 'MANAGER';

    const swap = await prisma.shiftSwap.findUnique({
      where: { id: req.params.id },
      include: {
        scheduleEntry: { include: { shift: true } },
        proposedEntry: true,
        requester: { select: { id: true, firstName: true, lastName: true } },
        target: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!swap) throw notFound('Verzoek niet gevonden');

    const date = swap.scheduleEntry.date.toLocaleDateString('nl-NL', { day: '2-digit', month: 'long' });

    if (isManager) {
      // Manager keurt goed of af nadat target al akkoord is
      if (swap.status !== 'MANAGER_PENDING') {
        throw badRequest('Dit verzoek wacht nog op goedkeuring van de collega');
      }

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
          await tx.shiftSwap.update({ where: { id: swap.id }, data: { status: 'ACCEPTED' } });
        });

        const msg = `De manager heeft de dienstruil op ${date} goedgekeurd`;
        await notify({ userId: swap.requesterId, type: 'SWAP_ACCEPTED', message: msg });
        await notify({ userId: swap.targetId, type: 'SWAP_ACCEPTED', message: msg });
      } else {
        await prisma.shiftSwap.update({ where: { id: swap.id }, data: { status: 'DECLINED' } });

        const msg = `De manager heeft de dienstruil op ${date} afgewezen`;
        await notify({ userId: swap.requesterId, type: 'SWAP_DECLINED', message: msg });
        await notify({ userId: swap.targetId, type: 'SWAP_DECLINED', message: msg });
      }
    } else {
      // Medewerker (target) reageert op de aanvraag
      if (swap.status !== 'PENDING') throw badRequest('Verzoek is al beoordeeld');
      if (swap.targetId !== req.user.id) throw forbidden('Dit verzoek is niet aan jou gericht');

      if (status === 'ACCEPTED') {
        // Niet meteen omwisselen — eerst manager laten goedkeuren
        await prisma.shiftSwap.update({ where: { id: swap.id }, data: { status: 'MANAGER_PENDING' } });

        // Notificeer aanvrager
        await notify({
          userId: swap.requesterId,
          type: 'SWAP_ACCEPTED',
          message: `${swap.target.firstName} heeft de dienstruil op ${date} geaccepteerd — wacht nu op goedkeuring van de manager`,
        });

        // Notificeer alle managers
        const managers = await prisma.user.findMany({
          where: { role: 'MANAGER', isActive: true },
          select: { id: true },
        });
        await Promise.all(
          managers.map((m) =>
            notify({
              userId: m.id,
              type: 'SWAP_REQUEST',
              message: `${swap.requester.firstName} ${swap.requester.lastName} en ${swap.target.firstName} ${swap.target.lastName} willen van dienst ruilen op ${date} (dienst ${swap.scheduleEntry.shift.name}) — jouw goedkeuring is vereist`,
            })
          )
        );
      } else {
        await prisma.shiftSwap.update({ where: { id: swap.id }, data: { status: 'DECLINED' } });

        await notify({
          userId: swap.requesterId,
          type: 'SWAP_DECLINED',
          message: `${swap.target.firstName} heeft de dienstruil-aanvraag op ${date} afgewezen`,
        });
      }
    }

    res.json({ success: true });
  })
);

export default router;
