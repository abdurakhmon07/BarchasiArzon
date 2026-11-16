import { User } from "./user";

export interface Flash {
  type: "success" | "error";
  text: string;
}

declare module "express-session" {
  interface SessionData {
    user?: User;
    flash?: Flash;
  }
}
