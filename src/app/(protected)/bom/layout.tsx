// Ported from Hoochuu-Bom-System/src/app/bom/layout.tsx (Phase 3+4d)
// The original BOM layout was just a generic container; this version replaces it
// with a BOM-access gate that runs once per BOM subtree.
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function BomLayout({
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
