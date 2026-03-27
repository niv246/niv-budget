import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { requireAuth, requireOwner } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (_req: Request, res: Response) => {
  try {
    const sources = await prisma.incomeSource.findMany({ orderBy: { name: 'asc' } });
    res.json(sources);
  } catch (error) {
    console.error('Get income error:', error);
    res.status(500).json({ error: 'Failed to get income sources' });
  }
});

router.post('/', requireOwner, async (req: Request, res: Response) => {
  try {
    const { name, amount } = req.body;
    if (!name || !amount) {
      res.status(400).json({ error: 'Name and amount required' });
      return;
    }
    const source = await prisma.incomeSource.create({
      data: { name, amount: parseFloat(amount), userId: req.user!.id },
    });
    res.status(201).json(source);
  } catch (error) {
    console.error('Create income error:', error);
    res.status(500).json({ error: 'Failed to create income source' });
  }
});

router.put('/:id', requireOwner, async (req: Request, res: Response) => {
  try {
    const { name, amount, isActive } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (amount !== undefined) data.amount = parseFloat(amount);
    if (isActive !== undefined) data.isActive = isActive;

    const source = await prisma.incomeSource.update({
      where: { id: req.params.id },
      data,
    });
    res.json(source);
  } catch (error) {
    console.error('Update income error:', error);
    res.status(500).json({ error: 'Failed to update income source' });
  }
});

router.delete('/:id', requireOwner, async (req: Request, res: Response) => {
  try {
    await prisma.incomeSource.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete income error:', error);
    res.status(500).json({ error: 'Failed to delete income source' });
  }
});

export default router;
