import React, { useState, Suspense, lazy } from "react";
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { CHAT_ENABLED } from "./services/config";

// Eager: the app shell (rendered on every route) + the landing page, so the
// first paint on "/" never waits on a lazy chunk.
import Home from "./pages/Home";
import AdminRoute from "./components/AdminRoute";
import Navigation from "./components/Navigation";
import ScrollToTop from "./components/ScrollToTop";
import Header from "./components/Header";
import Footer from "./components/Footer";
import AiSkinFab from "./components/AiSkinFab";
import ErrorBoundary, {
  AppErrorFallback,
  RouteErrorBoundary,
} from "./components/ErrorBoundary";
import { ToastProvider } from "./components/Toast";

// Every other route is code-split into its own chunk, loaded on demand. This is
// what pulls the heavy, route-specific libraries out of the initial bundle —
// @google/genai is only downloaded when someone opens one of the AI pages.
const Explore = lazy(() => import("./pages/Explore"));
const AiHub = lazy(() => import("./pages/AiHub"));
const SkincareAI = lazy(() => import("./pages/SkincareAI"));
const SkinAnalysis = lazy(() => import("./pages/SkinAnalysis"));
const ArticleView = lazy(() => import("./pages/ArticleView"));
const Reels = lazy(() => import("./pages/Reels"));
const Profile = lazy(() => import("./pages/Profile"));
const DIYCreator = lazy(() => import("./pages/DIYCreator"));
const IngredientLibrary = lazy(() => import("./pages/IngredientLibrary"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const Categories = lazy(() => import("./pages/Categories"));
const CategorySubcategories = lazy(() => import("./pages/CategorySubcategories"));
const ArticleEditorPage = lazy(() => import("./pages/ArticleEditorPage"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/SignupPage"));
const Article = lazy(() => import("./pages/Article"));
const GoogleCallback = lazy(() => import("./pages/GoogleCallback"));
const JournalPage = lazy(() => import("./pages/JournalPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const DailyLayout = lazy(() => import("./pages/daily/DailyLayout"));
const Today = lazy(() => import("./pages/daily/Today"));
const Notes = lazy(() => import("./pages/daily/Notes"));
const Habits = lazy(() => import("./pages/daily/Habits"));
const Planner = lazy(() => import("./pages/daily/Planner"));
const DailyProgress = lazy(() => import("./pages/daily/Progress"));
const AdminContentDashboard = lazy(() => import("./pages/AdminContentDashboard"));
const AdminSkinReports = lazy(() => import("./pages/AdminSkinReports"));
const MyReports = lazy(() => import("./pages/MyReports"));
const CategoryManager = lazy(() => import("./pages/CategoryManager"));
const StoryEditorPage = lazy(() => import("./pages/story-editor/StoryEditorPage"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));

/* Shown while a route chunk is still downloading. Kept minimal so it never
   flashes distractingly on fast connections. */
const RouteFallback: React.FC = () => (
  <div className="flex min-h-[60vh] w-full items-center justify-center">
    <div
      className="h-8 w-8 animate-spin rounded-full border-2 border-sage/30 border-t-sage"
      role="status"
      aria-label="Loading"
    />
  </div>
);


const AppContent: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { pathname } = useLocation();

  /* The chat owns the whole viewport below the header: it scrolls its own
     message list. Letting the page scroll too put two scrollers on top of each
     other — a drag moved the outer page or the message list depending on where
     it started, and the composer slid away with it. On these routes the page
     itself must not scroll, so the footer is dropped and the height is pinned. */
  const isAppShellRoute = pathname === "/ai/chat";

  return (
    <div
      className={`${isDarkMode ? "dark" : ""} ${
        isAppShellRoute ? "h-screen overflow-hidden" : "min-h-screen"
      } flex flex-col pb-24 lg:pb-0 font-sans bg-background-light dark:bg-background-dark`}
    >
      <ScrollToTop />
      <Header />
      <div
        className={`max-w-7xl w-full mx-auto flex-1 ${
          isAppShellRoute ? "flex flex-col min-h-0" : ""
        }`}
      >
        {/* Outside Suspense on purpose: a lazy chunk that fails to download
            (stale hash after a deploy, flaky network) throws here too, and this
            is what turns that into a retry instead of a blank page. */}
        <RouteErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/explore" element={<Explore />} />
          {/* /ai is the chooser; the chat and the scan each own their own URL
              so they stop reading as one blurred feature. With the chat
              switched off (CHAT_ENABLED) there's nothing to choose between,
              so /ai and /ai/chat both land on the scan — this keeps every
              existing link, bookmark and the header/footer/FAB entries working. */}
          <Route
            path="/ai"
            element={CHAT_ENABLED ? <AiHub /> : <Navigate to="/ai/analysis" replace />}
          />
          <Route
            path="/ai/chat"
            element={CHAT_ENABLED ? <SkincareAI /> : <Navigate to="/ai/analysis" replace />}
          />

          <Route path="/ai/analysis" element={<SkinAnalysis />} />
          <Route path="/article/:id" element={<ArticleView />} />
          <Route path="/reels" element={<Reels />} />
          <Route path="/reels/:id" element={<Reels />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/my-reports" element={<MyReports />} />
          <Route path="/diy" element={<DIYCreator />} />
          <Route path="/diy/:id" element={<DIYCreator />} />
          <Route path="/ingredients" element={<IngredientLibrary />} />
          <Route path="/ingredients/:id" element={<IngredientLibrary />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/categories/:id" element={<CategorySubcategories />} />
          <Route path="/category/:id" element={<CategoryPage />} />
          <Route path="/ArticleEditorPage/:id" element={<AdminRoute><ArticleEditorPage /></AdminRoute>} />
          <Route path="/admin/article-editor/:id" element={<AdminRoute><ArticleEditorPage /></AdminRoute>} />
          <Route path="/admin/content-editor" element={<AdminRoute><AdminContentDashboard /></AdminRoute>} />
          <Route path="/admin/categories" element={<AdminRoute><CategoryManager /></AdminRoute>} />
          <Route path="/admin/skin-reports" element={<AdminRoute><AdminSkinReports /></AdminRoute>} />
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
          {/* Legacy links across Header/Footer still point here */}
          <Route path="/articles" element={<Explore />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        </RouteErrorBoundary>

      </div>
      {!isAppShellRoute && <Footer />}
      <Navigation />
      <AiSkinFab />
    </div>
  );
};

const App: React.FC = () => {
  return (
    /* Outermost net: catches the chrome (Header, Footer, Navigation) and the
       Router itself. The inner RouteErrorBoundary handles page crashes and
       keeps the chrome alive, so this one only sees the cases where there is
       nothing left to navigate with — hence a reload as the only offer. */
    <ErrorBoundary fallback={(error) => <AppErrorFallback error={error} />}>
      {/* Outside Router so a toast survives navigation — several are fired by
          handlers that navigate immediately afterwards. */}
      <ToastProvider>
        <Router>
          <AppContent />
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
