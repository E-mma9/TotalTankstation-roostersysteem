import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const shifts = [
    { name: 'V', startTime: '06:15', endTime: '12:00' },
    { name: 'M', startTime: '09:00', endTime: '17:00' },
    { name: 'A', startTime: '17:00', endTime: '22:00' },
  ];

  for (const shift of shifts) {
    await prisma.shift.upsert({
      where: { name: shift.name },
      update: { startTime: shift.startTime, endTime: shift.endTime },
      create: shift,
    });
  }
  console.log('seed: shifts V/M/A klaar');

  const email = process.env.SEED_MANAGER_EMAIL;
  const password = process.env.SEED_MANAGER_PASSWORD;
  const firstName = process.env.SEED_MANAGER_FIRST_NAME;
  const lastName = process.env.SEED_MANAGER_LAST_NAME;

  if (!email || !password || !firstName || !lastName) {
    console.warn('seed: SEED_MANAGER_* env vars ontbreken, manager-account niet aangemaakt');
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`seed: manager ${email} bestaat al`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role: 'MANAGER',
      mustChangePassword: true,
      employmentStartDate: new Date(),
    },
  });
  console.log(`seed: manager aangemaakt (${email}), wachtwoord moet bij eerste login gewijzigd worden`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
