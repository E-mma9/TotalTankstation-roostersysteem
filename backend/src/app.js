import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import availabilityRoutes from './routes/availability.js';
import scheduleRoutes from './routes/schedules.js';
import leaveRoutes from './routes/leaveRequests.js';
import swapRoutes from './routes/shiftSwaps.js';
import notificationRoutes from './routes/notifications.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '500kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/availability', availabilityRoutes);
  app.use('/api/schedules', scheduleRoutes);
  app.use('/api/leave-requests', leaveRoutes);
  app.use('/api/shift-swaps', swapRoutes);
  app.use('/api/notifications', notificationRoutes);

  app.use((_req, res) => res.status(404).json({ error: 'Endpoint niet gevonden' }));
  app.use(errorHandler);

  return app;
}
