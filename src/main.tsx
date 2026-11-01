import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { FeedbackProvider } from "./components/Feedback";
import { i18nReady } from "./i18n";
import "./styles.css";
import "./production.css";
import "./ux.css";
import "./figma-review.css";
import "./path-review.css";
import "./learning-map.css";
import "./auth-production.css";

// The first screen needs the learner's language: render once its strings are loaded.
void i18nReady.finally(() =>
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <BrowserRouter>
        <ErrorBoundary>
          <FeedbackProvider>
            <AppProvider>
              <App />
            </AppProvider>
          </FeedbackProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </StrictMode>,
  ),
);
