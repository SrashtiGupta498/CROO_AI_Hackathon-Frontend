import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
// The editor's own Article shape, not the one in src/types.ts — that is the
// article-card type and has no `sections`, which the editor requires.
import { ArticleEditor, type Article } from "../pages/ArticleEditor";
import API from "../services/api";

export default function ArticleEditorPage() {
  const { id } = useParams(); // dynamic _id from URL
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useSelector((state: RootState) => state.user);
  const returnTo = searchParams.get("returnTo");
  const normalizedReturnTo = (() => {
    if (!returnTo) return null;
    try {
      return decodeURIComponent(returnTo);
    } catch {
      return null;
    }
  })();


  useEffect(() => {
    if (!currentUser) {
      navigate("/Login");
    }
  }, [currentUser, navigate]);

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        // Must go through the shared API instance, not bare axios: its request
        // interceptor attaches the Bearer token, and an unpublished draft is only
        // readable by its author/admin — a tokenless read now 404s.
        const res = await API.get(`/posts/getpostById/${id}`);

        // if your API returns { data: {...} }
        // Legacy posts predate `sections`; default it so the editor always has
        // an array to render instead of crashing on undefined.
        const raw = res.data.data || res.data;
        setArticle({ ...raw, sections: raw?.sections ?? [] });
      } catch (error) {
        console.error("Error fetching article:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchArticle();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans text-muted">
        Loading article...
      </div>
    );
  }

  if (!article) {
    return <div className="p-10 font-sans text-muted">Article not found</div>;
  }

  return (
    <div className="ae-bg-paper min-h-screen p-6">
      <ArticleEditor
        article={article}
        onSave={() => navigate(normalizedReturnTo || "/")}
        onCancel={() =>
          normalizedReturnTo ? navigate(normalizedReturnTo) : navigate(-1)
        }
      />
    </div>
  );
}
