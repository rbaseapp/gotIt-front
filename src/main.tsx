import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { FeedbackProvider } from "./components/Feedback";
import "./i18n";
import "./styles.css";
import "./production.css";

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
);
