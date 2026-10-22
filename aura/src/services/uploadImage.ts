import API from "./api";
import { API_ORIGIN } from "./config";
import { describeError } from "./errorMessage";

/* Backend origin — uploaded images come back as relative "/uploads/..." paths,
   which must be served from the API host, not the frontend dev server.
   Re-exported for existing importers; sourced from services/config.ts. */
export { API_ORIGIN };

/** Turn a stored value into something an <img src> can load. Absolute URLs and
 *  data-URLs pass through; relative "/uploads/..." paths get the API origin. */
export const toAbsoluteUrl = (url?: string | null): string => {
  if (!url) return "";
  return url.startsWith("http") || url.startsWith("data:")
    ? url
    : `${API_ORIGIN}${url}`;
};

/** Build a human-friendly message from an upload failure so the UI never shows
 *  a misleading "not logged in" for what is actually a 404 / network / size error.
 *
 *  Only the upload-specific cases live here; everything else (backend message,
 *  status copy, offline) defers to `describeError`, which is the single place
 *  that decides what a reader is allowed to see. The old 404 and Network Error
 *  strings named the API port and endpoint — useful in a terminal, noise in a
 *  toast — so they now read as ordinary failures. */
export const describeUploadError = (err: any): string => {
  const status = err?.response?.status;
  const backendMsg = err?.response?.data?.message;
  // Prefer the backend's own text where it has one — it names the actual
  // limit / unsupported format, which a hardcoded string here would drift from.
  if (!backendMsg) {
    if (status === 403) return "You don't have permission to upload images.";
    if (status === 413) return "That file is too large for the upload limit.";
  }
  return describeError(err, "Image upload failed. Please try again.");
};

/** Upload one or more image files to the backend and return their absolute URLs.
 *  Uses /upload/image for a single file and /upload/images for several. The auth
 *  token is attached automatically by the shared API client. Throws an Error
 *  whose message is safe to show to the user. */
export const uploadImageFiles = async (files: File[]): Promise<string[]> => {
  if (!files.length) return [];
  try {
    if (files.length === 1) {
      const form = new FormData();
      form.append("file", files[0]);
      const res = await API.post("/upload/image", form);
      const url = res.data?.data?.url ?? res.data?.url;
      return [toAbsoluteUrl(url)];
    }
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    const res = await API.post("/upload/images", form);
    const urls: string[] = res.data?.data?.urls ?? res.data?.urls ?? [];
    return urls.map(toAbsoluteUrl);
  } catch (err) {
    throw new Error(describeUploadError(err));
  }
};

/** Convenience wrapper for single-file uploads. */
export const uploadSingleImage = async (file: File): Promise<string> => {
  const [url] = await uploadImageFiles([file]);
  return url;
};

/** Whether a stored cover URL points to a video (so callers render <video>). */
export const isVideoUrl = (url?: string | null): boolean =>
  !!url && /\.(mp4|webm|mov|m4v|ogg|ogv)(\?|#|$)/i.test(url);

/** Upload a cover that may be an image OR a short video. Returns the absolute
 *  url plus whether it's an image or video. Throws an Error safe to display. */
export const uploadMediaFile = async (
  file: File,
): Promise<{ url: string; kind: "image" | "video" }> => {
  try {
    const form = new FormData();
    form.append("file", file);
    const res = await API.post("/upload/media", form);
    const data = res.data?.data ?? res.data;
    const url = toAbsoluteUrl(data?.url);
    const kind: "image" | "video" =
      data?.kind === "video" || isVideoUrl(url) ? "video" : "image";
    return { url, kind };
  } catch (err) {
    throw new Error(describeUploadError(err));
  }
};

/**
 * Resolve a post's cover image from its OWN document — never from static
 * assets. Priority: explicit cover field → first hero/image section image →
 * legacy imageUrl. Returns "" when the post has no image of its own (callers
 * may then show a neutral placeholder).
 */
export const getPostCover = (post: any): string => {
  if (!post) return "";

  const direct = post.thumbnailUrl || post.thumbnail || post.coverImage;
  if (direct) return toAbsoluteUrl(direct);

  if (Array.isArray(post.sections)) {
    for (const s of post.sections) {
      const type = String(s?.type || "").toLowerCase();
      if (type === "hero" && (s.image || s.images?.[0])) {
        return toAbsoluteUrl(s.image || s.images[0]);
      }
      if (type === "image" && s.images?.[0]) {
        return toAbsoluteUrl(s.images[0]);
      }
    }
  }

  return post.imageUrl ? toAbsoluteUrl(post.imageUrl) : "";
};
