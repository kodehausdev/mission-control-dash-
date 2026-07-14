import { getWorkspaceSettings } from "@/lib/server/settings";
import { AcceptInviteForm } from "@/components/auth/accept-invite-form";

export const dynamic = "force-dynamic";

export default async function AcceptInvitePage() {
  const settings = await getWorkspaceSettings();
  return <AcceptInviteForm workspaceName={settings.workspaceName} />;
}
