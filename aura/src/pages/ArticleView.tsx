import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { formatDate } from "../utils/datetime";
import { fetchPostById } from "../store/article/article.action";
import { RootState, AppDispatch } from "../store/store";
import { clearCurrentPost } from "../store/article/article.slice";
import { isAdminUser } from "../components/AdminRoute";
import { toAbsoluteUrl, getPostCover } from "../services/uploadImage";
import { PostCover } from "../components/PostCover";
import { getCategoryName, getSubcategoryNames } from "../services/taxonomy";
import {
  bookmarkPost,
  unbookmarkPost,
  getBookmarkStatus,
  likePost,
  unlikePost,
  getLikeStatus,
  sharePost,
  getComments,
  addComment,
  deleteComment,
  PostComment,
} from "../services/engagement";
import { BookOpen } from "lucide-react";
import { ARTICLES, REELS } from "../constants";
import { fetchReels } from "../store/reels/reels.action";
import {
  IngredientsBlock,
  InstructionsBlock,
  BenefitsBlock,
  TipBlock,
  WarningBlock,
  NotesBlock,
  SourceBlock,
  FaqBlock,
  HeroTextBlock,
  ReelBlock,
} from "../components/ArticleBlocks";
import { vid1, vid2, vid3, vid4, vid5 } from "../assets/index";
import "./ArticleView.css";

import { ACCENT, DARK } from "../styles/brand";
import { sanitizeHtml } from "../utils/sanitize";
import { useToast } from "../components/Toast";
import { describeError } from "../services/errorMessage";
/* Bundled ambient clips shown in the article sidebar. A clip is picked per
   article (stable for a given post, varied across posts) and auto-plays muted. */
const SIDEBAR_VIDEOS = [vid1, vid2, vid3, vid4, vid5];
const pickSidebarVideo = (key: string): string => {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return SIDEBAR_VIDEOS[hash % SIDEBAR_VIDEOS.length];
};

/* Prefer the post's own video (a "video" section's videoUrl, or a top-level
   videoUrl); otherwise fall back to a bundled ambient clip. */
const getArticleVideo = (post: any, key: string): string => {
  const fromSection = Array.isArray(post?.sections)
    ? post.sections.find(
        (s: any) => String(s?.type).toLowerCase() === "video" && s?.videoUrl,
      )?.videoUrl
    : undefined;
  const ownVideo = fromSection || post?.videoUrl;
  return ownVideo ? toAbsoluteUrl(ownVideo) : pickSidebarVideo(key);
};

/* ─── Theme tokens ─── */
const PEACH = "#FFF4E8";    // warm highlight
const OFF_WHITE = "#F6F2EC"; // = --color-paper-2

/* GenZ universal fallbacks so "do's & don'ts" always render fully. */
const DEFAULT_DOS = [
  "Patch test new products before going all in 🧪",
  "Layer thinnest → thickest texture, always",
  "Lock your AM routine with SPF ☀️ (non-negotiable)",
  "Stay consistent for 4+ weeks before judging results",
];
const DEFAULT_DONTS = [
  "Don't over-exfoliate — 2–3x a week is plenty",
  "Skip the 'more product = better' mindset",
  "Never sleep in your makeup 😴",
  "Don't pile on random actives at once",
];

/* ─── Premium Image Carousel ─── */
const PremiumCarousel: React.FC<{ images: string[] }> = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const total = images.length;
  if (total === 0) return null;

  const nextSlide = () => setCurrentIndex((p) => (p + 1) % total);
  const prevSlide = () => setCurrentIndex((p) => (p - 1 + total) % total);

  return (
    <div className="group relative w-full overflow-hidden rounded-[36px] shadow-2xl my-12 h-[clamp(280px,55vh,560px)]">
      {images.map((img, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] ${
            i === currentIndex ? "opacity-100 scale-100" : "opacity-0 scale-105"
          }`}
        >
          <img src={img} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      {total > 1 && (
        <>
          <button onClick={prevSlide} className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 hover:bg-white/25">←</button>
          <button onClick={nextSlide} className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 hover:bg-white/25">→</button>
        </>
      )}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-10">
        {images.map((_, i) => (
          <button key={i} onClick={() => setCurrentIndex(i)} className={`h-1.5 transition-all duration-500 rounded-full ${i === currentIndex ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/60"}`} />
        ))}
      </div>
    </div>
  );
};

/* ─── Types & helpers ─── */
type ArticleAIMetadata = {
  summary?: string;
  highlights?: string[];
  keyTakeaways?: string[];
  steps?: { stepLabel?: string; title?: string; body?: string }[];
};
type ArticleSection = { type?: string; body?: string; images?: string[]; title?: string };

const stripHtmlText = (value = "") => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/* ─── Comment display helpers ─── */
const commentAuthor = (c: any) => {
  const u = c?.userId;
  if (u && typeof u === "object") {
    const name = `${u.FirstName || ""} ${u.LastName || ""}`.trim();
    return { name: name || "Reader", avatar: u.ProfilePicture || "" };
  }
  return { name: "Reader", avatar: "" };
};
const commentInitial = (name: string) => (name?.trim()?.[0] || "R").toUpperCase();
const relativeTime = (iso?: string) => {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
};

const normalizeAiMetadata = (raw: any = {}): ArticleAIMetadata => ({
  summary: typeof raw?.summary === "string" ? raw.summary.trim() : "",
  highlights: Array.isArray(raw?.highlights) ? raw.highlights.map((h: any) => String(h).trim()).filter(Boolean) : [],
  keyTakeaways: Array.isArray(raw?.keyTakeaways) ? raw.keyTakeaways.map((k: any) => String(k).trim()).filter(Boolean) : [],
  steps: Array.isArray(raw?.steps)
    ? raw.steps
        .map((s: any) => ({
          stepLabel: typeof s?.stepLabel === "string" ? s.stepLabel : "",
          title: typeof s?.title === "string" && s.title.trim() ? s.title.trim() : "Step",
          body: typeof s?.body === "string" ? s.body.trim() : String(s?.body || "").trim(),
        }))
        .filter((s: any) => s.body.length > 0)
    : [],
});

const isTextSection = (type?: string) => {
  const n = (type || "").toLowerCase();
  return n === "text" || n === "paragraph" || n === "title" || n === "intro" || n === "highlight" || n === "conclusion";
};

