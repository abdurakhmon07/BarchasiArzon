import crypto from "crypto";
import UserModel from "../schema/User.model";
import LoginTokenModel from "../schema/LoginToken.model";
import { TelegramUserInput, User } from "../libs/types/user";
import { Language, UserRole } from "../libs/enums/user.enum";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { getAdminIds, LOGIN_TOKEN_TTL_MINUTES } from "../libs/config";

class UserService {
  private readonly userModel;
  private readonly loginTokenModel;

  constructor() {
    this.userModel = UserModel;
    this.loginTokenModel = LoginTokenModel;
  }

  /** BOT **/

  /** Called on /start: creates the user the first time, refreshes name/username/role after. */
  public async upsertFromTelegram(input: TelegramUserInput): Promise<{ user: User; isNew: boolean }> {
    const role = getAdminIds().includes(input.telegramId) ? UserRole.ADMIN : UserRole.CUSTOMER;
    const existed = await this.userModel.exists({ _id: input.telegramId });

    const user = await this.userModel
      .findByIdAndUpdate(
        input.telegramId,
        {
          $set: { firstName: input.firstName.slice(0, 100), username: input.username ?? null, role },
          $setOnInsert: { language: Language.UZ },
        },
        { upsert: true, new: true, runValidators: true }
      )
      .lean<User>()
      .exec();

    return { user, isNew: !existed };
  }

  public async getUser(telegramId: number): Promise<User | null> {
    return this.userModel.findById(telegramId).lean<User>().exec();
  }

  public async setLanguage(telegramId: number, language: Language): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(telegramId, { language }, { new: true, runValidators: true })
      .lean<User>()
      .exec();
    if (!user) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return user;
  }

  /** ADMIN LOGIN (replaces Burak's password login) **/

  public async createLoginToken(telegramId: number): Promise<string> {
    const user = await this.getUser(telegramId);
    if (!user || user.role !== UserRole.ADMIN) throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ADMIN);

    const token = crypto.randomBytes(24).toString("base64url");
    await this.loginTokenModel.create({ token, userId: telegramId });
    return token;
  }

  /** Each link works once and only within the TTL; the user must still be an admin. */
  public async consumeLoginToken(token: string): Promise<User> {
    const record = await this.loginTokenModel.findOneAndDelete({ token: String(token) }).exec();
    const fresh =
      record && Date.now() - record.createdAt.getTime() < LOGIN_TOKEN_TTL_MINUTES * 60 * 1000;
    if (!record || !fresh) throw new Errors(HttpCode.UNAUTHORIZED, Message.INVALID_LOGIN_LINK);

    const user = await this.getUser(record.userId);
    if (!user || user.role !== UserRole.ADMIN) throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ADMIN);
    return user;
  }
}

export default UserService;
