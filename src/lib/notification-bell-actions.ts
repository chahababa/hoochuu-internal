"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function markNotificationRead(notificationId: string): Promise<void> {
  const profile = await requireUser();
  const admin = createAdminClient();
  const { error } = await admin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", profile.id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead(): Promise<void> {
  const profile = await requireUser();
  const admin = createAdminClient();
  const { error } = await admin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", profile.id)
    .is("read_at", null);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
