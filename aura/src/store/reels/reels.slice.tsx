import { createSlice } from "@reduxjs/toolkit";
import { fetchReels } from "./reels.action";
import { Reel } from "../../constants";

const normalizeId = (value: any): string => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof value.$oid === "string")
    return value.$oid;
  return String(value ?? "");
};

const formatLikes = (n: any): string => {
  const num = Number(n) || 0;
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(num);
};

/* Pull the first playable video out of a post's sections (or a top-level field). */
const pickVideo = (post: any): string => {
  const fromSection = Array.isArray(post?.sections)
    ? post.sections.find(
        (s: any) => String(s?.type).toLowerCase() === "video" && s?.videoUrl,
      )?.videoUrl
    : undefined;
  return fromSection || post?.videoUrl || "";
};

/* Pull a still frame for the card. Reels.tsx keys `preload` off this: with a
   poster it can use preload="none", without one the card paints empty until
   the video buffers — which is what live (backend) reels were doing, since
   this mapper never set the field at all. */
const pickPoster = (post: any): string => {
  const fromSection = Array.isArray(post?.sections)
    ? post.sections.find(
        (s: any) => String(s?.type).toLowerCase() === "video" && s?.posterUrl,
      )?.posterUrl
    : undefined;
  return (
    fromSection || post?.thumbnail || post?.coverImage || post?.imageUrl || ""
  );
};

/* Map a backend Post (type: 'reel') into the frontend Reel shape. */
const mapPostToReel = (post: any): Reel => ({
  id: normalizeId(post?._id) || normalizeId(post?.id),
  src: pickVideo(post),
  poster: pickPoster(post),
  title: post?.title || "Untitled Reel",
  caption: post?.subtitle || post?.ai?.summary || "",
  author: post?.author?.name || post?.authorName || "Aura & Earth",
  handle: post?.author?.handle || "@auraearth",
  tags: Array.isArray(post?.tags) ? post.tags : [],
  likes: formatLikes(post?.stats?.likes),
});

interface ReelsState {
  reels: Reel[];
  loading: boolean;
  error: string | null;
}

const initialState: ReelsState = {
  reels: [],
  loading: false,
  error: null,
};

const reelsSlice = createSlice({
  name: "reels",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReels.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReels.fulfilled, (state, action) => {
        state.loading = false;
        const rawData = action.payload?.data || action.payload;
        const list = Array.isArray(rawData) ? rawData : rawData?.posts || [];
        // Only keep reels that actually have a video source.
        state.reels = list.map(mapPostToReel).filter((r: Reel) => r.src);
      })
      .addCase(fetchReels.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default reelsSlice.reducer;
