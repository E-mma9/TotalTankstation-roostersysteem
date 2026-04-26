import { createApp } from './app.js';
import { config } from './config.js';
import { startCronJobs } from './services/reminderJob.js';
import { prisma } from './db.js';

async function cleanupCorruptNotifications() {
  const { count } = await prisma.notification.deleteMany({
    where: { message: { contains: 'undefined' } },
  });
  if (count > 0) console.log(`Opgeruimd: ${count} corrupte notificatie(s) verwijderd`);
}

const app = createApp();

app.listen(config.port, async () => {
  console.log(`API draait op poort ${config.port} (${config.nodeEnv})`);
  await cleanupCorruptNotifications();
  startCronJobs();
});
