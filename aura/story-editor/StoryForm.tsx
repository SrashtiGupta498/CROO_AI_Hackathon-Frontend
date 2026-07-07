/* ════════════════════════════════════════════════════════════
   StoryForm — renders every editable section of the story.
   Driven entirely by the useStoryEditor hook passed in.
   ════════════════════════════════════════════════════════════ */

import React, { useEffect, useState } from "react";
import { UseStoryEditor } from "./useStoryEditor";
import BlockEditor, { RichText } from "./BlockEditor";
import ImageUploader from "./ImageUploader";
import {
  EDITOR_THEME as T,
  BLOCK_DEFINITIONS,
  INSIGHT_TYPES,
} from "./blockTypes";
import { BlockType } from "./story.types";
import { StoryService, CategoryLite } from "./story.service";

const field: React.CSSProperties = {
  width: "100%",
  padding: "11px 15px",
  borderRadius: 12,
  border: `1px solid ${T.border}`,
  fontSize: 14,
  fontFamily: T.sans,
  color: T.dark,
  outline: "none",
  background: "white",
};

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.muted, margin: "0 0 7px" }}>
    {children}
  </label>
);

const Section: React.FC<{ id: string; title: string; subtitle?: string; children: React.ReactNode }> = ({
  id,
  title,
  subtitle,
  children,
}) => (
  <section
    id={`section-${id}`}
    style={{
      scrollMarginTop: 90,
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 24,
      padding: 26,
      marginBottom: 22,
      boxShadow: "0 4px 24px rgba(47,39,68,0.05)",
    }}
  >
    <h3 style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 700, color: T.dark, margin: 0 }}>{title}</h3>
    {subtitle && <p style={{ fontSize: 13, color: T.muted, margin: "4px 0 18px" }}>{subtitle}</p>}
    {!subtitle && <div style={{ height: 18 }} />}
    {children}
  </section>
);

const addBtnStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  border: `1px dashed ${T.accentMed}`,
  background: T.accentSoft,
  color: T.accent,
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: T.sans,
};

const removeBtnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: `1px solid ${T.border}`,
  background: "white",
  color: T.muted,
  cursor: "pointer",
  flexShrink: 0,
};

/* Small chip list editor (tags / keywords) */
const ChipInput: React.FC<{
  values: string[];
  onAdd: (v: string) => void;
  onRemove: (i: number) => void;
  placeholder: string;
}> = ({ values, onAdd, onRemove, placeholder }) => {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const v = draft.trim();
    if (v) {
      onAdd(v);
      setDraft("");
    }
  };
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {values.map((v, i) => (
          <span
            key={i}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px 5px 12px",
              borderRadius: 100,
              background: T.accentSoft,
              color: T.accent,
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            {v}
            <button
              onClick={() => onRemove(i)}
              style={{ border: "none", background: "none", color: T.accent, cursor: "pointer", fontSize: 13 }}
            >
              ✕
            </button>
          </span>
        ))}
        {values.length === 0 && <span style={{ fontSize: 12.5, color: T.faint }}>No items yet.</span>}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={field}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
        />
        <button onClick={commit} style={{ ...addBtnStyle, whiteSpace: "nowrap" }}>
          + Add
        </button>
      </div>
    </div>
  );
};

interface StoryFormProps {
  editor: UseStoryEditor;
}

