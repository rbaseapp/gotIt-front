import { Component, type ReactNode } from "react";
import i18n from "../i18n";

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div className="empty-session" role="alert">
          <h1>{i18n.t("errors.boundaryTitle")}</h1>
          <p>{i18n.t("errors.boundaryDescription")}</p>
          <button
            className="button primary"
            onClick={() => window.location.reload()}
          >
            {i18n.t("common.reload")}
          </button>
        </div>
      );
    return this.props.children;
  }
}
