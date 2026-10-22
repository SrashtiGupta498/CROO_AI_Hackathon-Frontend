import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  signupUser,
  loginUser,
  updateUserProfile,
  fetchUserProfile,
  fetchCurrentUser,
  googleLogin,
  logoutUser,
  fetchUserSettings,
  updateUserSettings,
} from "./user.action";
import { User, UserSettings } from "../../types";

interface UserState {
  currentUser: User | null;
  settings: UserSettings | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  currentUser: JSON.parse(localStorage.getItem("currentUser") || "null"),
  settings: JSON.parse(localStorage.getItem("userSettings") || "null"),
  loading: false,
  error: null,
};

/**
 * Normalize any login-ish response (password login, Google callback, signup)
 * into the stored session user. Tokens may sit at the top level of the
 * response ({ accessToken, refreshToken, user }) or on the user object itself;
 * we always store them as AccessToken / RefreshToken, which is what the axios
 * interceptors in services/api.ts read.
 */
const buildSessionUser = (payload: any) => {
  const responseData = payload?.data || payload || {};
  const userData = responseData.user || responseData;
  const access =
    responseData.accessToken ||
    responseData.AccessToken ||
    responseData.token ||
    userData.accessToken ||
    userData.AccessToken;
  const refresh =
    responseData.refreshToken ||
    responseData.RefreshToken ||
    userData.refreshToken ||
    userData.RefreshToken;

  const finalUser: any = { ...userData };
  if (access) finalUser.AccessToken = access;
  if (refresh) finalUser.RefreshToken = refresh;
  return finalUser;
};

/**
 * Merge profile-ish response data into the current user WITHOUT touching the
 * session tokens. localStorage is the token source of truth — the axios
 * interceptor in services/api.ts rotates tokens there on silent refresh, so
 * in-memory Redux copies can be stale. Overwriting storage with a stale token
 * used to log users out right after a successful refresh.
 */
const mergeProfileUser = (stateUser: any, payload: any) => {
  const userData = payload?.data?.user || payload?.user || payload || {};
  // Profile endpoints never issue tokens; drop any token-ish fields they echo.
  const {
    AccessToken: _a,
    RefreshToken: _r,
    accessToken: _a2,
    refreshToken: _r2,
    ...profileFields
  } = userData;

  let persisted: any = null;
  try {
    persisted = JSON.parse(localStorage.getItem("currentUser") || "null");
  } catch {
    persisted = null;
  }

  return {
    ...stateUser,
    ...profileFields,
    AccessToken: persisted?.AccessToken || stateUser?.AccessToken,
    RefreshToken: persisted?.RefreshToken || stateUser?.RefreshToken,
  };
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    logout: (state) => {
      state.currentUser = null;
      state.settings = null;
      state.loading = false;
      state.error = null;
      localStorage.removeItem("currentUser");
      localStorage.removeItem("userSettings");
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ... existing reducers ...
      .addCase(signupUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        const finalUser = buildSessionUser(action.payload);
        state.currentUser = finalUser;
        state.error = null;
        localStorage.setItem("currentUser", JSON.stringify(finalUser));
      })
      .addCase(signupUser.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Login cases
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        const finalUser = buildSessionUser(action.payload);
        state.currentUser = finalUser;
        state.error = null;
        localStorage.setItem("currentUser", JSON.stringify(finalUser));
      })
      .addCase(loginUser.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update Profile cases
      .addCase(updateUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        updateUserProfile.fulfilled,
        (state, action: PayloadAction<any>) => {
          state.loading = false;
          const finalUser = mergeProfileUser(state.currentUser, action.payload) as User;
          state.currentUser = finalUser;
          state.error = null;
          localStorage.setItem(
            "currentUser",
            JSON.stringify(finalUser),
          );
        },
      )
      .addCase(
        updateUserProfile.rejected,
        (state, action: PayloadAction<any>) => {
          state.loading = false;
          state.error = action.payload as string;
        },
      )
      // Fetch Profile cases
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchUserProfile.fulfilled,
        (state, action: PayloadAction<any>) => {
          state.loading = false;
          const finalUser = mergeProfileUser(state.currentUser, action.payload) as User;
          state.currentUser = finalUser;
          state.error = null;
          localStorage.setItem(
            "currentUser",
            JSON.stringify(finalUser),
          );
        },
      )
      .addCase(
        fetchUserProfile.rejected,
        (state, action: PayloadAction<any>) => {
          state.loading = false;
          state.error = action.payload as string;
        },
      )
      // Current-user-from-token cases. Same merge as a profile fetch: /users/me
      // returns the user document with the token fields stripped, so tokens
      // must keep coming from storage rather than the response.
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchCurrentUser.fulfilled,
        (state, action: PayloadAction<any>) => {
          state.loading = false;
          const finalUser = mergeProfileUser(
            state.currentUser,
            action.payload,
          ) as User;
          state.currentUser = finalUser;
          state.error = null;
          localStorage.setItem("currentUser", JSON.stringify(finalUser));
        },
      )
      .addCase(
        fetchCurrentUser.rejected,
        (state, action: PayloadAction<any>) => {
          state.loading = false;
          state.error = action.payload as string;
        },
      )
      // Google Login cases
      .addCase(googleLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(googleLogin.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        const finalUser = buildSessionUser(action.payload);
        state.currentUser = finalUser;
        state.error = null;
        localStorage.setItem("currentUser", JSON.stringify(finalUser));
      })
      .addCase(googleLogin.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Logout cases
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.currentUser = null;
        state.settings = null;
        state.error = null;
        localStorage.removeItem("currentUser");
        localStorage.removeItem("userSettings");
      })
      .addCase(logoutUser.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Settings cases
      .addCase(fetchUserSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserSettings.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.settings = action.payload.data || action.payload;
        state.error = null;
        localStorage.setItem("userSettings", JSON.stringify(state.settings));
      })
      .addCase(fetchUserSettings.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update Settings cases
      .addCase(updateUserSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserSettings.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        // action.payload is the unwrapped settings object. Merge it in, then
        // scrub any response-envelope keys that earlier versions may have stored.
        const mergedSettings: any = { ...state.settings, ...action.payload };
        delete mergedSettings.status;
        delete mergedSettings.message;
        delete mergedSettings.data;
        state.settings = mergedSettings as UserSettings;
        state.error = null;
        localStorage.setItem("userSettings", JSON.stringify(state.settings));
      })
      .addCase(updateUserSettings.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { logout, clearError } = userSlice.actions;
export default userSlice.reducer;
