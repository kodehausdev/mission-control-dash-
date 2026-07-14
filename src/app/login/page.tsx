import { getWorkspaceSettings } from "@/lib/server/settings";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const settings = await getWorkspaceSettings();
  return <LoginForm workspaceName={settings.workspaceName} />;
}
