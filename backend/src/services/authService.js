import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../db.js';
import { signAccessToken, generateRefreshToken, refreshTokenExpiry } from '../utils/jwt.js';
import { unauthorized, badRequest, notFound } from '../utils/httpError.js';
import { sendEmail } from './emailService.js';
import { config } from '../config.js';

export async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw unauthorized('Ongeldige inloggegevens');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw unauthorized('Ongeldige inloggegevens');

  const accessToken = signAccessToken(user);
  const refreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshToken, expiresAt: refreshTokenExpiry() },
  });

  return { accessToken, refreshToken, user: publicUser(user) };
}

export async function rotateRefreshToken(oldToken) {
  if (!oldToken) throw unauthorized('Geen refresh token');
  const stored = await prisma.refreshToken.findUnique({
    where: { token: oldToken },
    include: { user: true },
  });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw unauthorized('Ongeldig of verlopen refresh token');
  }
  if (!stored.user.isActive) throw unauthorized('Account inactief');

  const newToken = generateRefreshToken();
  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: { userId: stored.userId, token: newToken, expiresAt: refreshTokenExpiry() },
    }),
  ]);

  const accessToken = signAccessToken(stored.user);
  return { accessToken, refreshToken: newToken, user: publicUser(stored.user) };
}

export async function revokeRefreshToken(token) {
  if (!token) return;
  await prisma.refreshToken.updateMany({
    where: { token, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return;

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.passwordReset.create({ data: { userId: user.id, token, expiresAt } });

  const link = `${config.appUrl}/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Wachtwoord resetten — Total Tankstation Roostersysteem',
    text: `Hallo ${user.firstName},\n\nKlik op de link om je wachtwoord te resetten (geldig 1 uur):\n${link}\n\nNiet zelf aangevraagd? Negeer deze e-mail.`,
  });
}

export async function resetPassword(token, newPassword) {
  if (newPassword.length < 8) throw badRequest('Wachtwoord moet minstens 8 tekens zijn');
  const reset = await prisma.passwordReset.findUnique({ where: { token } });
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    throw badRequest('Token ongeldig of verlopen');
  }
  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash: hash, mustChangePassword: false },
    }),
    prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    prisma.refreshToken.updateMany({
      where: { userId: reset.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function changePassword(userId, currentPassword, newPassword) {
  if (newPassword.length < 8) throw badRequest('Wachtwoord moet minstens 8 tekens zijn');
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('Gebruiker niet gevonden');
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw badRequest('Huidig wachtwoord onjuist');
  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hash, mustChangePassword: false },
  });
}

export function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
  };
}
