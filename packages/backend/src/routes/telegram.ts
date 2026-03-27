import { Router, Request, Response } from 'express';
import { getBot } from '../bot';

const router = Router();

router.post('/webhook', (req: Request, res: Response) => {
  try {
    const bot = getBot();
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

export default router;
