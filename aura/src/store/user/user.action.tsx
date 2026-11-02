import { createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../services/api";
import { User, UpdateProfilePayload, LoginPayload } from "../../types";

// GET /v1/users/callback?code=<google_auth_code>
export const googleLogin = createAsyncThunk(
  "user/googleLogin",
  async (code: string, { rejectWithValue }) => {
    try {
      const response = await API.get(`/users/callback?code=${code}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Google sign-in failed",
      );
    }
  },
);

export const signupUser = createAsyncThunk(
  "user/signup",
  async (userData: User, { rejectWithValue }) => {
    try {
      const response = await API.post("/users", userData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Signup failed");
    }
  },
);

export const loginUser = createAsyncThunk(
  "user/login",
  async (credentials: LoginPayload, { rejectWithValue }) => {
    try {
      const response = await API.post("/users/login", credentials);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Login failed");
    }
  },
);

// GET /v1/users/:id — fetches full profile data
// GET /v1/users/me — resolves the caller from the access token alone.
// Recovery path for a stored session that has a token but no user id (an older
// session written before signup returned the user object, or a partial write):
// without this the profile page has no id to fetch with and renders empty.
export const fetchCurrentUser = createAsyncThunk(
  "user/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await API.get("/users/me");
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Could not load your account",
      );
    }
  },
);

export const fetchUserProfile = createAsyncThunk(
  "user/fetchProfile",
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await API.get(`/users/${userId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Fetching profile failed",
      );
    }
  },
);

// POST /v1/auth/logout — logs out the user
export const logoutUser = createAsyncThunk(
  "user/logout",
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const token = state.user.currentUser?.AccessToken;
      const refreshToken = state.user.currentUser?.RefreshToken;

      // Send the refresh token so the server ends THIS device only. An account
      // can now hold several live sessions, and logging out of the laptop must
      // not sign the phone out too; omitting it is the server's "end them all".
      const response = await API.post(
        "/auth/logout",
        { refreshToken },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Logout failed");
    }
  },
);

// PATCH /v1/users/:id/profile — updates FirstName, LastName, ProfilePicture, Bio
export const updateUserProfile = createAsyncThunk(
  "user/updateProfile",
  async (
    {
      userId,
      profileData,
    }: { userId: string; profileData: UpdateProfilePayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await API.patch(`/users/${userId}/profile`, profileData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Profile update failed",
      );
    }
  },
);

// GET /v1/settings/user/:userId — fetches user settings
export const fetchUserSettings = createAsyncThunk(
  "user/fetchSettings",
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await API.get(`/settings/user/${userId}`);
      // Unwrap the { status, message, data } response envelope
      return response.data?.data ?? response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Fetching settings failed",
      );
    }
  },
);

// PATCH /v1/settings/user/:userId — updates (upserts) user settings
export const updateUserSettings = createAsyncThunk(
  "user/updateSettings",
  async (
    { userId, settingsData }: { userId: string; settingsData: any },
    { rejectWithValue },
  ) => {
    try {
      // Defensively strip any response-envelope keys that may have leaked into
      // the stored settings; the backend's ValidationPipe rejects unknown props.
      const { status, message, data, ...cleanSettings } = settingsData || {};
      const response = await API.patch(
        `/settings/user/${userId}`,
        cleanSettings,
      );
      // Unwrap the { status, message, data } response envelope
      return response.data?.data ?? response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Updating settings failed",
      );
    }
  },
);