const StoryForm: React.FC<StoryFormProps> = ({ editor }) => {
  const { story } = editor;
  const [pickerOpen, setPickerOpen] = useState(false);

  /* ── Taxonomy: live categories + subcategories from the Category APIs ── */
  const [categories, setCategories] = useState<CategoryLite[]>([]);
  const [subCategories, setSubCategories] = useState<CategoryLite[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  // Load top-level categories once.
  useEffect(() => {
    let active = true;
    setCatLoading(true);
    setCatError(null);
    StoryService.listCategories()
      .then((rows) => active && setCategories(rows))
      .catch((e: any) =>
        active && setCatError(e?.response?.data?.message || e?.message || "Failed to load categories"),
      )
      .finally(() => active && setCatLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Load subcategories whenever the selected category changes (incl. on edit-load).
  useEffect(() => {
    let active = true;
    if (!story.categoryId) {
      setSubCategories([]);
      return;
    }
    setSubLoading(true);
    StoryService.listSubCategories(story.categoryId)
      .then((rows) => active && setSubCategories(rows))
      .catch(() => active && setSubCategories([]))
      .finally(() => active && setSubLoading(false));
    return () => {
      active = false;
    };
  }, [story.categoryId]);

  // Pick a parent category: store its id + name, and reset stale subcategories.
  const handleCategoryChange = (id: string) => {
    const picked = categories.find((c) => c.id === id);
    editor.updateField("categoryId", id);
    editor.updateField("category", picked?.name || "");
    editor.updateField("subCategories", []);
  };

  // Toggle a subcategory in/out of the post's subCategories array.
  const toggleSubCategory = (id: string) => {
    const current = story.subCategories || [];
    const next = current.includes(id)
      ? current.filter((s) => s !== id)
      : [...current, id];
    editor.updateField("subCategories", next);
  };

  return (
    <div style={{ flex: 1, minWidth: 0, fontFamily: T.sans }}>
      {/* ── Story details ── */}
      <Section id="details" title="Post Details" subtitle="The essentials shown on cards and at the top of the article.">
        <Label>Title</Label>
        <input
          style={{ ...field, fontSize: 18, fontWeight: 700, marginBottom: 14 }}
          value={story.title}
          placeholder="The headline of your post"
          onChange={(e) => editor.updateField("title", e.target.value)}
        />

        <Label>Subtitle</Label>
        <input
          style={{ ...field, marginBottom: 14 }}
          value={story.subtitle}
          placeholder="A supporting one-liner"
          onChange={(e) => editor.updateField("subtitle", e.target.value)}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <Label>Category</Label>
            <select
              style={field}
              value={story.categoryId}
              disabled={catLoading}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              <option value="">{catLoading ? "Loading categories…" : "Select a category"}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {catError && <p style={{ fontSize: 11.5, color: "#C0392B", margin: "6px 0 0" }}>{catError}</p>}
          </div>
          <div>
            <Label>Status</Label>
            <select
              style={field}
              value={story.status}
              onChange={(e) => editor.updateField("status", e.target.value as any)}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        {/* Subcategories — multi-select chips, scoped to the chosen category */}
        <div style={{ marginBottom: 14 }}>
          <Label>Subcategories</Label>
          {!story.categoryId ? (
            <p style={{ fontSize: 12.5, color: T.faint, margin: 0 }}>Choose a category first to assign subcategories.</p>
          ) : subLoading ? (
            <p style={{ fontSize: 12.5, color: T.muted, margin: 0 }}>Loading subcategories…</p>
          ) : subCategories.length === 0 ? (
            <p style={{ fontSize: 12.5, color: T.faint, margin: 0 }}>No subcategories for this category yet.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {subCategories.map((sc) => {
                const active = (story.subCategories || []).includes(sc.id);
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => toggleSubCategory(sc.id)}
                    style={{
                      padding: "6px 13px",
                      borderRadius: 100,
                      fontSize: 12.5,
                      fontWeight: 700,
                      fontFamily: T.sans,
                      cursor: "pointer",
                      border: `1px solid ${active ? T.accent : T.border}`,
                      background: active ? T.accent : "white",
                      color: active ? "white" : T.dark,
                      transition: "all 0.15s",
                    }}
                  >
                    {active ? "✓ " : ""}
                    {sc.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <Label>Cover image</Label>
          <ImageUploader value={story.coverImage} onChange={(url) => editor.updateField("coverImage", url)} />
        </div>

        <Label>Tags</Label>
        <div style={{ marginBottom: 14 }}>
          <ChipInput
            values={story.tags}
            onAdd={(v) => editor.addToList("tags", v)}
            onRemove={(i) => editor.removeFromList("tags", i)}
            placeholder="Add a tag and press Enter"
          />
        </div>

        <Label>Quick answer</Label>
        <textarea
          style={{ ...field, minHeight: 80, resize: "vertical" }}
          value={story.quickAnswer}
          placeholder="A TL;DR that answers the reader's question in 1–2 sentences."
          onChange={(e) => editor.updateField("quickAnswer", e.target.value)}
        />
      </Section>

      {/* ── Content blocks ── */}
      <Section id="content" title="Content Blocks" subtitle="The body of your post. Add, reorder and edit blocks.">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {story.blocks.map((block, i) => (
            <BlockEditor
              key={block.id}
              block={block}
              index={i}
              total={story.blocks.length}
              onChange={(patch) => editor.updateBlock(block.id, patch)}
              onRemove={() => editor.removeBlock(block.id)}
              onMove={(dir) => editor.moveBlock(block.id, dir)}
              onDuplicate={() => editor.duplicateBlock(block.id)}
            />
          ))}
          {story.blocks.length === 0 && (
            <p style={{ fontSize: 13.5, color: T.faint, textAlign: "center", padding: "16px 0" }}>
              No blocks yet — add your first one below.
            </p>
          )}
        </div>

        {/* Add-block picker */}
        <div style={{ marginTop: 18 }}>
          {!pickerOpen ? (
            <button onClick={() => setPickerOpen(true)} style={{ ...addBtnStyle, width: "100%", padding: "14px" }}>
              + Add content block
            </button>
          ) : (
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 16, padding: 14, background: T.bg }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: T.dark }}>Choose a block</span>
                <button onClick={() => setPickerOpen(false)} style={{ border: "none", background: "none", cursor: "pointer", color: T.muted }}>
                  ✕
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                {BLOCK_DEFINITIONS.map((b) => (
                  <button
                    key={b.type}
                    onClick={() => {
                      editor.addBlock(b.type as BlockType);
                      setPickerOpen(false);
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      alignItems: "flex-start",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: `1px solid ${T.border}`,
                      background: "white",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{b.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: T.dark }}>{b.label}</span>
                    <span style={{ fontSize: 11, color: T.muted, lineHeight: 1.3 }}>{b.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ── Highlights ── */}
      <Section id="highlights" title="Highlights" subtitle="Key takeaways shown as a bulleted summary.">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {story.highlights.map((h, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ color: T.accent, fontWeight: 800 }}>★</span>
              <input
                style={field}
                value={h}
                placeholder={`Highlight ${i + 1}`}
                onChange={(e) => editor.updateInList("highlights", i, e.target.value)}
              />
              <button style={removeBtnStyle} onClick={() => editor.removeFromList("highlights", i)}>
                ✕
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => editor.addToList("highlights", "")} style={{ ...addBtnStyle, marginTop: 12 }}>
          + Add highlight
        </button>
      </Section>

      {/* ── Beauty insights ── */}
      <Section id="insights" title="Beauty Insights" subtitle="Ingredient notes, myths, facts and expert tips.">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {story.beautyInsights.map((ins) => (
            <div key={ins.id} style={{ border: `1px solid ${T.border}`, borderRadius: 16, padding: 16 }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <select
                  style={{ ...field, width: 160 }}
                  value={ins.type}
                  onChange={(e) => editor.updateInsight(ins.id, { type: e.target.value as any })}
                >
                  {INSIGHT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.icon} {t.label}
                    </option>
                  ))}
                </select>
                <input
                  style={field}
                  value={ins.title}
                  placeholder="Insight title"
                  onChange={(e) => editor.updateInsight(ins.id, { title: e.target.value })}
                />
                <button style={removeBtnStyle} onClick={() => editor.removeInsight(ins.id)}>
                  ✕
                </button>
              </div>
              <textarea
                style={{ ...field, minHeight: 70, resize: "vertical" }}
                value={ins.content}
                placeholder="Insight detail…"
                onChange={(e) => editor.updateInsight(ins.id, { content: e.target.value })}
              />
            </div>
          ))}
        </div>
        <button onClick={editor.addInsight} style={{ ...addBtnStyle, marginTop: 12 }}>
          + Add insight
        </button>
      </Section>

      {/* ── FAQ ── */}
      <Section id="faq" title="FAQ" subtitle="Common reader questions and answers.">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {story.faq.map((f) => (
            <div key={f.id} style={{ border: `1px solid ${T.border}`, borderRadius: 16, padding: 16 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input
                  style={{ ...field, fontWeight: 700 }}
                  value={f.question}
                  placeholder="Question"
                  onChange={(e) => editor.updateFaq(f.id, { question: e.target.value })}
                />
                <button style={removeBtnStyle} onClick={() => editor.removeFaq(f.id)}>
                  ✕
                </button>
              </div>
              <textarea
                style={{ ...field, minHeight: 70, resize: "vertical" }}
                value={f.answer}
                placeholder="Answer"
                onChange={(e) => editor.updateFaq(f.id, { answer: e.target.value })}
              />
            </div>
          ))}
        </div>
        <button onClick={editor.addFaq} style={{ ...addBtnStyle, marginTop: 12 }}>
          + Add question
        </button>
      </Section>

      {/* ── Sources ── */}
      <Section id="sources" title="Sources" subtitle="References and further reading.">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {story.sources.map((s) => (
            <div key={s.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                style={{ ...field, flex: "0 0 40%" }}
                value={s.title}
                placeholder="Source title"
                onChange={(e) => editor.updateSource(s.id, { title: e.target.value })}
              />
              <input
                style={field}
                value={s.url}
                placeholder="https://…"
                onChange={(e) => editor.updateSource(s.id, { url: e.target.value })}
              />
              <button style={removeBtnStyle} onClick={() => editor.removeSource(s.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
        <button onClick={editor.addSource} style={{ ...addBtnStyle, marginTop: 12 }}>
          + Add source
        </button>
      </Section>

      {/* ── SEO ── */}
      <Section id="seo" title="SEO" subtitle="How this post appears in search & social previews.">
        <Label>Meta title</Label>
        <input
          style={{ ...field, marginBottom: 14 }}
          value={story.seo.metaTitle}
          placeholder={story.title || "Defaults to the post title"}
          onChange={(e) => editor.updateSeo("metaTitle", e.target.value)}
        />

        <Label>Meta description</Label>
        <textarea
          style={{ ...field, minHeight: 70, resize: "vertical", marginBottom: 14 }}
          value={story.seo.metaDescription}
          placeholder="Up to ~160 characters."
          onChange={(e) => editor.updateSeo("metaDescription", e.target.value)}
        />

        <Label>Slug</Label>
        <input
          style={{ ...field, marginBottom: 14 }}
          value={story.seo.slug}
          placeholder="auto-generated-from-title"
          onChange={(e) => editor.updateSeo("slug", e.target.value)}
        />

        <Label>Keywords</Label>
        <ChipInput
          values={story.seo.keywords}
          onAdd={(v) => editor.addKeyword(v)}
          onRemove={(i) => editor.removeKeyword(i)}
          placeholder="Add a keyword and press Enter"
        />
      </Section>
    </div>
  );
};

export default StoryForm;
