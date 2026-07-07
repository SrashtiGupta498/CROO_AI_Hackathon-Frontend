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
  // Allow passing through DOM handlers (e.g. hover effects) to the element.
  [key: string]: any;
}

export const PostCover: React.FC<PostCoverProps> = ({
  src,
  alt = "",
  className,
  style,
  ...rest
}) => {
  if (isVideoUrl(src)) {
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
      />
    );
  }
  return <img src={src} alt={alt} className={className} style={style} {...rest} />;
};

export default PostCover;
