import dotenv from "dotenv";
dotenv.config({ quiet: true });
import { requireEnv } from "./libs/config";
// Checked before ./app is imported, because app.ts connects the session store immediately.
["MONGO_URL", "SESSION_SECRET", "BOT_TOKEN", "BASE_URL"].forEach(requireEnv);

import net from "net";
// Node tries IPv6 and IPv4 in parallel but gives each only 250 ms. On networks where
// IPv6 doesn't work and IPv4 to Telegram is slow, every request times out. Allow 2 s.
net.setDefaultAutoSelectFamilyAttemptTimeout(2000);

import mongoose from "mongoose";
import app from "./app"; 
import { startBot } from "./bot";

mongoose
  .connect(process.env.MONGO_URL as string, {})
  .then(async () => {
    console.log("MongoDB connection succeed");
    const PORT = process.env.PORT ?? 3005;

    app.listen(PORT, function () {
      console.info(`The server is running successfully on port: ${PORT}`);
      console.info(`Admin panel on http://localhost:${PORT}/admin \n`);
    });

    await startBot();
  })
  .catch((err) => console.log("ERROR on startup", err));
