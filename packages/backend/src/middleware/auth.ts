import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';

// Use Prisma's inferred types
type UserRecord = Awaited<ReturnType<typeof prisma.user.findUnique>> & {};

declare global {
  namespace Express {
    interface Request {
      user?: UserRecord;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization token' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const user = await prisma.user.findUnique({ where: { accessToken: token } });
    if (!user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(500).json({ error: 'Auth error' });
  }
}

export async function requireOwner(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    if (req.user?.role !== 'OWNER') {
      res.status(403).json({ error: 'Owner access required' });
      return;
    }
    next();
  });
}
