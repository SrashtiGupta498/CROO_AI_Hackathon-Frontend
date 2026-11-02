import React from "react";
import { useNavigate } from "react-router-dom";

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className="min-h-[60vh] bg-paper flex items-center justify-center px-6 py-24">
      <div className="text-center max-w-md">
        <p className="home-eyebrow mb-4">404 · Lost in the garden</p>
        <h1 className="font-serif text-[clamp(2.5rem,6vw,4rem)] leading-[0.98] tracking-[-0.035em] text-ink">
          This page has <span className="italic text-sage">wandered off.</span>
        </h1>
        <p className="mt-5 text-muted leading-relaxed">
          The page you're looking for doesn't exist or has moved. Let's get you
          back to something nourishing.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="ae-btn ae-btn-primary"
          >
            Back home
          </button>
          <button
            onClick={() => navigate("/explore")}
            className="ae-btn ae-btn-outline"
          >
            Explore remedies
          </button>
        </div>
      </div>
    </section>
  );
};

export default NotFound;
