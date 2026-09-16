import { Component, type ReactNode } from "react";

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
          <h1>משהו השתבש בתצוגה</h1>
          <p>אפשר לטעון שוב. נתוני הדמו שנשמרו אינם נמחקים.</p>
          <button
            className="button primary"
            onClick={() => window.location.reload()}
          >
            טעינה מחדש
          </button>
        </div>
      );
    return this.props.children;
  }
}
