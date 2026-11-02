import API from "./api";
import { API_ORIGIN } from "./config";
import { describeError } from "./errorMessage";

/* Backend origin — uploaded images come back as relative "/uploads/..." paths,
   which must be served from the API host, not the frontend dev server.
   Re-exported for existing importers; sourced from services/config.ts. */
export { API_ORIGIN };

/* Cloudinary delivery URLs look like
     https://res.cloudinary.com/<cloud>/image/upload/[<transforms>/][v123/]<public_id>.<ext>
   and anything inserted right after /upload/ is applied on the way out. */
const CLOUDINARY_DELIVERY =
  /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

/** A path segment that is already a transformation ("c_limit,w_1600", "f_auto"),
 *  as opposed to a version ("v1793168117") or the public id itself. */
const IS_TRANSFORM = /^[a-z]{1,3}_[^/]*$/;

/**
 * Add `f_auto,q_auto` to a Cloudinary IMAGE url so the browser is served AVIF
 * or WebP instead of the stored JPEG/PNG, at a per-image quality Cloudinary
 * picks itself. Typically 30-70% fewer bytes for the same picture, and on the
 * free plan bytes are the metered resource.
 *
 * Done here rather than only at upload time because the urls already written
 * into posts — every article published so far — are untransformed originals,
 * and rewriting them in the database would be a migration that this makes
 * unnecessary. Everything that renders media goes through `toAbsoluteUrl`.
 *
 * Left alone, deliberately:
 *  - videos (`/video/upload/`), whose transformation is baked in at upload and
 *    whose codec must not be guessed at here;
 *  - animated GIFs, which some browsers get back from `f_auto` as a
 *    single-frame WebP — the animation would silently disappear;
 *  - urls that already carry a transformation segment, which is someone having
 *    asked for something specific.
 *
 * @param width optional hard width cap, for slots we know are small (an
 *              avatar, a thumbnail). Never upscales.
 */
export const cloudinaryOptimized = (url: string, width?: number): string => {
  const match = CLOUDINARY_DELIVERY.exec(url);
  if (!match) return url;

  const [, prefix, rest] = match;
  if (/\.gif(\?|#|$)/i.test(rest)) return url;

  // Already carries a transformation — either from the upload endpoint, which
  // now bakes in f_auto,q_auto:good, or from an older post. Format and quality
  // are therefore already handled; only a width cap is still worth adding, and
  // it goes FIRST because chained transformations apply in order, so the
  // resize happens before the format conversion.
  if (IS_TRANSFORM.test(rest.split("/")[0])) {
    return width ? `${prefix}c_limit,w_${width}/${rest}` : url;
  }

  const transform = width
    ? `f_auto,q_auto,c_limit,w_${width}`
    : "f_auto,q_auto";
  return `${prefix}${transform}/${rest}`;
};

/**
 * Resolve a stored value to a loadable URL and nothing more: absolute URLs and
 * data-URLs pass through, relative "/uploads/..." paths get the API origin.
 *
 * This is what gets SAVED. Delivery transforms are a presentation decision and
 * must not be baked into a stored value — persist what the upload endpoint
 * returned, so the record keeps pointing at the asset rather than at one
 * particular rendering of it.
 */
export const toStorableUrl = (url?: string | null): string => {
  if (!url) return "";
  return url.startsWith("http") || url.startsWith("data:")
    ? url
    : `${API_ORIGIN}${url}`;
};

/** Turn a stored value into something an <img src> can load. Same resolution as
 *  `toStorableUrl`, plus `f_auto,q_auto` for Cloudinary images — see
 *  `cloudinaryOptimized`. This is what gets RENDERED. */
export const toAbsoluteUrl = (url?: string | null, width?: number): string => {
  const resolved = toStorableUrl(url);
  if (!resolved || resolved.startsWith("data:")) return resolved;
  return cloudinaryOptimized(resolved, width);
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

/** Shown when the upload endpoint answers 2xx but hands back no url — a
 *  broken server-side upload, which must not look like a no-op to the user. */
const NO_URL_RETURNED =
  "The server accepted the image but returned no link. Please try again.";

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
      // A 2xx with no url is a server-side failure, not an empty upload. It
      // used to come back as "" and every caller tested `if (url)`, so the
      // save was skipped in silence — the picture simply never changed.
      if (!url) throw new Error(NO_URL_RETURNED);
      return [toStorableUrl(url)];
    }
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    const res = await API.post("/upload/images", form);
    const urls: string[] = res.data?.data?.urls ?? res.data?.urls ?? [];
    if (urls.length !== files.length) throw new Error(NO_URL_RETURNED);
    return urls.map(toStorableUrl);
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
    const url = toStorableUrl(data?.url);
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
