import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Loader2, Inbox } from "lucide-react";
import { formatDate } from "../utils/datetime";
import {
  AppNotification,
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notification";
import "./NotificationBell.css";


import { ACCENT } from "../styles/brand";
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
  return formatDate(iso);
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
  const openRef = useRef(false);
  openRef.current = open;

  const refreshCount = useCallback(async () => {
    try {
      setUnread(await getUnreadCount());
    } catch {
      /* silent — auth/network hiccup shouldn't spam the header */
    }
  }, []);

  const loadList = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      setItems(await getNotifications());
      if (silent) setError(null);
    } catch (err: any) {
      if (!silent) {
        setError(
          err?.response?.data?.message || "Couldn't load notifications.",
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Poll the unread count on mount and every 45s; while the panel is open,
  // silently refresh the list too so new items appear without reopening.
  useEffect(() => {
    refreshCount();
    const t = setInterval(() => {
      refreshCount();
      if (openRef.current) loadList(true);
    }, 45000);
    return () => clearInterval(t);
  }, [refreshCount, loadList]);

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
    <div ref={wrapRef} className="relative">
      <button
        className="app-header-icon-btn relative"
        title="Notifications"
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="notif-bell-count">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-bell-panel">
          {/* Header */}
          <div className="flex items-center justify-between py-4 px-[18px] border-b border-[rgba(0,0,0,0.06)]">
            <p className="font-extrabold text-ink text-[14px] m-0">
              Notifications
              {unread > 0 && (
                <span className="text-sage font-bold"> · {unread} new</span>
              )}
            </p>
            <button
              onClick={handleMarkAll}
              disabled={unread === 0}
              className="notif-bell-markall"
              style={{
                color: unread === 0 ? "rgba(0,0,0,0.25)" : ACCENT,
                cursor: unread === 0 ? "default" : "pointer",
              }}
            >
              <CheckCheck size={13} /> Mark all read
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[60vh] overflow-y-auto">
            {loading && (
              <div className="p-8 flex justify-center text-sage">
                <Loader2 className="animate-spin" size={22} />
              </div>
            )}

            {!loading && error && (
              <p className="py-7 px-[18px] text-center text-[#c2452f] text-[13px]">
                {error}
              </p>
            )}

            {!loading && !error && items.length === 0 && (
              <div className="py-10 px-[18px] text-center text-[rgba(45,42,38,0.45)]">
                <Inbox size={28} className="mx-auto mb-2.5" />
                <p className="text-[13px] font-semibold m-0">You're all caught up</p>
              </div>
            )}

            {!loading && !error &&
              items.map((n) => (
                <button
                  key={n._id}
                  onClick={() => handleItemClick(n)}
                  className="notif-bell-item"
                  style={{
                    background: n.isRead ? "white" : "rgba(61,91,79,0.07)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(61,91,79,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = n.isRead
                      ? "white"
                      : "rgba(61,91,79,0.07)";
                  }}
                >
                  <span className="text-[18px] shrink-0 leading-[1.3]">
                    {TYPE_EMOJI[n.type] || "🔔"}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-bold text-ink mb-0.5">
                      {n.title}
                    </span>
                    {n.message && (
                      <span className="block text-[12px] text-[rgba(45,42,38,0.6)] leading-[1.5]">
                        {n.message}
                      </span>
                    )}
                    <span className="text-[10.5px] text-[rgba(45,42,38,0.4)] mt-1 block">
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-sage shrink-0 mt-[5px]" />
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
