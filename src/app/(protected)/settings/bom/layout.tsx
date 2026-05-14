// Phase 3+4d: BOM-settings access gate (mirrors (protected)/bom/layout.tsx)
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function BomSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireUser();
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("can_access_bom")
    .eq("id", profile.id)
    .maybeSingle();
  if (!data?.can_access_bom) {
    redirect("/forbidden?reason=bom");
  }
  return <>{children}</>;
}
