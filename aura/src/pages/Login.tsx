import React, { useState, useEffect } from "react";
import { Eye, EyeOff, ArrowRight, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../store/store";
import { loginUser } from "../store/user/user.action";
import { clearError } from "../store/user/user.slice";
import { startGoogleSignIn } from "../utils/googleOAuth";
import { Img10 } from "../assets/index";
import "./Login.css";
import Logo from "../components/Logo";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, currentUser } = useSelector(
    (state: RootState) => state.user,
  );

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    if (currentUser) {
      navigate("/profile");
    }
    return () => {
      dispatch(clearError());
    };
  }, [currentUser, navigate, dispatch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(loginUser({ Email: email, Password: password }));
  };

  const handleGoogleSignIn = () => {
    // After Google auth, Google redirects to auth-callback.html, which
    // forwards to /#/auth/callback?code=...&state=...
    startGoogleSignIn();
  };

  return (
    <div
      className="login-page relative min-h-screen w-full grid lg:grid-cols-2 font-sans bg-paper text-ink"
      data-testid="login-page"
    >
      {/* ── Left: botanical brand panel (desktop only) ─────────────── */}
      <aside className="login-aside relative hidden lg:flex flex-col justify-between overflow-hidden p-14">
        <img
          src={Img10}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover login-aside-img"
        />
        <div className="login-aside-veil absolute inset-0" />

        {/* One lockup everywhere — the header, the footer and these auth
            panels used to draw three different marks. */}
        <Logo tone="dark" size="md" className="relative z-10" />

        <div className="relative z-10 max-w-md">
          <p className="login-eyebrow text-[#d8e9df]">
            Natural rituals, personalised
          </p>
          <h2 className="font-serif text-4xl xl:text-5xl leading-[1.05] text-paper mt-4">
            Care for your skin, the way nature intended.
          </h2>
          <p className="text-paper/70 mt-5 text-[15px] leading-relaxed">
            Sign in to pick up your rituals, saved remedies and skin insights —
            all in one calm place.
          </p>
        </div>

        <p className="relative z-10 text-paper/45 text-xs tracking-[0.25em] uppercase">
          Herbal Apothecary · Est. Nature
        </p>
      </aside>

      {/* ── Right: sign-in form ────────────────────────────────────── */}
      <main className="relative flex items-center justify-center px-6 py-16 sm:px-10">
        <button
          onClick={() => navigate("/")}
          aria-label="Close and return home"
          className="absolute top-6 right-6 p-2.5 rounded-full text-ink/40 hover:text-ink hover:bg-ink/5 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="w-full max-w-sm login-fade">
          {/* Mobile brand mark */}
          {/* The utility goes on a wrapper, not on Logo: Logo.css sets
              display on .ae-logo and is unlayered, so `lg:hidden` placed on
              the component itself would never win. */}
          <div className="lg:hidden mb-10">
            <Logo size="sm" />
          </div>

          <header className="mb-8">
            <p className="login-eyebrow text-turmeric">Welcome back</p>
            <h1 className="font-serif text-3xl sm:text-4xl text-ink mt-3">
              Sign in to your account
            </h1>
            <p className="text-muted text-sm mt-3">
              New here?{" "}
              <button
                onClick={() => navigate("/Signup")}
                className="text-sage font-semibold hover:underline underline-offset-4"
                data-testid="login-signup-link"
              >
                Create an account
              </button>
            </p>
          </header>

          {error && (
            <div
              role="alert"
              data-testid="login-error"
              className="mb-6 flex items-start gap-2 p-3.5 rounded-2xl bg-[#b4413c]/8 border border-[#b4413c]/20 text-[#8f322e] text-sm"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="login-label">
                Email address
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="login-input"
                data-testid="login-email"
                aria-invalid={!!error}
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="login-label">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-xs text-sage hover:underline underline-offset-4"
                  data-testid="login-forgot"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="login-input pr-12"
                  data-testid="login-password"
                  aria-invalid={!!error}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-ink/35 hover:text-ink/70 hover:bg-ink/5 transition-colors"
                  data-testid="login-toggle-password"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="login-checkbox"
                data-testid="login-remember"
              />
              <span className="text-sm text-muted">Keep me signed in</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="login-btn w-full py-3.5 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              data-testid="login-submit"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-7 flex items-center gap-4">
            <div className="flex-1 h-px bg-line" />
            <span className="text-muted/70 text-xs tracking-wide uppercase">
              or
            </span>
            <div className="flex-1 h-px bg-line" />
          </div>

          {/* Google Sign-in */}
          <button
            type="button"
            id="google-signin-btn"
            onClick={handleGoogleSignIn}
            className="login-google w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-semibold text-sm text-ink transition-colors"
            data-testid="login-google"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            Continue with Google
          </button>

          <p className="mt-8 text-center text-xs text-muted/70">
            By signing in you agree to our{" "}
            <button
              onClick={() => navigate("/about")}
              className="underline underline-offset-2 hover:text-ink"
            >
              terms
            </button>{" "}
            &amp; privacy policy.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
