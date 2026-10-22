import { createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../services/api";

interface FetchByCategoryParams {
  categoryId: string;
  limit?: number;
  page?: number;
}

export const fetchPostsByCategory = createAsyncThunk(
  "articles/fetchPostsByCategory",
  async (
    { categoryId, limit = 50, page = 1 }: FetchByCategoryParams,
    { rejectWithValue },
  ) => {
    try {
      const response = await API.get(
        `/posts/category/${categoryId}?limit=${limit}&page=${page}`,
      );

      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch posts",
      );
    }
  },
);

export const fetchPostById = createAsyncThunk(
  "articles/fetchPostById",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await API.get(`/posts/getpostById/${id}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch article",
      );
    }
  },
);

/**
 * Fetch a page of posts. Pass `append: true` to add the page onto the existing
 * list instead of replacing it — that is what the Explore feed's progressive
 * loading uses, so the reader never loses their scroll position.
 */
export const fetchAllPosts = createAsyncThunk(
  "articles/fetchAllPosts",
  async (
    // `append` is read off action.meta.arg by the reducer, not used here.
    { limit = 10, page = 1 }: {
      limit?: number;
      page?: number;
      append?: boolean;
    } = {},
    { rejectWithValue },
  ) => {
    try {
      const response = await API.get(`/posts?limit=${limit}&page=${page}`);
      return response.data;
    } catch (error: any) {
      console.error("fetchAllPosts error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch articles",
      );
    }
  },
);
