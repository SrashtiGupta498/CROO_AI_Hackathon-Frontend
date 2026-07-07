import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError("");
    setLoading(true);
    try {
      await API.post("/auth/forgot-password", { Email: email.trim() });
      setSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16 relative overflow-hidden"
      style={{ background: "#1a2e25", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(circle at 30% 20%, #6B8E7A, transparent 55%)" }} />

      <div className="relative w-full max-w-md rounded-[2.5rem] p-8 md:p-10" style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <button onClick={() => navigate("/Login")} className="text-white/40 hover:text-white/70 text-xs font-bold uppercase tracking-widest mb-8 transition-colors">
          ← Back to sign in
        </button>

        {!sent ? (
          <>
            <h1 className="text-white mb-3" style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.2rem", fontWeight: 700, lineHeight: 1.1 }}>
              Forgot your password?
            </h1>
            <p className="text-white/50 text-sm leading-relaxed mb-8">
              Enter the email tied to your account and we'll send you a link to reset it.
            </p>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-2xl text-sm text-red-200" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                {error}
              </div>
            )}

            <form onSubmit={submit}>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#A8C5AB] mb-2">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nina@auraearth.com"
                className="w-full px-5 py-4 rounded-2xl text-white placeholder-white/30 outline-none mb-6 transition-all focus:border-[#6B8E7A]"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl text-white font-bold text-sm tracking-widest uppercase transition-all hover:-translate-y-0.5 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #6B8E7A 0%, #4a7060 100%)", boxShadow: "0 12px 30px rgba(107,142,122,0.3)" }}
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl" style={{ background: "rgba(107,142,122,0.15)" }}>
              ✉️
            </div>
            <h1 className="text-white mb-3" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.9rem", fontWeight: 700 }}>
              Check your inbox
            </h1>
            <p className="text-white/50 text-sm leading-relaxed mb-8">
              If an account exists for <span className="text-[#A8C5AB] font-semibold">{email}</span>, a reset link is on its way. The link expires in 30 minutes.
            </p>
            <button onClick={() => navigate("/Login")} className="w-full py-4 rounded-2xl text-white font-bold text-sm tracking-widest uppercase transition-all hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg, #6B8E7A 0%, #4a7060 100%)" }}>
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
