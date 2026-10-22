import React, { useRef, useState } from "react";

/**
 * A swipeable strip of photos — the "carousel" layout an editor can pick for
 * an image block. Native scroll-snap rather than a JS slider, so touch and
 * trackpad swiping work for free and there is no dependency to carry.
 *
 * Every slide reserves its aspect ratio up front. That is not only about
 * layout shift: an `h-auto` image with no reserved box collapses to zero
 * height, and a zero-height element never intersects the viewport, so
 * `loading="lazy"` never fires and the photo stays invisible forever.
 */
interface ImageCarouselProps {
  images: string[];
  alt?: string;
  /** CSS aspect-ratio for each slide, e.g. "16 / 10". */
  aspect?: string;
  /** Corner radius class, so callers can match their surrounding card. */
  radiusClassName?: string;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  alt = "",
  aspect = "16 / 10",
  radiusClassName = "rounded-[24px]",
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const slides = images.filter(Boolean);
  if (!slides.length) return null;

  const goTo = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const next = (index + slides.length) % slides.length;
    track.scrollTo({ left: track.clientWidth * next, behavior: "smooth" });
    setActive(next);
  };

  // A single slide is just a photo — a one-item carousel with arrows and a
  // lone dot reads as broken.
  if (slides.length === 1) {
    return (
      <div className={`overflow-hidden ${radiusClassName}`} style={{ aspectRatio: aspect }}>
        <img src={slides[0]} alt={alt} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className="relative group/carousel">
      <div
        ref={trackRef}
        onScroll={(e) => {
          const t = e.currentTarget;
          if (t.clientWidth) setActive(Math.round(t.scrollLeft / t.clientWidth));
        }}
        className={`flex overflow-x-auto snap-x snap-mandatory ${radiusClassName}`}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
      >
        {slides.map((src, i) => (
          <div key={`${src}-${i}`} className="min-w-full snap-center" style={{ aspectRatio: aspect }}>
            <img
              src={src}
              alt={slides.length > 1 ? `${alt} (${i + 1} of ${slides.length})` : alt}
              // The first slide is above the fold by definition; the rest can wait.
              loading={i === 0 ? "eager" : "lazy"}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Previous photo"
        onClick={() => goTo(active - 1)}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 text-white backdrop-blur-sm flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 focus:opacity-100 transition-opacity"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Next photo"
        onClick={() => goTo(active + 1)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 text-white backdrop-blur-sm flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 focus:opacity-100 transition-opacity"
      >
        ›
      </button>

      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to photo ${i + 1}`}
            aria-current={i === active}
            onClick={() => goTo(i)}
            className="w-1.5 h-1.5 rounded-full transition-all"
            style={{
              background: i === active ? "white" : "rgba(255,255,255,0.45)",
              transform: i === active ? "scale(1.5)" : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageCarousel;
