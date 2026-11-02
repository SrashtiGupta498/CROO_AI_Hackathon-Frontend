/* ════════════════════════════════════════════════════════════
   PreviewPanel — live, read-only render of the story as readers
   will eventually see it. Updates as you type.
   ════════════════════════════════════════════════════════════ */

import React from "react";
import { Story, StoryBlock } from "./story.types";
import { insightMeta } from "./blockTypes";
import { SAGE, WARNING } from "../../styles/brand";
import "./PreviewPanel.css";
import { sanitizeHtml } from "../../utils/sanitize";
import PostCover from "../../components/PostCover";
import ImageCarousel from "../../components/ImageCarousel";

const BlockView: React.FC<{ block: StoryBlock }> = ({ block }) => {
  switch (block.type) {
    case "text":
      return (
        <div className="mb-[22px]">
          {block.heading && (
            <h3 className="preview-panel-block-heading">{block.heading}</h3>
          )}
          <div
            className="preview-panel-prose"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(
                block.content ||
                  "<span style='color:#aaa'>Empty paragraph…</span>",
              ),
            }}
          />
        </div>
      );

    case "image":
      return (
        <figure className="m-0 mb-[22px]">
          {block.layout === "carousel" &&
          (block.images || []).filter(Boolean).length > 1 ? (
            <ImageCarousel
              images={(block.images || []).filter(Boolean)}
              alt={block.caption || ""}
              aspect="16 / 10"
              radiusClassName="rounded-2xl"
            />
          ) : block.imageUrl ? (
            <img
              src={block.imageUrl}
              alt={block.caption || ""}
              className="block w-full rounded-2xl"
            />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-2xl bg-[#eee] text-[13px] text-[#aaa]">
              No image
            </div>
          )}
          {block.caption && (
            <figcaption className="mt-2 text-center text-[12.5px] italic text-[rgba(var(--ae-ink-rgb),0.45)]">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    case "video":
      return (
        <figure className="m-0 mb-[22px]">
          {block.videoUrl ? (
            <video
              src={block.videoUrl}
              controls
              playsInline
              preload="metadata"
              className="block w-full rounded-2xl"
            />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-2xl bg-[#eee] text-[13px] text-[#aaa]">
              No video
            </div>
          )}
          {block.caption && (
            <figcaption className="mt-2 text-center text-[12.5px] italic text-[rgba(var(--ae-ink-rgb),0.45)]">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    case "gif":
      return (
        <figure className="m-0 mb-[22px]">
          {block.mediaUrl ? (
            /\.gif($|\?)/i.test(block.mediaUrl) ||
            block.mediaUrl.startsWith("data:image/gif") ? (
              <img
                src={block.mediaUrl}
                alt={block.caption || ""}
                className="block w-full rounded-2xl"
              />
            ) : (
              <video
                src={block.mediaUrl}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="block w-full rounded-2xl"
              />
            )
          ) : (
            <div className="flex h-40 items-center justify-center rounded-2xl bg-[#eee] text-[13px] text-[#aaa]">
              No GIF
            </div>
          )}
          {block.caption && (
            <figcaption className="mt-2 text-center text-[12.5px] italic text-[rgba(var(--ae-ink-rgb),0.45)]">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    case "quote":
      return (
        <blockquote className="preview-panel-quote">
          <p className="preview-panel-quote-text">“{block.quote || "…"}”</p>
          {block.author && (
            <cite className="preview-panel-quote-cite">— {block.author}</cite>
          )}
        </blockquote>
      );

    case "tip":
    case "callout": {
      const isTip = block.type === "tip";
      const c = isTip ? SAGE : WARNING;
      return (
        <div
          className="preview-panel-callout"
          style={{ background: `${c}14`, border: `1px solid ${c}40` }}
        >
          <p className="preview-panel-callout-title" style={{ color: c }}>
            {isTip ? "💡" : "📣"} {block.title || (isTip ? "Tip" : "Callout")}
          </p>
          <div
            className="preview-panel-callout-body"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content) }}
          />
        </div>
      );
    }

    case "warning":
      return (
        <div className="preview-panel-warning">
          <p className="preview-panel-callout-title text-[var(--ae-danger)]">
            ⚠️ {block.title || "Warning"}
          </p>
          <div
            className="preview-panel-callout-body"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content) }}
          />
        </div>
      );

    case "checklist":
      return (
        <ul className="m-0 mb-[22px] flex list-none flex-col gap-2.5 p-0">
          {block.items.filter(Boolean).map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 text-[15px] text-[rgba(var(--ae-ink-rgb),0.85)]"
            >
              <span className="font-extrabold text-sage">✓</span>
              {item}
            </li>
          ))}
        </ul>
      );

    case "comparison":
      return (
        <div className="mb-[22px] grid grid-cols-[1fr_1fr] gap-3.5">
          {[
            { t: block.leftTitle, c: block.leftContent },
            { t: block.rightTitle, c: block.rightContent },
          ].map((col, i) => (
            <div key={i} className="preview-panel-compare-col">
              <p className="m-0 mb-2 text-[14px] font-extrabold text-ink">
                {col.t || `Option ${i + 1}`}
              </p>
              <p className="m-0 whitespace-pre-wrap text-[13.5px] leading-[1.6] text-[rgba(var(--ae-ink-rgb),0.65)]">
                {col.c}
              </p>
            </div>
          ))}
        </div>
      );

    default:
      return null;
  }
};

interface PreviewPanelProps {
  story: Story;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ story }) => {
  return (
    <div className="preview-panel">
      <div className="preview-panel-bar">
        <span className="preview-panel-bar-label">Live Preview</span>
        <span
          className="ml-auto text-[11px] font-bold"
          style={{ color: story.status === "published" ? SAGE : WARNING }}
        >
          {story.status === "published" ? "● Published" : "○ Draft"}
        </span>
      </div>

      <div className="preview-panel-scroll">
        {/* Cover */}
        <div className="relative h-[200px] bg-[#ddd]">
          {story.coverImage ? (
            // A cover may be a photograph or a short clip — mirror what the
            // published page will actually render rather than forcing <img>,
            // which showed a broken tile for every video cover.
            <PostCover
              src={story.coverImage}
              alt="cover"
              loading="eager"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[13px] text-[#999]">
              Add a cover
            </div>
          )}
        </div>

        <div className="px-[30px] py-[26px]">
          {story.category && (
            <span className="preview-panel-category">{story.category}</span>
          )}
          <h1 className="preview-panel-title">
            {story.title || "Untitled post"}
          </h1>
          {story.subtitle && (
            <p className="m-0 mb-3.5 text-[17px] leading-[1.5] text-[rgba(var(--ae-ink-rgb),0.65)]">
              {story.subtitle}
            </p>
          )}
          <p className="m-0 mb-6 text-[12.5px] font-semibold text-[rgba(var(--ae-ink-rgb),0.45)]">
            {story.readingTime} min read
            {story.tags.length > 0 ? ` · ${story.tags.join(" · ")}` : ""}
          </p>

          {/* Quick answer */}
          {story.quickAnswer && (
            <div className="preview-panel-quick-answer">
              <p className="preview-panel-quick-answer-label">Quick Answer</p>
              <p className="m-0 text-[15px] leading-[1.6] text-[rgba(var(--ae-ink-rgb),0.85)]">
                {story.quickAnswer}
              </p>
            </div>
          )}

          {/* Highlights */}
          {story.highlights.filter(Boolean).length > 0 && (
            <div className="mb-7">
              <h3 className="preview-panel-section-heading">Highlights</h3>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {story.highlights.filter(Boolean).map((h, i) => (
                  <li
                    key={i}
                    className="flex gap-2.5 text-[15px] text-[rgba(var(--ae-ink-rgb),0.85)]"
                  >
                    <span className="text-sage">★</span> {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Blocks */}
          {story.blocks.map((b) => (
            <BlockView key={b.id} block={b} />
          ))}

          {/* Beauty insights */}
          {story.beautyInsights.length > 0 && (
            <div className="mb-7">
              <h3 className="preview-panel-section-heading">Beauty Insights</h3>
              <div className="flex flex-col gap-2.5">
                {story.beautyInsights.map((ins) => {
                  const meta = insightMeta(ins.type);
                  return (
                    <div key={ins.id} className="preview-panel-insight-card">
                      <p className="m-0 mb-1 text-[13.5px] font-extrabold text-ink">
                        {meta.icon} {ins.title || meta.label}
                      </p>
                      <p className="m-0 text-[13.5px] leading-[1.6] text-[rgba(var(--ae-ink-rgb),0.65)]">
                        {ins.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FAQ */}
          {story.faq.length > 0 && (
            <div className="mb-7">
              <h3 className="preview-panel-section-heading">FAQ</h3>
              <div className="flex flex-col gap-3">
                {story.faq.map((f) => (
                  <div key={f.id}>
                    <p className="m-0 mb-1 text-[15px] font-bold text-ink">
                      {f.question || "Question?"}
                    </p>
                    <p className="m-0 text-[14px] leading-[1.6] text-[rgba(var(--ae-ink-rgb),0.65)]">
                      {f.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sources */}
          {story.sources.length > 0 && (
            <div>
              <h3 className="preview-panel-section-heading">Sources</h3>
              <ul className="m-0 pl-[18px] text-sage">
                {story.sources.map((s) => (
                  <li key={s.id} className="mb-1.5 text-[13.5px]">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sage"
                    >
                      {s.title || s.url || "Untitled source"}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;
