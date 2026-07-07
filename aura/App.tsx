import React, { useState } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import SkincareAI from "./pages/SkincareAI";
import SkinAnalysis from "./pages/SkinAnalysis";
import ArticleView from "./pages/ArticleView";
import Reels from "./pages/Reels";
import AdminRoute from "./components/AdminRoute";
import Profile from "./pages/Profile";
import DIYCreator from "./pages/DIYCreator";
import IngredientLibrary from "./pages/IngredientLibrary";
import Navigation from "./components/Navigation";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CategoryPage from "./pages/CategoryPage";
import Categories from "./pages/Categories";
import CategorySubcategories from "./pages/CategorySubcategories";
import ArticleEditorPage from "./pages/ArticleEditorPage";
import Login from "./pages/Login";
import Signup from "./pages/Signuppage";
import Article from "./pages/Article";
import GoogleCallback from "./pages/GoogleCallback";
import JournalPage from "./pages/JournalPage";
import DailyLayout from "./pages/daily/DailyLayout";
import Today from "./pages/daily/Today";
import Notes from "./pages/daily/Notes";
import Habits from "./pages/daily/Habits";
import Planner from "./pages/daily/Planner";
import DailyProgress from "./pages/daily/Progress";
import AdminContentDashboard from "./pages/AdminContentDashboard";
import CategoryManager from "./pages/CategoryManager";
import StoryEditorPage from "./story-editor/StoryEditorPage";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";


const AppContent: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <div
      className={`${
        isDarkMode ? "dark" : ""
      } min-h-screen font-sans bg-background-light dark:bg-background-dark`}
    >
      <Header />
      <div className="max-w-7xl mx-auto">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/ai" element={<SkincareAI />} />
          <Route path="/ai/analysis" element={<SkinAnalysis />} />
          <Route path="/article/:id" element={<ArticleView />} />
          <Route path="/reels" element={<Reels />} />
          <Route path="/reels/:id" element={<Reels />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/diy" element={<DIYCreator />} />
          <Route path="/diy/:id" element={<DIYCreator />} />
          <Route path="/diypage" element={<DIYCreator />} />
          <Route path="/diy_Recipes" element={<DIYCreator />} />
          <Route path="/diy_recipes" element={<DIYCreator />} />
          <Route path="/diy-recipes" element={<DIYCreator />} />
          <Route path="/ingredients" element={<IngredientLibrary />} />
          <Route path="/ingredients/:id" element={<IngredientLibrary />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/categories/:id" element={<CategorySubcategories />} />
          <Route path="/category/:id" element={<CategoryPage />} />
          <Route path="ArticleEditorPage/:id" element={<AdminRoute><ArticleEditorPage /></AdminRoute>} />
          <Route path="/admin/article-editor/:id" element={<AdminRoute><ArticleEditorPage /></AdminRoute>} />
          <Route path="/admin/content-editor" element={<AdminRoute><AdminContentDashboard /></AdminRoute>} />
          <Route path="/admin/categories" element={<AdminRoute><CategoryManager /></AdminRoute>} />
          <Route path="/admin/story-editor" element={<AdminRoute><StoryEditorPage /></AdminRoute>} />
          <Route path="/admin/story-editor/:id" element={<AdminRoute><StoryEditorPage /></AdminRoute>} />
          <Route path="/admin/editor/article/:id" element={<AdminRoute><ArticleEditorPage /></AdminRoute>} />
          <Route path="/Login" element={<Login />} />
          <Route path="/Signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/articlesdata/:categoryId" element={<Article />} />
          <Route path="/auth/callback" element={<GoogleCallback />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/journal/:slug" element={<JournalPage />} />
          <Route path="/daily" element={<DailyLayout />}>
            <Route index element={<Today />} />
            <Route path="notes" element={<Notes />} />
            <Route path="habits" element={<Habits />} />
            <Route path="planner" element={<Planner />} />
            <Route path="progress" element={<DailyProgress />} />
          </Route>
        </Routes>

      </div>
      <Footer />
      <Navigation />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
