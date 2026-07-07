/* ════════════════════════════════════════════════════════════
   EditorSidebar — section navigation + at-a-glance story stats.
   ════════════════════════════════════════════════════════════ */

import React from "react";
import { EDITOR_SECTIONS, EDITOR_THEME as T } from "./blockTypes";
import { Story } from "./story.types";

interface EditorSidebarProps {
  story: Story;
  active: string;
  onSelect: (id: string) => void;
  wordCount: number;
  readingTime: number;
}

/* count filled items per section for the little badge */
const sectionCount = (story: Story, id: string): number => {
  switch (id) {
    case "content": return story.blocks.length;
    case "highlights": return story.highlights.length;
    case "insights": return story.beautyInsights.length;
    case "faq": return story.faq.length;
    case "sources": return story.sources.length;
    case "seo": return story.seo.keywords.length;
    default: return 0;
  }
};

const EditorSidebar: React.FC<EditorSidebarProps> = ({ story, active, onSelect, wordCount, readingTime }) => {
  return (
    <aside
      style={{
        width: 230,
        flexShrink: 0,
        position: "sticky",
        top: 84,
        alignSelf: "flex-start",
        fontFamily: T.sans,
      }}
    >
      <div
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 20,
          padding: 14,
          boxShadow: "0 4px 20px rgba(47,39,68,0.06)",
        }}
      >
        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", color: T.faint, textTransform: "uppercase", margin: "4px 8px 12px" }}>
          Sections
        </p>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {EDITOR_SECTIONS.map((s) => {
            const isActive = active === s.id;
            const count = sectionCount(story, s.id);
            return (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  background: isActive ? T.accentSoft : "transparent",
                  color: isActive ? T.accent : T.muted,
                  fontWeight: isActive ? 800 : 600,
                  fontSize: 13.5,
                  fontFamily: T.sans,
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                <span style={{ fontSize: 15 }}>{s.icon}</span>
                <span style={{ flex: 1 }}>{s.label}</span>
                {count > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      background: isActive ? T.accent : T.border,
                      color: isActive ? "white" : T.muted,
                      borderRadius: 100,
                      padding: "1px 7px",
                      minWidth: 18,
                      textAlign: "center",
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Stats card */}
      <div
        style={{
          marginTop: 14,
          background: `linear-gradient(135deg, ${T.dark} 0%, #463a63 100%)`,
          borderRadius: 20,
          padding: 18,
          color: "white",
        }}
      >
        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", opacity: 0.6, textTransform: "uppercase", marginBottom: 12 }}>
          Overview
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 13, opacity: 0.75 }}>Words</span>
          <span style={{ fontSize: 14, fontWeight: 800 }}>{wordCount}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 13, opacity: 0.75 }}>Read time</span>
          <span style={{ fontSize: 14, fontWeight: 800 }}>{readingTime} min</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, opacity: 0.75 }}>Blocks</span>
          <span style={{ fontSize: 14, fontWeight: 800 }}>{story.blocks.length}</span>
        </div>
      </div>
    </aside>
  );
};

export default EditorSidebar;
