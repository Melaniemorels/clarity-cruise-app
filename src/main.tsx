import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n"; // Initialize i18n before app renders

if (import.meta.env.DEV) {
  void import("./lib/auth-oauth-diagnostics").then((m) => m.logOAuthDashboardChecklistOnce());
}

createRoot(document.getElementById("root")!).render(<App />);
