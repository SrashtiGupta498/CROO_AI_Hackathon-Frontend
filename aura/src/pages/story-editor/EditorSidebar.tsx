/* ════════════════════════════════════════════════════════════
   EditorSidebar — section navigation + at-a-glance story stats.
   ════════════════════════════════════════════════════════════ */

import React from "react";
import { EDITOR_SECTIONS, EDITOR_THEME as T } from "./blockTypes";
import { Story } from "./story.types";
import "./EditorSidebar.css";

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
    <aside className="editor-sidebar">
      <div className="editor-sidebar-card">
        <p className="editor-sidebar-heading">
          Sections
        </p>

        <nav className="flex flex-col gap-0.5">
          {EDITOR_SECTIONS.map((s) => {
            const isActive = active === s.id;
            const count = sectionCount(story, s.id);
            return (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className="editor-sidebar-nav-btn"
                style={{
                  background: isActive ? T.accentSoft : "transparent",
                  color: isActive ? T.accent : T.muted,
                  fontWeight: isActive ? 800 : 600,
                }}
              >
                <span className="text-[15px]">{s.icon}</span>
                <span className="flex-1">{s.label}</span>
                {count > 0 && (
                  <span
                    className="editor-sidebar-count"
                    style={{
                      background: isActive ? T.accent : T.border,
                      color: isActive ? "white" : T.muted,
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
      <div className="editor-sidebar-stats">
        <p className="editor-sidebar-stats-heading">
          Overview
        </p>
        <div className="mb-2.5 flex justify-between">
          <span className="text-[13px] opacity-75">Words</span>
          <span className="text-[14px] font-extrabold">{wordCount}</span>
        </div>
        <div className="mb-2.5 flex justify-between">
          <span className="text-[13px] opacity-75">Read time</span>
          <span className="text-[14px] font-extrabold">{readingTime} min</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[13px] opacity-75">Blocks</span>
          <span className="text-[14px] font-extrabold">{story.blocks.length}</span>
        </div>
      </div>
    </aside>
  );
};

export default EditorSidebar;
