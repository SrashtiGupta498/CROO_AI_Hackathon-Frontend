import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./Toast.css";

/**
 * In-app transient feedback, replacing the `window.alert()` calls the app used
 * for routine messages — including success ones ("Link copied"). A native alert
 * blocks the whole page, looks nothing like the site, names the origin
 * ("localhost:3000 says"), and cannot be styled or dismissed on a timer.
 *
 * Announcements go through a single polite live region rather than one per
 * toast: assertive would interrupt whatever a screen-reader user is reading,
 * and these are never that urgent. Errors persist until dismissed; successes
 * time out, since nothing is lost if one is missed.
 */

export type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastApi {
  /** Confirmation of something that worked. Auto-dismisses. */
  success: (message: string) => void;
  /** Something failed. Persists until dismissed — errors shouldn't vanish. */
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const AUTO_DISMISS_MS = 4000;

/** Toast without a provider used to be a crash; now it degrades to the console
 *  so a component rendered outside the tree (tests, storybook) still works. */
const FALLBACK: ToastApi = {
  success: (m) => console.info("[toast:success]", m),
  error: (m) => console.error("[toast:error]", m),
  info: (m) => console.info("[toast:info]", m),
};

export const useToast = (): ToastApi => useContext(ToastContext) ?? FALLBACK;

const ICONS: Record<ToastVariant, string> = {
  success: "check_circle",
  error: "error_outline",
  info: "info",
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
    setToasts((list) => list.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (message: string, variant: ToastVariant) => {
      const id = nextId.current++;
      // Cap the stack: a failing loop that fires on every retry should not
      // paper over the page with its own error.
      setToasts((list) => [...list, { id, message, variant }].slice(-3));
      if (variant !== "error") {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), AUTO_DISMISS_MS),
        );
      }
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push(m, "success"),
      error: (m) => push(m, "error"),
      info: (m) => push(m, "info"),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="ae-toast-viewport" data-testid="toast-viewport">
        {/* One shared live region. Toasts render inside it so their text is
            announced when it appears, without each toast claiming its own. */}
        <div aria-live="polite" aria-atomic="false" className="contents">
          {toasts.map((t) => (
            <div key={t.id} className={`ae-toast ae-toast--${t.variant}`}>
              <span className="material-icons-round ae-toast-icon" aria-hidden="true">
                {ICONS[t.variant]}
              </span>
              <p className="ae-toast-message">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="ae-toast-dismiss"
              >
                <span className="material-icons-round text-[18px]" aria-hidden="true">
                  close
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
