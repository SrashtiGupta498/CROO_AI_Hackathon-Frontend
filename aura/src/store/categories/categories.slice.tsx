// src/redux/category/category.slice.ts

import { createSlice } from "@reduxjs/toolkit";
import {
  fetchCategories,
  fetchSubCategories,
  Category,
} from "./categories.action";

interface CategoryState {
  categories: Category[];
  loading: boolean;
  error: string | null;
  subByParent: Record<string, Category[]>;
  subLoading: Record<string, boolean>;
}

const initialState: CategoryState = {
  categories: [],
  loading: false,
  error: null,
  subByParent: {},
  subLoading: {},
};

const categorySlice = createSlice({
  name: "category",
  initialState,
  reducers: {},

  extraReducers: (builder) => {
    builder

      // 🔄 Pending
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      // ✅ Fulfilled
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
      })

      // ❌ Rejected
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Something went wrong";
      })

      // ─── Subcategories (per parent) ───
      .addCase(fetchSubCategories.pending, (state, action) => {
        state.subLoading[action.meta.arg] = true;
      })
      .addCase(fetchSubCategories.fulfilled, (state, action) => {
        const { categoryId, subCategories } = action.payload;
        state.subByParent[categoryId] = subCategories;
        state.subLoading[categoryId] = false;
      })
      .addCase(fetchSubCategories.rejected, (state, action) => {
        state.subLoading[action.meta.arg] = false;
        state.subByParent[action.meta.arg] = [];
      });
  },
});

export default categorySlice.reducer;
