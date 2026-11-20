"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bell,
  Check,
  CheckCheck,
  ClipboardCheck,
  Info,
  Loader2,
  Users,
} from "lucide-react";

const TYPE_ICON_MAP = {
  handover: {
    icon: Users,
    tone: "border-blue-200 bg-blue-50 text-[#1D4ED8]",
  },
  approval: {
    icon: ClipboardCheck,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  system: {
    icon: Info,
    tone: "border-amber-200 bg-amber-50 text-amber-700",
  },
  info: {
    icon: Info,
    tone: "border-stone-200 bg-[#F4F2EC] text-slate-700",
  },
};

/**
 * Dropdown notifikasi internal (handover, update status cuti, & pengingat kuota).
 * Terhubung langsung ke PostgreSQL melalui GET & PATCH /api/notifications.
 */
export default function NotificationDropdown({
  initialNotifications = [],
  initialUnreadCount = 0,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    setItems(initialNotifications);
    setUnreadCount(initialUnreadCount);
  }, [initialNotifications, initialUnreadCount]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleOutsideClick(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  async function refreshNotifications() {
    setIsRefreshing(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/notifications", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Gagal memuat notifikasi terbaru.");
      }
      const data = await response.json();
      if (Array.isArray(data.notifications)) {
        setItems(data.notifications);
      }
      if (typeof data.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
      }
    } catch {
      setErrorMessage("Tidak dapat menyinkronkan notifikasi terbaru.");
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleToggleOpen() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      refreshNotifications();
    }
  }

  async function markAsRead(notification) {
    if (notification.isRead) return;

    const prevItems = items;
    const prevUnread = unreadCount;

    setErrorMessage("");
    setItems((prev) =>
      prev.map((item) =>
        item.id === notification.id ? { ...item, isRead: true } : item
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: notification.id }),
      });

      if (!response.ok) {
        throw new Error("Gagal memperbarui notifikasi.");
      }

      const data = await response.json();
      if (typeof data.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
      }
    } catch {
      setItems(prevItems);
      setUnreadCount(prevUnread);
      setErrorMessage("Gagal menandai notifikasi sebagai dibaca.");
    }
  }

  async function markAllAsRead() {
    if (unreadCount === 0 || isUpdatingAll) return;

    const prevItems = items;
    const prevUnread = unreadCount;

    setIsUpdatingAll(true);
    setErrorMessage("");
    setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });

      if (!response.ok) {
        throw new Error("Gagal memperbarui semua notifikasi.");
      }

      const data = await response.json();
      if (typeof data.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
      }
    } catch {
      setItems(prevItems);
      setUnreadCount(prevUnread);
      setErrorMessage("Gagal menandai semua notifikasi.");
    } finally {
      setIsUpdatingAll(false);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleToggleOpen}
        aria-label={`Notifikasi (${unreadCount} belum dibaca)`}
        aria-expanded={isOpen}
        aria-controls="notification-panel"
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-stone-200 bg-white text-slate-700 transition-colors duration-150 hover:border-stone-300 hover:bg-[#F4F2EC]/60 hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A]"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-600 px-1 font-mono text-[10px] font-bold tabular-nums text-white ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id="notification-panel"
          className="absolute right-0 z-40 mt-2 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg sm:w-96"
        >
          {/* Header Panel */}
          <div className="flex items-center justify-between gap-2 border-b border-stone-200 bg-[#F4F2EC]/50 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-[#0F172A]">
                  Notifikasi Internal
                </h2>
                {isRefreshing && (
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin text-slate-500"
                    aria-hidden="true"
                  />
                )}
              </div>
              <p className="text-[11px] text-slate-600">
                {unreadCount > 0
                  ? `${unreadCount} notifikasi belum dibaca`
                  : "Semua notifikasi telah dibaca"}
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={isUpdatingAll}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-[#0F172A] transition-colors duration-150 hover:bg-[#F4F2EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Tandai semua
              </button>
            )}
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Daftar Notifikasi */}
          <div className="max-h-80 divide-y divide-stone-200/80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell
                  className="mx-auto h-6 w-6 text-slate-400"
                  aria-hidden="true"
                />
                <p className="mt-2 text-xs font-medium text-slate-700">
                  Belum ada notifikasi
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Pemberitahuan handover &amp; pembaruan cuti akan tampil di sini.
                </p>
              </div>
            ) : (
              items.map((item) => {
                const config =
                  TYPE_ICON_MAP[item.type] || TYPE_ICON_MAP.info;
                const Icon = config.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => markAsRead(item)}
                    className={`flex w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left transition-colors duration-150 hover:bg-[#F4F2EC]/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0F172A] ${
                      item.isRead ? "bg-white" : "bg-blue-50/40"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${config.tone}`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-xs font-semibold ${
                            item.isRead ? "text-slate-700" : "text-[#0F172A]"
                          }`}
                        >
                          {item.title}
                        </p>
                        {!item.isRead ? (
                          <span
                            className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#1D4ED8]"
                            aria-label="Belum dibaca"
                          />
                        ) : (
                          <Check
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                        {item.message}
                      </p>
                      <p className="mt-1 text-[11px] tabular-nums text-slate-500">
                        {item.createdAtLabel}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
