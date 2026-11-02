/* ════════════════════════════════════════════════════════════
   StoryForm — renders every editable section of the story.
   Driven entirely by the useStoryEditor hook passed in.
   ════════════════════════════════════════════════════════════ */

import React, { useEffect, useState } from "react";
import { UseStoryEditor } from "./useStoryEditor";
import BlockEditor from "./BlockEditor";
import ImageUploader from "./ImageUploader";
import MediaUploader from "./MediaUploader";
import { isVideoUrl } from "../../services/uploadImage";
import {
  EDITOR_THEME as T,
  BLOCK_DEFINITIONS,
  INSIGHT_TYPES,
} from "./blockTypes";
import { BlockType } from "./story.types";
import { StoryService, CategoryLite } from "./story.service";
import "./StoryForm.css";
import { describeError } from "../../services/errorMessage";

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="story-form-label">{children}</label>
);

const Section: React.FC<{
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ id, title, subtitle, children }) => (
  <section id={`section-${id}`} className="story-form-section">
    <h3 className="story-form-section-title">{title}</h3>
    {subtitle && <p className="story-form-section-subtitle">{subtitle}</p>}
    {!subtitle && <div className="h-[18px]" />}
    {children}
  </section>
);

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
      <div className="mb-2.5 flex flex-wrap gap-2">
        {values.map((v, i) => (
          <span key={i} className="story-form-chip">
            {v}
            <button
              onClick={() => onRemove(i)}
              className="story-form-chip-remove"
            >
              ✕
            </button>
          </span>
        ))}
        {values.length === 0 && (
          <span className="text-[12.5px] text-[rgba(47,39,68,0.35)]">
            No items yet.
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          className="story-form-field"
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
        <button
          onClick={commit}
          className="story-form-add-btn whitespace-nowrap"
        >
          + Add
        </button>
      </div>
    </div>
  );
};

interface StoryFormProps {
  editor: UseStoryEditor;
}

type CoverKind = "image" | "video";

const COVER_KINDS: { id: CoverKind; label: string }[] = [
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
];

