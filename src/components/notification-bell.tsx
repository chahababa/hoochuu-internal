import "server-only";

import { createClient } from "@/lib/supabase/server";

import {
  NotificationBellClient,
  type BellNotification,
} from "@/components/notification-bell-client";

type Props = {
  userId: string;
};

export async function NotificationBell({ userId }: Props) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, module, type, severity, title, body, link, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const items = (data ?? []) as BellNotification[];

  return <NotificationBellClient userId={userId} initialNotifications={items} />;
}
