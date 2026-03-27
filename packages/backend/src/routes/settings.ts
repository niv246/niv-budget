import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { requireAuth, requireOwner } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const settings = await prisma.userSettings.findFirst();
    res.json({ ...settings, userRole: req.user!.role, userName: req.user!.name });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

router.put('/', requireOwner, async (req: Request, res: Response) => {
  try {
    const { loanTotal, loanMonthlyPayment, weeklyReportEnabled, monthlyBudgetLimit, alertThreshold, isOnboarded } = req.body;
    const settings = await prisma.userSettings.findFirst();
    if (!settings) {
      res.status(404).json({ error: 'Settings not found' });
      return;
    }

    const data: Record<string, unknown> = {};
    if (loanTotal !== undefined) data.loanTotal = parseFloat(loanTotal);
    if (loanMonthlyPayment !== undefined) data.loanMonthlyPayment = parseFloat(loanMonthlyPayment);
    if (weeklyReportEnabled !== undefined) data.weeklyReportEnabled = weeklyReportEnabled;
    if (monthlyBudgetLimit !== undefined) data.monthlyBudgetLimit = monthlyBudgetLimit === null ? null : parseFloat(monthlyBudgetLimit);
    if (alertThreshold !== undefined) data.alertThreshold = parseInt(alertThreshold);
    if (isOnboarded !== undefined) data.isOnboarded = isOnboarded;

    const updated = await prisma.userSettings.update({
      where: { id: settings.id },
      data,
    });

    res.json(updated);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
