import { prisma } from '../db.js';
import { sendEmail } from './emailService.js';

export async function notify({ userId, type, message, emailSubject, emailBody }) {
  await prisma.notification.create({
    data: { userId, type, message },
  });

  if (emailSubject && emailBody) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.isActive) {
      await sendEmail({ to: user.email, subject: emailSubject, text: emailBody });
    }
  }
}

export async function notifyMany(userIds, payload) {
  await Promise.all(userIds.map((id) => notify({ userId: id, ...payload })));
}
