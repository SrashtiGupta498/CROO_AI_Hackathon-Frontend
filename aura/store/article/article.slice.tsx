import { createSlice } from "@reduxjs/toolkit";
import {
  fetchPostsByCategory,
  fetchPostById,
  fetchAllPosts,
} from "./article.action";

const normalizeId = (value: any): string | undefined => {
  if (typeof value === "string") return value;
  if (!value) return undefined;
  if (typeof value === "object" && typeof value.$oid === "string")
    return value.$oid;
  const fallback = String(value);
  return fallback === "[object Object]" ? undefined : fallback;
};

const normalizeSection = (section: any) => {
  if (!section || typeof section !== "object") return section;

  const type = String(section.type || "").toLowerCase();
  if (type === "hero" && section.image && !section.images?.[0]) {
    return {
      ...section,
      type: "image",
      images: [section.image],
    };
  }

  return section;
};

const normalizePost = (post: any) => {
  if (!post || typeof post !== "object") return post;

  const normalizedId = normalizeId(post._id) || normalizeId(post.id);

  return {
    ...post,
    _id: normalizedId || post._id,
    id: normalizeId(post.id) || normalizedId || post.id,
    imageUrl:
      post.imageUrl || post.thumbnailUrl || post.thumbnail || post.image,
    thumbnailUrl: post.thumbnailUrl || post.imageUrl || post.thumbnail,
    thumbnail: post.thumbnail || post.thumbnailUrl || post.imageUrl,
    sections: Array.isArray(post.sections)
      ? post.sections.map(normalizeSection).filter(Boolean)
      : [],
  };
};

interface ArticleState {
  posts: any[];
  currentPost: any | null;
  totalPosts: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string | null;
}

const initialState: ArticleState = {
  posts: [],
  currentPost: null,
  totalPosts: 0,
  page: 1,
  limit: 100,
  loading: false,
  error: null,
};

const articleSlice = createSlice({
  name: "articles",
  initialState,
  reducers: {
    clearCurrentPost: (state) => {
      state.currentPost = null;
    },
    setPagination: (
      state,
      action: { payload: { page?: number; limit?: number } },
    ) => {
      if (action.payload.page !== undefined) state.page = action.payload.page;
      if (action.payload.limit !== undefined)
        state.limit = action.payload.limit;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPostsByCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPostsByCategory.fulfilled, (state, action) => {
        state.loading = false;
        const rawData = action.payload.data || action.payload;
        const posts = Array.isArray(rawData) ? rawData : rawData.posts || [];
        state.posts = posts.map(normalizePost);
        state.totalPosts =
          action.payload.total || action.payload.totalDocuments || 0;
      })
      .addCase(fetchPostsByCategory.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchPostById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPostById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPost = normalizePost(
          action.payload.data || action.payload,
        );
      })
      .addCase(fetchPostById.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchAllPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllPosts.fulfilled, (state, action) => {
        state.loading = false;
        const rawData = action.payload.data || action.payload;
        const newData = Array.isArray(rawData) ? rawData : rawData.posts || [];

        console.log("DEBUG: fetchAllPosts payload:", action.payload);
        console.log("DEBUG: newData count:", newData.length);

        // Replace posts for traditional pagination
        state.posts = newData.map(normalizePost);
        state.totalPosts =
          action.payload.total ||
          action.payload.totalDocuments ||
          action.payload.totalPosts ||
          0;
      })
      .addCase(fetchAllPosts.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearCurrentPost, setPagination } = articleSlice.actions;
export default articleSlice.reducer;
