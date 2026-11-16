import mongoose, { Schema } from "mongoose";
import { Language, UserRole } from "../libs/enums/user.enum";
import { User } from "../libs/types/user";

/** USERS — everyone who opens the bot. _id = Telegram user ID, so no password is stored. */
const userSchema = new Schema<User>(
  {
    _id: { type: Number, required: true }, // telegram_id
    firstName: { type: String, required: true, maxlength: 100 },
    username: { type: String, maxlength: 64, default: null },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.CUSTOMER, required: true },
    language: { type: String, enum: Object.values(Language), default: Language.UZ, required: true },
  },
  { timestamps: true } // createdAt = first /start
);

export default mongoose.model<User>("User", userSchema);
