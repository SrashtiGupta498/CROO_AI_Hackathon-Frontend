import API from "./api";

export interface NewsletterResult {
  email: string;
  subscribed: boolean;
  alreadySubscribed: boolean;
  message: string;
}

const readCurrentUser = (): any | null => {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "null");
  } catch {
    return null;
  }
};

/**
 * Public newsletter signup — works for anonymous visitors.
 * POST /v1/subscriptions/newsletter  { email, source, userId? }
 */
export const subscribeNewsletter = async (
  email: string,
  source = "footer",
): Promise<NewsletterResult> => {
  const user = readCurrentUser();
  const userId = user?._id || user?.id || undefined;
  const res = await API.post("/subscriptions/newsletter", {
    email: email.trim(),
    source,
    ...(userId ? { userId } : {}),
  });
  return res.data?.data ?? res.data;
};

/**
 * In-app "subscribe to everything" for logged-in users.
 * POST /v1/subscriptions  { targetType: 'global' }  (requires JWT)
 * Best-effort: callers should ignore failures (e.g. not logged in).
 */
export const subscribeGlobalInApp = async (): Promise<void> => {
  await API.post("/subscriptions", {
    targetType: "global",
    channels: { inApp: true },
  });
};

export const isLoggedIn = (): boolean => !!readCurrentUser()?.AccessToken;
