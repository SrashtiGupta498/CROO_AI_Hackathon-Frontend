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

console.log("article.action.tsx loaded");

export const fetchAllPosts = createAsyncThunk(
  "articles/fetchAllPosts",
  async (
    { limit = 10, page = 1 }: { limit?: number; page?: number } = {},
    { rejectWithValue },
  ) => {
    try {
      console.log(`fetchAllPosts thunk started: page=${page}, limit=${limit}`);
      const response = await API.get(`/posts?limit=${limit}&page=${page}`);
      console.log("fetchAllPosts response received:", response.status);
      return response.data;
    } catch (error: any) {
      console.error("fetchAllPosts error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch articles",
      );
    }
  },
);
