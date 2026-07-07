import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API from "../services/api";

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      await API.post("/auth/reset-password", { token, newPassword: password });
      setDone(true);
      setTimeout(() => navigate("/Login"), 2200);
    } catch (err: any) {
      setError(err?.response?.data?.message || "This reset link is invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" } as React.CSSProperties;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16 relative overflow-hidden"
      style={{ background: "#1a2e25", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(circle at 70% 20%, #6B8E7A, transparent 55%)" }} />

      <div className="relative w-full max-w-md rounded-[2.5rem] p-8 md:p-10" style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.08)" }}>
        {!token ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-5">⚠️</div>
            <h1 className="text-white mb-3" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 700 }}>Invalid reset link</h1>
            <p className="text-white/50 text-sm mb-8">This link is missing its token. Please request a new one.</p>
            <button onClick={() => navigate("/forgot-password")} className="w-full py-4 rounded-2xl text-white font-bold text-sm tracking-widest uppercase" style={{ background: "linear-gradient(135deg, #6B8E7A 0%, #4a7060 100%)" }}>
              Request new link
            </button>
          </div>
        ) : done ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl" style={{ background: "rgba(107,142,122,0.15)" }}>✅</div>
            <h1 className="text-white mb-3" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.9rem", fontWeight: 700 }}>Password updated</h1>
            <p className="text-white/50 text-sm">Redirecting you to sign in…</p>
          </div>
        ) : (
          <>
            <h1 className="text-white mb-3" style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.1rem", fontWeight: 700, lineHeight: 1.1 }}>
              Set a new password
            </h1>
            <p className="text-white/50 text-sm leading-relaxed mb-8">Choose a strong password you haven't used before.</p>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-2xl text-sm text-red-200" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                {error}
              </div>
            )}

            <form onSubmit={submit}>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#A8C5AB] mb-2">New password</label>
              <div className="relative mb-5">
                <input
                  type={show ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-5 py-4 rounded-2xl text-white placeholder-white/30 outline-none transition-all focus:border-[#6B8E7A]"
                  style={inputStyle}
                />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 text-xs font-bold uppercase tracking-wider">
                  {show ? "Hide" : "Show"}
                </button>
              </div>

              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#A8C5AB] mb-2">Confirm password</label>
              <input
                type={show ? "text" : "password"}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full px-5 py-4 rounded-2xl text-white placeholder-white/30 outline-none mb-6 transition-all focus:border-[#6B8E7A]"
                style={inputStyle}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl text-white font-bold text-sm tracking-widest uppercase transition-all hover:-translate-y-0.5 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #6B8E7A 0%, #4a7060 100%)", boxShadow: "0 12px 30px rgba(107,142,122,0.3)" }}
              >
                {loading ? "Updating…" : "Reset password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
