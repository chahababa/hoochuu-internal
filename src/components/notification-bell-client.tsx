"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notification-bell-actions";
import { formatRelativeTime } from "@/lib/relative-time";
import { createClient } from "@/lib/supabase/client";

export type BellNotification = {
  id: string;
  module: "inspection" | "bom" | "system";
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

type Props = {
  userId: string;
  initialNotifications: BellNotification[];
};

export function NotificationBellClient({ userId, initialNotifications }: Props) {
  const [items, setItems] = useState<BellNotification[]>(initialNotifications);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const unreadCount = items.filter((n) => n.read_at === null).length;

  // Realtime: subscribe to INSERT on public.notifications filtered by user_id
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as BellNotification;
          setItems((prev) => [row, ...prev].slice(0, 20));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleMarkOne = useCallback(
    (id: string) => {
      // Optimistic
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
      );
      startTransition(async () => {
        try {
          await markNotificationRead(id);
        } catch {
          // Roll back on failure
          setItems((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read_at: null } : n)),
          );
        }
      });
    },
    [],
  );

  const handleMarkAll = useCallback(() => {
    const ts = new Date().toISOString();
    const previousState = items;
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? ts })));
    startTransition(async () => {
      try {
        await markAllNotificationsRead();
      } catch {
        setItems(previousState);
      }
    });
  }, [items]);

  const handleItemClick = useCallback(
    (n: BellNotification) => {
      if (n.read_at === null) {
        handleMarkOne(n.id);
      }
      if (n.link) {
        setOpen(false);
        router.push(n.link);
      }
    },
    [handleMarkOne, router],
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-11 w-11 items-center justify-center bg-nb-paper border-[2.5px] border-nb-ink shadow-nb-sm transition-all hover:-translate-y-0.5 hover:shadow-nb"
        aria-label={`通知 ${unreadCount > 0 ? `(${unreadCount} 則未讀)` : ""}`}
        aria-expanded={open}
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 inline-flex h-5 min-w-[20px] items-center justify-center bg-nb-red border-[2px] border-nb-ink px-1 font-nbMono text-[11px] font-bold leading-none text-nb-paper"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="通知中心"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[360px] max-w-[calc(100vw-32px)] bg-nb-paper border-[2.5px] border-nb-ink shadow-nb"
        >
          <div className="flex items-center justify-between border-b-[2px] border-nb-ink px-4 py-3">
            <div>
              <p className="nb-eyebrow">Notifications</p>
              <h2 className="font-nbSerif text-lg font-black leading-tight">
                通知 {unreadCount > 0 ? `(${unreadCount})` : ""}
              </h2>
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAll}
                className="font-nbMono text-[11px] font-bold uppercase tracking-[0.18em] underline decoration-2 underline-offset-4 hover:text-nb-red"
              >
                全部標已讀
              </button>
            ) : null}
          </div>

          <ul className="max-h-[400px] overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-nb-ink/60">目前沒有通知</li>
            ) : (
              items.map((n) => (
                <li
                  key={n.id}
                  className={`border-b border-nb-ink/15 last:border-b-0 ${
                    n.read_at === null ? "bg-nb-yellow/30" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleItemClick(n)}
                    className="flex w-full flex-col items-start gap-1 px-4 py-3 text-left hover:bg-nb-ink/5"
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <span className="font-bold text-sm text-nb-ink">{n.title}</span>
                      <span className="font-nbMono text-[10px] font-bold uppercase text-nb-ink/55 whitespace-nowrap">
                        {formatRelativeTime(n.created_at)}
                      </span>
                    </div>
                    {n.body ? (
                      <span className="text-xs text-nb-ink/75 line-clamp-2">{n.body}</span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>

          <div className="border-t-[2px] border-nb-ink px-4 py-3">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center font-nbMono text-[11px] font-bold uppercase tracking-[0.18em] underline decoration-2 underline-offset-4 hover:text-nb-red"
            >
              查看全部 →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
