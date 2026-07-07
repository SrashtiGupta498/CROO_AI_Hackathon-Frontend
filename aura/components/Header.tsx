import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import NotificationBell from "./NotificationBell";

/* ─── Mega-menu data ─────────────────────────────────── */
const NAV_ITEMS = [
  {
    label: "Journal",
    path: "/journal",
    mega: [
      {
        heading: "Daily Rituals",
        links: [
          { label: "☀️ Morning Routine", path: "/journal/morning-routine" },
          { label: "🌙 Night Care", path: "/journal/night-care" },
          { label: "🧖 Weekly Ritual", path: "/journal/weekly-ritual" },
          { label: "Seasonal Skincare", path: "/articles" },
        ],
      },
      {
        heading: "Categories",
        headingPath: "/categories",
        links: [
          { label: "All Categories", path: "/categories" },
          { label: "Natural Skincare", path: "/categories" },
          { label: "DIY Recipes", path: "/categories" },
          { label: "DIY Creator", path: "/diy" },
          { label: "Wellness & Mind", path: "/categories" },
        ],
      },
      {
        heading: "Popular",
        links: [
          { label: "Aloe Vera Guide", path: "/articles" },
          { label: "5-Step Glow Routine", path: "/articles" },
          { label: "Rosehip Oil Secrets", path: "/articles" },
          { label: "DIY Lavender Mist", path: "/articles" },
        ],
      },
    ],
  },
  {
    label: "Explore",
    path: "/explore",
    mega: [
      {
        heading: "By Concern",
        links: [
          { label: "Acne & Blemishes", path: "/explore" },
          { label: "Anti-Aging", path: "/explore" },
          { label: "Hydration & Glow", path: "/explore" },
          { label: "Sensitive Skin", path: "/explore" },
        ],
      },
      {
        heading: "By Ritual",
        links: [
          { label: "Morning Ritual", path: "/explore" },
          { label: "Evening Ritual", path: "/explore" },
          { label: "Weekly Treatments", path: "/explore" },
          { label: "Detox Rituals", path: "/explore" },
        ],
      },
      {
        heading: "Trending Now",
        links: [
          { label: "Curd & Besan Mask", path: "/explore" },
          { label: "Rose Ice Therapy", path: "/explore" },
          { label: "Green Tea Detox", path: "/explore" },
          { label: "Walnut Scrub", path: "/explore" },
        ],
      },
    ],
  },
  {
    label: "Ingredients",
    path: "/ingredients",
    mega: [
      {
        heading: "Plant Oils",
        links: [
          { label: "Rosehip Oil", path: "/ingredients" },
          { label: "Jojoba Oil", path: "/ingredients" },
          { label: "Argan Oil", path: "/ingredients" },
          { label: "Sea Buckthorn", path: "/ingredients" },
        ],
      },
      {
        heading: "Botanicals",
        links: [
          { label: "Aloe Vera", path: "/ingredients" },
          { label: "Green Tea", path: "/ingredients" },
          { label: "Turmeric", path: "/ingredients" },
          { label: "Lavender", path: "/ingredients" },
        ],
      },
      {
        heading: "Actives",
        links: [
          { label: "Vitamin C", path: "/ingredients" },
          { label: "Niacinamide", path: "/ingredients" },
          { label: "Hyaluronic Acid", path: "/ingredients" },
          { label: "Retinol", path: "/ingredients" },
        ],
      },
    ],
  },

  {
    label: "DIY Creator",
    path: "/diy",
    mega: null,
  },
  {
    label: "AI Skin Guide",
    path: "/ai",
    mega: null,
    badge: "NEW",
  },
];

const ANNOUNCEMENT_MESSAGES = [
  "🌿 Free shipping on orders over ₹999 · Use code AURA10 for 10% off",
  "✨ New: AI-powered skin analysis is now live — try it free",
  "🌸 Join 80K+ members in our natural living community",
];