const extractArticleParagraphs = (sections: ArticleSection[] = []) =>
  sections
    .filter((s) => isTextSection(s.type) && typeof s.body === "string")
    .map((s) => stripHtmlText(`${s.title ? `${s.title}. ` : ""}${s.body || ""}`))
    .filter(Boolean);

const inferStepsFromText = (paragraphs: string[]) => {
  const regex = /^(?:\s*(?:step\s*\d+|first|then|next|finally)\s*[:.\-]?\s*)(.+)/i;
  const explicit: ArticleAIMetadata["steps"] = [];
  paragraphs.forEach((paragraph, idx) => {
    if (explicit!.length >= 4) return;
    const match = paragraph.match(regex);
    if (match) {
      explicit!.push({ stepLabel: `0${explicit!.length + 1}`, title: (match[1] || `Step ${explicit!.length + 1}`).slice(0, 60), body: paragraph });
    } else if (idx < 4 && paragraph.length > 40) {
      explicit!.push({ stepLabel: `0${explicit!.length + 1}`, title: `Step ${explicit!.length + 1}`, body: paragraph });
    }
  });
  return explicit!.slice(0, 4);
};

const detectIngredientSpotlight = (paragraphs: string[]) => {
  const haystack = paragraphs.join(" ").toLowerCase();
  const keywords = ["aloe", "niacinamide", "hyaluronic", "ceramide", "retinol", "vitamin c", "vitamin e", "rosehip", "centella", "tea tree", "squalane", "panthenol", "milk", "honey", "turmeric"];
  const found = keywords.find((k) => haystack.includes(k));
  if (!found) return null;
  const sentence = paragraphs.find((p) => p.toLowerCase().includes(found));
  return { name: found[0].toUpperCase() + found.slice(1), quote: sentence?.slice(0, 180) || "A powerhouse ingredient to anchor this ritual." };
};

/* ─── Decorative: hand-drawn sprig flourish used between sections ─── */
const SprigDivider: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`flex items-center justify-center gap-4 my-16 ${className}`} aria-hidden>
    <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#3D5B4F]/40" />
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none" className="text-[#3D5B4F] article-view-sway-slow">
      <path d="M20 2C20 8 20 16 20 22" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M20 8C16 6 13 7 11 4M20 8C24 6 27 7 29 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M20 14C15 12 11 13 8 10M20 14C25 12 29 13 32 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="20" cy="2" r="2" fill="currentColor" />
    </svg>
    <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#3D5B4F]/40" />
  </div>
);

