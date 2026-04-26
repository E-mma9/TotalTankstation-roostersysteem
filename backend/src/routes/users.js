import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../db.js';
import { authenticate, requireManager } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { conflict, notFound, badRequest } from '../utils/httpError.js';
import { publicUser } from '../services/authService.js';
import { sendEmail } from '../services/emailService.js';
import { config } from '../config.js';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive === 'true';
    const where = req.user.role === 'MANAGER' && includeInactive ? {} : { isActive: true };
    const users = await prisma.user.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { firstName: 'asc' }],
    });
    res.json(users.map(publicUser));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'MANAGER' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Geen toegang' });
    }
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw notFound('Gebruiker niet gevonden');
    res.json(publicUser(user));
  })
);

const createSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['MEDEWERKER', 'MANAGER']).default('MEDEWERKER'),
  employmentStartDate: z.string().optional(),
});

router.post(
  '/',
  requireManager,
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw conflict('E-mailadres is al in gebruik');

    const tempPassword = crypto.randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        mustChangePassword: true,
        employmentStartDate: data.employmentStartDate ? new Date(data.employmentStartDate) : new Date(),
      },
    });

    await sendEmail({
      to: user.email,
      subject: 'Welkom bij Total Tankstation Roostersysteem',
      text: `Hallo ${user.firstName},\n\nEr is een account voor je aangemaakt. Log in op ${config.appUrl} met:\n\nE-mail: ${user.email}\nTijdelijk wachtwoord: ${tempPassword}\n\nBij de eerste login moet je een nieuw wachtwoord kiezen.`,
    });

    res.status(201).json(publicUser(user));
  })
);

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.enum(['MEDEWERKER', 'MANAGER']).optional(),
  isActive: z.boolean().optional(),
  employmentEndDate: z.string().nullable().optional(),
});

router.patch(
  '/:id',
  requireManager,
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    const updates = { ...data };
    if (data.employmentEndDate !== undefined) {
      updates.employmentEndDate = data.employmentEndDate ? new Date(data.employmentEndDate) : null;
    }
    if (data.isActive === false && !updates.employmentEndDate) {
      updates.employmentEndDate = new Date();
    }
    const user = await prisma.user.update({ where: { id: req.params.id }, data: updates });
    res.json(publicUser(user));
  })
);

router.post(
  '/:id/resend-invite',
  requireManager,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw notFound('Gebruiker niet gevonden');
    if (!user.isActive) throw badRequest('Inactieve gebruiker');

    const tempPassword = crypto.randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: true },
    });
    await sendEmail({
      to: user.email,
      subject: 'Nieuw tijdelijk wachtwoord — Total Tankstation',
      text: `Hallo ${user.firstName},\n\nEr is een nieuw tijdelijk wachtwoord voor je gegenereerd:\n\nE-mail: ${user.email}\nWachtwoord: ${tempPassword}\n\nBij de volgende login moet je het wijzigen.`,
    });
    res.json({ success: true });
  })
);

export default router;
