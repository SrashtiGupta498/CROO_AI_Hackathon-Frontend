import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Loader2, Inbox } from "lucide-react";
import {
  AppNotification,
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notification";

const ACCENT = "#6B8E7A";
const DARK = "#1a2e25";

// Small relative-time formatter (no external dependency).
const timeAgo = (iso?: string): string => {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

const TYPE_EMOJI: Record<string, string> = {
  new_post: "📝",
  post_like: "❤️",
  comment: "💬",
  follow_author: "🌿",
  system: "🔔",
};

const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    try {
      setUnread(await getUnreadCount());
    } catch {
      /* silent — auth/network hiccup shouldn't spam the header */
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await getNotifications());
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Couldn't load notifications.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll the unread count on mount and every 45s.
  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, 45000);
    return () => clearInterval(t);
  }, [refreshCount]);

  // Load the list whenever the panel opens.
  useEffect(() => {
    if (open) loadList();
  }, [open, loadList]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleItemClick = async (n: AppNotification) => {
    if (!n.isRead) {
      setItems((prev) =>
        prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)),
      );
      setUnread((c) => Math.max(0, c - 1));
      try {
        await markNotificationRead(n._id);
      } catch {
        /* optimistic — ignore failure */
      }
    }
    setOpen(false);
    if (n.postId) navigate(`/article/${n.postId}`);
  };

  const handleMarkAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnread(0);
    try {
      await markAllNotificationsRead();
    } catch {
      /* optimistic — ignore failure */
    }
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        className="header-icon-btn"
        title="Notifications"
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
        style={{ position: "relative" }}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: "4px",
              right: "4px",
              minWidth: "16px",
              height: "16px",
              padding: "0 4px",
              borderRadius: "100px",
              background: "linear-gradient(135deg, #e0654a, #c2452f)",
              color: "white",
              fontSize: "9px",
              fontWeight: 800,
              lineHeight: "16px",
              textAlign: "center",
              boxShadow: "0 2px 6px rgba(192,69,47,0.5)",
            }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 12px)",
            right: 0,
            width: "min(92vw, 380px)",
            background: "white",
            borderRadius: "18px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.05)",
            zIndex: 300,
            overflow: "hidden",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 18px",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <p style={{ fontWeight: 800, color: DARK, fontSize: "14px", margin: 0 }}>
              Notifications
              {unread > 0 && (
                <span style={{ color: ACCENT, fontWeight: 700 }}> · {unread} new</span>
              )}
            </p>
            <button
              onClick={handleMarkAll}
              disabled={unread === 0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "11px",
                fontWeight: 700,
                color: unread === 0 ? "rgba(0,0,0,0.25)" : ACCENT,
                background: "none",
                border: "none",
                cursor: unread === 0 ? "default" : "pointer",
                fontFamily: "inherit",
              }}
            >
              <CheckCheck size={13} /> Mark all read
            </button>
          </div>

          {/* Body */}
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            {loading && (
              <div style={{ padding: "32px", display: "flex", justifyContent: "center", color: ACCENT }}>
                <Loader2 className="animate-spin" size={22} />
              </div>
            )}

            {!loading && error && (
              <p style={{ padding: "28px 18px", textAlign: "center", color: "#c2452f", fontSize: "13px" }}>
                {error}
              </p>
            )}

            {!loading && !error && items.length === 0 && (
              <div style={{ padding: "40px 18px", textAlign: "center", color: "rgba(26,46,37,0.45)" }}>
                <Inbox size={28} style={{ margin: "0 auto 10px" }} />
                <p style={{ fontSize: "13px", fontWeight: 600, margin: 0 }}>You're all caught up</p>
              </div>
            )}

            {!loading && !error &&
              items.map((n) => (
                <button
                  key={n._id}
                  onClick={() => handleItemClick(n)}
                  style={{
                    display: "flex",
                    gap: "12px",
                    width: "100%",
                    textAlign: "left",
                    padding: "14px 18px",
                    border: "none",
                    borderBottom: "1px solid rgba(0,0,0,0.05)",
                    background: n.isRead ? "white" : "rgba(107,142,122,0.07)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "background 0.18s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(107,142,122,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = n.isRead
                      ? "white"
                      : "rgba(107,142,122,0.07)";
                  }}
                >
                  <span style={{ fontSize: "18px", flexShrink: 0, lineHeight: 1.3 }}>
                    {TYPE_EMOJI[n.type] || "🔔"}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: 700,
                        color: DARK,
                        marginBottom: "2px",
                      }}
                    >
                      {n.title}
                    </span>
                    {n.message && (
                      <span
                        style={{
                          display: "block",
                          fontSize: "12px",
                          color: "rgba(26,46,37,0.6)",
                          lineHeight: 1.5,
                        }}
                      >
                        {n.message}
                      </span>
                    )}
                    <span style={{ fontSize: "10.5px", color: "rgba(26,46,37,0.4)", marginTop: "4px", display: "block" }}>
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                  {!n.isRead && (
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: ACCENT,
                        flexShrink: 0,
                        marginTop: "5px",
                      }}
                    />
                  )}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
