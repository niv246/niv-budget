import TelegramBot from 'node-telegram-bot-api';
import { env } from '../config/env';
import { handleMessage } from './commands';

let bot: TelegramBot;

export function initBot(): TelegramBot {
  bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, { polling: false });

  bot.on('message', (msg) => {
    handleMessage(bot, msg).catch((err) => {
      console.error('Bot error:', err);
    });
  });

  return bot;
}

export function getBot(): TelegramBot {
  return bot;
}
