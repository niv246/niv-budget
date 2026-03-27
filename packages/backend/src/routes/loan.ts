import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { requireAuth, requireOwner } from '../middleware/auth';
import { getLoanStatus } from '../services/budget';

const router = Router();

router.get('/', requireAuth, async (_req: Request, res: Response) => {
  try {
    const status = await getLoanStatus();
    const payments = await prisma.loanPayment.findMany({ orderBy: { paidAt: 'desc' } });
    res.json({ ...status, payments });
  } catch (error) {
    console.error('Get loan error:', error);
    res.status(500).json({ error: 'Failed to get loan status' });
  }
});

router.post('/payment', requireOwner, async (req: Request, res: Response) => {
  try {
    const { amount, note } = req.body;
    if (!amount) {
      res.status(400).json({ error: 'Amount required' });
      return;
    }

    const payment = await prisma.loanPayment.create({
      data: { amount: parseFloat(amount), note: note || null, userId: req.user!.id },
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error('Create loan payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

export default router;
