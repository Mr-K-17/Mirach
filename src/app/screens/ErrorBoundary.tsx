import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // In development or local debugging, errors are kept in memory only; never logged with user data
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-screen bg-bg text-text flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full bg-surface border border-borderStrong/40 rounded-card p-6 text-center space-y-4 shadow-sm">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-danger/10 text-danger mb-2">
              <AlertCircle className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-semibold text-text">
              Something unexpected happened
            </h1>
            <p className="text-sm text-textMuted">
              Mirach encountered an error while displaying this page. Your data is safe in the cloud.
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] min-w-[44px] rounded-control bg-accent text-white font-medium text-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-all"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              <span>Reload page</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
