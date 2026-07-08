// Ambient types for Vite's import.meta.env (self-contained so it works even
// with tsconfig "types": ["node"]). Add new VITE_-prefixed vars here.
interface ImportMetaEnv {
  /** Backend origin, no trailing /v1 (e.g. https://croo-blog-api.onrender.com). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
