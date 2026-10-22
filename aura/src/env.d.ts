// Ambient types for Vite's import.meta.env (self-contained so it works even
// with tsconfig "types": ["node"]). Add new VITE_-prefixed vars here.
interface ImportMetaEnv {
  /** Backend origin, no trailing /v1 (e.g. https://croo-blog-api.onrender.com). */
  readonly VITE_API_URL?: string;
  /** "true" re-enables the botanical chat assistant (hidden by default). */
  readonly VITE_ENABLE_CHAT?: string;
  /** Vite built-ins. Normally from `vite/client`, which the `types` pin below excludes. */
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/* Asset imports (`import img from "./x.jpg"`). Vite ships these in
   `vite/client`, but tsconfig pins `"types": ["node"]`, which replaces the
   automatic @types roots — so vite/client is never loaded and every asset
   import is an error. Declared here rather than dropping the `types` pin,
   which exists to keep DOM/node globals from fighting. */
declare module "*.jpg" {
  const src: string;
  export default src;
}
declare module "*.jpeg" {
  const src: string;
  export default src;
}
declare module "*.png" {
  const src: string;
  export default src;
}
declare module "*.webp" {
  const src: string;
  export default src;
}
declare module "*.avif" {
  const src: string;
  export default src;
}
declare module "*.gif" {
  const src: string;
  export default src;
}
declare module "*.mp4" {
  const src: string;
  export default src;
}
declare module "*.webm" {
  const src: string;
  export default src;
}
declare module "*.svg" {
  const src: string;
  export default src;
}
