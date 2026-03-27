import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { requireAuth, requireOwner } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (_req: Request, res: Response) => {
  try {
    const expenses = await prisma.fixedExpense.findMany({ orderBy: { name: 'asc' } });
    res.json(expenses);
  } catch (error) {
    console.error('Get fixed error:', error);
    res.status(500).json({ error: 'Failed to get fixed expenses' });
  }
});

router.post('/', requireOwner, async (req: Request, res: Response) => {
  try {
    const { name, amount, dueDay } = req.body;
    if (!name || !amount) {
      res.status(400).json({ error: 'Name and amount required' });
      return;
    }
    const expense = await prisma.fixedExpense.create({
      data: { name, amount: parseFloat(amount), dueDay: dueDay ? parseInt(dueDay) : null, userId: req.user!.id },
    });
    res.status(201).json(expense);
  } catch (error) {
    console.error('Create fixed error:', error);
    res.status(500).json({ error: 'Failed to create fixed expense' });
  }
});

router.put('/:id', requireOwner, async (req: Request, res: Response) => {
  try {
    const { name, amount, dueDay, isActive } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (amount !== undefined) data.amount = parseFloat(amount);
    if (dueDay !== undefined) data.dueDay = dueDay ? parseInt(dueDay) : null;
    if (isActive !== undefined) data.isActive = isActive;

    const expense = await prisma.fixedExpense.update({
      where: { id: req.params.id },
      data,
    });
    res.json(expense);
  } catch (error) {
    console.error('Update fixed error:', error);
    res.status(500).json({ error: 'Failed to update fixed expense' });
  }
});

router.delete('/:id', requireOwner, async (req: Request, res: Response) => {
  try {
    await prisma.fixedExpense.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete fixed error:', error);
    res.status(500).json({ error: 'Failed to delete fixed expense' });
  }
});

export default router;
