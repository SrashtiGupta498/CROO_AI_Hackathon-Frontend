/**
 * Turns a thrown value into something worth showing a reader.
 *
 * The app used to fall back to `err.message` in a dozen places, which for axios
 * means the reader saw "Network Error", "timeout of 0ms exceeded", or "Request
 * failed with status code 500" — accurate, useless, and slightly alarming. Some
 * of those strings also leaked implementation detail (a port number, an
 * endpoint path). Everything user-facing should come through here instead.
 *
 * Order matters: the backend's own message wins where it exists, because it is
 * the only source that can name the actual problem ("Email already registered",
 * "File exceeds 5 MB"). A hardcoded string here would drift from it.
 */

/** Axios/network failure shapes we can recognise without importing axios. */
interface ErrorLike {
  response?: { status?: number; data?: { message?: string | string[] } };
  code?: string;
  message?: string;
}

/** Raw library strings that must never reach a reader. */
const OPAQUE = [
  /^network error$/i,
  /^request failed with status code/i,
  /^timeout of .* exceeded/i,
  /^canceled$/i,
  /^ecconn/i,
  /^\s*$/,
];

const isOpaque = (msg: string) => OPAQUE.some((re) => re.test(msg));

const STATUS_COPY: Record<number, string> = {
  400: "That request wasn't quite right. Please check the details and try again.",
  401: "Your session has expired — please sign in again.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  409: "That conflicts with something that already exists.",
  413: "That file is too large.",
  429: "Too many attempts — please wait a moment and try again.",
};

/**
 * @param err      the caught value
 * @param fallback what to say when nothing more specific is known. Write it as
 *                 a complete, human sentence about the ACTION that failed
 *                 ("Couldn't save your profile."), not about the transport.
 */
export const describeError = (err: unknown, fallback: string): string => {
  const e = (err ?? {}) as ErrorLike;

  // 1. The backend's own message, where it has one.
  const backendMsg = e.response?.data?.message;
  if (backendMsg) {
    const text = Array.isArray(backendMsg)
      ? backendMsg.filter(Boolean).join(", ")
      : String(backendMsg);
    if (text.trim() && !isOpaque(text)) return text;
  }

  // 2. Offline / unreachable — worth saying plainly, since retrying may work.
  if (
    e.code === "ERR_NETWORK" ||
    e.code === "ECONNABORTED" ||
    (typeof navigator !== "undefined" && navigator.onLine === false)
  ) {
    return "We can't reach the server right now. Check your connection and try again.";
  }

  // 3. A status we have human copy for.
  const status = e.response?.status;
  if (status) {
    if (STATUS_COPY[status]) return STATUS_COPY[status];
    if (status >= 500)
      return "Something went wrong on our side. Please try again in a moment.";
  }

  // 4. A message that is genuinely ours (thrown by app code, not by axios).
  const raw = typeof e.message === "string" ? e.message.trim() : "";
  if (raw && !isOpaque(raw)) return raw;

  return fallback;
};