const StoryForm: React.FC<StoryFormProps> = ({ editor }) => {
  const { story } = editor;
  const [pickerOpen, setPickerOpen] = useState(false);

  /* ── Cover: photograph or short clip, admin's choice ── */
  const [coverKind, setCoverKind] = useState<CoverKind>(
    isVideoUrl(story.coverImage) ? "video" : "image",
  );

  // An already-saved cover decides which tab opens. Guarded on a non-empty
  // value so that clearing the slot — including the clear below — leaves the
  // admin on the tab they picked rather than snapping back to Image.
  useEffect(() => {
    if (story.coverImage) {
      setCoverKind(isVideoUrl(story.coverImage) ? "video" : "image");
    }
  }, [story.coverImage]);

  const selectCoverKind = (kind: CoverKind) => {
    setCoverKind(kind);
    // Drop a cover of the other type when switching: an image URL inside a
    // <video> (or a clip inside an <img>) previews as a broken tile.
    const stillFits =
      kind === "video"
        ? isVideoUrl(story.coverImage)
        : !isVideoUrl(story.coverImage);
    if (story.coverImage && !stillFits) editor.updateField("coverImage", "");
  };

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
      .catch(
        (e: any) =>
          active && setCatError(describeError(e, "Couldn't load categories.")),
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
    <div className="min-w-0 flex-1 font-sans">
      {/* ── Story details ── */}
      <Section
        id="details"
        title="Post Details"
        subtitle="The essentials shown on cards and at the top of the article."
      >
        <Label>Title</Label>
        <input
          className="story-form-field story-form-field--title"
          value={story.title}
          placeholder="The headline of your post"
          onChange={(e) => editor.updateField("title", e.target.value)}
        />

        <Label>Subtitle</Label>
        <input
          className="story-form-field mb-3.5"
          value={story.subtitle}
          placeholder="A supporting one-liner"
          onChange={(e) => editor.updateField("subtitle", e.target.value)}
        />

        <Label>Post Type</Label>
        <select
          className="story-form-field mb-3.5"
          value={story.postType}
          onChange={(e) =>
            editor.updateField("postType", e.target.value as any)
          }
        >
          <option value="article">Article — standard blog post</option>
          <option value="reel">Reel — short vertical video</option>
        </select>

        {story.postType === "reel" && (
          <>
            <Label>Reel Video URL</Label>
            <input
              className="story-form-field mb-1.5"
              value={story.videoUrl}
              placeholder="https://…/clip.mp4"
              onChange={(e) => editor.updateField("videoUrl", e.target.value)}
            />
            <p className="m-0 mb-3.5 text-[11.5px] text-[rgba(47,39,68,0.4)]">
              A direct link to a vertical (9:16) video file. This becomes the
              reel shown on the Reels page.
            </p>
          </>
        )}

        <div className="mb-3.5 grid grid-cols-[1fr_1fr] gap-3.5">
          <div>
            <Label>Category</Label>
            <select
              className="story-form-field"
              value={story.categoryId}
              disabled={catLoading}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              <option value="">
                {catLoading ? "Loading categories…" : "Select a category"}
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {catError && (
              <p className="m-0 mt-1.5 text-[11.5px] text-[#C0392B]">
                {catError}
              </p>
            )}
          </div>
          <div>
            <Label>Status</Label>
            <select
              className="story-form-field"
              value={story.status}
              onChange={(e) =>
                editor.updateField("status", e.target.value as any)
              }
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        {/* Subcategories — multi-select chips, scoped to the chosen category */}
        <div className="mb-3.5">
          <Label>Subcategories</Label>
          {!story.categoryId ? (
            <p className="m-0 text-[12.5px] text-[rgba(47,39,68,0.35)]">
              Choose a category first to assign subcategories.
            </p>
          ) : subLoading ? (
            <p className="m-0 text-[12.5px] text-[rgba(47,39,68,0.55)]">
              Loading subcategories…
            </p>
          ) : subCategories.length === 0 ? (
            <p className="m-0 text-[12.5px] text-[rgba(47,39,68,0.35)]">
              No subcategories for this category yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {subCategories.map((sc) => {
                const active = (story.subCategories || []).includes(sc.id);
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => toggleSubCategory(sc.id)}
                    className="story-form-subcat-btn"
                    style={{
                      border: `1px solid ${active ? T.accent : T.border}`,
                      background: active ? T.accent : "white",
                      color: active ? "white" : T.dark,
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

        {/* Cover — a photograph or a short clip. Both are stored in the same
            thumbnailUrl field; the reader (PostCover) picks <img> or a muted
            looping <video> from the extension, so the choice here is only
            about which uploader the admin gets. */}
        <div className="mb-3.5">
          <Label>Cover</Label>
          <div className="flex gap-2 mb-2">
            {COVER_KINDS.map((k) => {
              const active = coverKind === k.id;
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => selectCoverKind(k.id)}
                  className="story-form-subcat-btn"
                  style={{
                    border: `1px solid ${active ? T.accent : T.border}`,
                    background: active ? T.accent : "white",
                    color: active ? "white" : T.dark,
                  }}
                >
                  {active ? "✓ " : ""}
                  {k.label}
                </button>
              );
            })}
          </div>
          {coverKind === "video" ? (
            <MediaUploader
              kind="video"
              value={story.coverImage}
              onChange={(url) => editor.updateField("coverImage", url)}
            />
          ) : (
            <ImageUploader
              value={story.coverImage}
              onChange={(url) => editor.updateField("coverImage", url)}
            />
          )}
        </div>

        <Label>Tags</Label>
        <div className="mb-3.5">
          <ChipInput
            values={story.tags}
            onAdd={(v) => editor.addToList("tags", v)}
            onRemove={(i) => editor.removeFromList("tags", i)}
            placeholder="Add a tag and press Enter"
          />
        </div>

        <Label>Quick answer</Label>
        <textarea
          className="story-form-field min-h-[80px] resize-y"
          value={story.quickAnswer}
          placeholder="A TL;DR that answers the reader's question in 1–2 sentences."
          onChange={(e) => editor.updateField("quickAnswer", e.target.value)}
        />

        {story.contentType === "FACE_OIL" && (
          <div className="mt-3.5">
            <Label>Disclaimer</Label>
            <textarea
              className="story-form-field min-h-[80px] resize-y"
              value={story.disclaimer}
              placeholder="Safety note / patch-test / medical disclaimer shown to readers on this oil post. Leave blank to hide."
              onChange={(e) => editor.updateField("disclaimer", e.target.value)}
            />
            <p className="m-0 mt-1.5 text-[11.5px] text-[rgba(47,39,68,0.4)]">
              Shown in a highlighted box at the bottom of the oil detail page.
            </p>
          </div>
        )}
      </Section>

      {/* ── Content blocks ── */}
      <Section
        id="content"
        title="Content Blocks"
        subtitle="The body of your post. Add, reorder and edit blocks."
      >
        <div className="flex flex-col gap-4">
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
            <p className="py-4 text-center text-[13.5px] text-[rgba(47,39,68,0.35)]">
              No blocks yet — add your first one below.
            </p>
          )}
        </div>

        {/* Add-block picker */}
        <div className="mt-[18px]">
          {!pickerOpen ? (
            <button
              onClick={() => setPickerOpen(true)}
              className="story-form-add-btn story-form-add-btn--block"
            >
              + Add content block
            </button>
          ) : (
            <div className="story-form-picker">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[13px] font-extrabold text-ink">
                  Choose a block
                </span>
                <button
                  onClick={() => setPickerOpen(false)}
                  className="story-form-picker-close"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5">
                {BLOCK_DEFINITIONS.map((b) => (
                  <button
                    key={b.type}
                    onClick={() => {
                      editor.addBlock(b.type as BlockType);
                      setPickerOpen(false);
                    }}
                    className="story-form-picker-item"
                  >
                    <span className="text-[18px]">{b.icon}</span>
                    <span className="text-[13px] font-extrabold text-ink">
                      {b.label}
                    </span>
                    <span className="text-[11px] leading-[1.3] text-[rgba(47,39,68,0.55)]">
                      {b.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ── Highlights ── */}
      <Section
        id="highlights"
        title="Highlights"
        subtitle="Key takeaways shown as a bulleted summary."
      >
        <div className="flex flex-col gap-2">
          {story.highlights.map((h, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="font-extrabold text-sage">★</span>
              <input
                className="story-form-field"
                value={h}
                placeholder={`Highlight ${i + 1}`}
                onChange={(e) =>
                  editor.updateInList("highlights", i, e.target.value)
                }
              />
              <button
                className="story-form-remove-btn"
                onClick={() => editor.removeFromList("highlights", i)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => editor.addToList("highlights", "")}
          className="story-form-add-btn mt-3"
        >
          + Add highlight
        </button>
      </Section>

      {/* ── Beauty insights ── */}
      <Section
        id="insights"
        title="Beauty Insights"
        subtitle="Ingredient notes, myths, facts and expert tips."
      >
        <div className="flex flex-col gap-3.5">
          {story.beautyInsights.map((ins) => (
            <div key={ins.id} className="story-form-item-card">
              <div className="mb-2.5 flex gap-2.5">
                <select
                  className="story-form-field story-form-field--type"
                  value={ins.type}
                  onChange={(e) =>
                    editor.updateInsight(ins.id, {
                      type: e.target.value as any,
                    })
                  }
                >
                  {INSIGHT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.icon} {t.label}
                    </option>
                  ))}
                </select>
                <input
                  className="story-form-field"
                  value={ins.title}
                  placeholder="Insight title"
                  onChange={(e) =>
                    editor.updateInsight(ins.id, { title: e.target.value })
                  }
                />
                <button
                  className="story-form-remove-btn"
                  onClick={() => editor.removeInsight(ins.id)}
                >
                  ✕
                </button>
              </div>
              <textarea
                className="story-form-field min-h-[70px] resize-y"
                value={ins.content}
                placeholder="Insight detail…"
                onChange={(e) =>
                  editor.updateInsight(ins.id, { content: e.target.value })
                }
              />
            </div>
          ))}
        </div>
        <button onClick={editor.addInsight} className="story-form-add-btn mt-3">
          + Add insight
        </button>
      </Section>

      {/* ── FAQ ── */}
      <Section
        id="faq"
        title="FAQ"
        subtitle="Common reader questions and answers."
      >
        <div className="flex flex-col gap-3.5">
          {story.faq.map((f) => (
            <div key={f.id} className="story-form-item-card">
              <div className="mb-2.5 flex gap-2">
                <input
                  className="story-form-field font-bold"
                  value={f.question}
                  placeholder="Question"
                  onChange={(e) =>
                    editor.updateFaq(f.id, { question: e.target.value })
                  }
                />
                <button
                  className="story-form-remove-btn"
                  onClick={() => editor.removeFaq(f.id)}
                >
                  ✕
                </button>
              </div>
              <textarea
                className="story-form-field min-h-[70px] resize-y"
                value={f.answer}
                placeholder="Answer"
                onChange={(e) =>
                  editor.updateFaq(f.id, { answer: e.target.value })
                }
              />
            </div>
          ))}
        </div>
        <button onClick={editor.addFaq} className="story-form-add-btn mt-3">
          + Add question
        </button>
      </Section>

      {/* ── Sources ── */}
      <Section
        id="sources"
        title="Sources"
        subtitle="References and further reading."
      >
        <div className="flex flex-col gap-2.5">
          {story.sources.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <input
                className="story-form-field flex-[0_0_40%]"
                value={s.title}
                placeholder="Source title"
                onChange={(e) =>
                  editor.updateSource(s.id, { title: e.target.value })
                }
              />
              <input
                className="story-form-field"
                value={s.url}
                placeholder="https://…"
                onChange={(e) =>
                  editor.updateSource(s.id, { url: e.target.value })
                }
              />
              <button
                className="story-form-remove-btn"
                onClick={() => editor.removeSource(s.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button onClick={editor.addSource} className="story-form-add-btn mt-3">
          + Add source
        </button>
      </Section>

      {/* ── SEO ── */}
      <Section
        id="seo"
        title="SEO"
        subtitle="How this post appears in search & social previews."
      >
        <Label>Meta title</Label>
        <input
          className="story-form-field mb-3.5"
          value={story.seo.metaTitle}
          placeholder={story.title || "Defaults to the post title"}
          onChange={(e) => editor.updateSeo("metaTitle", e.target.value)}
        />

        <Label>Meta description</Label>
        <textarea
          className="story-form-field mb-3.5 min-h-[70px] resize-y"
          value={story.seo.metaDescription}
          placeholder="Up to ~160 characters."
          onChange={(e) => editor.updateSeo("metaDescription", e.target.value)}
        />

        <Label>Slug</Label>
        <input
          className="story-form-field mb-3.5"
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
