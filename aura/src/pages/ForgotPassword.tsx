import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "./ForgotPassword.css";

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
    <div className="min-h-screen flex items-center justify-center px-4 py-16 relative overflow-hidden bg-ink font-sans">
      <div className="forgot-glow absolute inset-0 opacity-10" />

      <div className="forgot-card relative w-full max-w-md rounded-[2.5rem] p-8 md:p-10">
        <button onClick={() => navigate("/Login")} className="text-white/40 hover:text-white/70 text-xs font-bold uppercase tracking-widest mb-8 transition-colors">
          ← Back to sign in
        </button>

        {!sent ? (
          <>
            <h1 className="text-white mb-3 font-serif text-[2.2rem] font-bold leading-[1.1]">
              Forgot your password?
            </h1>
            <p className="text-white/50 text-sm leading-relaxed mb-8">
              Enter the email tied to your account and we'll send you a link to reset it.
            </p>

            {error && (
              <div className="forgot-alert mb-5 px-4 py-3 rounded-2xl text-sm text-[#ffb4a8]">
                {error}
              </div>
            )}

            <form onSubmit={submit}>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-sage-light mb-2">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nina@auraearth.com"
                className="forgot-input w-full px-5 py-4 rounded-2xl text-white placeholder-white/30 outline-none mb-6 transition-all focus:border-sage"
              />
              <button
                type="submit"
                disabled={loading}
                className="forgot-btn w-full py-4 rounded-2xl text-white font-bold text-sm tracking-widest uppercase transition-all hover:-translate-y-0.5 disabled:opacity-60 shadow-[0_12px_30px_rgba(61,91,79,0.3)]"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl bg-sage/15">
              ✉️
            </div>
            <h1 className="text-white mb-3 font-serif text-[1.9rem] font-bold">
              Check your inbox
            </h1>
            <p className="text-white/50 text-sm leading-relaxed mb-8">
              If an account exists for <span className="text-sage-light font-semibold">{email}</span>, a reset link is on its way. The link expires in 30 minutes.
            </p>
            <button onClick={() => navigate("/Login")} className="forgot-btn w-full py-4 rounded-2xl text-white font-bold text-sm tracking-widest uppercase transition-all hover:-translate-y-0.5">
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
