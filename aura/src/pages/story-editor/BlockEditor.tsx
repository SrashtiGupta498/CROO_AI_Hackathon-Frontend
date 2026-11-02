/* ════════════════════════════════════════════════════════════
   BlockEditor — edits a single StoryBlock based on its type.
   Includes a compact contentEditable RichText for prose blocks.
   ════════════════════════════════════════════════════════════ */

import React, { useRef } from "react";
import { StoryBlock } from "./story.types";
import { blockDef, EDITOR_THEME as T } from "./blockTypes";
import ImageUploader from "./ImageUploader";
import MediaUploader from "./MediaUploader";
import "./BlockEditor.css";
import { sanitizeHtml } from "../../utils/sanitize";

/* How an image block lays out on the page. "carousel" maps to the `gallery`
   section type on save — both are already valid SECTION_TYPES, so this needs
   no schema change. */
const IMAGE_LAYOUTS: {
  id: "single" | "carousel";
  label: string;
  hint: string;
}[] = [
  { id: "single", label: "Single image", hint: "One full-width photo" },
  {
    id: "carousel",
    label: "Carousel",
    hint: "Several photos in a swipeable strip",
  },
];

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block-editor-label">{children}</label>
);

/* ─── Compact rich-text editor (contentEditable) ─── */
const RICH_TOOLS: { cmd: string; val?: string; label: string; tip: string }[] =
  [
    { cmd: "bold", label: "B", tip: "Bold" },
    { cmd: "italic", label: "i", tip: "Italic" },
    { cmd: "formatBlock", val: "H3", label: "H", tip: "Heading" },
    { cmd: "insertUnorderedList", label: "•", tip: "Bullet list" },
    { cmd: "createLink", label: "🔗", tip: "Link" },
  ];

