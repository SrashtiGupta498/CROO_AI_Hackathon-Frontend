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
    dispatch(fetchAllPosts({ limit: 80, page: 1 }));
  }, [currentUser, dispatch, navigate]);

  const safePosts = useMemo(() => (Array.isArray(posts) ? posts : []), [posts]);

  const filteredPosts = useMemo(() => {
    const query = search.toLowerCase();
    if (!query) return safePosts;

    return safePosts.filter((article: DashboardArticle) => {
      const title = toText(article.title).toLowerCase();
      const subtitle = toText(article.subtitle).toLowerCase();
      const category = toText(article.category?.name).toLowerCase();
      return title.includes(query) || subtitle.includes(query) || category.includes(query);
    });
  }, [search, safePosts]);

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f5f8f7] px-6 md:px-10 py-10">
      <section className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
          <div>
            <p className="text-xs tracking-[0.22em] text-[#6b8e7a] font-bold uppercase">Admin Studio</p>
            <h1 className="text-3xl md:text-5xl mt-2 font-[Playfair_Display] text-[#1a1c1b]">
              Content Editor Dashboard
            </h1>
            <p className="mt-2 text-[#5c6057] max-w-2xl">
              Edit articles and preview the Ritual view in one place. Open any article below.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, subtitle, category..."
              className="w-full lg:w-80 px-4 py-3 rounded-2xl border border-[#d8ddd8] bg-white focus:outline-none focus:ring-2 focus:ring-[#6b8e7a]/35"
            />
            <button
              onClick={() => navigate("/admin/categories")}
              className="px-5 py-3 rounded-2xl border border-[#6b8e7a] text-[#6b8e7a] text-sm font-bold tracking-[0.04em] whitespace-nowrap hover:bg-[#eaf1ec] transition-colors shrink-0"
            >
              Manage Categories
            </button>
            <button
              onClick={() => navigate("/admin/story-editor")}
              className="px-5 py-3 rounded-2xl bg-[#6b8e7a] text-white text-sm font-bold tracking-[0.04em] whitespace-nowrap hover:bg-[#5a7a68] transition-colors shrink-0"
            >
              + New Post
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="bg-white border border-[#e3e7e5] rounded-2xl p-8 text-[#6b7b6f]">
              Loading article list...
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="bg-white border border-[#e3e7e5] rounded-2xl p-8 text-[#6b7b6f]">
              No articles found.
            </div>
          ) : (
            filteredPosts.map((article: DashboardArticle) => {
              const id = toText(article._id || article.id);
              const title = toText(article.title) || "Untitled article";
              const subtitle = toText(article.subtitle) || "No subtitle";
              const category = toText(article.category?.name) || "Ritual";
              const cover = article.thumbnail || article.thumbnailUrl || article.imageUrl || "";
              const updated = toText(article.updatedAt || article.createdAt);
                const returnTo = "/admin/content-editor";

              return (
                <article
                  key={id || title}
                  className="bg-white border border-[#e3e7e5] rounded-3xl p-5 md:p-6 flex flex-col md:flex-row gap-5 items-start"
                >
                  <div className="w-full md:w-52 h-40 rounded-2xl overflow-hidden bg-[#eef2ee] shrink-0">
                    {cover ? (
                      <img
                        src={cover}
                        alt={title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-[#7f887f] text-sm">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-[11px] tracking-[0.18em] text-[#6b8e7a] font-bold uppercase">
                      {category}
                    </p>
                    <h2 className="mt-2 text-2xl md:text-3xl font-[Playfair_Display] leading-tight text-[#1a1c1b]">
                      {title}
                    </h2>
                    <p className="mt-2 text-[#5c6057]">{subtitle}</p>
                    <p className="mt-2 text-xs text-[#7c857a]">
                      {updated ? `Updated: ${updated}` : ""}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        onClick={() => {
                          if (!id) return;
                          navigate(`/admin/article-editor/${id}?returnTo=${returnTo}`);
                        }}
                        className="px-4 py-2.5 rounded-full bg-[#1a1c1b] text-white text-xs font-bold tracking-[0.12em] uppercase"
                        disabled={!id}
                      >
                        Edit + Ritual Preview
                      </button>
                      <button
                        onClick={() => {
                          if (!id) return;
                          navigate(`/admin/story-editor/${id}?returnTo=${returnTo}`);
                        }}
                        className="px-4 py-2.5 rounded-full border border-[#6b8e7a] text-[#6b8e7a] text-xs font-bold tracking-[0.12em] uppercase"
                        disabled={!id}
                      >
                        Block Editor
                      </button>
                      <button
                        onClick={() => {
                          if (!id) return;
                          navigate(`/article/${id}`);
                        }}
                        className="px-4 py-2.5 rounded-full border border-[#1a1c1b] text-[#1a1c1b] text-xs font-bold tracking-[0.12em] uppercase"
                        disabled={!id}
                      >
                        Open Published View
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
