/*
 * Workspace branding — deliberately one place to change. The design mockup
 * uses "Receptionly"; the real agency name is TBD, so everything renders
 * from these values (or the workspace_settings row, which overrides them —
 * see lib/server/settings.ts).
 */
export const BRANDING = {
  /** Product name shown in the sidebar header + breadcrumb root. */
  product: process.env.NEXT_PUBLIC_MC_PRODUCT_NAME ?? "Mission Control",
  /** Workspace / agency label under the product name. */
  workspace: process.env.NEXT_PUBLIC_MC_WORKSPACE_NAME ?? "Receptionly HQ",
  /** Legal company name (Settings → Workspace). */
  company: process.env.NEXT_PUBLIC_MC_COMPANY_NAME ?? "Receptionly, Inc.",
  /** Single letter mark in the sidebar logo tile. */
  mark: process.env.NEXT_PUBLIC_MC_MARK ?? "M",
} as const;
