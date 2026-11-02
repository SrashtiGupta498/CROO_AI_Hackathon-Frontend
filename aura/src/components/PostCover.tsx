import React from "react";
import { isVideoUrl } from "../services/uploadImage";

/**
 * Renders a post cover that may be an image OR a short video.
 * Videos auto-play muted + looped (browsers allow muted autoplay) so cards
 * and heroes "come alive" without controls. Falls back to an <img>.
 */
interface PostCoverProps {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  /** What to show when the cover fails to load. Defaults to a branded tile;
   *  pass `null` where the slot already has its own backdrop underneath (the
   *  ingredient cards put a monogram there) so that shows through instead. */
  fallback?: React.ReactNode;
  /**
   * Defaults to "lazy", because most covers are cards in a long grid — the
   * Explore grid alone renders 100 of them, and fetching all of them up front
   * is the single heaviest thing that page does.
   *
   * Pass "eager" for a cover that is above the fold, above all for a page's
   * hero: that one is usually the Largest Contentful Paint element, and
   * lazy-loading it delays the very paint the metric measures.
   *
   * One caveat worth repeating from ImageCarousel: a lazy image only loads
   * once its box intersects the viewport, so a slot that collapses to zero
   * height never loads at all. Every caller here sits in a sized or
   * aspect-ratio'd wrapper; keep it that way.
   */
  loading?: "lazy" | "eager";
  // Allow passing through DOM handlers (e.g. hover effects) to the element.
  [key: string]: any;
}

export const PostCover: React.FC<PostCoverProps> = ({
  src,
  alt = "",
  className,
  style,
  fallback,
  loading = "lazy",
  ...rest
}) => {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [src]);

  // An empty/missing src never fires onError (an <img src=""> just sits
  // blank in Chromium), so it has to be caught here rather than relying on
  // the same fallback path as a genuinely broken URL.
  const noSrc = !src;

  if (!noSrc && !failed && isVideoUrl(src)) {
    return (
      <video
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className={className}
        style={style}
        {...rest}
        onError={() => setFailed(true)}
      />
    );
  }
  // Dead or missing cover URL (hotlink-blocked / expired external images,
  // or no cover at all): show a quiet branded tile instead of the browser's
  // broken-image glyph.
  if (noSrc || failed) {
    if (fallback !== undefined) return <>{fallback}</>;
    return (
      <div
        role="img"
        aria-label={alt}
        className={className}
        style={{
          ...style,
          background: "linear-gradient(135deg, #3D5B4F 0%, #2D2A26 100%)",
        }}
      />
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading={loading}
      decoding="async"
      {...rest}
      onError={() => setFailed(true)}
    />
  );
};

export default PostCover;
