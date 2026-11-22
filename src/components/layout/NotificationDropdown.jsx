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
    tone: "border-[var(--slate-border)] bg-[var(--slate-tint)] text-[var(--slate-blue)]",
  },
  approval: {
    icon: ClipboardCheck,
    tone: "border-[var(--spruce-border)] bg-[var(--spruce-tint)] text-[var(--spruce)]",
  },
  system: {
    icon: Info,
    tone: "border-[var(--ochre-border)] bg-[var(--ochre-tint)] text-[var(--ochre)]",
  },
  info: {
    icon: Info,
    tone: "border-[var(--rule-strong)] bg-[var(--alabaster)] text-[var(--ink-soft)]",
  },
};

/**
 * Dropdown notifikasi internal bergaya Swiss Archival (handover, update status cuti, & pengingat kuota).
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
        className="btn btn-icon"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="notif-pip"
            aria-hidden="true"
            title={`${unreadCount} belum dibaca`}
          />
        )}
      </button>

      {isOpen && (
        <div
          id="notification-panel"
          className="absolute right-0 z-40 mt-2 w-[calc(100vw-2rem)] max-w-[360px] overflow-hidden rounded-[2px] border border-[var(--ink)] bg-[var(--paper-pure)] shadow-[0_14px_32px_rgba(25,24,22,0.16)] sm:w-[360px]"
        >
          {/* Header Panel */}
          <div className="flex items-center justify-between gap-2 border-b border-[var(--rule)] bg-[var(--paper)] px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[13px] font-semibold text-[var(--ink)]">
                  Kotak Notifikasi
                </h2>
                {unreadCount > 0 && (
                  <span className="tag tag-approved !py-0 !text-[10px]">
                    {unreadCount > 99 ? "99+" : unreadCount} Baru
                  </span>
                )}
                {isRefreshing && (
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin text-[var(--ink-muted)]"
                    aria-hidden="true"
                  />
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">
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
                className="btn btn-sm shrink-0"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tandai semua</span>
              </button>
            )}
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="flex items-center gap-2 border-b border-[var(--terracotta-border)] bg-[var(--terracotta-tint)] px-4 py-2 text-xs text-[var(--terracotta)]"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Daftar Notifikasi */}
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell
                  className="mx-auto h-6 w-6 text-[var(--ink-muted)]"
                  aria-hidden="true"
                />
                <p className="mt-2 text-xs font-semibold text-[var(--ink-soft)]">
                  Belum ada notifikasi
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">
                  Pemberitahuan handover &amp; pembaruan cuti akan tampil di
                  sini.
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
                    className={`notif-row w-full cursor-pointer text-left transition-colors duration-150 hover:bg-[var(--alabaster)] ${
                      item.isRead ? "bg-[var(--paper-pure)]" : "unread"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[2px] border ${config.tone}`}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-[12.5px] font-semibold leading-snug ${
                              item.isRead
                                ? "text-[var(--ink-soft)]"
                                : "text-[var(--ink)]"
                            }`}
                          >
                            {item.title}
                          </p>
                          {!item.isRead ? (
                            <span
                              className="mt-1 h-2 w-2 shrink-0 bg-[var(--spruce)]"
                              aria-label="Belum dibaca"
                            />
                          ) : (
                            <Check
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ink-muted)]"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-[var(--ink-soft)]">
                          {item.message}
                        </p>
                        <p className="mono mt-1 text-[10.5px] text-[var(--ink-muted)]">
                          {item.createdAtLabel}
                        </p>
                      </div>
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
