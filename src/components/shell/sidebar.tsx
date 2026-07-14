"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BRANDING } from "@/lib/branding";
import { supabaseBrowser } from "@/lib/supabase/browser";
import {
  IconAiHealth,
  IconAnalytics,
  IconBilling,
  IconClients,
  IconConversations,
  IconDashboard,
  IconLeads,
  IconLogout,
  IconSettings,
  IconSupport,
  IconTrials,
} from "./icons";

export type SidebarCounts = {
  clients: number;
  leads: number;
  trials: number;
  supportOpen: number;
  aiDegraded: boolean;
};

export type OperatorInfo = {
  name: string;
  role: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function NavItem({
  href,
  icon,
  label,
  active,
  trailing,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-[9px] rounded-[7px] px-2 py-[6px] font-medium ${
        active ? "bg-accent/16 text-fg" : "text-soft hover:bg-white/5"
      }`}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {trailing}
    </Link>
  );
}

function SectionLabel({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return (
    <div
      className={`px-2 pb-1 text-[10px] font-semibold uppercase tracking-[.09em] text-label ${
        first ? "pt-2" : "pt-3"
      }`}
    >
      {children}
    </div>
  );
}

export function Sidebar({
  counts,
  operator,
}: {
  counts: SidebarCounts;
  operator: OperatorInfo;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (href: string) =>
    href === "/clients" ? pathname.startsWith("/clients") : pathname.startsWith(href);

  const signOut = async () => {
    const sb = supabaseBrowser();
    await sb?.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex w-[216px] flex-none flex-col border-r border-white/6 bg-raised">
      <div className="flex items-center gap-[9px] px-[14px] pb-[14px] pt-4">
        <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-accent text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(108,92,231,.4)]">
          {BRANDING.mark}
        </div>
        <div className="flex flex-col">
          <span className="text-[13px] font-semibold tracking-[-.01em]">{BRANDING.product}</span>
          <span className="text-[10px] text-faint">{BRANDING.workspace}</span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-px overflow-y-auto px-2 pb-2 pt-[2px]">
        <SectionLabel first>Overview</SectionLabel>
        <NavItem href="/dashboard" icon={<IconDashboard />} label="Dashboard" active={isActive("/dashboard")} />

        <SectionLabel>Customers</SectionLabel>
        <NavItem
          href="/clients"
          icon={<IconClients />}
          label="Clients"
          active={isActive("/clients")}
          trailing={
            counts.clients > 0 ? (
              <span className="font-mono text-[10px] text-faint">{counts.clients}</span>
            ) : undefined
          }
        />
        <NavItem
          href="/leads"
          icon={<IconLeads />}
          label="Leads"
          active={isActive("/leads")}
          trailing={
            counts.leads > 0 ? (
              <span className="rounded-[5px] bg-accent/18 px-[5px] py-px text-[10px] font-semibold text-lav">
                {counts.leads}
              </span>
            ) : undefined
          }
        />
        <NavItem
          href="/trials"
          icon={<IconTrials />}
          label="Trials"
          active={isActive("/trials")}
          trailing={
            counts.trials > 0 ? (
              <span className="rounded-[5px] bg-amber/15 px-[5px] py-px text-[10px] font-semibold text-amber">
                {counts.trials}
              </span>
            ) : undefined
          }
        />

        <SectionLabel>Revenue</SectionLabel>
        <NavItem href="/billing" icon={<IconBilling />} label="Billing" active={isActive("/billing")} />

        <SectionLabel>Operations</SectionLabel>
        <NavItem
          href="/support"
          icon={<IconSupport />}
          label="Support"
          active={isActive("/support")}
          trailing={
            counts.supportOpen > 0 ? (
              <span className="rounded-[5px] bg-red/15 px-[5px] py-px text-[10px] font-semibold text-red">
                {counts.supportOpen}
              </span>
            ) : undefined
          }
        />
        <NavItem
          href="/conversations"
          icon={<IconConversations />}
          label="Conversations"
          active={isActive("/conversations")}
        />
        <NavItem
          href="/ai-health"
          icon={<IconAiHealth />}
          label="AI Health"
          active={isActive("/ai-health")}
          trailing={
            counts.aiDegraded ? (
              <span className="mc-pulse h-[6px] w-[6px] rounded-full bg-amber" />
            ) : undefined
          }
        />

        <SectionLabel>Insights</SectionLabel>
        <NavItem href="/analytics" icon={<IconAnalytics />} label="Analytics" active={isActive("/analytics")} />
      </nav>

      <div className="flex flex-col gap-px border-t border-white/6 p-2">
        <NavItem href="/settings" icon={<IconSettings />} label="Settings" active={isActive("/settings")} />
        <div className="flex items-center gap-[9px] px-2 pb-1 pt-2">
          <div className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-deep text-[11px] font-semibold text-white">
            {initials(operator.name)}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs font-medium">{operator.name}</span>
            <span className="text-[10px] text-faint">{operator.role}</span>
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="flex h-6 w-6 flex-none cursor-pointer items-center justify-center rounded-md text-faint hover:bg-white/6 hover:text-soft"
          >
            <IconLogout />
          </button>
        </div>
      </div>
    </div>
  );
}
