import React from "react";
import ReactDOM from "react-dom/client";
import "modern-normalize/modern-normalize.css";
import "@/app/assets/css/global.css";
// Side-effect imports: settle the active profile (the per-profile stores read it when they are
// created), then rehydrate the theme/locale stores and set <html data-theme> / <html lang> before the first paint.
import "@/app/store/profileStore";
import "@/app/store/themeStore";
import "@/app/store/localeStore";
import { App } from "./App";

const container = document.getElementById("root");

if (!container) {
  throw new Error('Root element "#root" was not found in the document');
}

const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
