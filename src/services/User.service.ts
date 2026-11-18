import { eq, lt } from "drizzle-orm";
import type { DB } from "../db";
import { loginTokens, users, type UserRow } from "../db/schema";
import { Language, UserRole } from "../libs/enums/user.enum";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { LOGIN_TOKEN_TTL_MINUTES } from "../libs/config";
import { randomToken } from "../libs/telegramAuth";

export interface TelegramUserInput {
  telegramId: number;
  firstName: string;
  username?: string;
}

class UserService {
  constructor(private readonly db: DB) {}

  /** BOT / MINI APP **/

  /** Creates the user the first time; afterwards refreshes name, username and role (from ADMIN_IDS). */
  public async upsertFromTelegram(input: TelegramUserInput, adminIds: number[]): Promise<{ user: UserRow; isNew: boolean }> {
    const role = adminIds.includes(input.telegramId) ? UserRole.ADMIN : UserRole.CUSTOMER;
    const existing = await this.getUser(input.telegramId);
    const values = {
      firstName: (input.firstName || "User").slice(0, 100),
      username: input.username ?? null,
      role,
    };
    const [user] = await this.db
      .insert(users)
      .values({ telegramId: input.telegramId, ...values })
      .onConflictDoUpdate({ target: users.telegramId, set: { ...values, updatedAt: new Date() } })
      .returning();
    return { user, isNew: !existing };
  }

  public async getUser(telegramId: number): Promise<UserRow | undefined> {
    return this.db.select().from(users).where(eq(users.telegramId, telegramId)).get();
  }

  public async setLanguage(telegramId: number, language: Language): Promise<UserRow> {
    if (!Object.values(Language).includes(language)) throw new Errors(HttpCode.BAD_REQUEST, Message.UPDATE_FAILED);
    const [user] = await this.db
      .update(users)
      .set({ language, updatedAt: new Date() })
      .where(eq(users.telegramId, telegramId))
      .returning();
    if (!user) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return user;
  }

  /** ADMIN LOGIN (one-time links from the bot) **/

  public async createLoginToken(telegramId: number): Promise<string> {
    const user = await this.getUser(telegramId);
    if (!user || user.role !== UserRole.ADMIN) throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ADMIN);
    const token = randomToken();
    await this.db.insert(loginTokens).values({
      token,
      userId: telegramId,
      expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_MINUTES * 60 * 1000),
    });
    return token;
  }

  /** Each link works once and only before it expires; the user must still be an admin. */
  public async consumeLoginToken(token: string): Promise<UserRow> {
    const [record] = await this.db.delete(loginTokens).where(eq(loginTokens.token, String(token))).returning();
    if (!record || record.expiresAt.getTime() < Date.now()) {
      throw new Errors(HttpCode.UNAUTHORIZED, Message.INVALID_LOGIN_LINK);
    }
    const user = await this.getUser(record.userId);
    if (!user || user.role !== UserRole.ADMIN) throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ADMIN);
    return user;
  }

  /** Nightly cron: remove links nobody used. */
  public async deleteExpiredTokens(): Promise<void> {
    await this.db.delete(loginTokens).where(lt(loginTokens.expiresAt, new Date()));
  }
}

export default UserService;
