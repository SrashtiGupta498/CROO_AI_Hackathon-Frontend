import { createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../services/api";

export const fetchReels = createAsyncThunk(
  "reels/fetchReels",
  async (
    { limit = 50, page = 1 }: { limit?: number; page?: number } = {},
    { rejectWithValue },
  ) => {
    try {
      const response = await API.get(`/posts/reels?limit=${limit}&page=${page}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch reels",
      );
    }
  },
);
