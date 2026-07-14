import { BRANDING } from "@/lib/branding";

/** Logo + product/workspace label used on the pre-auth screens (login, accept-invite). */
export function BrandHeader({ workspaceName }: { workspaceName: string }) {
  return (
    <div className="mb-6 flex items-center gap-[10px]">
      <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-accent text-[15px] font-bold text-white shadow-[0_2px_8px_rgba(108,92,231,.4)]">
        {BRANDING.mark}
      </div>
      <div className="flex flex-col">
        <span className="text-[15px] font-semibold tracking-[-.01em]">{BRANDING.product}</span>
        <span className="text-[11px] text-faint">{workspaceName}</span>
      </div>
    </div>
  );
}
