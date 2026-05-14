import Link from "next/link";
import { PropsWithChildren } from "react";

import { NavigationGroup, type NavigationLink } from "@/components/app-navigation";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { ImpersonationMenu } from "@/components/impersonation-menu";
import { NotificationBell } from "@/components/notification-bell";
import { SignOutButton } from "@/components/sign-out-button";
import { UserProfile } from "@/lib/auth";
import { getRoleLabel } from "@/lib/ui-labels";

type StoreOption = { id: string; name: string };

const inspectionLinks: NavigationLink[] = [
  { href: "/", label: "首頁", roles: ["owner", "manager", "leader"] },
  { href: "/inspection/new", label: "新增巡店", roles: ["owner", "manager"] },
  { href: "/inspection/history", label: "巡店紀錄", roles: ["owner", "manager", "leader"] },
  { href: "/inspection/improvements", label: "改善追蹤", roles: ["owner", "manager", "leader"] },
  { href: "/inspection/reports", label: "報表分析", roles: ["owner", "manager", "leader"] },
  { href: "/notifications", label: "通知中心", roles: ["owner", "manager", "leader"] },
];

const peopleAndItemLinks: NavigationLink[] = [
  { href: "/settings/staff", label: "組員管理", roles: ["owner", "manager", "leader"] },
  { href: "/settings/workstations", label: "工作站設定", roles: ["owner", "manager"] },
  { href: "/settings/items", label: "題目管理", roles: ["owner"] },
  { href: "/settings/focus-items", label: "標籤管理", roles: ["owner", "manager"] },
  { href: "/settings/release-announcements", label: "更新通知", roles: ["owner", "manager"] },
];

const bomLinks: NavigationLink[] = [
  { href: "/bom/cost-overview", label: "成本總覽", roles: ["owner", "manager"] },
  { href: "/bom/baselines", label: "成本基準", roles: ["owner", "manager"] },
  { href: "/bom/dishes", label: "餐點 BOM", roles: ["owner", "manager"] },
  { href: "/bom/semi-products", label: "半成品", roles: ["owner", "manager"] },
  { href: "/bom/ingredients", label: "食材／品項", roles: ["owner", "manager"] },
  { href: "/bom/purchase", label: "進貨紀錄", roles: ["owner", "manager"] },
  { href: "/bom/search", label: "BOM 搜尋", roles: ["owner", "manager"] },
  { href: "/bom/import", label: "批次匯入", roles: ["owner", "manager"] },
];

const bomSettingsLinks: NavigationLink[] = [
  { href: "/settings/bom/monthly-close", label: "月結鎖定", roles: ["owner", "manager"] },
  { href: "/settings/bom/backup", label: "BOM 備份", roles: ["owner"] },
  { href: "/settings/bom/audit-log", label: "BOM 操作紀錄", roles: ["owner", "manager"] },
];

const otherSettingsLinks: NavigationLink[] = [
  { href: "/settings/users", label: "帳號管理", roles: ["owner", "manager"] },
  { href: "/settings/stores", label: "店別管理", roles: ["owner"] },
  { href: "/settings/qa-cleanup", label: "測試資料清理", roles: ["owner"] },
  { href: "/audit", label: "操作紀錄", roles: ["owner", "manager"] },
];

export function AppShell({
  profile,
  pathname,
  stores,
  impersonationStoreName,
  children,
}: PropsWithChildren<{
  profile: UserProfile;
  pathname: string;
  stores: StoreOption[];
  impersonationStoreName: string | null;
}>) {
  const visibleInspectionLinks = profile.can_access_inspection
    ? inspectionLinks.filter((link) => link.roles.includes(profile.role))
    : [];
  const visiblePeopleAndItemLinks = profile.can_access_inspection
    ? peopleAndItemLinks.filter((link) => link.roles.includes(profile.role))
    : [];
  const visibleBomLinks = profile.can_access_bom
    ? bomLinks.filter((link) => link.roles.includes(profile.role))
    : [];
  const visibleBomSettingsLinks = profile.can_access_bom
    ? bomSettingsLinks.filter((link) => link.roles.includes(profile.role))
    : [];
  const visibleOtherSettingsLinks = otherSettingsLinks.filter((link) => link.roles.includes(profile.role));
  const isImpersonating = Boolean(profile.impersonating);
  const isRealOwner = (profile.impersonating?.realRole ?? profile.role) === "owner";

  return (
    <div className="min-h-screen">
      {isImpersonating ? (
        <ImpersonationBanner role={profile.role} storeName={impersonationStoreName} />
      ) : null}
      <header className="border-b-[3px] border-nb-ink bg-nb-bg">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="group inline-flex items-center gap-3 transition">
              <span className="inline-flex h-11 w-11 items-center justify-center bg-nb-yellow border-[2.5px] border-nb-ink shadow-nb-sm font-nbSerif text-xl font-black group-hover:-translate-y-0.5 group-hover:shadow-nb transition-all">
                巡
              </span>
              <span>
                <p className="nb-eyebrow">Warm Morning Ops</p>
                <h1 className="font-nbSerif text-2xl font-black text-nb-ink leading-tight">門市巡檢營運系統</h1>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell userId={profile.id} />
            <div className="flex items-center gap-3 bg-nb-paper border-[2.5px] border-nb-ink shadow-nb-sm px-4 py-2.5">
              <div className="text-right">
                <p className="font-bold text-sm text-nb-ink leading-tight">{profile.name || profile.email}</p>
                <p className="font-nbMono text-[11px] font-bold uppercase tracking-[0.18em] text-nb-ink/65 mt-0.5">
                  {getRoleLabel(profile.role)}
                </p>
              </div>
              {isRealOwner && !isImpersonating ? <ImpersonationMenu stores={stores} /> : null}
              <SignOutButton />
            </div>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl flex-col gap-3 px-4 pb-4">
          {visibleInspectionLinks.length > 0 ? (
            <NavigationGroup title="巡檢業務" eyebrow="Inspection" links={visibleInspectionLinks} initialPathname={pathname} />
          ) : null}
          {visiblePeopleAndItemLinks.length > 0 ? (
            <>
              <div className="h-[2px] w-full bg-nb-ink/20" aria-hidden="true" />
              <NavigationGroup title="組員與題目" eyebrow="People & Items" links={visiblePeopleAndItemLinks} initialPathname={pathname} />
            </>
          ) : null}
          {visibleBomLinks.length > 0 ? (
            <>
              <div className="h-[2px] w-full bg-nb-ink/20" aria-hidden="true" />
              <NavigationGroup title="BOM 成本管理" eyebrow="BOM Cost" links={visibleBomLinks} initialPathname={pathname} />
            </>
          ) : null}
          {visibleBomSettingsLinks.length > 0 ? (
            <>
              <div className="h-[2px] w-full bg-nb-ink/20" aria-hidden="true" />
              <NavigationGroup title="BOM 設定" eyebrow="BOM Settings" links={visibleBomSettingsLinks} initialPathname={pathname} />
            </>
          ) : null}
          {visibleOtherSettingsLinks.length > 0 ? (
            <>
              <div className="h-[2px] w-full bg-nb-ink/20" aria-hidden="true" />
              <NavigationGroup title="其他設定" eyebrow="Other Settings" links={visibleOtherSettingsLinks} initialPathname={pathname} />
            </>
          ) : null}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
