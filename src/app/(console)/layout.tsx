import { requireOperator } from "@/lib/server/operator";
import { getNotifications, getShellCounts, getSystemStatus } from "@/lib/server/shell";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { ShellUIProvider } from "@/components/shell/shell-ui";
import { CommandPalette } from "@/components/shell/command-palette";
import { NotifDrawer } from "@/components/shell/notif-drawer";

// Live badges + engine status on every navigation.
export const dynamic = "force-dynamic";

export default async function ConsoleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const operator = await requireOperator();
  const [counts, system, notifications] = await Promise.all([
    getShellCounts(),
    getSystemStatus(),
    getNotifications(),
  ]);

  return (
    <ShellUIProvider palette={<CommandPalette />} drawer={<NotifDrawer items={notifications} />}>
      <div className="flex h-screen overflow-hidden bg-bg text-fg">
        <Sidebar
          counts={counts}
          operator={{ name: operator.name, role: operator.roleLabel }}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar system={system} hasUnread={notifications.length > 0} />
          <div className="flex-1 overflow-auto bg-bg">{children}</div>
        </div>
      </div>
    </ShellUIProvider>
  );
}
