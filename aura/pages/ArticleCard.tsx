import React from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Article } from "../types";
import { RootState } from "../store/store";
import { isAdminUser } from "../components/AdminRoute";
import { getPostCover } from "../services/uploadImage";
import { PostCover } from "../components/PostCover";
import { getCategoryName, getSubcategoryNames } from "../services/taxonomy";

interface ArticleCardProps {
  article: Article;
  onClick: () => void;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  onClick,
}) => {
  const { currentUser } = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();
  if (!article) return null;
  const articleId = (article as any)._id || (article as any).id;
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden border border-slate-200"
    >
      <div className="h-48 w-full bg-slate-100 overflow-hidden relative">
        <PostCover
          src={
            getPostCover(article) ||
            `https://picsum.photos/seed/${article._id}/800/400`
          }
          alt={article.title}
          className="w-full h-full object-cover"
        />
        {isAdminUser(currentUser) && articleId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/article-editor/${articleId}`);
            }}
            className="absolute top-2 left-2 flex items-center gap-1 bg-[#6B8E7A] text-white text-xs font-bold px-3 py-1 rounded-full shadow hover:scale-105 transition-all"
            title="Edit this post"
          >
            ✎ Edit
          </button>
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          {article.isPublished ? (
            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
              Published
            </span>
          ) : (
            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full font-medium">
              Draft
            </span>
          )}
        </div>
      </div>
      <div className="p-5">
        {(getCategoryName(article) || getSubcategoryNames(article).length > 0) && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {getCategoryName(article) && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-[#6B8E7A] px-2 py-0.5 rounded-full">
                {getCategoryName(article)}
              </span>
            )}
            {getSubcategoryNames(article).map((name) => (
              <span key={name} className="text-[10px] font-bold uppercase tracking-wider text-[#6B8E7A] border border-[#6B8E7A]/30 px-2 py-0.5 rounded-full">
                {name}
              </span>
            ))}
          </div>
        )}
        <h3 className="text-lg font-bold text-slate-800 line-clamp-1 mb-1">
          {article.title}
        </h3>
        <p className="text-slate-500 text-sm line-clamp-2 mb-4">
          {article.subtitle}
        </p>
        {/*
        <div className="flex flex-wrap gap-2 mb-4">
          {article?.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] uppercase tracking-wider font-bold text-slate-400 border border-slate-200 px-2 py-1 rounded"
            >
              {tag}
            </span>
          ))}
        </div> */}

        <div className="flex items-center justify-between text-slate-400 text-xs pt-4 border-t border-slate-100">
          <div className="flex gap-4">
            <span>
              <i className="far fa-eye mr-1"></i> {article?.stats?.views ?? 0}
            </span>
            <span>
              <i className="far fa-heart mr-1"></i> {article?.stats?.likes ?? 0}
            </span>
            <span>
              <i className="far fa-comment mr-1"></i> {article?.stats?.comments ?? 0}
            </span>
            <span>
              <i className="far fa-share-square mr-1"></i> {article?.stats?.shares ?? 0}
            </span>
          </div>
          {/* <span>{new Date(article.createdAt.$date).toLocaleDateString()}</span> */}
        </div>
      </div>
    </div>
  );
};
