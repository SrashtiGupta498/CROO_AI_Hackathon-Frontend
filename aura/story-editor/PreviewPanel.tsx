/* ════════════════════════════════════════════════════════════
   PreviewPanel — live, read-only render of the story as readers
   will eventually see it. Updates as you type.
   ════════════════════════════════════════════════════════════ */

import React from "react";
import { Story, StoryBlock } from "./story.types";
import { EDITOR_THEME as T, insightMeta } from "./blockTypes";

const SAGE = "#6B8E7A";
const INK = "#1a2e25";

const BlockView: React.FC<{ block: StoryBlock }> = ({ block }) => {
  switch (block.type) {
    case "text":
      return (
        <div style={{ marginBottom: 22 }}>
          {block.heading && (
            <h3 style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 700, color: INK, margin: "0 0 8px" }}>
              {block.heading}
            </h3>
          )}
          <div
            style={{ fontSize: 15.5, lineHeight: 1.8, color: "#3e4b45" }}
            dangerouslySetInnerHTML={{ __html: block.content || "<span style='color:#aaa'>Empty paragraph…</span>" }}
          />
        </div>
      );

    case "image":
      return (
        <figure style={{ margin: "0 0 22px" }}>
          {block.imageUrl ? (
            <img src={block.imageUrl} alt={block.caption || ""} style={{ width: "100%", borderRadius: 16, display: "block" }} />
          ) : (
            <div style={{ height: 160, borderRadius: 16, background: "#eee", display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 13 }}>
              No image
            </div>
          )}
          {block.caption && (
            <figcaption style={{ fontSize: 12.5, color: "#8a9a92", textAlign: "center", marginTop: 8, fontStyle: "italic" }}>
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    case "quote":
      return (
        <blockquote
          style={{
            margin: "0 0 22px",
            padding: "18px 22px",
            borderLeft: `4px solid ${SAGE}`,
            background: "rgba(107,142,122,0.07)",
            borderRadius: "0 14px 14px 0",
          }}
        >
          <p style={{ fontFamily: T.serif, fontSize: 19, fontStyle: "italic", color: INK, margin: 0, lineHeight: 1.5 }}>
            “{block.quote || "…"}”
          </p>
          {block.author && <cite style={{ display: "block", marginTop: 10, fontSize: 13, fontWeight: 700, color: SAGE }}>— {block.author}</cite>}
        </blockquote>
      );

    case "tip":
    case "callout": {
      const isTip = block.type === "tip";
      const c = isTip ? SAGE : "#C98A3A";
      return (
        <div style={{ marginBottom: 22, padding: 18, borderRadius: 16, background: `${c}14`, border: `1px solid ${c}40` }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: c, margin: "0 0 6px" }}>
            {isTip ? "💡" : "📣"} {block.title || (isTip ? "Tip" : "Callout")}
          </p>
          <div style={{ fontSize: 14.5, lineHeight: 1.7, color: "#3e4b45" }} dangerouslySetInnerHTML={{ __html: block.content }} />
        </div>
      );
    }

    case "warning":
      return (
        <div style={{ marginBottom: 22, padding: 18, borderRadius: 16, background: "rgba(214,90,90,0.08)", border: "1px solid rgba(214,90,90,0.3)" }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: "#C0392B", margin: "0 0 6px" }}>⚠️ {block.title || "Warning"}</p>
          <div style={{ fontSize: 14.5, lineHeight: 1.7, color: "#3e4b45" }} dangerouslySetInnerHTML={{ __html: block.content }} />
        </div>
      );

    case "checklist":
      return (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 22px", display: "flex", flexDirection: "column", gap: 10 }}>
          {block.items.filter(Boolean).map((item, i) => (
            <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 15, color: "#3e4b45" }}>
              <span style={{ color: SAGE, fontWeight: 800 }}>✓</span>
              {item}
            </li>
          ))}
        </ul>
      );

    case "comparison":
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 }}>
          {[
            { t: block.leftTitle, c: block.leftContent },
            { t: block.rightTitle, c: block.rightContent },
          ].map((col, i) => (
            <div key={i} style={{ padding: 16, borderRadius: 14, border: `1px solid rgba(0,0,0,0.08)`, background: "#fafbfa" }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: INK, margin: "0 0 8px" }}>{col.t || `Option ${i + 1}`}</p>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#5a6a62", margin: 0, whiteSpace: "pre-wrap" }}>{col.c}</p>
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
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: "#F9F8F5",
        borderRadius: 24,
        border: `1px solid ${T.border}`,
        overflow: "hidden",
        alignSelf: "flex-start",
        position: "sticky",
        top: 84,
        maxHeight: "calc(100vh - 104px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, background: "white", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: SAGE }}>
          Live Preview
        </span>
        <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: story.status === "published" ? SAGE : "#C98A3A" }}>
          {story.status === "published" ? "● Published" : "○ Draft"}
        </span>
      </div>

      <div style={{ overflowY: "auto", padding: "0 0 40px", fontFamily: T.sans }}>
        {/* Cover */}
        <div style={{ position: "relative", height: 200, background: "#ddd" }}>
          {story.coverImage ? (
            <img src={story.coverImage} alt="cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 13 }}>
              Add a cover image
            </div>
          )}
        </div>

        <div style={{ padding: "26px 30px" }}>
          {story.category && (
            <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: 100, background: SAGE, color: "white", fontSize: 10, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 14 }}>
              {story.category}
            </span>
          )}
          <h1 style={{ fontFamily: T.serif, fontSize: 34, fontWeight: 700, color: INK, lineHeight: 1.12, margin: "0 0 10px" }}>
            {story.title || "Untitled post"}
          </h1>
          {story.subtitle && <p style={{ fontSize: 17, color: "#5a6a62", margin: "0 0 14px", lineHeight: 1.5 }}>{story.subtitle}</p>}
          <p style={{ fontSize: 12.5, color: "#8a9a92", fontWeight: 600, margin: "0 0 24px" }}>
            {story.readingTime} min read{story.tags.length > 0 ? ` · ${story.tags.join(" · ")}` : ""}
          </p>

          {/* Quick answer */}
          {story.quickAnswer && (
            <div style={{ padding: 18, borderRadius: 16, background: "rgba(107,142,122,0.08)", marginBottom: 26 }}>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: SAGE, margin: "0 0 6px" }}>
                Quick Answer
              </p>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: "#3e4b45", margin: 0 }}>{story.quickAnswer}</p>
            </div>
          )}

          {/* Highlights */}
          {story.highlights.filter(Boolean).length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 700, color: INK, margin: "0 0 12px" }}>Highlights</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {story.highlights.filter(Boolean).map((h, i) => (
                  <li key={i} style={{ display: "flex", gap: 10, fontSize: 15, color: "#3e4b45" }}>
                    <span style={{ color: SAGE }}>★</span> {h}
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
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 700, color: INK, margin: "0 0 12px" }}>Beauty Insights</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {story.beautyInsights.map((ins) => {
                  const meta = insightMeta(ins.type);
                  return (
                    <div key={ins.id} style={{ padding: 14, borderRadius: 14, background: "white", border: "1px solid rgba(0,0,0,0.07)" }}>
                      <p style={{ fontSize: 13.5, fontWeight: 800, color: INK, margin: "0 0 4px" }}>
                        {meta.icon} {ins.title || meta.label}
                      </p>
                      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#5a6a62", margin: 0 }}>{ins.content}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FAQ */}
          {story.faq.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 700, color: INK, margin: "0 0 12px" }}>FAQ</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {story.faq.map((f) => (
                  <div key={f.id}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: INK, margin: "0 0 4px" }}>{f.question || "Question?"}</p>
                    <p style={{ fontSize: 14, lineHeight: 1.6, color: "#5a6a62", margin: 0 }}>{f.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sources */}
          {story.sources.length > 0 && (
            <div>
              <h3 style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 700, color: INK, margin: "0 0 12px" }}>Sources</h3>
              <ul style={{ paddingLeft: 18, margin: 0, color: SAGE }}>
                {story.sources.map((s) => (
                  <li key={s.id} style={{ fontSize: 13.5, marginBottom: 6 }}>
                    <a href={s.url} target="_blank" rel="noreferrer" style={{ color: SAGE }}>
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