/* ─── Icons ────────────────────────────────────────────── */
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);
const HeartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);
const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const MenuIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
const CloseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const ChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/* ─── Component ─────────────────────────────────────── */
const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useSelector((state: RootState) => state.user);

  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [announcementIdx, setAnnouncementIdx] = useState(0);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Scroll detection */
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  /* Announcement rotation */
  useEffect(() => {
    const t = setInterval(() => {
      setAnnouncementIdx((p) => (p + 1) % ANNOUNCEMENT_MESSAGES.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  /* Focus search input when overlay opens */
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 100);
  }, [searchOpen]);

  /* Close mobile menu on route change */
  useEffect(() => {
    setMobileOpen(false);
    setActiveMenu(null);
  }, [location.pathname]);

  const handleMenuEnter = (label: string) => {
    if (menuTimerRef.current) clearTimeout(menuTimerRef.current);
    setActiveMenu(label);
  };
  const handleMenuLeave = () => {
    menuTimerRef.current = setTimeout(() => setActiveMenu(null), 180);
  };

  const ACCENT = "#6B8E7A";
  const DARK = "#1a2e25";

  return (
    <>
      <style>{`
        @keyframes announceFade {
          0%   { opacity: 0; transform: translateY(8px); }
          15%  { opacity: 1; transform: translateY(0); }
          85%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-8px); }
        }
        @keyframes megaSlide {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes searchDrop {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes drawerSlide {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        .mega-menu { animation: megaSlide 0.25s cubic-bezier(0.4,0,0.2,1) both; }
        .search-drop { animation: searchDrop 0.3s cubic-bezier(0.4,0,0.2,1) both; }
        .drawer { animation: drawerSlide 0.32s cubic-bezier(0.4,0,0.2,1) both; }
        .announce-text { animation: announceFade 4s ease-in-out infinite; }
        .nav-link::after {
          content: '';
          display: block;
          height: 2px;
          border-radius: 2px;
          background: ${ACCENT};
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
          margin-top: 4px;
        }
        .nav-link:hover::after,
        .nav-link.active::after { transform: scaleX(1); }
        .header-icon-btn {
          width: 38px; height: 38px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: #3a3a3a;
          transition: background 0.2s, color 0.2s;
          cursor: pointer;
          border: none;
          background: transparent;
        }
        .header-icon-btn:hover {
          background: rgba(107,142,122,0.12);
          color: ${ACCENT};
        }
        .mobile-link {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 0;
          font-size: 1rem;
          font-weight: 600;
          color: #1a2e25;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          cursor: pointer;
          transition: color 0.2s;
        }
        .mobile-link:hover { color: ${ACCENT}; }
        .mobile-sublink {
          display: flex;
          padding: 9px 16px;
          font-size: 0.875rem;
          color: rgba(0,0,0,0.55);
          cursor: pointer;
          transition: color 0.2s;
          border-radius: 8px;
        }
        .mobile-sublink:hover { color: ${ACCENT}; background: rgba(107,142,122,0.06); }
        .badge {
          font-size: 8px;
          letter-spacing: 0.12em;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 100px;
          background: linear-gradient(135deg, #6B8E7A, #4a7060);
          color: white;
          vertical-align: middle;
          margin-left: 5px;
        }
      `}</style>

      {/* ── Announcement Bar ───────────────────────── */}
      {announcementVisible && (
        <div
          style={{
            background: `linear-gradient(90deg, ${DARK} 0%, #2d4a3e 50%, ${DARK} 100%)`,
            color: "white",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.03em",
            position: "relative",
            zIndex: 60,
          }}
          className="w-full text-center py-2.5 px-8"
        >
          <span className="announce-text inline-block" key={announcementIdx}>
            {ANNOUNCEMENT_MESSAGES[announcementIdx]}
          </span>
          <button
            onClick={() => setAnnouncementVisible(false)}
            style={{
              position: "absolute",
              right: "16px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "rgba(255,255,255,0.5)",
              background: "none",
              border: "none",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Main Header ───────────────────────────── */}
      <header
        style={{
          background: scrolled
            ? "rgba(250,249,246,0.97)"
            : "rgba(250,249,246,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: scrolled
            ? "1px solid rgba(0,0,0,0.09)"
            : "1px solid rgba(0,0,0,0.05)",
          boxShadow: scrolled ? "0 2px 24px rgba(0,0,0,0.07)" : "none",
          transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          position: "sticky",
          top: 0,
          zIndex: 50,
          width: "100%",
        }}
      >
        <div
          className="max-w-[1600px] mx-auto px-5 md:px-10"
          style={{ height: "68px", display: "flex", alignItems: "center", gap: "0" }}
        >
          {/* ── Left: Logo ───────────────────── */}
          <div style={{ display: "flex", alignItems: "center", flex: "0 0 auto", gap: "10px", cursor: "pointer" }}
            onClick={() => navigate("/")}
          >
            <div
              style={{
                width: "36px", height: "36px", borderRadius: "50%",
                background: `linear-gradient(135deg, ${ACCENT} 0%, #4a7060 100%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 4px 14px rgba(107,142,122,0.4)`,
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.4rem",
                fontWeight: 700,
                color: DARK,
                letterSpacing: "-0.01em",
                lineHeight: 1,
              }}
            >
              Aura <span style={{ fontStyle: "italic", color: ACCENT }}>&amp;</span> Earth
            </span>
          </div>

          {/* ── Center: Nav ──────────────────── */}
          <nav
            className="hidden lg:flex"
            style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: "6px" }}
          >
            {NAV_ITEMS.map((item) => (
              <div
                key={item.label}
                style={{ position: "relative" }}
                onMouseEnter={() => item.mega && handleMenuEnter(item.label)}
                onMouseLeave={handleMenuLeave}
              >
                <button
                  onClick={() => navigate(item.path)}
                  className={`nav-link ${location.pathname === item.path ? "active" : ""}`}
                  style={{
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                    color: location.pathname === item.path ? DARK : "rgba(26,46,37,0.6)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    transition: "color 0.2s",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = DARK; }}
                  onMouseLeave={(e) => {
                    if (location.pathname !== item.path)
                      (e.currentTarget as HTMLButtonElement).style.color = "rgba(26,46,37,0.6)";
                  }}
                >
                  {item.label}
                  {item.badge && <span className="badge">{item.badge}</span>}
                  {item.mega && <ChevronDown />}
                </button>

                {/* Mega Menu */}
                {item.mega && activeMenu === item.label && (
                  <div
                    className="mega-menu"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 12px)",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "white",
                      borderRadius: "20px",
                      boxShadow: "0 24px 60px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.05)",
                      padding: "28px",
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 200px)",
                      gap: "24px",
                      zIndex: 100,
                      minWidth: "640px",
                    }}
                    onMouseEnter={() => { if (menuTimerRef.current) clearTimeout(menuTimerRef.current); setActiveMenu(item.label); }}
                    onMouseLeave={handleMenuLeave}
                  >
                    {item.mega.map((col) => {
                      const headingPath = (col as { headingPath?: string }).headingPath;
                      return (
                      <div key={col.heading}>
                        {headingPath ? (
                          <button
                            onClick={() => { navigate(headingPath); setActiveMenu(null); }}
                            className="group/heading"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                              fontSize: "9px",
                              fontWeight: 800,
                              letterSpacing: "0.25em",
                              textTransform: "uppercase",
                              color: ACCENT,
                              marginBottom: "14px",
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                              fontFamily: "'Plus Jakarta Sans', sans-serif",
                            }}
                          >
                            {col.heading}
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="transition-transform duration-200 group-hover/heading:translate-x-0.5">
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          </button>
                        ) : (
                          <p
                            style={{
                              fontSize: "9px",
                              fontWeight: 800,
                              letterSpacing: "0.25em",
                              textTransform: "uppercase",
                              color: ACCENT,
                              marginBottom: "14px",
                            }}
                          >
                            {col.heading}
                          </p>
                        )}
                        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "3px" }}>
                          {col.links.map((link, li) => (
                            <li key={`${col.heading}-${li}`}>
                              <button
                                onClick={() => { navigate(link.path); setActiveMenu(null); }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  padding: "7px 10px",
                                  borderRadius: "10px",
                                  fontSize: "13.5px",
                                  fontWeight: 500,
                                  color: "rgba(26,46,37,0.7)",
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  width: "100%",
                                  textAlign: "left",
                                  transition: "background 0.18s, color 0.18s",
                                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                                }}
                                onMouseEnter={(e) => {
                                  const el = e.currentTarget as HTMLButtonElement;
                                  el.style.background = "rgba(107,142,122,0.09)";
                                  el.style.color = DARK;
                                }}
                                onMouseLeave={(e) => {
                                  const el = e.currentTarget as HTMLButtonElement;
                                  el.style.background = "none";
                                  el.style.color = "rgba(26,46,37,0.7)";
                                }}
                              >
                                <span style={{ color: ACCENT, fontSize: "8px", marginTop: "1px" }}>●</span>
                                {link.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                      );
                    })}

                    {/* Bottom strip */}
                    <div
                      style={{
                        gridColumn: "1 / -1",
                        borderTop: "1px solid rgba(0,0,0,0.06)",
                        paddingTop: "16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <span style={{ fontSize: "11px", color: "rgba(26,46,37,0.4)", fontWeight: 600 }}>
                        ✨ Trending:
                      </span>
                      {["Rosehip Oil", "Vitamin C serum", "Aloe toner"].map((tag) => (
                        <button
                          key={tag}
                          onClick={() => navigate("/articles")}
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "4px 12px",
                            borderRadius: "100px",
                            background: "rgba(107,142,122,0.1)",
                            color: ACCENT,
                            border: "none",
                            cursor: "pointer",
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            transition: "background 0.2s",
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(107,142,122,0.2)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(107,142,122,0.1)"; }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* ── Right: Actions ───────────────── */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: "0 0 auto", marginLeft: "auto" }}>

            {/* Search */}
            <button className="header-icon-btn" onClick={() => setSearchOpen(true)} title="Search">
              <SearchIcon />
            </button>

            {/* Notifications (logged-in only) */}
            {currentUser && <NotificationBell />}

            {/* Wishlist */}
            <button className="header-icon-btn hidden sm:flex" title="Saved Rituals" onClick={() => navigate(currentUser ? "/profile" : "/Login")}>
              <HeartIcon />
            </button>

            {/* Profile */}
            <button 
              className="header-icon-btn hidden sm:flex" 
              title={currentUser ? `Profile: ${currentUser.FirstName}` : "Profile"} 
              onClick={() => navigate(currentUser ? "/profile" : "/Login")}
            >
              {currentUser?.ProfilePicture ? (
                <img src={currentUser.ProfilePicture} alt="Avatar" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <UserIcon />
              )}
            </button>

            {/* Divider */}
            <div style={{ width: "1px", height: "24px", background: "rgba(0,0,0,0.1)", margin: "0 6px" }} className="hidden md:block" />

            {/* Subscribe CTA or User Name */}
            {currentUser ? (
              <div 
                className="hidden md:flex items-center gap-3 px-4 py-2 rounded-full border border-[#6B8E7A]/20 bg-[#6B8E7A]/5 cursor-pointer hover:bg-[#6B8E7A]/10 transition-all"
                onClick={() => navigate("/profile")}
              >
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#6B8E7A]">Aura Member</p>
                  <p className="text-xs font-bold text-[#1a2e25]">{currentUser.FirstName} {currentUser.LastName}</p>
                </div>
              </div>
            ) : (
              <button
                onClick={() => navigate("/Signup")}
                className="hidden md:flex items-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${ACCENT} 0%, #4a7060 100%)`,
                  color: "white",
                  border: "none",
                  borderRadius: "100px",
                  padding: "9px 22px",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                  boxShadow: `0 6px 20px rgba(107,142,122,0.35)`,
                  transition: "transform 0.22s, box-shadow 0.22s",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.transform = "translateY(-2px)";
                  el.style.boxShadow = "0 10px 28px rgba(107,142,122,0.45)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.transform = "translateY(0)";
                  el.style.boxShadow = "0 6px 20px rgba(107,142,122,0.35)";
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Join Free
              </button>
            )}

            {/* Hamburger */}
            <button
              className="header-icon-btn lg:hidden"
              style={{ marginLeft: "4px" }}
              onClick={() => setMobileOpen(true)}
            >
              <MenuIcon />
            </button>
          </div>
        </div>

        {/* ── Secondary Nav Bar (Desktop) ──────────── */}
        <div
          className="hidden lg:block"
          style={{
            borderTop: "1px solid rgba(0,0,0,0.05)",
            background: "rgba(250,249,246,0.5)",
            overflow: "hidden",
            maxHeight: scrolled ? "0" : "38px",
            opacity: scrolled ? 0 : 1,
            transition: "max-height 0.35s ease, opacity 0.3s ease",
          }}
        >
          <div
            className="max-w-[1600px] mx-auto px-10"
            style={{ height: "38px", display: "flex", alignItems: "center", gap: "24px" }}
          >
            <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(26,46,37,0.35)", letterSpacing: "0.1em" }}>
              QUICK ACCESS:
            </span>
            {[
              { label: "Morning Routine Guide", path: "/articles" },
              { label: "Best Natural Oils", path: "/ingredients" },
              { label: "DIY Face Masks", path: "/diy" },
              { label: "Skin Quiz", path: "/ai" },
              { label: "Ingredient Checker", path: "/ingredients" },
              { label: "Weekly Ritual Plan", path: "/explore" },
            ].map((item) => (

              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "rgba(26,46,37,0.5)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  transition: "color 0.2s",
                  whiteSpace: "nowrap",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  padding: "0",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = ACCENT; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(26,46,37,0.5)"; }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Search Overlay ───────────────────────── */}
      {searchOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(10,20,15,0.6)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: "18vh",
            paddingLeft: "16px",
            paddingRight: "16px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setSearchOpen(false); }}
        >
          <div
            className="search-drop w-full"
            style={{
              maxWidth: "680px",
              background: "white",
              borderRadius: "24px",
              boxShadow: "0 32px 80px rgba(0,0,0,0.22)",
              overflow: "hidden",
            }}
          >
            {/* Input */}
            <div style={{ display: "flex", alignItems: "center", padding: "20px 24px", gap: "14px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
              <SearchIcon />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rituals, ingredients, guides..."
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  fontSize: "1.1rem",
                  fontWeight: 500,
                  color: DARK,
                  background: "transparent",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              />
              <button
                onClick={() => setSearchOpen(false)}
                style={{ color: "rgba(0,0,0,0.35)", background: "none", border: "none", cursor: "pointer" }}
              >
                <CloseIcon />
              </button>
            </div>

            {/* Quick suggestions */}
            <div style={{ padding: "20px 24px" }}>
              <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", color: ACCENT, marginBottom: "14px" }}>
                POPULAR SEARCHES
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {[
                  "Rosehip oil", "Morning glow", "Aloe vera", "DIY face mask",
                  "Anti-aging routine", "Skin barrier", "Niacinamide", "Natural toner",
                ].map((term) => (
                  <button
                    key={term}
                    onClick={() => { navigate("/articles"); setSearchOpen(false); }}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "100px",
                      fontSize: "13px",
                      fontWeight: 600,
                      background: "rgba(107,142,122,0.08)",
                      color: "rgba(26,46,37,0.7)",
                      border: "1px solid rgba(107,142,122,0.15)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.background = "rgba(107,142,122,0.16)";
                      el.style.color = DARK;
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.background = "rgba(107,142,122,0.08)";
                      el.style.color = "rgba(26,46,37,0.7)";
                    }}
                  >
                    {term}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
                <button
                  onClick={() => { navigate("/ai"); setSearchOpen(false); }}
                  style={{
                    flex: 1,
                    padding: "14px",
                    borderRadius: "16px",
                    background: `linear-gradient(135deg, ${ACCENT}15 0%, rgba(74,112,96,0.1) 100%)`,
                    border: `1px solid ${ACCENT}30`,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  <p style={{ fontSize: "12px", fontWeight: 700, color: ACCENT }}>✨ Try AI Skin Guide</p>
                  <p style={{ fontSize: "11px", color: "rgba(26,46,37,0.5)", marginTop: "3px" }}>Get personalized recommendations</p>
                </button>
                <button
                  onClick={() => { navigate("/diy"); setSearchOpen(false); }}
                  style={{
                    flex: 1,
                    padding: "14px",
                    borderRadius: "16px",
                    background: "rgba(0,0,0,0.03)",
                    border: "1px solid rgba(0,0,0,0.07)",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  <p style={{ fontSize: "12px", fontWeight: 700, color: DARK }}>🌿 DIY Creator</p>
                  <p style={{ fontSize: "11px", color: "rgba(26,46,37,0.5)", marginTop: "3px" }}>Build your own ritual</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Drawer ────────────────────────── */}
      {mobileOpen && (
        <>
          {/* Overlay */}
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 150,
              background: "rgba(10,20,15,0.5)", backdropFilter: "blur(4px)",
            }}
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div
            className="drawer"
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 160,
              width: "min(85vw, 360px)",
              background: "white",
              boxShadow: "-20px 0 60px rgba(0,0,0,0.15)",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "20px 24px",
                borderBottom: "1px solid rgba(0,0,0,0.06)",
                background: `linear-gradient(135deg, ${DARK} 0%, #2d4a3e 100%)`,
              }}
            >
              <span
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1.3rem",
                  fontWeight: 700,
                  fontStyle: "italic",
                  color: "white",
                }}
              >
                Aura &amp; Earth
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                style={{ color: "rgba(255,255,255,0.7)", background: "none", border: "none", cursor: "pointer" }}
              >
                <CloseIcon />
              </button>
            </div>

            {/* Search bar in drawer */}
            <div style={{ padding: "16px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  background: "rgba(107,142,122,0.07)",
                  borderRadius: "12px",
                  padding: "10px 14px",
                }}
                onClick={() => { setMobileOpen(false); setSearchOpen(true); }}
              >
                <SearchIcon />
                <span style={{ fontSize: "13px", color: "rgba(26,46,37,0.45)", fontWeight: 500 }}>
                  Search rituals &amp; ingredients...
                </span>
              </div>
            </div>

            {/* Nav links */}
            <div style={{ padding: "8px 24px 16px", flex: 1 }}>
              {NAV_ITEMS.map((item) => (
                <div key={item.label}>
                  <div
                    className="mobile-link"
                    onClick={() => {
                      if (item.mega) {
                        setMobileExpanded(mobileExpanded === item.label ? null : item.label);
                      } else {
                        navigate(item.path);
                        setMobileOpen(false);
                      }
                    }}
                  >
                    <span>
                      {item.label}
                      {item.badge && <span className="badge">{item.badge}</span>}
                    </span>
                    {item.mega && (
                      <span style={{ transform: mobileExpanded === item.label ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.25s" }}>
                        <ChevronDown />
                      </span>
                    )}
                  </div>

                  {item.mega && mobileExpanded === item.label && (
                    <div style={{ padding: "6px 0 12px", display: "flex", flexDirection: "column" }}>
                      {item.mega.flatMap((col) => col.links).map((link, li) => (
                        <button
                          key={`${link.label}-${li}`}
                          className="mobile-sublink"
                          onClick={() => { navigate(link.path); setMobileOpen(false); }}
                        >
                          <span style={{ color: ACCENT, marginRight: "8px", fontSize: "8px" }}>●</span>
                          {link.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Drawer Footer */}
            <div
              style={{
                padding: "20px 24px",
                borderTop: "1px solid rgba(0,0,0,0.06)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <button
                onClick={() => { navigate("/Signup"); setMobileOpen(false); }}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "14px",
                  background: `linear-gradient(135deg, ${ACCENT} 0%, #4a7060 100%)`,
                  color: "white",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  letterSpacing: "0.04em",
                }}
              >
                Join Free — Subscribe
              </button>
              <button
                onClick={() => { navigate("/Login"); setMobileOpen(false); }}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "14px",
                  background: "rgba(26,46,37,0.05)",
                  color: DARK,
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                Sign In
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Header;
