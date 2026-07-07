import { configureStore } from "@reduxjs/toolkit";
import articleReducer from "./article/article.slice";
import categoryReducer from "./categories/categories.slice";
import userReducer from "./user/user.slice";
import reelsReducer from "./reels/reels.slice";

export const store = configureStore({
  reducer: {
    articles: articleReducer,
    category: categoryReducer,
    user: userReducer,
    reels: reelsReducer,
  },
});

// Types for TS
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
