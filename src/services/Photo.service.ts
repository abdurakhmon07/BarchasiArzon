import { InputFile } from "grammy";
import type { Env } from "../env";
import { telegramApi, telegramFileUrl } from "../libs/telegram";
import Errors, { HttpCode, Message } from "../libs/Errors";

/**
 * Product photos live on Telegram's servers (ER: photo_file_id).
 * Upload: send the photo to the admin's own chat, keep the file_id, delete the message.
 * Display: proxy the file so the bot token never reaches the browser.
 */
class PhotoService {
  constructor(private readonly env: Env) {}

  public async upload(file: File, adminChatId: number): Promise<string> {
    const api = telegramApi(this.env);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const msg = await api.sendPhoto(adminChatId, new InputFile(bytes, file.name || "photo.jpg"), {
        disable_notification: true,
      });
      const largest = msg.photo[msg.photo.length - 1];
      await api.deleteMessage(adminChatId, msg.message_id).catch(() => undefined);
      return largest.file_id;
    } catch (err) {
      console.error("Error, photo upload", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_PHOTO);
    }
  }

  /** Downloads a photo from Telegram by file_id. */
  public async download(fileId: string): Promise<Response> {
    const file = await telegramApi(this.env).getFile(fileId);
    if (!file.file_path) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    const res = await fetch(telegramFileUrl(this.env, file.file_path));
    if (!res.ok) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return res;
  }
}

export default PhotoService;
