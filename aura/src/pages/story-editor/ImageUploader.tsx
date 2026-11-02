/* ════════════════════════════════════════════════════════════
   ImageUploader — reusable image picker.
   Tries the upload service; gracefully falls back to a local
   data-URL preview (offline) and always allows a manual URL.
   ════════════════════════════════════════════════════════════ */

import React, { useRef, useState } from "react";
import { StoryService } from "./story.service";
import { EDITOR_THEME as T } from "./blockTypes";
import "./ImageUploader.css";

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

const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  label,
  height = 180,
}) => {
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
    } catch (err: any) {
      // Offline / no upload backend → embed a local preview so the
      // editor stays fully usable.
      const dataUrl = await readAsDataUrl(file);
      onChange(dataUrl);
      const reason =
        err?.message && err.message !== "empty url"
          ? err.message
          : "Upload failed.";
      setNote(
        `${reason} Showing a local preview only — re-upload before saving, or the save will be blocked.`,
      );
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
      {label && <label className="image-uploader-label">{label}</label>}

      <div
        onClick={() => inputRef.current?.click()}
        className="image-uploader-dropzone"
        style={{
          height,
          border: `1.5px dashed ${value ? "transparent" : T.accentMed}`,
          background: value ? "#000" : T.accentSoft,
        }}
      >
        {value ? (
          <img
            src={value}
            alt="cover"
            className="h-full w-full object-cover opacity-95"
          />
        ) : (
          <div className="text-center text-sage">
            <div className="mb-1.5 text-[28px]">{uploading ? "⏳" : "🖼️"}</div>
            <div className="text-[13px] font-bold">
              {uploading ? "Uploading…" : "Click to upload image"}
            </div>
            <div className="mt-0.5 text-[11px] text-[rgba(47,39,68,0.55)]">
              or paste a URL below
            </div>
          </div>
        )}

        {value && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setNote("");
            }}
            className="image-uploader-remove-btn"
            title="Remove image"
          >
            ✕
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onSelect}
        className="hidden"
      />

      <input
        type="text"
        value={value && value.startsWith("data:") ? "" : value}
        placeholder="https://image-url.jpg"
        onChange={(e) => onChange(e.target.value)}
        className="image-uploader-url-input"
      />
      {note && (
        <p className="mt-1.5 text-[11px] text-[rgba(47,39,68,0.55)]">{note}</p>
      )}
    </div>
  );
};

export default ImageUploader;
