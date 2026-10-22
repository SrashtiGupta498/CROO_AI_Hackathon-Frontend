// Single source of truth for the backend location.
//
// Local dev defaults to the NestJS server on :3002. In deployment, set
// VITE_API_URL to the backend ORIGIN (no trailing /v1), e.g.
//   VITE_API_URL=https://croo-blog-api.onrender.com
// Vite inlines VITE_-prefixed vars at build time, so this is baked into the
// bundle when you build.

const rawOrigin =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  "http://localhost:3002";

/** Backend origin, no trailing slash — used to resolve "/uploads/..." paths. */
export const API_ORIGIN = rawOrigin.replace(/\/+$/, "");

/** Versioned API base the axios client points at. */
export const API_BASE = `${API_ORIGIN}/v1`;

/**
 * The botanical chat assistant is off for release 1 (it needs paid Gemini
 * quota the free tier can't cover). The page, route and backend endpoint are
 * kept; set VITE_ENABLE_CHAT=true at build time to bring it back.
 */
export const CHAT_ENABLED = import.meta.env.VITE_ENABLE_CHAT === "true";
