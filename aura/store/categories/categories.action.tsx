// src/redux/category/category.actions.ts

import { createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../services/api"; // your axios instance

export interface Category {
  id: string;
  name: string;
  slug: string;
  isSubCategory?: boolean;
  parentCategory?: string | null;
  description?: string;
  icon?: string;
  coverImage?: string;
  postsCount?: number;
  isFeatured?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Fetch all categories
export const fetchCategories = createAsyncThunk<
  Category[], // Return type
  void, // Argument type
  { rejectValue: string }
>("category/fetchCategories", async (_, { rejectWithValue }) => {
  try {
    const response = await API.get("/categories/get");
    return response.data.data; // adjust based on backend response
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.message || "Failed to fetch categories",
    );
  }
});

// Payload used when creating / updating a category or subcategory.
export interface CategoryInput {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  coverImage?: string;
  isFeatured?: boolean;
  // null / undefined => top-level category. A valid id => subcategory of it.
  parentCategory?: string | null;
}

// Create a category (or a subcategory when `parentCategory` is set).
export const createCategory = createAsyncThunk<
  Category, // Return type
  CategoryInput, // Argument type
  { rejectValue: string }
>("category/createCategory", async (payload, { rejectWithValue }) => {
  try {
    const response = await API.post("/categories/create", payload);
    return response.data?.data ?? response.data;
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.message || "Failed to create category",
    );
  }
});

// Update an existing category/subcategory by id.
export const updateCategory = createAsyncThunk<
  Category, // Return type
  { id: string; changes: Partial<CategoryInput> }, // Argument type
  { rejectValue: string }
>("category/updateCategory", async ({ id, changes }, { rejectWithValue }) => {
  try {
    const response = await API.patch(`/categories/${id}`, changes);
    return response.data?.data ?? response.data;
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.message || "Failed to update category",
    );
  }
});

// Delete a category/subcategory by id. Backend blocks deleting a parent that
// still has children, so the error message is surfaced to the caller.
export const deleteCategory = createAsyncThunk<
  string, // Return type (deleted id)
  string, // Argument type (id)
  { rejectValue: string }
>("category/deleteCategory", async (id, { rejectWithValue }) => {
  try {
    await API.delete(`/categories/${id}`);
    return id;
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.message || "Failed to delete category",
    );
  }
});

// Fetch subcategories for a given parent category id.
// Primary route is `/categories/subcategory/:id` (defined in the backend
// source). Older/stale builds expose it as `/categories/category/:id`, so we
// fall back to that on a 404 to stay compatible with both.
export const fetchSubCategories = createAsyncThunk<
  { categoryId: string; subCategories: Category[] }, // Return type
  string, // Argument type (parent category id)
  { rejectValue: string }
>("category/fetchSubCategories", async (categoryId, { rejectWithValue }) => {
  const paths = [
    `/categories/subcategory/${categoryId}`,
    `/categories/category/${categoryId}`,
  ];
  let lastError: any;
  for (const path of paths) {
    try {
      const response = await API.get(path);
      return { categoryId, subCategories: response.data?.data ?? response.data ?? [] };
    } catch (error: any) {
      lastError = error;
      // Only try the fallback path when the route itself is missing (404).
      if (error?.response?.status !== 404) break;
    }
  }
  return rejectWithValue(
    lastError?.response?.data?.message || "Failed to fetch subcategories",
  );
});
