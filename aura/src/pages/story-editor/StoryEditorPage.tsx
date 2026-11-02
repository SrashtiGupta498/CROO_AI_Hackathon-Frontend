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
import "./StoryEditorPage.css";

type ViewMode = "split" | "edit" | "preview";

const StoryEditorPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const returnTo = decodeURIComponent(
    searchParams.get("returnTo") || "/admin/content-editor",
  );

  const editor = useStoryEditor(id);
  const [activeSection, setActiveSection] = useState("details");
  const [viewMode, setViewMode] = useState<ViewMode>("split");

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    if (viewMode === "preview") setViewMode("split");
    requestAnimationFrame(() => {
      document
        .getElementById(`section-${sectionId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSave = async (status?: "draft" | "published") => {
    await editor.save(status);
  };

  const handleDelete = async () => {
    const ok = window.confirm(
      `Delete "${editor.story.title || "this post"}"? This cannot be undone.`,
    );
    if (!ok) return;
    const deleted = await editor.deletePost();
    if (deleted) navigate(returnTo);
  };

  const pillBtn = (mode: ViewMode, label: string) => (
    <button
      onClick={() => setViewMode(mode)}
      className="story-editor-pill-btn"
      style={{
        background: viewMode === mode ? T.accent : "transparent",
        color: viewMode === mode ? "white" : T.muted,
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="story-editor-page">
      {/* ── Top bar ── */}
      <header className="story-editor-topbar">
        <button
          onClick={() => navigate(returnTo)}
          className="story-editor-back-btn"
        >
          ← Back
        </button>

        <div className="min-w-0">
          <p className="story-editor-eyebrow">
            {editor.isNew ? "New Post" : "Editing Post"}
          </p>
          <h1 className="story-editor-title">
            {editor.story.title || "Untitled post"}
          </h1>
        </div>

        {/* View-mode toggle */}
        <div className="story-editor-view-toggle">
          {pillBtn("edit", "Edit")}
          {pillBtn("split", "Split")}
          {pillBtn("preview", "Preview")}
        </div>

        {/* Save actions */}
        <div className="flex items-center gap-2">
          {editor.savedFlash && (
            <span className="text-[12.5px] font-bold text-[#3FA66A]">
              ✓ Saved
            </span>
          )}
          {editor.dirty && !editor.savedFlash && (
            <span className="text-[12px] text-[rgba(47,39,68,0.35)]">
              Unsaved changes
            </span>
          )}
          {!editor.isNew && (
            <button
              onClick={handleDelete}
              disabled={editor.deleting || editor.saving}
              className="story-editor-save-draft-btn"
              style={{
                color: "#C2452F",
                borderColor: "rgba(194,69,47,0.4)",
                cursor: editor.deleting ? "wait" : "pointer",
              }}
            >
              {editor.deleting ? "Deleting…" : "Delete"}
            </button>
          )}
          <button
            onClick={() => handleSave("draft")}
            disabled={editor.saving}
            className="story-editor-save-draft-btn"
            style={{ cursor: editor.saving ? "wait" : "pointer" }}
          >
            Save draft
          </button>
          <button
            onClick={() => handleSave("published")}
            disabled={editor.saving}
            className="story-editor-publish-btn"
            style={{ cursor: editor.saving ? "wait" : "pointer" }}
          >
            {editor.saving ? "Saving…" : "Publish"}
          </button>
        </div>
      </header>

      {/* ── Error / loading banners ── */}
      {editor.error && (
        <div className="story-editor-error-banner">
          {editor.error}
          {!editor.isNew && " — you can still edit; saving will retry."}
        </div>
      )}
      {editor.loading && (
        <div className="story-editor-loading-banner">Loading story…</div>
      )}

      {/* ── Body ── */}
      <div className="mx-auto flex max-w-[1500px] items-start gap-5 px-6 py-5">
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
