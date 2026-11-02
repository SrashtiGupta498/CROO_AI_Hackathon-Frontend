import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../store/store";
import { googleLogin } from "../store/user/user.action";
import { consumeGoogleOAuthState } from "../utils/googleOAuth";
import { Loader2, AlertCircle } from "lucide-react";
import "./GoogleCallback.css";
import Logo from "../components/Logo";

const GoogleCallback: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  // HashRouter exposes ?code= from within the hash via useSearchParams
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errMsg, setErrMsg] = useState<string>("");
  // The Google authorization code is single-use; guard against the effect
  // firing twice (React StrictMode double-mounts in dev) and burning it.
  const exchangedOnce = useRef(false);

  useEffect(() => {
    if (exchangedOnce.current) return;
    exchangedOnce.current = true;
    // URL: http://localhost:3000/#/auth/callback?code=XXXX
    // React Router HashRouter correctly parses ?code= from within the hash
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      setErrMsg(`Google denied access: ${error}`);
      setStatus("error");
      setTimeout(() => navigate("/Login"), 3000);
      return;
    }

    if (!code) {
      setErrMsg("No authorization code received from Google.");
      setStatus("error");
      setTimeout(() => navigate("/Login"), 3000);
      return;
    }

    // Reject any callback that wasn't initiated by this browser (e.g. a
    // forged link carrying someone else's authorization code) before ever
    // exchanging the code with the backend.
    if (!consumeGoogleOAuthState(searchParams.get("state"))) {
      setErrMsg("Sign-in request could not be verified. Please try again.");
      setStatus("error");
      setTimeout(() => navigate("/Login"), 3000);
      return;
    }

    // Hit: GET http://localhost:3002/v1/users/callback?code=XXXX
    dispatch(googleLogin(code)).then((result) => {
      if (googleLogin.fulfilled.match(result)) {
        navigate("/profile");
      } else {
        const msg = (result.payload as string) || "Google sign-in failed.";
        setErrMsg(msg);
        setStatus("error");
        setTimeout(() => navigate("/Login"), 3000);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink font-sans">
      <div className="gcb-glow-card rounded-[2.5rem] p-14 flex flex-col items-center gap-8 max-w-sm w-full mx-4">
        {/* Animated ring icon */}
        <div className="relative flex items-center justify-center w-20 h-20">
          {status === "loading" && (
            <div className="absolute inset-0 rounded-full bg-sage-light/20 animate-[gcb-pulse-ring_1.6s_ease-out_infinite]" />
          )}
          <div
            className={`relative w-16 h-16 rounded-full flex items-center justify-center border ${
              status === "loading"
                ? "bg-sage/30 border-sage-light/30"
                : "bg-[#b4413c]/10 border-[#b4413c]/30"
            }`}
          >
            {status === "loading" ? (
              <Loader2 size={28} className="text-sage-light animate-spin" />
            ) : (
              <AlertCircle size={28} className="text-[#ffb4a8]" />
            )}
          </div>
        </div>

        {/* Brand tag — the same lockup the header and the auth panels use. */}
        <Logo tone="dark" size="sm" />

        {/* Message */}
        <div className="text-center space-y-2">
          {status === "loading" ? (
            <>
              <h2 className="font-serif text-white text-2xl font-bold italic">
                Signing you in…
              </h2>
              <p className="text-white/40 text-sm">
                Calling Google verification API…
              </p>
            </>
          ) : (
            <>
              <h2 className="font-serif text-white text-2xl font-bold italic">
                Sign-in Failed
              </h2>
              <p className="text-white/40 text-sm">{errMsg}</p>
            </>
          )}
        </div>

        {/* Shimmer bar */}
        {status === "loading" && (
          <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden relative">
            <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-sage-light/70 to-transparent animate-[gcb-shimmer_1.4s_ease-in-out_infinite]" />
          </div>
        )}

        {status === "error" && (
          <p className="text-white/20 text-[10px] tracking-widest">
            Redirecting to login…
          </p>
        )}
      </div>
    </div>
  );
};

export default GoogleCallback;
