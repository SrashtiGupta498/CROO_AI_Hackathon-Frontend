import API from "./api";

export interface AppNotification {
  _id: string;
  type: string;
  title: string;
  message?: string;
  postId?: string;
  categoryId?: string;
  isRead: boolean;
  createdAt?: string;
}

// Decode the `sub` (user id) from a JWT payload without any dependency.
const decodeJwtSub = (token?: string): string | undefined => {
  if (!token) return undefined;
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    return payload?.sub || payload?.id || undefined;
  } catch {
    return undefined;
  }
};

const readCurrentUser = (): any | null => {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "null");
  } catch {
    return null;
  }
};

// The GetNotifications query DTO validates `userId` as a required Mongo id,
// so we always supply it (preferring the JWT subject for correctness).
export const currentUserId = (): string | undefined => {
  const u = readCurrentUser();
  return u?._id || u?.id || decodeJwtSub(u?.AccessToken);
};

export const isLoggedIn = (): boolean => !!readCurrentUser()?.AccessToken;

/** GET /v1/notifications/unread/count → { count } */
export const getUnreadCount = async (): Promise<number> => {
  const res = await API.get("/notifications/unread/count");
  const data = res.data?.data ?? res.data;
  return Number(data?.count ?? 0);
};

/**
 * GET /v1/notifications?userId= → { total, page, limit, notifications }
 * Note: we intentionally omit page/limit — the API defaults to the 20 most
 * recent, which is what the bell shows, and passing them as query strings
 * trips the backend's numeric validation.
 */
export const getNotifications = async (): Promise<AppNotification[]> => {
  const res = await API.get("/notifications", {
    params: { userId: currentUserId() },
  });
  const data = res.data?.data ?? res.data;
  return data?.notifications ?? (Array.isArray(data) ? data : []);
};

/** PATCH /v1/notifications/read { notificationId } */
export const markNotificationRead = async (
  notificationId: string,
): Promise<void> => {
  await API.patch("/notifications/read", { notificationId });
};

/** PATCH /v1/notifications/read-all */
export const markAllNotificationsRead = async (): Promise<void> => {
  await API.patch("/notifications/read-all");
};
