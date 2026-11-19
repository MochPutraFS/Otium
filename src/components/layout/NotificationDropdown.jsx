"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  ClipboardCheck,
  Info,
  Users,
} from "lucide-react";

const TYPE_ICON_MAP = {
  handover: {
    icon: Users,
    tone: "bg-blue-50 text-blue-600",
  },
  approval: {
    icon: ClipboardCheck,
    tone: "bg-emerald-50 text-emerald-600",
  },
  system: {
    icon: Info,
    tone: "bg-amber-50 text-amber-600",
  },
  info: {
    icon: Info,
    tone: "bg-slate-100 text-slate-600",
  },
};

// Dropdown lonceng notifikasi (handover & update status cuti).
// Sementara masih simpan status sudah dibaca di state lokal browser.
export default function NotificationDropdown({
  initialNotifications = [],
  roleKey = "karyawan",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState(initialNotifications);
  const containerRef = useRef(null);

  useEffect(() => {
    setItems(initialNotifications);
    setIsOpen(false);
  }, [roleKey, initialNotifications]);

  useEffect(() => {
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
  }, []);

  const unreadCount = items.filter((item) => !item.isRead).length;

  function markAsRead(id) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );
  }

  function markAllAsRead() {
    setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Notifikasi (${unreadCount} belum dibaca)`}
        aria-expanded={isOpen}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Notifikasi Internal
              </h3>
              <p className="text-[11px] text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} notifikasi belum dibaca`
                  : "Semua notifikasi telah dibaca"}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Tandai semua
              </button>
            )}
          </div>

          <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-slate-500">
                Belum ada notifikasi baru.
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
                    onClick={() => markAsRead(item.id)}
                    className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 ${
                      item.isRead ? "bg-white" : "bg-blue-50/40"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.tone}`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-xs font-semibold ${
                            item.isRead ? "text-slate-700" : "text-slate-900"
                          }`}
                        >
                          {item.title}
                        </p>
                        {!item.isRead ? (
                          <span
                            className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600"
                            aria-label="Belum dibaca"
                          />
                        ) : (
                          <Check
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                        {item.message}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {item.createdAt}
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
