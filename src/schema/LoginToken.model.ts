import mongoose, { Schema } from "mongoose";
import { LOGIN_TOKEN_TTL_MINUTES } from "../libs/config";

/**
 * One-time admin login links sent by the bot (not part of the ER model;
 * it replaces Burak's password login). MongoDB deletes expired tokens itself.
 */
interface LoginToken {
  token: string;
  userId: number;
  createdAt: Date;
}

const loginTokenSchema = new Schema<LoginToken>({
  token: { type: String, required: true, unique: true },
  userId: { type: Number, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now, expires: LOGIN_TOKEN_TTL_MINUTES * 60 },
});

export default mongoose.model<LoginToken>("LoginToken", loginTokenSchema);
