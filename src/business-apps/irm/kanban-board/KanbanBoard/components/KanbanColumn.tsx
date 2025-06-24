import { useDroppable } from "@dnd-kit/core";
import { OpportunityCard } from "./OpportunityCard";
import { formatCurrency } from "../lib/utils";
import type { Opportunity, Stage } from "../lib/types";
import { Empty } from "antd";

interface BusinessAppContextProps {
  accessToken: string;
  userInfo?: any;
  employeeId?: string;
  structureId?: string;
}

interface KanbanColumnProps extends BusinessAppContextProps {
  stage: Stage;
  opportunities: Opportunity[];
}

export function KanbanColumn({ stage, opportunities }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: stage.id,
    data: {
      type: "stage",
      stage,
    },
  });

  // Calculate stats directly from opportunities and stage probability
  // Previously used calculateColumnStats helper function

  // Stage editing is no longer needed with fixed stages

  return (
    <div
      ref={setNodeRef}
      className="gba:shrink-0 gba:w-72 gba:h-full gba:flex gba:flex-col gba:bg-gray-50 gba:dark:bg-gray-900 gba:rounded-md gba:shadow-sm gba:border gba:border-gray-200 gba:dark:border-gray-800 gba:max-h-full"
    >
      <div className="gba:p-3 gba:pb-0 gba:border-b gba:border-gray-100 gba:dark:border-gray-800">
        <div className="gba:flex gba:items-center gba:justify-between">
          <h3 className="gba:font-medium gba:text-sm" data-testid={`stage-title-${stage.id}`}>{stage.name}</h3>
        </div>
        
        <div className="gba:flex gba:justify-between gba:text-xs gba:text-gray-500 gba:dark:text-gray-400 gba:pt-1">
          <div>
            <span className="gba:font-medium" data-testid={`stage-total-${stage.id}`}>
              {formatCurrency(opportunities.reduce((sum, opp) => sum + (opp.estimatedAmount || 0), 0))}
            </span>
          </div>
          <div>
            <span className="gba:font-medium">{opportunities.length}</span>{" "}
            {opportunities.length === 1 ? "deal" : "deals"}
          </div>
        </div>
      </div>
      <div className="gba:flex-1 gba:overflow-y-auto gba:p-2 gba:max-h-[calc(100vh-200px)]">
        <div className="gba:space-y-2">
          {opportunities.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} />
          ))}
          
          {opportunities.length === 0 && (
            <div className="gba:text-center gba:py-4 gba:text-gray-500 gba:dark:text-gray-400">
              <Empty description="No opportunities" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default KanbanColumn;