export const RichText: React.FC<{
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder }) => {
  const ref = useRef<HTMLDivElement>(null);

  const exec = (cmd: string, val?: string) => {
    ref.current?.focus();
    if (cmd === "createLink") {
      const url = window.prompt("Enter URL:");
      if (url) document.execCommand("createLink", false, url);
    } else {
      document.execCommand(cmd, false, val);
    }
    onChange(ref.current?.innerHTML || "");
  };

  return (
    <div className="block-editor-richtext">
      <div className="block-editor-richtext-toolbar">
        {RICH_TOOLS.map((tool) => (
          <button
            key={tool.label}
            type="button"
            title={tool.tip}
            onMouseDown={(e) => {
              e.preventDefault();
              exec(tool.cmd, tool.val);
            }}
            className="block-editor-richtext-tool"
            style={{ fontStyle: tool.label === "i" ? "italic" : "normal" }}
          >
            {tool.label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder || "Start writing…"}
        onInput={() => onChange(ref.current?.innerHTML || "")}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
        className="block-editor-richtext-editor"
      />
    </div>
  );
};

/* ─── Block controls (move / duplicate / delete) ─── */
const ControlBtn: React.FC<{
  onClick: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ onClick, title, disabled, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    disabled={disabled}
    className="block-editor-control-btn"
  >
    {children}
  </button>
);

interface BlockEditorProps {
  block: StoryBlock;
  index: number;
  total: number;
  onChange: (patch: Partial<StoryBlock>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
}

const BlockEditor: React.FC<BlockEditorProps> = ({
  block,
  index,
  total,
  onChange,
  onRemove,
  onMove,
  onDuplicate,
}) => {
  const def = blockDef(block.type);

  const renderBody = () => {
    switch (block.type) {
      case "text":
        return (
          <>
            <Label>Heading (optional)</Label>
            <input
              className="block-editor-field mb-2.5"
              value={block.heading || ""}
              placeholder="Section heading"
              onChange={(e) => onChange({ heading: e.target.value })}
            />
            <Label>Content</Label>
            <RichText
              value={block.content}
              onChange={(html) => onChange({ content: html })}
              placeholder="Write your paragraph…"
            />
          </>
        );

      case "image": {
        const carousel = block.layout === "carousel";
        // Always at least one slot to upload into.
        const slides =
          block.images && block.images.length
            ? block.images
            : block.imageUrl
              ? [block.imageUrl]
              : [""];

        // imageUrl tracks the first slide so readers that only understand a
        // single image still show something sensible.
        const setSlides = (next: string[]) =>
          onChange({ images: next, imageUrl: next.find(Boolean) || "" });

        const setLayout = (next: "single" | "carousel") =>
          next === "carousel"
            ? onChange({ layout: "carousel", images: slides })
            : onChange({
                layout: "single",
                imageUrl: slides.find(Boolean) || "",
                images: undefined,
              });

        return (
          <>
            <Label>Layout</Label>
            <div className="flex gap-2 mb-2.5">
              {IMAGE_LAYOUTS.map((l) => {
                const active = carousel === (l.id === "carousel");
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLayout(l.id)}
                    className="story-form-subcat-btn"
                    style={{
                      border: `1px solid ${active ? T.accent : T.border}`,
                      background: active ? T.accent : "white",
                      color: active ? "white" : T.dark,
                    }}
                    title={l.hint}
                  >
                    {active ? "✓ " : ""}
                    {l.label}
                  </button>
                );
              })}
            </div>

            {!carousel ? (
              <ImageUploader
                value={block.imageUrl}
                onChange={(url) => onChange({ imageUrl: url })}
                label="Image"
                height={160}
              />
            ) : (
              <>
                {slides.map((url, i) => (
                  <div key={i} className="mb-2.5">
                    <ImageUploader
                      value={url}
                      onChange={(u) =>
                        setSlides(slides.map((s, j) => (j === i ? u : s)))
                      }
                      label={`Slide ${i + 1}`}
                      height={140}
                    />
                    {slides.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setSlides(slides.filter((_, j) => j !== i))
                        }
                        className="mt-1 text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: T.muted }}
                      >
                        Remove slide {i + 1}
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setSlides([...slides, ""])}
                  className="story-form-subcat-btn"
                  style={{
                    border: `1px dashed ${T.border}`,
                    background: "white",
                    color: T.dark,
                  }}
                >
                  + Add slide
                </button>
                <p className="mt-1.5 mb-0 text-[11px] text-[rgba(47,39,68,0.55)]">
                  A carousel needs two or more slides — with one it saves as a
                  single image.
                </p>
              </>
            )}

            <div className="mt-2.5" />
            <Label>Caption (optional)</Label>
            <input
              className="block-editor-field"
              value={block.caption || ""}
              placeholder="Photo caption"
              onChange={(e) => onChange({ caption: e.target.value })}
            />
          </>
        );
      }

      case "video":
        return (
          <>
            <MediaUploader
              value={block.videoUrl}
              onChange={(url) => onChange({ videoUrl: url })}
              label="Video"
              height={180}
              kind="video"
            />
            <div className="mt-2.5" />
            <Label>Caption (optional)</Label>
            <input
              className="block-editor-field"
              value={block.caption || ""}
              placeholder="Video caption"
              onChange={(e) => onChange({ caption: e.target.value })}
            />
          </>
        );

      case "gif":
        return (
          <>
            <MediaUploader
              value={block.mediaUrl}
              onChange={(url) => onChange({ mediaUrl: url })}
              label="GIF"
              height={180}
              kind="gif"
            />
            <div className="mt-2.5" />
            <Label>Caption (optional)</Label>
            <input
              className="block-editor-field"
              value={block.caption || ""}
              placeholder="GIF caption"
              onChange={(e) => onChange({ caption: e.target.value })}
            />
          </>
        );

      case "quote":
        return (
          <>
            <Label>Quote</Label>
            <textarea
              className="block-editor-field mb-2.5 min-h-[70px] resize-y"
              value={block.quote}
              placeholder="“A memorable line…”"
              onChange={(e) => onChange({ quote: e.target.value })}
            />
            <Label>Author (optional)</Label>
            <input
              className="block-editor-field"
              value={block.author || ""}
              placeholder="— Author name"
              onChange={(e) => onChange({ author: e.target.value })}
            />
          </>
        );

      case "tip":
      case "warning":
      case "callout":
        return (
          <>
            <Label>Title</Label>
            <input
              className="block-editor-field mb-2.5"
              value={block.title}
              placeholder={def.label + " title"}
              onChange={(e) => onChange({ title: e.target.value })}
            />
            <Label>Content</Label>
            <RichText
              value={block.content}
              onChange={(html) => onChange({ content: html })}
              placeholder={def.description}
            />
          </>
        );

      case "checklist":
        return (
          <>
            <Label>Items</Label>
            <div className="flex flex-col gap-2">
              {block.items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sage">✓</span>
                  <input
                    className="block-editor-field"
                    value={item}
                    placeholder={`Item ${i + 1}`}
                    onChange={(e) =>
                      onChange({
                        items: block.items.map((it, idx) =>
                          idx === i ? e.target.value : it,
                        ),
                      })
                    }
                  />
                  <ControlBtn
                    title="Remove item"
                    onClick={() =>
                      onChange({
                        items: block.items.filter((_, idx) => idx !== i),
                      })
                    }
                  >
                    ✕
                  </ControlBtn>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onChange({ items: [...block.items, ""] })}
              className="block-editor-add-item-btn"
            >
              + Add item
            </button>
          </>
        );

      case "comparison":
        return (
          <div className="grid grid-cols-[1fr_1fr] gap-3">
            <div>
              <Label>Left title</Label>
              <input
                className="block-editor-field mb-2.5"
                value={block.leftTitle}
                placeholder="Option A"
                onChange={(e) => onChange({ leftTitle: e.target.value })}
              />
              <Label>Left content</Label>
              <textarea
                className="block-editor-field min-h-[90px] resize-y"
                value={block.leftContent}
                onChange={(e) => onChange({ leftContent: e.target.value })}
              />
            </div>
            <div>
              <Label>Right title</Label>
              <input
                className="block-editor-field mb-2.5"
                value={block.rightTitle}
                placeholder="Option B"
                onChange={(e) => onChange({ rightTitle: e.target.value })}
              />
              <Label>Right content</Label>
              <textarea
                className="block-editor-field min-h-[90px] resize-y"
                value={block.rightContent}
                onChange={(e) => onChange({ rightContent: e.target.value })}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="block-editor-card">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[16px]">{def.icon}</span>
          <span className="text-[13px] font-extrabold text-ink">
            {def.label}
          </span>
          <span className="text-[11px] text-[rgba(47,39,68,0.35)]">
            #{index + 1}
          </span>
        </div>
        <div className="flex gap-1.5">
          <ControlBtn
            title="Move up"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            ↑
          </ControlBtn>
          <ControlBtn
            title="Move down"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            ↓
          </ControlBtn>
          <ControlBtn title="Duplicate" onClick={onDuplicate}>
            ⧉
          </ControlBtn>
          <ControlBtn title="Delete block" onClick={onRemove}>
            🗑
          </ControlBtn>
        </div>
      </div>
      {renderBody()}
    </div>
  );
};

export default BlockEditor;
