import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store/store";
import { logoutUser } from "../store/user/user.action";
import { logout } from "../store/user/user.slice";
import NotificationBell from "./NotificationBell";
import Logo from "./Logo";
import { userInitials as initials } from "./UserAvatar";
import "./Header.css";

import { DARK } from "../styles/brand";
/* ─── Mega-menu data ─────────────────────────────────── */
const NAV_ITEMS = [
  {
    label: "Journal",
    path: "/journal",
    mega: null,
  },
  {
    label: "Concerns",
    path: "/explore",
    mega: null,
  },
  {
    label: "Ingredients",
    path: "/ingredients",
    mega: null,
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

/* ─── Icons ────────────────────────────────────────────── */
const SearchIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);
const HeartIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);
const UserIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const MenuIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
const CloseIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const ChevronDown = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/* ─── Component ─────────────────────────────────────── */
const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { currentUser } = useSelector((state: RootState) => state.user);

  const handleLogout = () => {
    // Best-effort server logout, then clear the session locally right away so
    // the redirect can't race the async thunk (Login bounces to /profile while
    // currentUser is still set otherwise).
    dispatch(logoutUser());
    dispatch(logout());
    setMobileOpen(false);
    navigate("/Login");
  };

  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  /* Scroll detection — hysteresis (enter at 40px, exit at 20px) so hovering
     right at one threshold during momentum/trackpad scroll can't flip
     `scrolled` back and forth every frame. */
  useEffect(() => {
    const handler = () =>
      setScrolled((prev) => (prev ? window.scrollY > 20 : window.scrollY > 40));
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  /* Scroll progress — the page scrollbar is hidden site-wide, so this hairline
     is the only remaining cue for "how far in am I / how much is left".
     Written straight to the node's transform rather than through state: at
     ~6800px of page a state-driven bar would re-render the whole header on
     every scroll frame. scaleX on a ref'd node stays on the compositor. */
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = progressRef.current;
      if (!el) return;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
      el.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  /* Focus search input when overlay opens */
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 100);
  }, [searchOpen]);

  /* Run a search: send the term to the Explore feed (which reads ?q=) and
     close the overlay. Empty terms just open the unfiltered feed. */
  const runSearch = (term: string) => {
    const q = term.trim();
    navigate(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore");
    setSearchOpen(false);
    setMobileOpen(false);
    setSearchQuery("");
  };

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

  return (
    <>
      {/* The "QUICK ACCESS" strip that used to sit here was removed: four of
          its six links duplicated the main nav directly below it, two of them
          ("Best Natural Oils" / "Ingredient Checker") pointed at the SAME url,
          and two more promised specific content but landed on generic index
          pages. A second nav row that says less than the first isn't worth
          38px above the fold. ── */}

      {/* ── Main Header ───────────────────────────── */}
      <header
        className="app-header-root font-sans"
        style={{
          background: scrolled
            ? "rgba(245,244,238,0.97)"
            : "rgba(245,244,238,0.92)",
          borderBottom: scrolled
            ? "1px solid rgba(0,0,0,0.09)"
            : "1px solid rgba(0,0,0,0.05)",
          boxShadow: scrolled ? "0 2px 24px rgba(0,0,0,0.07)" : "none",
        }}
      >
        {/* Scroll progress hairline — sits on the header's bottom border. */}
        <div className="app-header-progress-track" aria-hidden="true">
          <div ref={progressRef} className="app-header-progress-bar" />
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 h-[68px] grid grid-cols-[1fr_auto_1fr] items-center">
          {/* ── Left: Logo ───────────────────── */}
          <Logo onClick={() => navigate("/")} />

          {/* ── Center: Nav ──────────────────── */}
          <nav
            data-testid="desktop-nav"
            className="hidden lg:flex justify-center items-center gap-1.5"
          >
            {NAV_ITEMS.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => item.mega && handleMenuEnter(item.label)}
                onMouseLeave={handleMenuLeave}
              >
                <button
                  onClick={() => navigate(item.path)}
                  className={`app-header-nav-link ${location.pathname === item.path ? "active" : ""}`}
                  style={{
                    color:
                      location.pathname === item.path
                        ? DARK
                        : "rgba(45,42,38,0.6)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = DARK;
                  }}
                  onMouseLeave={(e) => {
                    if (location.pathname !== item.path)
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "rgba(45,42,38,0.6)";
                  }}
                >
                  {item.label}
                  {item.badge && (
                    <span className="app-header-badge">{item.badge}</span>
                  )}
                  {item.mega && <ChevronDown />}
                </button>

                {/* Mega Menu */}
                {item.mega && activeMenu === item.label && (
                  <div
                    className="app-header-mega-menu"
                    onMouseEnter={() => {
                      if (menuTimerRef.current)
                        clearTimeout(menuTimerRef.current);
                      setActiveMenu(item.label);
                    }}
                    onMouseLeave={handleMenuLeave}
                  >
                    {item.mega.map((col) => {
                      const headingPath = (col as { headingPath?: string })
                        .headingPath;
                      return (
                        <div key={col.heading}>
                          {headingPath ? (
                            <button
                              onClick={() => {
                                navigate(headingPath);
                                setActiveMenu(null);
                              }}
                              className="group/heading app-header-mega-heading app-header-mega-heading-btn"
                            >
                              {col.heading}
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                className="transition-transform duration-200 group-hover/heading:translate-x-0.5"
                              >
                                <path d="M5 12h14M12 5l7 7-7 7" />
                              </svg>
                            </button>
                          ) : (
                            <p className="app-header-mega-heading">
                              {col.heading}
                            </p>
                          )}
                          <ul className="list-none p-0 m-0 flex flex-col gap-[3px]">
                            {col.links.map((link, li) => (
                              <li key={`${col.heading}-${li}`}>
                                <button
                                  onClick={() => {
                                    navigate(link.path);
                                    setActiveMenu(null);
                                  }}
                                  className="app-header-mega-link"
                                  onMouseEnter={(e) => {
                                    const el =
                                      e.currentTarget as HTMLButtonElement;
                                    el.style.background = "rgba(61,91,79,0.09)";
                                    el.style.color = DARK;
                                  }}
                                  onMouseLeave={(e) => {
                                    const el =
                                      e.currentTarget as HTMLButtonElement;
                                    el.style.background = "none";
                                    el.style.color = "rgba(45,42,38,0.7)";
                                  }}
                                >
                                  <span className="text-sage text-[8px] mt-px">
                                    ●
                                  </span>
                                  {link.label}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}

                    {/* Bottom strip */}
                    <div className="col-span-full border-t border-[rgba(0,0,0,0.06)] pt-4 flex items-center gap-3">
                      <span className="text-[11px] text-[rgba(45,42,38,0.4)] font-semibold">
                        ✨ Trending:
                      </span>
                      {["Rosehip Oil", "Vitamin C serum", "Aloe toner"].map(
                        (tag) => (
                          <button
                            key={tag}
                            onClick={() => navigate("/articles")}
                            className="app-header-trending-tag"
                            onMouseEnter={(e) => {
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.background = "rgba(61,91,79,0.2)";
                            }}
                            onMouseLeave={(e) => {
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.background = "rgba(61,91,79,0.1)";
                            }}
                          >
                            {tag}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* ── Right: Actions ───────────────── */}
          <div className="flex items-center gap-1 justify-self-end col-start-3">
            {/* Notifications (logged-in only) */}
            {currentUser && <NotificationBell />}

            {/* Liked posts */}
            <button
              className="app-header-icon-btn hidden sm:flex"
              title="Liked Posts"
              aria-label="Liked posts"
              onClick={() =>
                navigate(currentUser ? "/profile?tab=liked" : "/Login")
              }
            >
              <HeartIcon />
            </button>

            {/* Sign-in shortcut, signed-out only. When signed in, the Aura
                Member pill below is the one and only profile control — this
                icon pointed at the same /profile page, so the header carried
                two buttons doing one job. Narrower widths lose nothing: the
                drawer (lg:hidden) already carries its own profile entry. */}
            {!currentUser && (
              <button
                className="app-header-icon-btn hidden sm:flex"
                title="Sign in"
                aria-label="Sign in"
                onClick={() => navigate("/Login")}
              >
                <UserIcon />
              </button>
            )}

            {/* Divider */}
            <div className="w-px h-6 bg-[rgba(0,0,0,0.1)] mx-1.5 hidden md:block" />

            {/* Subscribe CTA or User Name */}
            {currentUser ? (
              <button
                type="button"
                className="hidden md:flex flex-none items-center gap-2.5 max-w-[220px] pl-2 pr-3.5 py-1.5 rounded-full border border-[#3D5B4F]/20 bg-[#3D5B4F]/5 cursor-pointer hover:bg-[#3D5B4F]/10 transition-colors text-left"
                onClick={() => navigate("/profile")}
                title={`${currentUser.FirstName} ${currentUser.LastName}`.trim()}
              >
                {/* Avatar where there is one, initials otherwise — the same
                    order the drawer uses. This badge is now the only place the
                    header shows who you are, so it carries the photo the
                    removed profile icon used to. Never the full name: it is
                    user-supplied and a long one used to grow this pill until
                    it collided with the nav column. The badge is fixed-width;
                    the name truncates. */}
                <span className="flex-none grid place-items-center w-7 h-7 rounded-full overflow-hidden bg-[#3D5B4F] text-[#FCFAF7] text-[11px] font-bold leading-none">
                  {currentUser.ProfilePicture ? (
                    <img
                      src={currentUser.ProfilePicture}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials(currentUser.FirstName, currentUser.LastName)
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[9px] font-black uppercase tracking-[0.12em] leading-none text-[#3D5B4F]">
                    Aura Member
                  </span>
                  <span className="block mt-1 text-xs font-bold leading-none text-[#2D2A26] truncate">
                    {currentUser.FirstName} {currentUser.LastName}
                  </span>
                </span>
              </button>
            ) : (
              <button
                onClick={() => navigate("/Signup")}
                className="app-header-join-btn hidden md:flex items-center gap-2"
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.transform = "translateY(-2px)";
                  el.style.boxShadow = "0 10px 28px rgba(61,91,79,0.45)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.transform = "translateY(0)";
                  el.style.boxShadow = "0 6px 20px rgba(61,91,79,0.35)";
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Join Free
              </button>
            )}

            {/* Hamburger */}
            <button
              className="app-header-icon-btn flex lg:hidden ml-1"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              aria-controls="app-header-drawer"
              title="Menu"
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </header>

      {/* ── Search Overlay ───────────────────────── */}
      {searchOpen && (
        <div
          className="app-header-search-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSearchOpen(false);
          }}
        >
          <div className="app-header-search-drop w-full">
            {/* Input */}
            <div className="flex items-center py-5 px-6 gap-3.5 border-b border-[rgba(0,0,0,0.07)]">
              <button
                type="button"
                onClick={() => runSearch(searchQuery)}
                aria-label="Search"
                className="bg-transparent border-none cursor-pointer text-inherit p-0 flex items-center"
              >
                <SearchIcon />
              </button>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runSearch(searchQuery);
                  if (e.key === "Escape") setSearchOpen(false);
                }}
                placeholder="Search rituals, ingredients, guides..."
                className="flex-1 border-none outline-none text-[1.1rem] font-medium text-ink bg-transparent font-sans"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="text-[rgba(0,0,0,0.35)] bg-transparent border-none cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Quick suggestions */}
            <div className="py-5 px-6">
              <p className="text-[10px] font-extrabold tracking-[0.2em] text-sage mb-3.5">
                POPULAR SEARCHES
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Rosehip oil",
                  "Morning glow",
                  "Aloe vera",
                  "DIY face mask",
                  "Anti-aging routine",
                  "Skin barrier",
                  "Niacinamide",
                  "Natural toner",
                ].map((term) => (
                  <button
                    key={term}
                    onClick={() => runSearch(term)}
                    className="app-header-search-term"
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.background = "rgba(61,91,79,0.16)";
                      el.style.color = DARK;
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.background = "rgba(61,91,79,0.08)";
                      el.style.color = "rgba(45,42,38,0.7)";
                    }}
                  >
                    {term}
                  </button>
                ))}
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => {
                    navigate("/ai");
                    setSearchOpen(false);
                  }}
                  className="app-header-search-cta-ai"
                >
                  <p className="text-[12px] font-bold text-sage">
                    ✨ Try AI Skin Guide
                  </p>
                  <p className="text-[11px] text-[rgba(45,42,38,0.5)] mt-[3px]">
                    Get personalized recommendations
                  </p>
                </button>
                <button
                  onClick={() => {
                    navigate("/diy");
                    setSearchOpen(false);
                  }}
                  className="app-header-search-cta-diy"
                >
                  <p className="text-[12px] font-bold text-ink">
                    🌿 DIY Creator
                  </p>
                  <p className="text-[11px] text-[rgba(45,42,38,0.5)] mt-[3px]">
                    Build your own ritual
                  </p>
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
            className="app-header-drawer-overlay"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="app-header-drawer" id="app-header-drawer">
            {/* Drawer Header */}
            <div className="app-header-drawer-head">
              <Logo tone="dark" size="sm" />
              <button
                onClick={() => setMobileOpen(false)}
                className="text-[rgba(255,255,255,0.7)] bg-transparent border-none cursor-pointer"
                aria-label="Close menu"
                title="Close menu"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Search bar in drawer */}
            <div className="p-4 border-b border-[rgba(0,0,0,0.06)]">
              <div
                className="flex items-center gap-2.5 bg-[rgba(61,91,79,0.07)] rounded-xl py-2.5 px-3.5"
                onClick={() => {
                  setMobileOpen(false);
                  setSearchOpen(true);
                }}
              >
                <SearchIcon />
                <span className="text-[13px] text-[rgba(45,42,38,0.45)] font-medium">
                  Search rituals &amp; ingredients...
                </span>
              </div>
            </div>

            {/* Nav links */}
            <div className="pt-2 px-6 pb-4 flex-1">
              {NAV_ITEMS.map((item) => (
                <div key={item.label}>
                  <div
                    className="app-header-mobile-link"
                    onClick={() => {
                      if (item.mega) {
                        setMobileExpanded(
                          mobileExpanded === item.label ? null : item.label,
                        );
                      } else {
                        navigate(item.path);
                        setMobileOpen(false);
                      }
                    }}
                  >
                    <span>
                      {item.label}
                      {item.badge && (
                        <span className="app-header-badge">{item.badge}</span>
                      )}
                    </span>
                    {item.mega && (
                      <span
                        className="app-header-mobile-chevron"
                        style={{
                          transform:
                            mobileExpanded === item.label
                              ? "rotate(180deg)"
                              : "rotate(0)",
                        }}
                      >
                        <ChevronDown />
                      </span>
                    )}
                  </div>

                  {item.mega && mobileExpanded === item.label && (
                    <div className="pt-1.5 pb-3 flex flex-col">
                      {item.mega
                        .flatMap((col) => col.links)
                        .map((link, li) => (
                          <button
                            key={`${link.label}-${li}`}
                            className="app-header-mobile-sublink"
                            onClick={() => {
                              navigate(link.path);
                              setMobileOpen(false);
                            }}
                          >
                            <span className="text-sage mr-2 text-[8px]">●</span>
                            {link.label}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Drawer Footer */}
            <div className="py-5 px-6 border-t border-[rgba(0,0,0,0.06)] flex flex-col gap-2.5">
              {currentUser ? (
                <button
                  onClick={() => {
                    navigate("/profile");
                    setMobileOpen(false);
                  }}
                  className="app-header-drawer-profile"
                >
                  <span className="app-header-drawer-profile-avatar">
                    {currentUser.ProfilePicture ? (
                      <img src={currentUser.ProfilePicture} alt="Avatar" />
                    ) : (
                      /* Initials, matching the desktop member pill. */
                      <span className="text-[13px] font-bold">
                        {initials(currentUser.FirstName, currentUser.LastName)}
                      </span>
                    )}
                  </span>
                  <span className="app-header-drawer-profile-meta">
                    <span className="app-header-drawer-profile-role">
                      Aura Member
                    </span>
                    <span className="app-header-drawer-profile-name">
                      {currentUser.FirstName} {currentUser.LastName}
                    </span>
                  </span>
                </button>
              ) : null}
              {currentUser ? (
                <button
                  onClick={handleLogout}
                  className="app-header-drawer-logout"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Log Out
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      navigate("/Signup");
                      setMobileOpen(false);
                    }}
                    className="app-header-drawer-join"
                  >
                    Join Free — Subscribe
                  </button>
                  <button
                    onClick={() => {
                      navigate("/Login");
                      setMobileOpen(false);
                    }}
                    className="app-header-drawer-signin"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Header;
