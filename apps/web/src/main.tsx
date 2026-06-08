import React from "react";
import ReactDOM from "react-dom/client";
import "antd/dist/reset.css";
import "./styles.css";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./state/AuthContext";
import { ThemeModeProvider } from "./state/ThemeModeContext";
import { AppThemeProvider } from "./components/AppThemeProvider";
import { AppRoutes } from "./routes";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeModeProvider>
      <ThemedApp />
    </ThemeModeProvider>
  </React.StrictMode>
);

function ThemedApp() {
  return (
    <AppThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </AppThemeProvider>
  );
}
