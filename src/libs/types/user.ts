import { Language, UserRole } from "../enums/user.enum";

/** USERS: _id is the Telegram user ID (ER: telegram_id). */
export interface User {
  _id: number;
  firstName: string;
  username?: string | null;
  role: UserRole;
  language: Language;
  createdAt: Date;
  updatedAt: Date;
}

/** Data the bot receives from Telegram when someone presses /start. */
export interface TelegramUserInput {
  telegramId: number;
  firstName: string;
  username?: string;
}
