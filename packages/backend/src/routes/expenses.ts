import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { requireAuth, requireOwner } from '../middleware/auth';
import { categorize } from '../bot/categorizer';

const router = Router();

// GET /api/expenses?month=3&year=2026&category=xxx
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const categoryId = req.query.category as string | undefined;

    const where: Record<string, unknown> = { month, year };
    if (categoryId) where.categoryId = categoryId;

    const expenses = await prisma.expense.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Failed to get expenses' });
  }
});

// POST /api/expenses
router.post('/', requireOwner, async (req: Request, res: Response) => {
  try {
    const { description, amount, categoryId } = req.body;

    if (!description || !amount) {
      res.status(400).json({ error: 'Description and amount required' });
      return;
    }

    const resolvedCategoryId = categoryId || await categorize(description);
    const now = new Date();

    const expense = await prisma.expense.create({
      data: {
        description,
        amount: parseFloat(amount),
        categoryId: resolvedCategoryId,
        userId: req.user!.id,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        source: 'WEB',
      },
      include: { category: true },
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// PUT /api/expenses/:id
router.put('/:id', requireOwner, async (req: Request, res: Response) => {
  try {
    const { description, amount, categoryId } = req.body;
    const data: Record<string, unknown> = {};

    if (description !== undefined) data.description = description;
    if (amount !== undefined) data.amount = parseFloat(amount);
    if (categoryId !== undefined) data.categoryId = categoryId;

    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data,
      include: { category: true },
    });

    res.json(expense);
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', requireOwner, async (req: Request, res: Response) => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

export default router;
