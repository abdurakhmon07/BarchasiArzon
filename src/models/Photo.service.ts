import { InputFile } from "grammy";
import { getBot } from "../libs/telegram";
import Errors, { HttpCode, Message } from "../libs/Errors";

/**
 * Product photos live on Telegram's servers (ER: photo_file_id).
 * Upload: send the photo to the admin's own chat, keep the file_id, delete the message.
 * Display in the admin panel: proxy the file so the bot token never reaches the browser.
 */
class PhotoService {
  public async upload(buffer: Buffer, filename: string, adminChatId: number): Promise<string> {
    const bot = getBot();
    try {
      const msg = await bot.api.sendPhoto(adminChatId, new InputFile(buffer, filename), {
        disable_notification: true,
      });
      const largest = msg.photo[msg.photo.length - 1];
      bot.api.deleteMessage(adminChatId, msg.message_id).catch(() => undefined);
      return largest.file_id;
    } catch (err) {
      console.error("Error, model:photo upload", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_PHOTO);
    }
  }

  /** Downloads a photo from Telegram by file_id. */
  public async download(fileId: string): Promise<{ body: ArrayBuffer; contentType: string }> {
    const bot = getBot();
    const file = await bot.api.getFile(fileId);
    if (!file.file_path) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    const res = await fetch(`https://api.telegram.org/file/bot${bot.token}/${file.file_path}`);
    if (!res.ok) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return { body: await res.arrayBuffer(), contentType: res.headers.get("content-type") ?? "image/jpeg" };
  }
}

export default PhotoService;