/* ─── Decorative: floating ambient orbs + drifting petals behind content ─── */
const AmbientDecor: React.FC = () => (
  <div className="article-view-ambient pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
    <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-[#3D5B4F]/10 blur-[90px] article-view-float-orb" />
    <div className="absolute top-1/3 -right-32 w-[32rem] h-[32rem] rounded-full bg-[#FFD9B0]/20 blur-[100px] article-view-float-orb-slow" />
    <div className="absolute bottom-0 left-1/4 w-[24rem] h-[24rem] rounded-full bg-[#DCE5DD]/15 blur-[90px] article-view-float-orb" />
    {[
      { left: "8%", top: "18%", size: 14, delay: "0s", dur: "13s" },
      { left: "82%", top: "26%", size: 10, delay: "2s", dur: "16s" },
      { left: "20%", top: "62%", size: 12, delay: "4s", dur: "15s" },
      { left: "70%", top: "74%", size: 9, delay: "1s", dur: "18s" },
      { left: "46%", top: "40%", size: 8, delay: "3s", dur: "14s" },
    ].map((p, i) => (
      <svg key={i} width={p.size} height={p.size} viewBox="0 0 24 24" className="absolute text-[#3D5B4F]/25 article-view-petal-drift"
        style={{ left: p.left, top: p.top, animationDelay: p.delay, animationDuration: p.dur }}>
        <path d="M12 2C7 7 7 14 12 22C17 14 17 7 12 2Z" fill="currentColor" />
      </svg>
    ))}
  </div>
);

const ArticleView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const dispatch = useDispatch<AppDispatch>();
  const [scrolled, setScrolled] = useState(0);
  const [showFullBody, setShowFullBody] = useState(false);

  /* ── Reading mode ──────────────────────────────────────────
     Preferences persist across articles and sessions. Reading is
     the one place a user tunes settings once and expects them to
     stick, so this is localStorage rather than component state. */
  const [reading, setReading] = useState(
    () => localStorage.getItem("ae:reading") === "1",
  );
  const [readingTheme, setReadingTheme] = useState<"paper" | "sepia" | "dark">(
    () => (localStorage.getItem("ae:reading-theme") as any) || "paper",
  );
  const [readingScale, setReadingScale] = useState(
    () => Number(localStorage.getItem("ae:reading-scale")) || 1,
  );

  useEffect(() => {
    localStorage.setItem("ae:reading", reading ? "1" : "0");
  }, [reading]);
  useEffect(() => {
    localStorage.setItem("ae:reading-theme", readingTheme);
  }, [readingTheme]);
  useEffect(() => {
    localStorage.setItem("ae:reading-scale", String(readingScale));
  }, [readingScale]);

  /* Esc leaves reading mode — matches the reels viewer's convention. */
  useEffect(() => {
    if (!reading) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setReading(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reading]);

  /* Reading mode recolours the whole page, so the <body> has to follow
     or the area past the article stays cream in dark mode. */
  useEffect(() => {
    const bg =
      reading && readingTheme === "dark"
        ? "#2D2A26"
        : reading && readingTheme === "sepia"
          ? "#f4ecdd"
          : "";
    document.body.style.backgroundColor = bg;
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, [reading, readingTheme]);

  const { currentPost, posts, loading } = useSelector((state: RootState) => state.articles);
  const { currentUser } = useSelector((state: RootState) => state.user);
  const { reels: liveReels } = useSelector((state: RootState) => state.reels);

  /* Reels are only needed when a post embeds one, but the list is small
     and cached in the store, so fetch it once alongside the article. */
  useEffect(() => {
    if (!liveReels.length) dispatch(fetchReels({}));
  }, [dispatch, liveReels.length]);

  /* Resolves a `reel` section's reelId to something playable. Falls back
     to the bundled reels so an embed never renders as a dead card. */
  const resolveReel = useMemo(() => {
    const pool: any[] = liveReels.length ? liveReels : REELS;
    return (reelId: string) => {
      const match = pool.find((r) => r.id === reelId || r._id === reelId);
      if (!match) return undefined;
      return { src: match.src, title: match.title, poster: match.thumbnailUrl };
    };
  }, [liveReels]);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrolled(totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (id) dispatch(fetchPostById(id));
    window.scrollTo(0, 0);
    return () => {
      dispatch(clearCurrentPost());
    };
  }, [dispatch, id]);

  /* Fallback to the bundled ARTICLES so the page renders without a backend. */
  const fallback = useMemo(() => ARTICLES.find((a) => String(a.id) === String(id)), [id]);
  const post: any = currentPost || fallback;

  /* ── Save / bookmark this ritual via the engagement API ── */
  const postId = post?._id || post?.id || id;
  const [saved, setSaved] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);

  // Reflect the existing bookmark state when the post / login changes.
  useEffect(() => {
    let active = true;
    if (currentUser && postId) {
      getBookmarkStatus(String(postId))
        .then((b) => active && setSaved(b))
        .catch(() => active && setSaved(false));
    } else {
      setSaved(false);
    }
    return () => {
      active = false;
    };
  }, [currentUser, postId]);

  const toggleSaved = async () => {
    if (!currentUser) {
      navigate("/Login");
      return;
    }
    if (!postId || savingBookmark) return;
    setSavingBookmark(true);
    try {
      if (saved) {
        await unbookmarkPost(String(postId));
        setSaved(false);
      } else {
        await bookmarkPost(String(postId));
        setSaved(true);
      }
    } catch (err: any) {
      // A duplicate bookmark just means it's already saved — treat as saved.
      const msg = err?.response?.data?.message || "";
      if (/already/i.test(String(msg))) {
        setSaved(true);
      } else {
        console.error(err);
        toast.error(
          describeError(err, "Couldn't update your saved rituals."),
        );
      }
    } finally {
      setSavingBookmark(false);
    }
  };

  /* ── Live engagement stats (views / likes / comments / shares) ──
     Views & comments are maintained server-side; likes & shares are kept in
     local state so toggling reflects instantly without a refetch. */
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [commentCountOverride, setCommentCountOverride] = useState<number | null>(
    null,
  );

  // Seed the counts from the post whenever it loads/changes.
  useEffect(() => {
    setLikeCount(Number(post?.stats?.likes) || 0);
    setShareCount(Number(post?.stats?.shares) || 0);
    setCommentCountOverride(null);
  }, [post?._id, post?.stats?.likes, post?.stats?.shares, post?.stats?.comments]);

  const viewCount = Number(post?.stats?.views) || 0;
  const commentCount =
    commentCountOverride ?? (Number(post?.stats?.comments) || 0);

  // Reflect the existing like state when the post / login changes.
  useEffect(() => {
    let active = true;
    if (currentUser && postId) {
      getLikeStatus(String(postId))
        .then((l) => active && setLiked(l))
        .catch(() => active && setLiked(false));
    } else {
      setLiked(false);
    }
    return () => {
      active = false;
    };
  }, [currentUser, postId]);

  const toggleLike = async () => {
    if (!currentUser) {
      navigate("/Login");
      return;
    }
    if (!postId || liking) return;
    setLiking(true);
    // Optimistic update.
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => Math.max(0, c + (wasLiked ? -1 : 1)));
    try {
      if (wasLiked) {
        await unlikePost(String(postId));
      } else {
        await likePost(String(postId));
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || "";
      // A duplicate like just means it's already liked — keep it liked.
      if (!/already/i.test(String(msg))) {
        // Roll back on a real failure.
        setLiked(wasLiked);
        setLikeCount((c) => Math.max(0, c + (wasLiked ? 1 : -1)));
        console.error(err);
      }
    } finally {
      setLiking(false);
    }
  };

  const handleShare = async () => {
    if (!postId || sharing) return;
    setSharing(true);
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      // Record the share (best-effort) and bump the count optimistically.
      sharePost(String(postId)).catch(() => {});
      setShareCount((c) => c + 1);

      if (navigator.share) {
        await navigator.share({ title: post?.title, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to your clipboard.");
      }
    } catch (err) {
      // User dismissing the native share sheet is not an error worth surfacing.
    } finally {
      setSharing(false);
    }
  };

  /* ── Comments ── */
  const myUserId = String(
    (currentUser as any)?.id || (currentUser as any)?._id || "",
  );
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  // Load the post's comments whenever the post changes.
  useEffect(() => {
    let active = true;
    if (!postId) return;
    setLoadingComments(true);
    getComments(String(postId))
      .then((list) => active && setComments(list))
      .catch(() => active && setComments([]))
      .finally(() => active && setLoadingComments(false));
    return () => {
      active = false;
    };
  }, [postId]);

  const submitComment = async () => {
    if (!currentUser) {
      navigate("/Login");
      return;
    }
    const text = commentText.trim();
    if (!text || !postId || postingComment) return;
    setPostingComment(true);
    try {
      const created = await addComment(String(postId), text);
      // Show it immediately with the current user's details for the avatar/name.
      const optimistic: PostComment = {
        ...created,
        _id: created?._id || `tmp-${Date.now()}`,
        content: created?.content ?? text,
        createdAt: created?.createdAt || new Date().toISOString(),
        userId: {
          _id: myUserId,
          FirstName: (currentUser as any)?.FirstName,
          LastName: (currentUser as any)?.LastName,
          ProfilePicture: (currentUser as any)?.ProfilePicture,
        },
      };
      setComments((prev) => [optimistic, ...prev]);
      setCommentCountOverride((c) => (c == null ? commentCount + 1 : c + 1));
      setCommentText("");
    } catch (err) {
      console.error(err);
      toast.error(describeError(err, "Couldn't post your comment."));
    } finally {
      setPostingComment(false);
    }
  };

  const removeComment = async (commentId: string) => {
    if (!commentId || commentId.startsWith("tmp-")) return;
    const prev = comments;
    setComments((list) => list.filter((c) => c._id !== commentId));
    setCommentCountOverride((c) =>
      c == null ? Math.max(0, commentCount - 1) : Math.max(0, c - 1),
    );
    try {
      await deleteComment(commentId);
    } catch (err) {
      console.error(err);
      setComments(prev); // roll back on failure
    }
  };

  const heroImage = useMemo(() => getPostCover(post), [post]);

  const aiMetadata = useMemo(() => normalizeAiMetadata(post?.ai), [post?.ai]);
  // When the post already has an `ai` object, respect it exactly — empty fields
  // mean the author removed them, so we must NOT re-derive from the body.
  const hasAi = !!post?.ai && typeof post.ai === "object";

  const articleParagraphs = useMemo(() => {
    const fromSections = extractArticleParagraphs(post?.sections || []);
    if (fromSections.length) return fromSections;
    const raw = stripHtmlText(post?.content || post?.subtitle || "");
    return raw ? raw.split(/(?<=[.!?])\s+/).filter((p) => p.trim().length > 0) : [];
  }, [post]);

  const readTime = useMemo(() => {
    if (post?.readTime) return parseInt(String(post.readTime), 10) || 1;
    const words = articleParagraphs.join(" ").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  }, [post, articleParagraphs]);

  const tldr = useMemo(
    () =>
      hasAi
        ? aiMetadata.summary || ""
        : aiMetadata.summary || post?.content || articleParagraphs.slice(0, 2).join(" ") || "A quick, glow-worthy read on natural skincare.",
    [hasAi, aiMetadata.summary, post, articleParagraphs],
  );

  const highlights = useMemo(() => {
    if (aiMetadata.highlights?.length) return aiMetadata.highlights.slice(0, 4);
    if (hasAi) return [];
    return articleParagraphs.slice(1).map((p) => p.slice(0, 110)).slice(0, 3);
  }, [hasAi, aiMetadata.highlights, articleParagraphs]);

  const timelineSteps = useMemo(
    () =>
      aiMetadata.steps?.length
        ? aiMetadata.steps
        : hasAi
          ? []
          : inferStepsFromText(articleParagraphs),
    [hasAi, aiMetadata.steps, articleParagraphs],
  );

  const takeaways = useMemo(
    () =>
      aiMetadata.keyTakeaways?.length
        ? aiMetadata.keyTakeaways
        : hasAi
          ? []
          : articleParagraphs.slice(2),
    [hasAi, aiMetadata.keyTakeaways, articleParagraphs],
  );

  const DONT_RE = /\b(avoid|avoidance|mistake|don't|do not|never|skip|warning|caution|stop)\b/i;
  const derivedDonts = useMemo(() => takeaways.filter((i) => DONT_RE.test(i)).slice(0, 4), [takeaways]);
  const derivedDos = useMemo(() => takeaways.filter((i) => !DONT_RE.test(i)).slice(0, 4), [takeaways]);
  const dos = derivedDos.length ? derivedDos : DEFAULT_DOS;
  const donts = derivedDonts.length ? derivedDonts : DEFAULT_DONTS;

  const ingredientSpotlight = useMemo(() => detectIngredientSpotlight(articleParagraphs), [articleParagraphs]);

  const vibes = useMemo(() => {
    if (Array.isArray(post?.tags) && post.tags.length) return post.tags.slice(0, 5);
    return ["glow", "self-care", "clean girl", "soft life"];
  }, [post]);

  const visibleSections = useMemo(() => {
    if (!post?.sections) return [];
    if (showFullBody) return post.sections;
    let textCount = 0;
    return post.sections.filter((section: any) => {
      if (!isTextSection(section.type)) return true;
      if (textCount < 3) {
        textCount += 1;
        return true;
      }
      return false;
    });
  }, [post?.sections, showFullBody]);

  const renderArticleSection = (section: any, idx: number) => {
    if (!section || typeof section !== "object") return null;
    const sectionType = String(section.type || "").toLowerCase();
    const hasBody = typeof section.body === "string" && section.body.trim().length > 0;
    const bodyContent = section.body || "";
    // Prefer the array: a carousel section carries every slide in `images`
    // and only its first in `image`, so checking `image` first collapsed
    // every multi-photo section down to one slide.
    const media = (
      Array.isArray(section.images) && section.images.length
        ? section.images
        : section.image
          ? [section.image]
          : []
    ).filter(Boolean);

    if (sectionType === "video" && section.videoUrl) {
      return (
        <div key={idx} className="my-12 rounded-[32px] overflow-hidden shadow-2xl bg-black">
          <video src={section.videoUrl} controls playsInline preload="metadata" className="w-full h-full object-cover" />
          {section.caption && <p className="text-center text-xs text-[#2D2A26]/50 italic py-3">{section.caption}</p>}
        </div>
      );
    }

    /* GIF section: a raw .gif plays natively as an <img>; the recommended
       mp4/webm loop plays autoplay/muted/loop so it reads exactly like a
       GIF without the file weight. Never has controls — that's the point. */
    if (sectionType === "gif" && (section.videoUrl || section.image)) {
      return (
        <div key={idx} className="my-12 rounded-[32px] overflow-hidden shadow-2xl bg-black">
          {section.videoUrl ? (
            <video src={section.videoUrl} autoPlay muted loop playsInline preload="metadata" className="w-full h-full object-cover" />
          ) : (
            <img src={section.image} alt={section.caption || ""} loading="lazy" className="w-full h-full object-cover" />
          )}
          {section.caption && <p className="text-center text-xs text-[#2D2A26]/50 italic py-3">{section.caption}</p>}
        </div>
      );
    }

    /* Recipe / reference blocks. These types make up ~923 sections
       across the corpus and rendered as nothing before. */
    switch (sectionType) {
      case "ingredients":
        return <IngredientsBlock key={idx} section={section} />;
      case "instructions":
        return <InstructionsBlock key={idx} section={section} />;
      case "benefits":
        return <BenefitsBlock key={idx} section={section} />;
      case "tip":
        return <TipBlock key={idx} section={section} />;
      case "warning":
        return <WarningBlock key={idx} section={section} />;
      case "notes":
        return <NotesBlock key={idx} section={section} />;
      case "source":
        return <SourceBlock key={idx} section={section} />;
      case "faq":
        return <FaqBlock key={idx} section={section} />;
      case "reel":
        return (
          <ReelBlock
            key={idx}
            section={section}
            resolveReel={resolveReel}
            onOpen={(reelId) => navigate(`/reels/${reelId}`)}
          />
        );
      default:
        break;
    }

    /* A `hero` with no image still carries title + subtitle — 285 of them
       do — so fall through to the text treatment instead of returning null. */
    if (sectionType === "hero" && !media.length) {
      return <HeroTextBlock key={idx} section={section} />;
    }

    if (sectionType === "image" || sectionType === "hero" || sectionType === "images" || sectionType === "gallery") {
      if (!media.length) return null;
      return (
        <div key={idx}>
          <PremiumCarousel images={media} />
          {section.caption && <p className="text-center text-xs text-[#2D2A26]/50 italic -mt-6 mb-6">{section.caption}</p>}
        </div>
      );
    }

    if (isTextSection(sectionType)) {
      return (
        <div
          key={idx}
          className="prose prose-stone prose-lg max-w-none text-[#2D2A26]/90 leading-[1.9] font-light
                     prose-h2:font-serif prose-h2:italic prose-h2:text-3xl prose-h2:text-[#2D2A26] prose-h2:mt-10 prose-h2:mb-5
                     prose-p:leading-[1.9] prose-ul:list-disc prose-ul:pl-6 prose-li:mb-2"
        >
          {section.title && sectionType !== "text" ? <h3 className="font-serif text-2xl mt-0">{section.title}</h3> : null}
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(bodyContent) }} />
        </div>
      );
    }

    if (sectionType === "quote" && hasBody) {
      return (
        <div key={idx} className="my-16 text-center px-8 py-12 relative rounded-[28px] bg-[#faf8f4] border border-[#3D5B4F]/15">
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[7rem] font-serif leading-none text-[#3D5B4F]/15 select-none">“</span>
          <blockquote className="text-3xl md:text-4xl font-serif italic leading-tight text-[#2D2A26] [&_mark]:rounded [&_mark]:px-1" dangerouslySetInnerHTML={{ __html: sanitizeHtml(bodyContent) }} />
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] text-[#3D5B4F]">{section.author ? `— ${section.author}` : "Wisdom from the Earth"}</p>
        </div>
      );
    }

    if (sectionType === "callout" && hasBody) {
      return (
        <div key={idx} className="my-10 p-8 bg-[#3D5B4F]/8 rounded-[28px] border border-[#3D5B4F]/15 flex gap-5">
          <div className="w-11 h-11 rounded-2xl bg-[#3D5B4F] flex items-center justify-center shrink-0 shadow-lg shadow-[#3D5B4F]/20">
            <span className="text-white text-xl">✨</span>
          </div>
          <div>
            <h4 className="font-serif text-xl italic mb-2">Ritual Tip</h4>
            <div className="text-[#2D2A26]/70 leading-relaxed font-light [&_mark]:rounded [&_mark]:px-1 [&_a]:text-[#3D5B4F] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5" dangerouslySetInnerHTML={{ __html: sanitizeHtml(bodyContent) }} />
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading && !post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#3D5B4F]/20 border-t-[#3D5B4F] rounded-full animate-spin" />
          <p className="font-serif italic text-[#2D2A26]/60">Preparing your ritual…</p>
        </div>
      </div>
    );
  }

  if (!post) return <div className="p-10 text-center font-serif">Article not found</div>;

  const categoryLabel = getCategoryName(post) || "Ritual";
  const subcategoryNames = getSubcategoryNames(post);
  const relatedSource = posts?.length ? posts : ARTICLES;

  return (
    <div
      className={`relative min-h-screen bg-paper-2 text-[#2D2A26] selection:bg-[#3D5B4F]/20 overflow-x-clip ${
        reading ? "article-view-reading" : ""
      }`}
      data-reading-theme={reading ? readingTheme : undefined}
      style={reading ? ({ "--ar-scale": readingScale } as React.CSSProperties) : undefined}
    >
      <AmbientDecor />

      {/* A second "reading progress" hairline used to render here, fixed at
          the very top of the viewport — permanently hidden behind the site
          Header (sticky, 68px, z-60) since this one was `fixed top-0`. It also
          duplicated a bar the Header already renders at its own bottom edge
          (app-header-progress-track in Header.tsx/css), driven by the same
          whole-page scroll — that one is visible, this one never was.
          Removed rather than repositioned. `scrolled` is still used below for
          the hero parallax. */}

      {/* ── Reading mode control bar (replaces the nav while active) ── */}
      {reading && (
        <div className="article-view-reading-bar" role="toolbar" aria-label="Reading mode controls">
          <button
            className="article-view-reading-btn"
            onClick={() => setReading(false)}
            title="Exit reading mode (Esc)"
          >
            ← Exit
          </button>

          <span className="article-view-reading-spacer" />

          <button
            className="article-view-reading-btn"
            onClick={() => setReadingScale((s) => Math.max(0.9, +(s - 0.1).toFixed(2)))}
            disabled={readingScale <= 0.9}
            aria-label="Decrease text size"
          >
            A−
          </button>
          <button
            className="article-view-reading-btn"
            onClick={() => setReadingScale((s) => Math.min(1.5, +(s + 0.1).toFixed(2)))}
            disabled={readingScale >= 1.5}
            aria-label="Increase text size"
          >
            A+
          </button>

          {(["paper", "sepia", "dark"] as const).map((t) => (
            <button
              key={t}
              className="article-view-reading-btn"
              aria-pressed={readingTheme === t}
              onClick={() => setReadingTheme(t)}
            >
              {t === "paper" ? "Paper" : t === "sepia" ? "Sepia" : "Dark"}
            </button>
          ))}
        </div>
      )}

      {/* Top nav — floats over the hero, docked directly below the site
          Header. It used to sit at `top-1.5` (6px), which put it entirely
          behind the Header (sticky, 68px tall, z-60): Back / Read / Share were
          unclickable at any scroll position, since the Header received every
          click aimed at them. `top-[68px]` must track the Header's own
          `h-[68px]` (Header.tsx) — that height is constant across breakpoints,
          so one offset covers all of them. */}
      {/* `grid-cols-[auto_minmax(0,1fr)_auto]` rather than `flex justify-between`:
          with a plain flex row the centre title block does not actually shrink
          below its content's natural width, so on narrow screens the right-hand
          icon group (Like/Bookmark/Share) got pushed past the viewport's right
          edge entirely — off-screen and untappable, e.g. Bookmark measured at
          x 400–437 on a 375px screen. `minmax(0,1fr)` gives the centre column a
          true zero minimum, so `truncate` on the title can actually engage and
          the two auto-sized side columns are guaranteed to fit. */}
      <nav className="article-view-hide-in-reading fixed top-[68px] left-0 w-full z-50 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 sm:px-6 py-4 backdrop-blur-md bg-white/80 border-b border-black/5">
        <button onClick={() => navigate(-1)} className="group flex items-center gap-2 px-2.5 sm:px-4 py-2 rounded-full hover:bg-black/5 transition-all">
          <span className="transition-transform group-hover:-translate-x-1">←</span>
          <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Back</span>
        </button>
        <div className="flex flex-col items-center min-w-0">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#3D5B4F] truncate max-w-full">The Journal</span>
          <span className="text-sm font-serif italic truncate max-w-full">{post.title}</span>
        </div>
        <div className="flex gap-1.5 sm:gap-3 items-center">
          <button
            onClick={() => setReading(true)}
            className="article-view-reading-toggle flex items-center gap-2 px-2.5 sm:px-4 py-2 rounded-full hover:bg-black/5 transition-all"
            title="Reading mode — hide everything but the article"
          >
            <BookOpen size={15} />
            <span className="text-[10px] font-bold uppercase tracking-widest hidden md:inline">Read</span>
          </button>
          {isAdminUser(currentUser) && (post?._id || post?.id || id) && (
            <button
              onClick={() => navigate(`/admin/article-editor/${post?._id || post?.id || id}`)}
              className="flex items-center gap-2 px-3 sm:px-5 py-2 rounded-full bg-[#3D5B4F] text-white text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-all active:scale-95 shadow-lg shadow-[#3D5B4F]/30"
              title="Edit this post"
            >
              ✎ Edit
            </button>
          )}
          <button onClick={toggleLike} disabled={liking} className={`flex items-center gap-1.5 px-3 py-2 rounded-full transition-all ${liked ? "bg-[#C0584F]/15 text-[#C0584F]" : "hover:bg-black/5"}`} title={liked ? "Liked — click to remove" : "Like this ritual"}>
            <span>{liked ? "❤️" : "🤍"}</span>
            <span className="text-xs font-bold tabular-nums">{likeCount}</span>
          </button>
          <button onClick={toggleSaved} disabled={savingBookmark} className={`p-2 rounded-full transition-all ${saved ? "bg-[#3D5B4F]/15" : "hover:bg-black/5"}`} title={saved ? "Saved — click to remove" : "Save to profile"}>{saved ? "🔖" : "🏷️"}</button>
          <button onClick={handleShare} disabled={sharing} className="hidden sm:flex items-center gap-2 px-5 py-2 rounded-full bg-[#2D2A26] text-white text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-all active:scale-95 shadow-lg shadow-[#2D2A26]/20 disabled:opacity-60">Share{shareCount > 0 ? ` · ${shareCount}` : ""}</button>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative w-full h-[78vh] overflow-hidden">
        <PostCover src={heroImage} alt="" className="w-full h-full object-cover" style={{ transform: `scale(1.1) translateY(${scrolled * 0.2}px)` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-paper-2" />
        {/* twinkling sparkles over the hero */}
        {[
          { left: "12%", top: "22%", d: "0s" },
          { left: "88%", top: "30%", d: "1.2s" },
          { left: "30%", top: "16%", d: "2.1s" },
          { left: "74%", top: "18%", d: "0.6s" },
        ].map((s, i) => (
          <span key={i} className="absolute text-white article-view-twinkle text-lg select-none" style={{ left: s.left, top: s.top, animationDelay: s.d }} aria-hidden>✦</span>
        ))}
        <div className="absolute inset-x-0 bottom-0 max-w-5xl mx-auto px-6 pb-16">
          <div className="flex flex-wrap items-center gap-3 mb-5 article-view-float-up">
            <span className="px-4 py-1.5 rounded-full bg-[#3D5B4F] text-white text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg shadow-[#3D5B4F]/30">{categoryLabel}</span>
            {subcategoryNames.map((name) => (
              <span key={name} className="px-3 py-1.5 rounded-full bg-white/70 backdrop-blur text-[#3D5B4F] text-[10px] font-bold uppercase tracking-widest border border-[#3D5B4F]/30">{name}</span>
            ))}
            <span className="px-3 py-1.5 rounded-full bg-white/80 backdrop-blur text-[#2D2A26] text-[10px] font-bold uppercase tracking-widest">⏱ {readTime} min</span>
            <span className="px-3 py-1.5 rounded-full bg-white/80 backdrop-blur text-[#2D2A26] text-[10px] font-bold uppercase tracking-widest">🔥 trending</span>
          </div>
          <h1 className="text-4xl md:text-7xl font-serif leading-[0.98] tracking-tight text-[#2D2A26] mb-6 max-w-4xl article-view-float-up-1">{post.title}</h1>
          <div className="flex items-center gap-4 article-view-float-up-2">
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-xl bg-[#3D5B4F]">
              <img src={post.author?.avatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200"} alt="" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-bold">By {post.author?.name || "Aura Editor"}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#3D5B4F]">{post.author?.role || "Beauty Anthropologist"}</p>
            </div>
          </div>
        </div>
        {/* scroll cue */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-[#2D2A26]/50 article-view-bob" aria-hidden>
          <span className="text-[9px] font-black uppercase tracking-[0.3em]">Scroll</span>
          <span className="text-lg leading-none">↓</span>
        </div>
      </div>

      {/* Body */}
      <div className="article-view-shell relative z-10 max-w-[1400px] mx-auto px-5 lg:px-12 py-16 lg:py-24 grid lg:grid-cols-[1fr_300px] gap-12 lg:gap-16">
        <article className="article-view-body max-w-2xl mx-auto lg:mx-0 w-full">
          {/* TL;DR card — hidden when the author removed the summary */}
          {tldr && (
          <div className="article-view-tldr-card relative overflow-hidden rounded-[28px] p-8 mb-10 text-white shadow-xl article-view-float-up">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#3D5B4F]/40 blur-3xl" />
            {/* decorative corner sprig */}
            <svg className="absolute top-4 right-5 text-white/15 article-view-sway-slow" width="46" height="46" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 3v18M12 8C9 6 6 7 5 4M12 8c3-2 6-1 7-4M12 14c-3-2-7-1-8-4M12 14c3-2 7-1 8-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <p className="relative z-10 text-[10px] font-black uppercase tracking-[0.3em] mb-3 article-view-shimmer-text inline-block">⚡ The TL;DR</p>
            <p className="relative z-10 text-lg md:text-xl leading-relaxed font-light">{tldr}</p>
          </div>
          )}

          {/* Vibe chips */}
          <div className="flex flex-wrap gap-2 mb-12 article-view-float-up-1">
            {vibes.map((v: string) => (
              <span key={v} className="px-4 py-1.5 rounded-full bg-[#3D5B4F]/10 text-[#4B695A] text-xs font-bold lowercase tracking-wide transition-all hover:bg-[#3D5B4F]/20 hover:-translate-y-0.5">#{String(v).replace(/\s+/g, "")}</span>
            ))}
          </div>

          {post.subtitle && (
            <h2 className="text-2xl md:text-3xl font-serif italic text-[#2D2A26] leading-tight mb-12 opacity-80 border-l-4 border-[#3D5B4F] pl-6">{post.subtitle}</h2>
          )}

          {/* Highlights */}
          {highlights.length > 0 && (
            <section className="mb-14">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#3D5B4F] mb-4">✨ Key Highlights</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {highlights.map((item, idx) => (
                  <div key={`${item}-${idx}`} className="group relative overflow-hidden rounded-2xl p-5 border border-[#3D5B4F]/15 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#3D5B4F]/10 bg-[#FFF4E8]">
                    <span className="pointer-events-none absolute -bottom-4 -right-2 text-6xl font-serif italic text-[#3D5B4F]/10 select-none">{idx + 1}</span>
                    <span className="relative inline-flex w-7 h-7 rounded-full bg-[#3D5B4F] text-white text-xs font-bold items-center justify-center mb-3 transition-transform group-hover:scale-110">{idx + 1}</span>
                    <p className="relative text-sm leading-relaxed font-medium text-[#2D2A26]">{item}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <SprigDivider />

          {/* Glow-Up Steps */}
          {timelineSteps.length > 0 && (
            <section className="mb-14">
              <h3 className="text-2xl font-serif italic mb-6">The Glow-Up Steps 🌿</h3>
              <div className="relative space-y-4 before:absolute before:left-5 before:top-6 before:bottom-6 before:w-px before:bg-gradient-to-b before:from-[#3D5B4F]/40 before:via-[#3D5B4F]/25 before:to-transparent">
                {timelineSteps.map((step, idx) => (
                  <div key={`${step.title}-${idx}`} className="relative flex gap-4 items-start p-5 rounded-2xl bg-white border border-black/5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                    <span className="relative z-10 w-10 h-10 rounded-full bg-[#3D5B4F] text-white text-sm font-bold flex items-center justify-center shrink-0 ring-4 ring-paper-2 shadow-md shadow-[#3D5B4F]/30">{(step.stepLabel || `0${idx + 1}`).replace(/[^0-9]/g, "").slice(0, 2) || idx + 1}</span>
                    <div>
                      <p className="font-bold text-[#2D2A26] mb-1">{step.title}</p>
                      <p className="text-sm leading-relaxed text-[#2D2A26]/70">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <SprigDivider />

          {/* ✅ Green Flags / 🚩 Red Flags (Do's & Don'ts) */}
          <section className="mb-14 grid md:grid-cols-2 gap-5">
            <div className="rounded-[26px] p-7 border bg-[#EAF3EC] border-[rgba(61,91,79,0.3)]">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">✅</span>
                <h4 className="text-lg font-black uppercase tracking-wide text-[#4B695A]">Green Flags</h4>
              </div>
              <ul className="space-y-3">
                {dos.map((item, idx) => (
                  <li key={idx} className="flex gap-3 text-sm leading-relaxed text-[#2D2A26]/85">
                    <span className="text-[#4B695A] font-bold shrink-0">do</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[26px] p-7 border bg-[#FBEDED] border-[rgba(192,88,79,0.3)]">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🚩</span>
                <h4 className="text-lg font-black uppercase tracking-wide text-[#C0584F]">Red Flags</h4>
              </div>
              <ul className="space-y-3">
                {donts.map((item, idx) => (
                  <li key={idx} className="flex gap-3 text-sm leading-relaxed text-[#2D2A26]/85">
                    <span className="text-[#C0584F] font-bold shrink-0">no</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Ingredient spotlight */}
          {ingredientSpotlight && (
            <section className="mb-14 rounded-[26px] border border-[#3D5B4F]/15 p-7 bg-white relative overflow-hidden">
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-[#3D5B4F]/10 blur-2xl" />
              <p className="text-[10px] tracking-[0.3em] text-[#3D5B4F] uppercase font-black mb-1">🌿 Ingredient Spotlight</p>
              <h3 className="text-2xl font-serif italic mb-2">{ingredientSpotlight.name}</h3>
              <p className="text-sm leading-relaxed text-[#2D2A26]/80">{ingredientSpotlight.quote}</p>
            </section>
          )}

          {/* Full body sections */}
          <div className="space-y-8">
            {visibleSections?.map((section: any, idx: number) => renderArticleSection(section, idx))}
            {!showFullBody && articleParagraphs.length > 3 && (
              <button onClick={() => setShowFullBody(true)} className="w-full py-3.5 rounded-full bg-[#2D2A26] text-white text-sm font-bold hover:scale-[1.01] transition-all">
                Read the full story ↓
              </button>
            )}
          </div>

          {/* FAQ (if provided) */}
          {Array.isArray(post.faq) && post.faq.length > 0 && (
            <section className="mt-14">
              <h3 className="text-2xl font-serif italic mb-6">Real Questions 💬</h3>
              <div className="space-y-3">
                {post.faq.map((f: any, idx: number) => (
                  <details key={f.id || idx} className="group rounded-2xl bg-white border border-black/5 p-5">
                    <summary className="cursor-pointer font-bold text-[#2D2A26] list-none flex justify-between items-center">
                      {f.question}
                      <span className="text-[#3D5B4F] group-open:rotate-45 transition-transform">+</span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-[#2D2A26]/70">{f.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* Save / share CTA */}
          <div className="mt-20 p-8 md:p-10 bg-[#2D2A26] rounded-[36px] text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-full bg-[#3D5B4F] flex items-center justify-center p-4 shrink-0">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                </div>
                <div>
                  <h4 className="font-serif text-xl md:text-2xl italic">Obsessed? Same.</h4>
                  <p className="text-white/60 text-sm">Save this glow guide or send it to a bestie who needs it.</p>
                </div>
              </div>
              <button onClick={toggleSaved} disabled={savingBookmark} className="px-8 py-3.5 rounded-full bg-white text-[#2D2A26] text-sm font-bold hover:scale-105 active:scale-95 transition-all whitespace-nowrap disabled:opacity-60">{savingBookmark ? "Saving…" : saved ? "✓ Saved Ritual" : "Save Ritual"}</button>
            </div>
          </div>

          {/* ─── Comments ─── */}
          <section id="comments" className="mt-16">
            <h3 className="text-2xl font-serif italic mb-6">
              Join the conversation 💬{" "}
              <span className="text-base not-italic text-[#2D2A26]/40 font-sans">({commentCount})</span>
            </h3>

            {/* Composer */}
            <div className="mb-8 p-5 rounded-[24px] bg-white border border-black/5 shadow-sm">
              {currentUser ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-[#3D5B4F] text-white flex items-center justify-center font-bold shrink-0">
                      {(currentUser as any)?.ProfilePicture ? (
                        <img src={(currentUser as any).ProfilePicture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        commentInitial((currentUser as any)?.FirstName || "You")
                      )}
                    </div>
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Share your thoughts on this ritual…"
                      rows={3}
                      maxLength={1000}
                      className="flex-1 resize-none rounded-2xl border border-black/10 bg-[#faf8f4] px-4 py-3 text-sm leading-relaxed text-[#2D2A26] focus:outline-none focus:ring-2 focus:ring-[#3D5B4F]/40"
                    />
                  </div>
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={submitComment}
                      disabled={postingComment || !commentText.trim()}
                      className="px-6 py-2.5 rounded-full bg-[#2D2A26] text-white text-sm font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {postingComment ? "Posting…" : "Post comment"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-[#2D2A26]/60">Log in to share your thoughts.</p>
                  <button onClick={() => navigate("/Login")} className="px-6 py-2.5 rounded-full bg-[#3D5B4F] text-white text-sm font-bold hover:scale-105 active:scale-95 transition-all whitespace-nowrap">Log in</button>
                </div>
              )}
            </div>

            {/* List */}
            {loadingComments ? (
              <p className="text-sm text-[#2D2A26]/50 italic">Loading comments…</p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-[#2D2A26]/50 italic">No comments yet — be the first to share. ✨</p>
            ) : (
              <ul className="space-y-4">
                {comments.map((c) => {
                  const author = commentAuthor(c);
                  const ownerId =
                    c.userId && typeof c.userId === "object"
                      ? String((c.userId as any)._id || "")
                      : String(c.userId || "");
                  const isMine = !!myUserId && ownerId === myUserId;
                  return (
                    <li key={c._id} className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-black/5">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-[#3D5B4F] text-white flex items-center justify-center font-bold shrink-0">
                        {author.avatar ? (
                          <img src={author.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          commentInitial(author.name)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#2D2A26] truncate">{author.name}</span>
                          <span className="text-[11px] text-[#2D2A26]/40">{relativeTime(c.createdAt)}</span>
                        </div>
                        <p className="text-sm leading-relaxed text-[#2D2A26]/80 mt-1 whitespace-pre-wrap break-words">{c.content}</p>
                      </div>
                      {isMine && (
                        <button
                          onClick={() => removeComment(c._id)}
                          className="text-[11px] font-bold uppercase tracking-wide text-[#C0584F]/70 hover:text-[#C0584F] transition-colors shrink-0"
                          title="Delete your comment"
                        >
                          Delete
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </article>

        {/* Sidebar */}
        <aside className="article-view-aside hidden lg:block">
          <div className="sticky top-32 space-y-10">
            {/* Ambient ritual clip — auto-plays on every article */}
            <div className="rounded-3xl overflow-hidden border border-black/5 shadow-lg relative">
              <video
                src={getArticleVideo(post, String(post?._id || post?.id || id || "aura"))}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-56 object-cover"
              />
              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                <span className="text-white text-[10px] font-black uppercase tracking-[0.3em]">Ritual in Motion</span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-black/5">
              <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#3D5B4F] mb-4">Quick Stats</h5>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-[#2D2A26]/55 font-medium">👁 Views</span><span className="font-bold tabular-nums">{viewCount.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-[#2D2A26]/55 font-medium">❤️ Likes</span><span className="font-bold tabular-nums">{likeCount.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-[#2D2A26]/55 font-medium">💬 Comments</span><span className="font-bold tabular-nums">{commentCount.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-[#2D2A26]/55 font-medium">🔗 Shares</span><span className="font-bold tabular-nums">{shareCount.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-[#2D2A26]/55 font-medium">Read time</span><span className="font-bold">{readTime} min</span></div>
                <div className="flex justify-between"><span className="text-[#2D2A26]/55 font-medium">Category</span><span className="font-bold">{categoryLabel}</span></div>
              </div>
            </div>

            <div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#3D5B4F] mb-4">The Vibe</h5>
              <div className="space-y-3">
                {["Luminous Skin", "Internal Balance", "Gentle Care"].map((m) => (
                  <div key={m} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3D5B4F]" />
                    <span className="text-sm font-bold text-[#2D2A26]/60">{m}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* The AI analysis CTA that used to sit here is now the app-wide
                floating action button (components/AiSkinFab) — one persistent
                entry point instead of a copy inside every article. */}
          </div>
        </aside>
      </div>

      {/* Related */}
      <section className="bg-white py-24 lg:py-32 border-t border-black/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h3 className="text-4xl md:text-5xl font-serif italic mb-2">More to Glow For</h3>
              <p className="text-[#3D5B4F] font-bold uppercase tracking-widest text-[10px]">Keep the streak going</p>
            </div>
            <button onClick={() => navigate("/explore")} className="text-sm font-bold border-b-2 border-[#3D5B4F] pb-1 hover:text-[#3D5B4F] transition-all">View All</button>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {relatedSource.slice(0, 3).map((p: any) => (
              <div key={p.id || p._id} onClick={() => navigate(`/article/${p.id || p._id}`)} className="group cursor-pointer">
                <div className="relative aspect-[3/4] rounded-[28px] overflow-hidden mb-5 shadow-xl transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-2">
                  <PostCover src={getPostCover(p) || `https://picsum.photos/seed/${p.id || p._id}/800/600`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                  <div className="absolute inset-x-0 bottom-0 p-7 bg-gradient-to-t from-black/70 to-transparent">
                    <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-2 block">{getCategoryName(p) || "Ritual"}</span>
                    <h4 className="text-white text-xl font-serif italic leading-tight">{p.title}</h4>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};

export default ArticleView;
