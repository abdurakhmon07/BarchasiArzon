import express from "express";
import path from "path";
import morgan from "morgan";
import session from "express-session";
import ConnectMongoDB from "connect-mongodb-session";
import cors from "cors";
import router from "./router";
import routerAdmin from "./router-admin";
import { getMiniAppUrl, MORGAN_FORMAT } from "./libs/config";
import { formatPrice } from "./libs/i18n";
import { Language } from "./libs/enums/user.enum";
import "./libs/types/session";

const MongoDBStore = ConnectMongoDB(session);
const store = new MongoDBStore({
  uri: String(process.env.MONGO_URL),
  collection: "sessions",
});

/** 1-ENTRANCE **/
const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan(MORGAN_FORMAT));

/** Mini App API: stateless (Telegram initData in a header), so it comes before sessions. */
const miniAppUrl = getMiniAppUrl();
app.use(
  "/api",
  cors({ origin: miniAppUrl ? new URL(miniAppUrl).origin : false, allowedHeaders: ["Authorization", "Content-Type"] }),
  router
);
app.use("/api", (_req, res) => res.status(404).json({ code: 404, message: "Not found" }));

/** 2-SESSIONS **/
app.use(
  session({
    secret: String(process.env.SESSION_SECRET),
    cookie: {
      maxAge: 1000 * 3600 * 6, // 6h
      httpOnly: true,
      sameSite: "lax", // blocks cross-site form posts to the admin panel
      secure: String(process.env.BASE_URL).startsWith("https://"),
    },
    store: store,
    resave: false,
    saveUninitialized: false,
  })
);
if (String(process.env.BASE_URL).startsWith("https://")) app.set("trust proxy", 1);

/** One-time flash message + helpers for every view */
app.use((req, res, next) => {
  res.locals.flash = req.session.flash ?? null;
  delete req.session.flash;
  res.locals.admin = req.session.user ?? null;
  res.locals.price = (n: number) => formatPrice(n, Language.UZ);
  next();
});

/** 3-VIEWS **/
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

/** 4-ROUTERS **/
app.use("/admin", routerAdmin); // SSR admin panel
app.get("/", (_req, res) => res.redirect("/admin")); // customers use the bot / Mini App

export default app;
