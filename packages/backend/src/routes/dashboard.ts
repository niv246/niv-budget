import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { requireAuth } from '../middleware/auth';
import { getBudgetStatus, getCategoryBreakdown, getLoanStatus, getWeeklyComparison } from '../services/budget';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const [budget, categories, loanStatus, weeklyComparison, recentExpenses] = await Promise.all([
      getBudgetStatus(month, year),
      getCategoryBreakdown(month, year),
      getLoanStatus(),
      getWeeklyComparison(year),
      prisma.expense.findMany({
        where: { month, year },
        include: { category: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const totalExpenses = categories.reduce((sum: number, c) => sum + c.total, 0);
    const byCategory = categories
      .filter((c) => c.total > 0)
      .map((c) => ({
        ...c,
        percent: totalExpenses > 0 ? Math.round((c.total / totalExpenses) * 100) : 0,
      }));

    res.json({
      totalIncome: budget.totalIncome,
      totalFixed: budget.totalFixed,
      loanMonthlyPayment: budget.loanMonthlyPayment,
      totalVariable: budget.totalVariable,
      remaining: budget.remaining,
      budgetPercent: budget.budgetPercent,
      availableBudget: budget.availableBudget,
      byCategory,
      recentExpenses,
      loanStatus,
      weeklyComparison,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

export default router;
