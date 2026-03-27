import cron from 'node-cron';
import prisma from '../prisma';
import { getBot } from '../bot';
import { getBudgetStatus, getCategoryBreakdown, getLoanStatus } from './budget';
import { formatCurrency } from '../bot/responses';

export function startWeeklyScheduler() {
  cron.schedule('0 10 * * 0', async () => {
    console.log('Running weekly summary...');
    await sendWeeklySummary();
  }, {
    timezone: 'Asia/Jerusalem',
  });

  console.log('Weekly summary scheduler started (Sunday 10:00 IST)');
}

export async function sendWeeklySummary() {
  try {
    const bot = getBot();
    if (!bot) return;

    const settings = await prisma.userSettings.findFirst();
    if (!settings?.weeklyReportEnabled) return;

    const users = await prisma.user.findMany({
      where: { telegramChatId: { not: null } },
    });

    if (users.length === 0) return;

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const currentDay = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - currentDay);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const formatDate = (d: Date) =>
      `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;

    const budget = await getBudgetStatus(month, year);
    const categories = await getCategoryBreakdown(month, year);
    const loan = await getLoanStatus();

    const weekExpenses = await prisma.expense.findMany({
      where: { createdAt: { gte: weekStart, lte: now } },
      include: { category: true },
      orderBy: { amount: 'desc' },
      take: 3,
    });

    const catLines = categories
      .filter((c) => c.total > 0)
      .map((c) => `  ${c.icon} ${c.name}: ${formatCurrency(c.total)}`);

    const topLines = weekExpenses.map(
      (e, i: number) => `  ${i + 1}. ${e.description} — ${formatCurrency(e.amount)}`,
    );

    const message = [
      `📊 סיכום שבועי — ${formatDate(weekStart)}-${formatDate(weekEnd)}/${year}`,
      ``,
      `💰 הכנסות: ${formatCurrency(budget.totalIncome)}`,
      `📌 הוצאות קבועות: ${formatCurrency(budget.totalFixed)}`,
      `🛒 הוצאות משתנות: ${formatCurrency(budget.totalVariable)}`,
      ``,
      `📂 לפי קטגוריה:`,
      ...catLines,
      ``,
      ...(topLines.length > 0
        ? [`🔝 3 ההוצאות הגדולות השבוע:`, ...topLines, ``]
        : []),
      `💰 נשאר החודש: ${formatCurrency(budget.remaining)} מתוך ${formatCurrency(budget.availableBudget)}`,
      `📋 הלוואה: שולם ${formatCurrency(loan.paid)} מתוך ${formatCurrency(loan.total)} (נותרו ${loan.monthsLeft} חודשים)`,
    ].join('\n');

    for (const user of users) {
      try {
        await bot.sendMessage(parseInt(user.telegramChatId!), message);
      } catch (err) {
        console.error(`Failed to send summary to ${user.name}:`, err);
      }
    }

    console.log(`Weekly summary sent to ${users.length} users`);
  } catch (error) {
    console.error('Weekly summary error:', error);
  }
}
