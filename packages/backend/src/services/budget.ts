import prisma from '../prisma';

export async function getBudgetStatus(month: number, year: number) {
  const settings = await prisma.userSettings.findFirst();
  if (!settings) throw new Error('Settings not found');

  const [incomeSources, fixedExpenses, expenses] = await Promise.all([
    prisma.incomeSource.findMany({ where: { isActive: true } }),
    prisma.fixedExpense.findMany({ where: { isActive: true } }),
    prisma.expense.findMany({ where: { month, year } }),
  ]);

  const totalIncome = incomeSources.reduce((sum, s) => sum + s.amount, 0);
  const totalFixed = fixedExpenses.reduce((sum, s) => sum + s.amount, 0);
  const loanMonthlyPayment = settings.loanMonthlyPayment;
  const totalVariable = expenses.reduce((sum, e) => sum + e.amount, 0);
  const availableBudget = totalIncome - totalFixed - loanMonthlyPayment;
  const remaining = availableBudget - totalVariable;
  const budgetPercent = availableBudget > 0 ? Math.round((totalVariable / availableBudget) * 100) : 0;

  return {
    totalIncome,
    totalFixed,
    loanMonthlyPayment,
    totalVariable,
    availableBudget,
    remaining,
    budgetPercent,
    settings,
  };
}

export async function getCategoryBreakdown(month: number, year: number) {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
  const expenses = await prisma.expense.findMany({
    where: { month, year },
    include: { category: true },
  });

  return categories.map((cat) => {
    const catExpenses = expenses.filter((e) => e.categoryId === cat.id);
    const total = catExpenses.reduce((sum, e) => sum + e.amount, 0);
    return {
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      total,
      count: catExpenses.length,
    };
  });
}

export async function getLoanStatus() {
  const settings = await prisma.userSettings.findFirst();
  if (!settings) throw new Error('Settings not found');

  const payments = await prisma.loanPayment.findMany();
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = settings.loanTotal - totalPaid;
  const monthsLeft = settings.loanMonthlyPayment > 0
    ? Math.ceil(remaining / settings.loanMonthlyPayment)
    : 0;

  return {
    total: settings.loanTotal,
    paid: totalPaid,
    remaining,
    monthsLeft,
    monthlyPayment: settings.loanMonthlyPayment,
    startDate: settings.loanStartDate,
  };
}

export async function getWeeklyComparison(year: number) {
  const now = new Date();
  // Get start of current week (Sunday)
  const currentDay = now.getDay();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - currentDay);
  thisWeekStart.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const lastWeekEnd = new Date(thisWeekStart);

  const [thisWeekExpenses, lastWeekExpenses] = await Promise.all([
    prisma.expense.findMany({
      where: { createdAt: { gte: thisWeekStart }, year },
    }),
    prisma.expense.findMany({
      where: { createdAt: { gte: lastWeekStart, lt: lastWeekEnd }, year },
    }),
  ]);

  const thisWeek = thisWeekExpenses.reduce((sum, e) => sum + e.amount, 0);
  const lastWeek = lastWeekExpenses.reduce((sum, e) => sum + e.amount, 0);
  const trend: 'up' | 'down' | 'same' = thisWeek > lastWeek ? 'up' : thisWeek < lastWeek ? 'down' : 'same';

  return { thisWeek, lastWeek, trend };
}
