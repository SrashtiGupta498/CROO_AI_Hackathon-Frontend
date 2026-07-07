import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  signupUser,
  loginUser,
  updateUser,
  updateUserProfile,
  fetchUserProfile,
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
        const responseData = action.payload.data || action.payload;
        const userData = responseData.user || responseData;
        const token = responseData.AccessToken || responseData.accessToken || responseData.token;

        const finalUser = { ...userData };
        if (token) finalUser.AccessToken = token;

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
        const responseData = action.payload.data || action.payload;
        const userData = responseData.user || responseData;
        const token = responseData.AccessToken || responseData.accessToken || responseData.token;

        const finalUser = { ...userData };
        if (token) finalUser.AccessToken = token;

        state.currentUser = finalUser;
        state.error = null;
        localStorage.setItem("currentUser", JSON.stringify(finalUser));
      })
      .addCase(loginUser.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update cases
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        const userData = action.payload.data?.user || action.payload.user || action.payload;
        const finalUser = { 
          ...state.currentUser, 
          ...userData, 
          AccessToken: userData.AccessToken || state.currentUser?.AccessToken 
        } as User;
        state.currentUser = finalUser;
        state.error = null;
        localStorage.setItem("currentUser", JSON.stringify(finalUser));
      })
      .addCase(updateUser.rejected, (state, action: PayloadAction<any>) => {
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
          const userData =
            action.payload.data?.user || action.payload.user || action.payload;
          const finalUser = { 
            ...state.currentUser, 
            ...userData,
            AccessToken: userData.AccessToken || userData.accessToken || userData.token || state.currentUser?.AccessToken
          } as User;
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
          const userData =
            action.payload.data?.user || action.payload.user || action.payload;
          const finalUser = { 
            ...state.currentUser, 
            ...userData,
            AccessToken: userData.AccessToken || userData.accessToken || userData.token || state.currentUser?.AccessToken
          } as User;
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
      // Google Login cases
      .addCase(googleLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(googleLogin.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        const responseData = action.payload.data || action.payload;
        const userData = responseData.user || responseData;
        const token = responseData.AccessToken || responseData.accessToken || responseData.token;

        const finalUser = { ...userData };
        if (token) finalUser.AccessToken = token;

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
