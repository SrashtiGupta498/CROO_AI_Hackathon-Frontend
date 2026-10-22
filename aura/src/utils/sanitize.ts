import DOMPurify from "dompurify";

/* Single sanitization point for every dangerouslySetInnerHTML site.
   Article/story content is user-authored HTML stored on the backend, so it
   must never reach the DOM unsanitized. Keeps standard formatting tags,
   strips scripts/handlers/iframes. */
export function sanitizeHtml(html: string | undefined | null): string {
  return DOMPurify.sanitize(html ?? "", { USE_PROFILES: { html: true } });
}
