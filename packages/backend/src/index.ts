import { env } from './config/env';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { initBot } from './bot';
import { errorHandler } from './middleware/error';
import { startWeeklyScheduler } from './services/scheduler';

import telegramRouter from './routes/telegram';
import dashboardRouter from './routes/dashboard';
import expensesRouter from './routes/expenses';
import incomeRouter from './routes/income';
import fixedRouter from './routes/fixed';
import loanRouter from './routes/loan';
import categoriesRouter from './routes/categories';
import settingsRouter from './routes/settings';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/telegram', telegramRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/income', incomeRouter);
app.use('/api/fixed', fixedRouter);
app.use('/api/loan', loanRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/settings', settingsRouter);

// Error handler
app.use(errorHandler);

// Initialize bot and start server
initBot();
startWeeklyScheduler();

app.listen(env.PORT, () => {
  console.log(`NivBudget backend running on port ${env.PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});
