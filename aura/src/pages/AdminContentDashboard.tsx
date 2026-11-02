import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AppDispatch, RootState } from "../store/store";
import { fetchAllPosts } from "../store/article/article.action";

interface DashboardArticle {
  _id?: string;
  id?: string;
  title?: string;
  subtitle?: string;
  category?: { name?: string };
  thumbnail?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  updatedAt?: string;
  createdAt?: string;
}

const toText = (value: unknown) => String(value || "").trim();

const AdminContentDashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { posts, loading } = useSelector((state: RootState) => state.articles);
  const { currentUser } = useSelector((state: RootState) => state.user);

  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!currentUser) {
      navigate("/Login");
      return;
    }
    dispatch(fetchAllPosts({ limit: 1100, page: 1 }));
  }, [currentUser, dispatch, navigate]);

  const safePosts = useMemo(() => (Array.isArray(posts) ? posts : []), [posts]);

  const filteredPosts = useMemo(() => {
    const query = search.toLowerCase();
    if (!query) return safePosts;

    return safePosts.filter((article: DashboardArticle) => {
      const title = toText(article.title).toLowerCase();
      const subtitle = toText(article.subtitle).toLowerCase();
      const category = toText(article.category?.name).toLowerCase();
      return (
        title.includes(query) ||
        subtitle.includes(query) ||
        category.includes(query)
      );
    });
  }, [search, safePosts]);

  if (!currentUser) {
    return null;
  }

  return (
    <div className="ae-bg-paper min-h-screen px-6 md:px-10 py-14">
      <section className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-12">
          <div>
            <span className="ae-eyebrow">Admin Studio</span>
            <h1 className="ae-h3 text-4xl mt-2.5">Content</h1>
            <p className="mt-2 text-sm text-[var(--ae-muted)]">
              Edit articles and preview the Ritual view in one place.
            </p>
          </div>
          <div className="flex gap-2.5 shrink-0">
            <button
              onClick={() => navigate("/admin/categories")}
              className="ae-btn ae-btn-sm ae-btn-outline"
            >
              Categories
            </button>
            <button
              onClick={() => navigate("/admin/story-editor")}
              className="ae-btn ae-btn-sm ae-btn-primary"
            >
              + New Post
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <span className="ae-eyebrow">All articles</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, subtitle, category…"
            className="ae-input w-full sm:w-72"
          />
        </div>

        <div className="ae-card divide-y divide-line">
          {loading ? (
            <p className="p-8 text-sm text-[var(--ae-muted)]">
              Loading article list…
            </p>
          ) : filteredPosts.length === 0 ? (
            <p className="p-8 text-sm text-[var(--ae-muted)]">
              No articles found.
            </p>
          ) : (
            filteredPosts.map((article: DashboardArticle) => {
              const id = toText(article._id || article.id);
              const title = toText(article.title) || "Untitled article";
              const subtitle = toText(article.subtitle) || "No subtitle";
              const category = toText(article.category?.name) || "Ritual";
              const cover =
                article.thumbnail ||
                article.thumbnailUrl ||
                article.imageUrl ||
                "";
              const updated = toText(article.updatedAt || article.createdAt);
              const returnTo = "/admin/content-editor";

              return (
                <article
                  key={id || title}
                  className="group p-6 md:p-8 flex flex-col md:flex-row gap-5 items-start"
                >
                  <div className="w-full md:w-32 aspect-[4/3] rounded-[var(--ae-r-md)] overflow-hidden bg-paper-2 border border-line shrink-0">
                    {cover ? (
                      <img
                        src={cover}
                        alt={title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-[var(--ae-muted)] text-[11px]">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="ae-eyebrow">{category}</span>
                      {updated && (
                        <span className="text-xs text-[var(--ae-muted)]">
                          Updated {updated}
                        </span>
                      )}
                    </div>
                    <h2 className="ae-h3 text-xl mt-1.5">{title}</h2>
                    <p className="mt-1.5 text-sm text-[var(--ae-muted)] line-clamp-1">
                      {subtitle}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          if (!id) return;
                          navigate(
                            `/admin/article-editor/${id}?returnTo=${returnTo}`,
                          );
                        }}
                        className="ae-btn ae-btn-sm ae-btn-dark"
                        disabled={!id}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (!id) return;
                          navigate(
                            `/admin/story-editor/${id}?returnTo=${returnTo}`,
                          );
                        }}
                        className="ae-btn ae-btn-sm ae-btn-outline"
                        disabled={!id}
                      >
                        Block Editor
                      </button>
                      <button
                        onClick={() => {
                          if (!id) return;
                          navigate(`/article/${id}`);
                        }}
                        className="ae-btn ae-btn-sm ae-btn-outline"
                        disabled={!id}
                      >
                        View
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminContentDashboard;
