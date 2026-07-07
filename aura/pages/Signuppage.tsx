import React, { useState, useEffect } from "react";
import { Eye, EyeOff, ArrowRight, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../store/store";
import { signupUser } from "../store/user/user.action";
import { clearError } from "../store/user/user.slice";
import { Img6 } from "../assets/index";

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, currentUser } = useSelector((state: RootState) => state.user);

  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (currentUser) {
      navigate("/profile");
    }
    return () => {
      dispatch(clearError());
    };
  }, [currentUser, navigate, dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Split full name into FirstName and LastName
    const names = fullName.trim().split(/\s+/);
    const FirstName = names[0];
    const LastName = names.slice(1).join(" ") || "";

    const userData = {
      Email: email,
      Password: password,
      FirstName,
      LastName,
      ProfilePicture: ""
    };

    dispatch(signupUser(userData));
  };

  const handleGoogleSignIn = () => {
    const GOOGLE_CLIENT_ID =
      "8993578499-0dffgdlfiso4qt35m4gvj6g0bgofpm3g.apps.googleusercontent.com";
    const REDIRECT_URI = "http://localhost:3000/auth-callback.html";

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "select_account",
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans bg-[#1a2e25]">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={Img6}
          alt="Botanical Background"
          className="w-full h-full object-cover opacity-40 scale-105 animate-[slowZoom_20s_ease-in-out_infinite]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a2e25]/80 via-[#1a2e25]/40 to-[#1a2e25]/90" />
      </div>

      <style>{`
        @keyframes slowZoom {
          0%   { transform: scale(1.05); }
          50%  { transform: scale(1.12); }
          100% { transform: scale(1.05); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .glass-container {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .input-premium {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }
        .input-premium:focus {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(168, 197, 171, 0.5);
          box-shadow: 0 0 0 4px rgba(168, 197, 171, 0.1);
        }
        .btn-premium {
          background: linear-gradient(135deg, #6B8E7A 0%, #4a7060 100%);
          transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .btn-premium:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(74, 112, 96, 0.4);
          filter: brightness(1.1);
        }
      `}</style>

      {/* Back Button */}
      <button 
        onClick={() => navigate("/Login")}
        className="absolute top-8 left-8 z-20 p-2 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 pr-4 text-xs font-bold tracking-widest"
      >
        <div className="rotate-180"><ArrowRight size={16} /></div>
        BACK TO LOGIN
      </button>

      {/* Close Button */}
      <button 
        onClick={() => navigate("/")}
        className="absolute top-8 right-8 z-20 p-2 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
      >
        <X size={20} />
      </button>

      {/* Signup Card */}
      <div 
        className="relative z-10 w-full max-w-lg px-6 animate-[fadeUp_1s_cubic-bezier(0.22,1,0.36,1)_both]"
      >
        <div className="glass-container rounded-[2.5rem] p-10 md:p-14">
          <div className="text-center mb-10">
            <span className="inline-block mb-4 text-[10px] tracking-[0.3em] font-bold text-[#A8C5AB] uppercase">
              Begin Your Journey
            </span>
            <h1 className="text-white text-4xl md:text-5xl font-bold mb-4 italic" style={{ fontFamily: "'Playfair Display', serif" }}>
              Join the Ritual
            </h1>
            <p className="text-white/40 text-sm font-medium tracking-wide">
              Embrace botanical wisdom and slow beauty rituals.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-200 text-xs text-center animate-pulse">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/50 ml-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nina Earth"
                  className="input-premium w-full px-6 py-4 rounded-2xl text-white placeholder:text-white/20 outline-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/50 ml-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nina@auraearth.com"
                  className="input-premium w-full px-6 py-4 rounded-2xl text-white placeholder:text-white/20 outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 relative">
              <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/50 ml-1">
                Create Security Key
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-premium w-full px-6 py-4 rounded-2xl text-white placeholder:text-white/20 outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="px-1 pt-1 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" className="hidden" />
                <div className="w-5 h-5 rounded border border-white/20 flex items-center justify-center group-hover:border-[#A8C5AB] transition-colors flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#A8C5AB] opacity-0 transition-opacity" />
                </div>
                <span className="text-xs text-white/40 group-hover:text-white/60 transition-colors">
                  I agree to the Ritual Terms and Privacy Sanctuary
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" defaultChecked className="hidden" />
                <div className="w-5 h-5 rounded border border-[#A8C5AB] flex items-center justify-center transition-colors flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#A8C5AB] opacity-100 transition-opacity" />
                </div>
                <span className="text-xs text-white/60 group-hover:text-white transition-colors font-medium">
                  Receive "The Ritual Letter" for weekly botanical wisdom
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-premium w-full py-5 rounded-2xl text-white font-bold text-sm tracking-widest flex items-center justify-center gap-3 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  CREATING ACCOUNT...
                </>
              ) : (
                <>
                  BEGIN MY RITUAL
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-[10px] tracking-[0.2em] font-bold uppercase">Or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Google Sign-in */}
          <button
            type="button"
            id="google-signup-btn"
            onClick={handleGoogleSignIn}
            className="mt-4 w-full flex items-center justify-center gap-3 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group"
          >
            <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            <span className="text-white/60 group-hover:text-white text-xs font-bold tracking-widest uppercase transition-colors">
              Continue with Google
            </span>
          </button>

          <div className="mt-8 text-center">
            <p className="text-white/30 text-xs text-center">
              Already a community member?{" "}
              <button
                onClick={() => navigate("/Login")}
                className="text-[#A8C5AB] font-bold hover:underline underline-offset-4"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>

        {/* Branding Footer */}
        <div className="mt-10 text-center flex flex-col items-center gap-4 opacity-30">
          <div className="h-px w-8 bg-white" />
          <p className="text-[9px] tracking-[0.4em] text-white uppercase font-bold">
            Aura & Earth Botanical
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
