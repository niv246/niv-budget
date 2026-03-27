import TelegramBot from 'node-telegram-bot-api';
import prisma from '../prisma';
import { parseExpenseMessage, isHighAmount } from './parser';
import { categorize } from './categorizer';
import { getBudgetStatus, getCategoryBreakdown, getLoanStatus } from '../services/budget';
import * as R from './responses';

interface PendingExpense {
  description: string;
  amount: number;
  userId: string;
  timestamp: number;
}

// In-memory pending confirmations (chatId → pending expense)
const pendingConfirmations = new Map<number, PendingExpense>();
const PENDING_TTL = 60_000; // 60 seconds

// Track last expense per user for /undo
const lastExpenseMap = new Map<string, { expenseId: string; timestamp: number }>();
const UNDO_TTL = 5 * 60_000; // 5 minutes

function getCurrentMonth() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export async function handleMessage(bot: TelegramBot, msg: TelegramBot.Message) {
  const chatId = msg.chat.id;

  try {
    // Ignore non-text messages
    if (!msg.text) {
      await bot.sendMessage(chatId, R.TEXT_ONLY_MESSAGE);
      return;
    }

    const text = msg.text.trim();

    // Handle commands
    if (text.startsWith('/')) {
      await handleCommand(bot, chatId, text);
      return;
    }

    // Check for pending confirmation
    const pending = pendingConfirmations.get(chatId);
    if (pending) {
      if (Date.now() - pending.timestamp > PENDING_TTL) {
        pendingConfirmations.delete(chatId);
        await bot.sendMessage(chatId, '⏰ הזמן לאישור עבר. שלח את ההוצאה מחדש.');
        return;
      }

      if (text === 'כן' || text.toLowerCase() === 'yes') {
        pendingConfirmations.delete(chatId);
        await recordExpense(bot, chatId, pending.description, pending.amount, pending.userId);
        return;
      } else {
        pendingConfirmations.delete(chatId);
        await bot.sendMessage(chatId, R.CANCEL_MESSAGE);
        return;
      }
    }

    // Parse expense message
    const parsed = parseExpenseMessage(text);
    if (!parsed) {
      await bot.sendMessage(chatId, R.PARSE_ERROR_MESSAGE);
      return;
    }

    // Find user by chatId
    const user = await prisma.user.findUnique({ where: { telegramChatId: chatId.toString() } });
    if (!user) {
      await bot.sendMessage(chatId, 'חשבון לא מחובר. שלח /start או /connect <token>');
      return;
    }

    if (user.role !== 'OWNER') {
      await bot.sendMessage(chatId, 'רק הבעלים יכול לרשום הוצאות');
      return;
    }

    // Check for high amount confirmation
    if (isHighAmount(parsed.amount)) {
      pendingConfirmations.set(chatId, {
        description: parsed.description,
        amount: parsed.amount,
        userId: user.id,
        timestamp: Date.now(),
      });
      await bot.sendMessage(chatId, R.confirmHighAmount(parsed.amount));
      return;
    }

    await recordExpense(bot, chatId, parsed.description, parsed.amount, user.id);
  } catch (error) {
    console.error('Bot message error:', error);
    await bot.sendMessage(chatId, R.DB_ERROR_MESSAGE);
  }
}

async function recordExpense(bot: TelegramBot, chatId: number, description: string, amount: number, userId: string) {
  const { month, year } = getCurrentMonth();
  const categoryId = await categorize(description);

  const expense = await prisma.expense.create({
    data: { description, amount, categoryId, userId, month, year, source: 'TELEGRAM' },
    include: { category: true },
  });

  // Track for /undo
  lastExpenseMap.set(userId, { expenseId: expense.id, timestamp: Date.now() });

  const budget = await getBudgetStatus(month, year);

  await bot.sendMessage(
    chatId,
    R.expenseRecorded(description, amount, expense.category.name, expense.category.icon, budget.remaining),
  );

  // Check budget alert threshold
  const settings = budget.settings;
  if (settings.monthlyBudgetLimit && settings.monthlyBudgetLimit > 0) {
    const usedPercent = Math.round((budget.totalVariable / settings.monthlyBudgetLimit) * 100);
    if (usedPercent >= settings.alertThreshold) {
      await bot.sendMessage(chatId, R.budgetAlert(settings.alertThreshold, budget.remaining, budget.availableBudget));
    }
  } else if (budget.budgetPercent >= settings.alertThreshold) {
    await bot.sendMessage(chatId, R.budgetAlert(settings.alertThreshold, budget.remaining, budget.availableBudget));
  }
}

async function handleCommand(bot: TelegramBot, chatId: number, text: string) {
  const parts = text.split(/\s+/);
  const command = parts[0].toLowerCase().replace(/@.*$/, ''); // Remove @botname suffix

  switch (command) {
    case '/start':
      await handleStart(bot, chatId);
      break;
    case '/connect':
      await handleConnect(bot, chatId, parts[1]);
      break;
    case '/status':
      await handleStatus(bot, chatId);
      break;
    case '/history':
      await handleHistory(bot, chatId);
      break;
    case '/summary':
      await handleSummary(bot, chatId);
      break;
    case '/loan':
      await handleLoan(bot, chatId);
      break;
    case '/undo':
      await handleUndo(bot, chatId);
      break;
    case '/export':
      await handleExport(bot, chatId, parts);
      break;
    case '/cancel':
      await handleCancel(bot, chatId);
      break;
    case '/help':
      await bot.sendMessage(chatId, R.HELP_MESSAGE);
      break;
    default:
      await bot.sendMessage(chatId, R.UNKNOWN_COMMAND_MESSAGE);
  }
}

