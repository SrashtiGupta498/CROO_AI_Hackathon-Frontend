/* ════════════════════════════════════════════════════════════
   StoryEditorPage — main layout: top bar + sidebar + form + preview.
   Routes:  /admin/story-editor        (new story)
            /admin/story-editor/:id    (edit existing)
   ════════════════════════════════════════════════════════════ */

import React, { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useStoryEditor } from "./useStoryEditor";
import EditorSidebar from "./EditorSidebar";
import StoryForm from "./StoryForm";
import PreviewPanel from "./PreviewPanel";
import { EDITOR_THEME as T } from "./blockTypes";

type ViewMode = "split" | "edit" | "preview";

const StoryEditorPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const returnTo = decodeURIComponent(searchParams.get("returnTo") || "/admin/content-editor");

  const editor = useStoryEditor(id);
  const [activeSection, setActiveSection] = useState("details");
  const [viewMode, setViewMode] = useState<ViewMode>("split");

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    if (viewMode === "preview") setViewMode("split");
    requestAnimationFrame(() => {
      document.getElementById(`section-${sectionId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSave = async (status?: "draft" | "published") => {
    await editor.save(status);
  };

  const pillBtn = (mode: ViewMode, label: string) => (
    <button
      onClick={() => setViewMode(mode)}
      style={{
        padding: "7px 14px",
        borderRadius: 10,
        border: "none",
        cursor: "pointer",
        fontSize: 12.5,
        fontWeight: 700,
        fontFamily: T.sans,
        background: viewMode === mode ? T.accent : "transparent",
        color: viewMode === mode ? "white" : T.muted,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: T.sans }}>
      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: ${T.faint};
        }
      `}</style>

      {/* ── Top bar ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "rgba(247,245,250,0.92)",
          backdropFilter: "blur(14px)",
          borderBottom: `1px solid ${T.border}`,
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <button
          onClick={() => navigate(returnTo)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: "none",
            background: "none",
            cursor: "pointer",
            color: T.muted,
            fontWeight: 700,
            fontSize: 13,
            fontFamily: T.sans,
          }}
        >
          ← Back
        </button>

        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: T.accent, margin: 0 }}>
            {editor.isNew ? "New Post" : "Editing Post"}
          </p>
          <h1
            style={{
              fontFamily: T.serif,
              fontSize: 19,
              fontWeight: 700,
              color: T.dark,
              margin: "2px 0 0",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 360,
            }}
          >
            {editor.story.title || "Untitled post"}
          </h1>
        </div>

        {/* View-mode toggle */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 2, background: "white", border: `1px solid ${T.border}`, borderRadius: 12, padding: 3 }}>
          {pillBtn("edit", "Edit")}
          {pillBtn("split", "Split")}
          {pillBtn("preview", "Preview")}
        </div>

        {/* Save actions */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {editor.savedFlash && <span style={{ fontSize: 12.5, fontWeight: 700, color: "#3FA66A" }}>✓ Saved</span>}
          {editor.dirty && !editor.savedFlash && <span style={{ fontSize: 12, color: T.faint }}>Unsaved changes</span>}
          <button
            onClick={() => handleSave("draft")}
            disabled={editor.saving}
            style={{
              padding: "9px 18px",
              borderRadius: 12,
              border: `1px solid ${T.border}`,
              background: "white",
              color: T.dark,
              fontWeight: 700,
              fontSize: 13,
              cursor: editor.saving ? "wait" : "pointer",
              fontFamily: T.sans,
            }}
          >
            Save draft
          </button>
          <button
            onClick={() => handleSave("published")}
            disabled={editor.saving}
            style={{
              padding: "9px 20px",
              borderRadius: 12,
              border: "none",
              background: `linear-gradient(135deg, ${T.accent} 0%, #b85890 100%)`,
              color: "white",
              fontWeight: 700,
              fontSize: 13,
              cursor: editor.saving ? "wait" : "pointer",
              fontFamily: T.sans,
              boxShadow: "0 6px 18px rgba(215,115,169,0.35)",
            }}
          >
            {editor.saving ? "Saving…" : "Publish"}
          </button>
        </div>
      </header>

      {/* ── Error / loading banners ── */}
      {editor.error && (
        <div style={{ margin: "16px 24px 0", padding: "12px 16px", borderRadius: 12, background: "rgba(214,90,90,0.1)", border: "1px solid rgba(214,90,90,0.3)", color: "#C0392B", fontSize: 13 }}>
          {editor.error}
          {!editor.isNew && " — you can still edit; saving will retry."}
        </div>
      )}
      {editor.loading && (
        <div style={{ margin: "16px 24px 0", padding: "12px 16px", borderRadius: 12, background: T.accentSoft, color: T.accent, fontSize: 13, fontWeight: 700 }}>
          Loading story…
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", padding: "20px 24px", maxWidth: 1500, margin: "0 auto" }}>
        {viewMode !== "preview" && (
          <EditorSidebar
            story={editor.story}
            active={activeSection}
            onSelect={scrollToSection}
            wordCount={editor.wordCount}
            readingTime={editor.readingTime}
          />
        )}

        {viewMode !== "preview" && <StoryForm editor={editor} />}

        {viewMode !== "edit" && <PreviewPanel story={editor.story} />}
      </div>
    </div>
  );
};

export default StoryEditorPage;
