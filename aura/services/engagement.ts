import API from "./api";

/* Engagement API — comments / likes / claps / bookmarks.
   The auth token is attached automatically by the shared API client. */

const getCurrentUserId = (): string | undefined => {
  const user = JSON.parse(localStorage.getItem("currentUser") || "null");
  return user?.id || user?._id;
};

export interface PostComment {
  _id: string;
  content: string;
  createdAt?: string;
  parentId?: string | null;
  userId?: {
    _id?: string;
    FirstName?: string;
    LastName?: string;
    ProfilePicture?: string;
  } | string;
}

/* The API serializes Mongo `_id` as `id` (toJSON transform). Normalize back to
   `_id` so callers can rely on a single id field for both the comment and its
   populated author. */
const normalizeComment = (c: any): PostComment => {
  if (!c || typeof c !== "object") return c;
  const u = c.userId;
  const userId =
    u && typeof u === "object" ? { ...u, _id: u._id ?? u.id } : u;
  return { ...c, _id: c._id ?? c.id, userId };
};

/** All comments on a post (public — newest first). */
export const getComments = async (postId: string): Promise<PostComment[]> => {
  const res = await API.get(`/engagements/post/${postId}/comments`);
  const data = res.data?.data ?? res.data;
  return Array.isArray(data) ? data.map(normalizeComment) : [];
};

/** Add a comment to a post (increments the post's stats.comments). */
export const addComment = async (
  postId: string,
  content: string,
  parentId?: string,
): Promise<PostComment> => {
  const userId = getCurrentUserId();
  const res = await API.post("/engagements", {
    postId,
    userId,
    type: "comment",
    content,
    ...(parentId ? { parentId } : {}),
  });
  return normalizeComment(res.data?.data ?? res.data);
};

/** Edit one of the current user's own comments. */
export const updateComment = async (id: string, content: string) => {
  const res = await API.patch(`/engagements/${id}`, { content });
  return res.data?.data ?? res.data;
};

/** Delete an engagement (e.g. the current user's own comment). */
export const deleteComment = async (id: string) => {
  const res = await API.delete(`/engagements/${id}`);
  return res.data?.data ?? res.data;
};

/** Like a post (increments the post's stats.likes on the backend). */
export const likePost = async (postId: string) => {
  const userId = getCurrentUserId();
  const res = await API.post("/engagements", { postId, userId, type: "like" });
  return res.data?.data ?? res.data;
};

/** Remove a previously-added like (un-like). */
export const unlikePost = async (postId: string) => {
  const res = await API.delete(`/engagements/like/${postId}`);
  return res.data?.data ?? res.data;
};

/** Whether the current user has liked a given post. */
export const getLikeStatus = async (postId: string): Promise<boolean> => {
  const res = await API.get(`/engagements/like/${postId}/status`);
  const data = res.data?.data ?? res.data;
  return Boolean(data?.liked);
};

/** Record a share of a post (increments the post's stats.shares). Repeatable. */
export const sharePost = async (postId: string) => {
  const userId = getCurrentUserId();
  const res = await API.post("/engagements", { postId, userId, type: "share" });
  return res.data?.data ?? res.data;
};

/** Save (bookmark) a post so it appears in the user's profile "Saved" tab. */
export const bookmarkPost = async (postId: string) => {
  const userId = getCurrentUserId();
  const res = await API.post("/engagements", {
    postId,
    userId,
    type: "bookmark",
  });
  return res.data?.data ?? res.data;
};

/** Remove a previously saved post (un-bookmark). */
export const unbookmarkPost = async (postId: string) => {
  const res = await API.delete(`/engagements/bookmark/${postId}`);
  return res.data?.data ?? res.data;
};

/** Whether the current user has bookmarked a given post. */
export const getBookmarkStatus = async (postId: string): Promise<boolean> => {
  const res = await API.get(`/engagements/bookmark/${postId}/status`);
  const data = res.data?.data ?? res.data;
  return Boolean(data?.bookmarked);
};

/** The current user's bookmarked posts (for the profile "Saved" tab). */
export const getMyBookmarks = async (): Promise<any[]> => {
  const res = await API.get("/engagements/me/bookmarks");
  const data = res.data?.data ?? res.data;
  return Array.isArray(data) ? data : [];
};
