/* ════════════════════════════════════════════════════════════
   BlockEditor — edits a single StoryBlock based on its type.
   Includes a compact contentEditable RichText for prose blocks.
   ════════════════════════════════════════════════════════════ */

import React, { useRef } from "react";
import { StoryBlock } from "./story.types";
import { EDITOR_THEME as T, blockDef } from "./blockTypes";
import ImageUploader from "./ImageUploader";

/* ─── Shared field primitives ─── */
const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 12,
  border: `1px solid ${T.border}`,
  fontSize: 14,
  fontFamily: T.sans,
  color: T.dark,
  outline: "none",
  background: "white",
};

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.muted, margin: "0 0 6px" }}>
    {children}
  </label>
);

/* ─── Compact rich-text editor (contentEditable) ─── */
const RICH_TOOLS: { cmd: string; val?: string; label: string; tip: string }[] = [
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
    <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${T.border}`, background: "white" }}>
      <div style={{ display: "flex", gap: 2, padding: "6px 8px", background: T.accentSoft, borderBottom: `1px solid ${T.border}` }}>
        {RICH_TOOLS.map((tool) => (
          <button
            key={tool.label}
            type="button"
            title={tool.tip}
            onMouseDown={(e) => {
              e.preventDefault();
              exec(tool.cmd, tool.val);
            }}
            style={{
              width: 30,
              height: 28,
              borderRadius: 7,
              border: "none",
              background: "transparent",
              color: T.muted,
              cursor: "pointer",
              fontWeight: 700,
              fontStyle: tool.label === "i" ? "italic" : "normal",
              fontSize: 14,
            }}
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
        dangerouslySetInnerHTML={{ __html: value }}
        style={{
          minHeight: 96,
          padding: "12px 16px",
          outline: "none",
          fontSize: 14,
          lineHeight: 1.7,
          color: T.dark,
          fontFamily: T.sans,
        }}
      />
    </div>
  );
};

/* ─── Block controls (move / duplicate / delete) ─── */
const ControlBtn: React.FC<{ onClick: () => void; title: string; disabled?: boolean; children: React.ReactNode }> = ({
  onClick,
  title,
  disabled,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    disabled={disabled}
    style={{
      width: 30,
      height: 30,
      borderRadius: 8,
      border: `1px solid ${T.border}`,
      background: "white",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.4 : 1,
      color: T.muted,
      fontSize: 13,
    }}
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
              style={{ ...fieldStyle, marginBottom: 10 }}
              value={block.heading || ""}
              placeholder="Section heading"
              onChange={(e) => onChange({ heading: e.target.value })}
            />
            <Label>Content</Label>
            <RichText value={block.content} onChange={(html) => onChange({ content: html })} placeholder="Write your paragraph…" />
          </>
        );

      case "image":
        return (
          <>
            <ImageUploader value={block.imageUrl} onChange={(url) => onChange({ imageUrl: url })} label="Image" height={160} />
            <div style={{ marginTop: 10 }} />
            <Label>Caption (optional)</Label>
            <input
              style={fieldStyle}
              value={block.caption || ""}
              placeholder="Photo caption"
              onChange={(e) => onChange({ caption: e.target.value })}
            />
          </>
        );

      case "quote":
        return (
          <>
            <Label>Quote</Label>
            <textarea
              style={{ ...fieldStyle, minHeight: 70, resize: "vertical", marginBottom: 10 }}
              value={block.quote}
              placeholder="“A memorable line…”"
              onChange={(e) => onChange({ quote: e.target.value })}
            />
            <Label>Author (optional)</Label>
            <input
              style={fieldStyle}
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
              style={{ ...fieldStyle, marginBottom: 10 }}
              value={block.title}
              placeholder={def.label + " title"}
              onChange={(e) => onChange({ title: e.target.value })}
            />
            <Label>Content</Label>
            <RichText value={block.content} onChange={(html) => onChange({ content: html })} placeholder={def.description} />
          </>
        );

      case "checklist":
        return (
          <>
            <Label>Items</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {block.items.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: T.accent }}>✓</span>
                  <input
                    style={fieldStyle}
                    value={item}
                    placeholder={`Item ${i + 1}`}
                    onChange={(e) => onChange({ items: block.items.map((it, idx) => (idx === i ? e.target.value : it)) })}
                  />
                  <ControlBtn
                    title="Remove item"
                    onClick={() => onChange({ items: block.items.filter((_, idx) => idx !== i) })}
                  >
                    ✕
                  </ControlBtn>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onChange({ items: [...block.items, ""] })}
              style={{
                marginTop: 10,
                padding: "8px 14px",
                borderRadius: 10,
                border: `1px dashed ${T.accentMed}`,
                background: T.accentSoft,
                color: T.accent,
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              + Add item
            </button>
          </>
        );

      case "comparison":
        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Label>Left title</Label>
              <input
                style={{ ...fieldStyle, marginBottom: 10 }}
                value={block.leftTitle}
                placeholder="Option A"
                onChange={(e) => onChange({ leftTitle: e.target.value })}
              />
              <Label>Left content</Label>
              <textarea
                style={{ ...fieldStyle, minHeight: 90, resize: "vertical" }}
                value={block.leftContent}
                onChange={(e) => onChange({ leftContent: e.target.value })}
              />
            </div>
            <div>
              <Label>Right title</Label>
              <input
                style={{ ...fieldStyle, marginBottom: 10 }}
                value={block.rightTitle}
                placeholder="Option B"
                onChange={(e) => onChange({ rightTitle: e.target.value })}
              />
              <Label>Right content</Label>
              <textarea
                style={{ ...fieldStyle, minHeight: 90, resize: "vertical" }}
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
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 18,
        background: T.surface,
        padding: 18,
        boxShadow: "0 2px 12px rgba(47,39,68,0.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{def.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: T.dark }}>{def.label}</span>
          <span style={{ fontSize: 11, color: T.faint }}>#{index + 1}</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <ControlBtn title="Move up" disabled={index === 0} onClick={() => onMove(-1)}>↑</ControlBtn>
          <ControlBtn title="Move down" disabled={index === total - 1} onClick={() => onMove(1)}>↓</ControlBtn>
          <ControlBtn title="Duplicate" onClick={onDuplicate}>⧉</ControlBtn>
          <ControlBtn title="Delete block" onClick={onRemove}>🗑</ControlBtn>
        </div>
      </div>
      {renderBody()}
    </div>
  );
};

export default BlockEditor;
