import { requireOperator } from "@/lib/server/operator";
import { getLeadsBoard } from "@/lib/server/leads";
import { LeadsBoardView } from "@/components/leads/leads-board";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  await requireOperator();
  const board = await getLeadsBoard();

  return (
    <div className="flex h-full flex-col gap-4 px-[26px] pb-8 pt-[22px]">
      <LeadsBoardView
        columns={board.columns}
        pipelineCents={board.pipelineCents}
        demoWinRatePct={board.demoWinRatePct}
      />
    </div>
  );
}
