import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { ArticleEditor } from "../pages/ArticleEditor";
import { Article } from "../types";

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
        const res = await axios.get(
          `http://localhost:3002/v1/posts/getpostById/${id}`,
        );

        // if your API returns { data: {...} }
        setArticle(res.data.data || res.data);
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
      <div className="min-h-screen flex items-center justify-center">
        Loading article...
      </div>
    );
  }

  if (!article) {
    return <div className="p-10">Article not found</div>;
  }

  return (
    <div className="min-h-screen bg-[#F4F7F5] p-6">
      <ArticleEditor
        article={article}
        onSave={() => navigate(normalizedReturnTo || "/")}
        onCancel={() => navigate(normalizedReturnTo || -1)}
      />
    </div>
  );
}
