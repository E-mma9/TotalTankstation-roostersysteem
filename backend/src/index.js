import { createApp } from './app.js';
import { config } from './config.js';
import { startCronJobs } from './services/reminderJob.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`API draait op poort ${config.port} (${config.nodeEnv})`);
  startCronJobs();
});
