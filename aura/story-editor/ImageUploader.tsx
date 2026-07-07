/* ════════════════════════════════════════════════════════════
   ImageUploader — reusable image picker.
   Tries the upload service; gracefully falls back to a local
   data-URL preview (offline) and always allows a manual URL.
   ════════════════════════════════════════════════════════════ */

import React, { useRef, useState } from "react";
import { StoryService } from "./story.service";
import { EDITOR_THEME as T } from "./blockTypes";

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  height?: number;
}

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const ImageUploader: React.FC<ImageUploaderProps> = ({ value, onChange, label, height = 180 }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState<string>("");

  const handleFile = async (file: File) => {
    setUploading(true);
    setNote("");
    try {
      const url = await StoryService.uploadImage(file);
      if (url) {
        onChange(url);
        setNote("Uploaded");
      } else {
        throw new Error("empty url");
      }
    } catch {
      // Offline / no upload backend → embed a local preview so the
      // editor stays fully usable.
      const dataUrl = await readAsDataUrl(file);
      onChange(dataUrl);
      setNote("Embedded locally (no upload server)");
    } finally {
      setUploading(false);
    }
  };

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <div>
      {label && (
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 8 }}>
          {label}
        </label>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        style={{
          position: "relative",
          height,
          borderRadius: 18,
          overflow: "hidden",
          border: `1.5px dashed ${value ? "transparent" : T.accentMed}`,
          background: value ? "#000" : T.accentSoft,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {value ? (
          <img src={value} alt="cover" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.95 }} />
        ) : (
          <div style={{ textAlign: "center", color: T.accent }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{uploading ? "⏳" : "🖼️"}</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{uploading ? "Uploading…" : "Click to upload image"}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>or paste a URL below</div>
          </div>
        )}

        {value && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setNote("");
            }}
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: "none",
              background: "rgba(0,0,0,0.55)",
              color: "white",
              cursor: "pointer",
              fontSize: 14,
            }}
            title="Remove image"
          >
            ✕
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" onChange={onSelect} style={{ display: "none" }} />

      <input
        type="text"
        value={value && value.startsWith("data:") ? "" : value}
        placeholder="https://image-url.jpg"
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          marginTop: 10,
          padding: "10px 14px",
          borderRadius: 12,
          border: `1px solid ${T.border}`,
          fontSize: 13,
          fontFamily: T.sans,
          color: T.dark,
          outline: "none",
        }}
      />
      {note && <p style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>{note}</p>}
    </div>
  );
};

export default ImageUploader;
