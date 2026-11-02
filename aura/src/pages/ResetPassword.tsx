import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API from "../services/api";
import "./ResetPassword.css";

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
      setError(
        err?.response?.data?.message ||
          "This reset link is invalid or expired.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 relative overflow-hidden bg-ink font-sans">
      <div className="reset-glow absolute inset-0 opacity-10" />

      <div className="reset-card relative w-full max-w-md rounded-[2.5rem] p-8 md:p-10">
        {!token ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-5">⚠️</div>
            <h1 className="text-white mb-3 font-serif text-[1.8rem] font-bold">
              Invalid reset link
            </h1>
            <p className="text-white/50 text-sm mb-8">
              This link is missing its token. Please request a new one.
            </p>
            <button
              onClick={() => navigate("/forgot-password")}
              className="reset-btn w-full py-4 rounded-2xl text-white font-bold text-sm tracking-widest uppercase"
            >
              Request new link
            </button>
          </div>
        ) : done ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl bg-sage/15">
              ✅
            </div>
            <h1 className="text-white mb-3 font-serif text-[1.9rem] font-bold">
              Password updated
            </h1>
            <p className="text-white/50 text-sm">Redirecting you to sign in…</p>
          </div>
        ) : (
          <>
            <h1 className="text-white mb-3 font-serif text-[2.1rem] font-bold leading-[1.1]">
              Set a new password
            </h1>
            <p className="text-white/50 text-sm leading-relaxed mb-8">
              Choose a strong password you haven't used before.
            </p>

            {error && (
              <div className="reset-alert mb-5 px-4 py-3 rounded-2xl text-sm text-[#ffb4a8]">
                {error}
              </div>
            )}

            <form onSubmit={submit}>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-sage-light mb-2">
                New password
              </label>
              <div className="relative mb-5">
                <input
                  type={show ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="reset-input w-full px-5 py-4 rounded-2xl text-white placeholder-white/30 outline-none transition-all focus:border-sage"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 text-xs font-bold uppercase tracking-wider"
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>

              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-sage-light mb-2">
                Confirm password
              </label>
              <input
                type={show ? "text" : "password"}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="reset-input w-full px-5 py-4 rounded-2xl text-white placeholder-white/30 outline-none mb-6 transition-all focus:border-sage"
              />

              <button
                type="submit"
                disabled={loading}
                className="reset-btn w-full py-4 rounded-2xl text-white font-bold text-sm tracking-widest uppercase transition-all hover:-translate-y-0.5 disabled:opacity-60 shadow-[0_12px_30px_rgba(61,91,79,0.3)]"
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