async function handleStart(bot: TelegramBot, chatId: number) {
  // Check if any user already has this chatId
  const existing = await prisma.user.findUnique({ where: { telegramChatId: chatId.toString() } });
  if (existing) {
    await bot.sendMessage(chatId, R.WELCOME_MESSAGE);
    return;
  }

  // Check if OWNER has no chatId yet → link this user as owner
  const owner = await prisma.user.findFirst({ where: { role: 'OWNER', telegramChatId: null } });
  if (owner) {
    await prisma.user.update({
      where: { id: owner.id },
      data: { telegramChatId: chatId.toString() },
    });
    await bot.sendMessage(chatId, R.OWNER_REGISTERED_MESSAGE + '\n\n' + R.WELCOME_MESSAGE);
    return;
  }

  // Owner already registered
  await bot.sendMessage(chatId, R.ALREADY_REGISTERED_MESSAGE);
}

async function handleConnect(bot: TelegramBot, chatId: number, token?: string) {
  if (!token) {
    await bot.sendMessage(chatId, 'שימוש: /connect <token>');
    return;
  }

  const user = await prisma.user.findUnique({ where: { accessToken: token } });
  if (!user) {
    await bot.sendMessage(chatId, R.CONNECT_INVALID_MESSAGE);
    return;
  }

  if (user.telegramChatId) {
    await bot.sendMessage(chatId, 'חשבון זה כבר מחובר לטלגרם');
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { telegramChatId: chatId.toString() },
  });

  await bot.sendMessage(chatId, R.CONNECT_SUCCESS_MESSAGE);
}

async function handleStatus(bot: TelegramBot, chatId: number) {
  const { month, year } = getCurrentMonth();
  const budget = await getBudgetStatus(month, year);
  await bot.sendMessage(chatId, R.statusMessage(budget.remaining, budget.availableBudget, budget.budgetPercent));
}

async function handleHistory(bot: TelegramBot, chatId: number) {
  const expenses = await prisma.expense.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: { category: true },
  });

  const formatted = expenses.map((e) => ({
    description: e.description,
    amount: e.amount,
    categoryIcon: e.category.icon,
    createdAt: e.createdAt,
  }));

  await bot.sendMessage(chatId, R.historyMessage(formatted));
}

async function handleSummary(bot: TelegramBot, chatId: number) {
  const { month, year } = getCurrentMonth();
  const budget = await getBudgetStatus(month, year);
  const categories = await getCategoryBreakdown(month, year);

  await bot.sendMessage(
    chatId,
    R.summaryMessage(
      budget.totalIncome,
      budget.totalFixed,
      budget.loanMonthlyPayment,
      budget.totalVariable,
      budget.remaining,
      categories,
    ),
  );
}

async function handleLoan(bot: TelegramBot, chatId: number) {
  const loan = await getLoanStatus();
  await bot.sendMessage(chatId, R.loanMessage(loan.paid, loan.total, loan.monthsLeft));
}

async function handleUndo(bot: TelegramBot, chatId: number) {
  const user = await prisma.user.findUnique({ where: { telegramChatId: chatId.toString() } });
  if (!user || user.role !== 'OWNER') {
    await bot.sendMessage(chatId, 'רק הבעלים יכול לבטל הוצאות');
    return;
  }

  const last = lastExpenseMap.get(user.id);
  if (!last) {
    await bot.sendMessage(chatId, R.UNDO_NOTHING_MESSAGE);
    return;
  }

  if (Date.now() - last.timestamp > UNDO_TTL) {
    lastExpenseMap.delete(user.id);
    await bot.sendMessage(chatId, R.UNDO_TOO_LATE_MESSAGE);
    return;
  }

  const expense = await prisma.expense.findUnique({ where: { id: last.expenseId }, include: { category: true } });
  if (!expense) {
    lastExpenseMap.delete(user.id);
    await bot.sendMessage(chatId, R.UNDO_NOTHING_MESSAGE);
    return;
  }

  await prisma.expense.delete({ where: { id: expense.id } });
  lastExpenseMap.delete(user.id);

  const { month, year } = getCurrentMonth();
  const budget = await getBudgetStatus(month, year);

  await bot.sendMessage(chatId, R.undoMessage(expense.description, expense.amount, budget.remaining));
}

async function handleExport(bot: TelegramBot, chatId: number, parts: string[]) {
  let month: number, year: number;

  if (parts.length >= 3) {
    month = parseInt(parts[1]);
    year = parseInt(parts[2]);
  } else {
    const now = getCurrentMonth();
    month = now.month;
    year = now.year;
  }

  if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
    await bot.sendMessage(chatId, 'שימוש: /export או /export 3 2026');
    return;
  }

  const expenses = await prisma.expense.findMany({
    where: { month, year },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });

  const total = expenses.reduce((sum: number, e) => sum + e.amount, 0);
  const formatted = expenses.map((e) => ({
    description: e.description,
    amount: e.amount,
    categoryIcon: e.category.icon,
    createdAt: e.createdAt,
  }));

  await bot.sendMessage(chatId, R.exportMessage(month, year, formatted, total));
}

async function handleCancel(bot: TelegramBot, chatId: number) {
  if (pendingConfirmations.has(chatId)) {
    pendingConfirmations.delete(chatId);
    await bot.sendMessage(chatId, R.CANCEL_MESSAGE);
  } else {
    await bot.sendMessage(chatId, R.NO_PENDING_MESSAGE);
  }
}
