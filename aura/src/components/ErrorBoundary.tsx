import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Catches render-time errors so one broken subtree doesn't blank the whole app.
 *
 * Before this existed, any throw during render unmounted everything — header,
 * footer and bottom nav included — leaving a white page with no way out but a
 * manual reload. React itself logs that advice to the console when it happens.
 *
 * Two boundaries are mounted (see App.tsx):
 *   - one around <Routes>, so a page crash keeps the chrome alive and the user
 *     can simply navigate somewhere else;
 *   - one around the whole shell, for the rarer case of the chrome itself
 *     throwing, where the only honest offer is a reload.
 *
 * Errors thrown in event handlers and async callbacks are NOT caught by React
 * error boundaries — those still need their own try/catch at the call site.
 */

interface Props {
  children: React.ReactNode;
  /** Changing this value clears a caught error and retries the subtree. */
  resetKey?: string;
  /** Renders the failure state. `retry` re-mounts the children. */
  fallback: (error: Error, retry: () => void) => React.ReactNode;
}

interface State {
  error: Error | null;
  /** The resetKey the current error was caught under. */
  errorKey?: string;
}

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(
    props: Props,
    state: State,
  ): Partial<State> | null {
    // A crash on /profile must not follow the user to /explore: once the reset
    // key moves on, drop the error and let the new subtree try to render.
    if (
      state.error &&
      state.errorKey !== undefined &&
      state.errorKey !== props.resetKey
    ) {
      return { error: null, errorKey: undefined };
    }
    if (state.error && state.errorKey === undefined) {
      return { errorKey: props.resetKey };
    }
    return null;
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // No error-reporting service is wired up; the console is the record. Keep
    // the component stack — it is the only pointer to which subtree threw.
    console.error(
      "Render error caught by ErrorBoundary:",
      error,
      info.componentStack,
    );
  }

  retry = () => this.setState({ error: null, errorKey: undefined });

  render() {
    if (this.state.error)
      return this.props.fallback(this.state.error, this.retry);
    return this.props.children;
  }
}

/* The message is deliberately vague about the cause — the reader can't act on a
   stack trace. In dev the real message is shown, because there the reader is
   the person who has to fix it. */
const isDev = import.meta.env.DEV;

const ErrorDetail: React.FC<{ error: Error }> = ({ error }) =>
  isDev ? (
    <pre className="mt-6 max-h-40 overflow-auto rounded-card-sm bg-paper-2 p-4 text-left text-xs leading-relaxed text-muted">
      {error.message}
    </pre>
  ) : null;

/** Page-level failure: chrome survives, so offer a retry and a way onward. */
export const RouteErrorFallback: React.FC<{
  error: Error;
  retry: () => void;
}> = ({ error, retry }) => {
  const navigate = useNavigate();
  return (
    <section
      className="min-h-[60vh] bg-paper flex items-center justify-center px-6 py-24"
      role="alert"
    >
      <div className="text-center max-w-md">
        <p className="home-eyebrow mb-4">Something went wrong</p>
        <h1 className="font-serif text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.02] tracking-[-0.03em] text-ink">
          This page didn't{" "}
          <span className="italic text-sage">load properly.</span>
        </h1>
        <p className="mt-5 text-muted leading-relaxed">
          Nothing you did caused this. Try again, or head somewhere else — the
          rest of the site is working fine.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={retry} className="ae-btn ae-btn-primary">
            Try again
          </button>
          <button
            onClick={() => navigate("/")}
            className="ae-btn ae-btn-outline"
          >
            Back home
          </button>
        </div>
        <ErrorDetail error={error} />
      </div>
    </section>
  );
};

/** Shell-level failure: the chrome itself threw, so a reload is the only offer. */
export const AppErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div
    className="min-h-screen bg-paper flex items-center justify-center px-6 py-24 font-sans"
    role="alert"
  >
    <div className="text-center max-w-md">
      <p className="home-eyebrow mb-4">Aura &amp; Earth</p>
      <h1 className="font-serif text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.02] tracking-[-0.03em] text-ink">
        We hit an <span className="italic text-sage">unexpected error.</span>
      </h1>
      <p className="mt-5 text-muted leading-relaxed">
        Reloading usually clears it. If it keeps happening, please let us know.
      </p>
      <div className="mt-8 flex justify-center">
        <button
          onClick={() => window.location.reload()}
          className="ae-btn ae-btn-primary"
        >
          Reload the page
        </button>
      </div>
      <ErrorDetail error={error} />
    </div>
  </div>
);

/**
 * Boundary for the routed page. Resets itself on navigation, so a crashed route
 * doesn't poison every page the user visits afterwards.
 */
export const RouteErrorBoundary: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary
      resetKey={pathname}
      fallback={(error, retry) => (
        <RouteErrorFallback error={error} retry={retry} />
      )}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundary;
