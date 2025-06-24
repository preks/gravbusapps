import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useKanbanStore } from "../lib/kanban-store";
import { OpportunityCard } from "./OpportunityCard";
import { PlusOutlined } from "@ant-design/icons";
import { type Opportunity, type Stage } from "../lib/types";
import { formatCurrency } from "../lib/utils";

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
  const { setIsAddingOpportunity } = useKanbanStore();

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: stage.id,
      data: {
        type: "stage",
        stage,
      },
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Calculate stats directly from opportunities and stage probability
  // Previously used calculateColumnStats helper function

  // Stage editing is no longer needed with fixed stages

  const handleAddCard = () => {
    setIsAddingOpportunity(true);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="gba:shrink-0 gba:w-72 gba:h-full gba:flex gba:flex-col gba:bg-gray-50 gba:dark:bg-gray-900 gba:rounded-md gba:shadow-sm gba:border gba:border-gray-200 gba:dark:border-gray-800"
      {...attributes}
      {...listeners}
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
      <div className="gba:flex-1 gba:overflow-y-auto gba:scrollbar-hide gba:p-2">
        <div className="gba:space-y-2">
          {opportunities.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} />
          ))}

          <button
            onClick={handleAddCard}
            className="gba:w-full gba:mt-2 gba:py-2 gba:px-3 gba:border gba:border-dashed gba:border-gray-300 gba:rounded gba:flex gba:items-center gba:justify-center gba:text-gray-500 gba:hover:text-gray-700 gba:hover:border-gray-400 gba:dark:border-gray-700 gba:dark:text-gray-400 gba:dark:hover:text-gray-300 gba:dark:hover:border-gray-600"
          >
            <PlusOutlined style={{ marginRight: "4px" }} />
            Add Card
          </button>
        </div>
      </div>
    </div>
  );
}

export default KanbanColumn;
