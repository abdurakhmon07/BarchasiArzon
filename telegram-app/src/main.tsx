import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { tg } from "./telegram";
import "./styles.css";

// Tell Telegram the app is ready (hides its loading placeholder) and use the full height.
tg?.ready();
tg?.expand();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
