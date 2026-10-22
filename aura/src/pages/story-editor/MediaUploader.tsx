/* ════════════════════════════════════════════════════════════
   MediaUploader — reusable video / GIF picker, mirroring
   ImageUploader's UX (upload → offline data-URL fallback → manual
   URL). Used by the Video and GIF content blocks.

   GIFs are previewed as an <img> (browsers autoplay/loop these
   natively); everything else previews as a muted, looping,
   controls-less <video> — which is how the GIF block plays back in
   the published article too. A raw animated GIF works, but an
   mp4/webm loop of the same clip is typically 5–10x smaller, so we
   nudge editors toward that without blocking the GIF upload path.
   ════════════════════════════════════════════════════════════ */

import React, { useRef, useState } from "react";
import { uploadMediaFile } from "../../services/uploadImage";
import { EDITOR_THEME as T } from "./blockTypes";
import "./ImageUploader.css";
import { describeError } from "../../services/errorMessage";

interface MediaUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  height?: number;
  /** "video" = normal clip, previewed with player controls.
   *  "gif" = looping muted clip (or raw .gif), previewed like a GIF. */
  kind: "video" | "gif";
}

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const isGifSrc = (src: string) => /^data:image\/gif/i.test(src) || /\.gif($|\?)/i.test(src);

const MediaUploader: React.FC<MediaUploaderProps> = ({ value, onChange, label, height = 180, kind }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState<string>("");

  const accept = kind === "gif" ? "image/gif,video/mp4,video/webm" : "video/*";

  const handleFile = async (file: File) => {
    setUploading(true);
    setNote("");
    try {
      const { url } = await uploadMediaFile(file);
      onChange(url);
      setNote("Uploaded");
    } catch (err: any) {
      // Offline / no upload backend → embed a local preview so the
      // editor stays fully usable. Large clips make a heavy data-URL,
      // but it keeps editing unblocked; it's replaced on next upload.
      try {
        const dataUrl = await readAsDataUrl(file);
        onChange(dataUrl);
        setNote("Embedded locally (upload failed — will need re-upload before publish)");
      } catch {
        setNote(describeError(err, "Upload failed."));
      }
    } finally {
      setUploading(false);
    }
  };

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const showAsImage = value && kind === "gif" && isGifSrc(value);

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
          showAsImage ? (
            <img src={value} alt="gif preview" className="h-full w-full object-cover opacity-95" />
          ) : (
            <video
              src={value}
              className="h-full w-full object-cover opacity-95"
              autoPlay={kind === "gif"}
              muted={kind === "gif"}
              loop={kind === "gif"}
              controls={kind === "video"}
              playsInline
              preload="metadata"
            />
          )
        ) : (
          <div className="text-center text-sage">
            <div className="mb-1.5 text-[28px]">{uploading ? "⏳" : kind === "gif" ? "🎞️" : "🎬"}</div>
            <div className="text-[13px] font-bold">
              {uploading ? "Uploading…" : kind === "gif" ? "Click to upload a GIF or MP4/WebM loop" : "Click to upload a video"}
            </div>
            <div className="mt-0.5 text-[11px] text-[rgba(47,39,68,0.55)]">or paste a URL below · up to 50MB</div>
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
            title={`Remove ${kind}`}
          >
            ✕
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept={accept} onChange={onSelect} className="hidden" />

      <input
        type="text"
        value={value && value.startsWith("data:") ? "" : value}
        placeholder={kind === "gif" ? "https://…/clip.webm" : "https://…/clip.mp4"}
        onChange={(e) => onChange(e.target.value)}
        className="image-uploader-url-input"
      />
      {kind === "gif" && (
        <p className="mt-1.5 text-[11px] text-[rgba(47,39,68,0.55)]">
          Prefer an MP4/WebM loop over a raw .gif — same look, a fraction of the size.
        </p>
      )}
      {note && <p className="mt-1.5 text-[11px] text-[rgba(47,39,68,0.55)]">{note}</p>}
    </div>
  );
};

export default MediaUploader;
