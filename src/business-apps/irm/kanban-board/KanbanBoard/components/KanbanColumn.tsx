import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useKanbanStore } from "../lib/kanban-store";
import { OpportunityCard } from "./OpportunityCard";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import {
  calculateColumnStats,
  currentUser,
  type Opportunity,
  type Stage,
} from "../lib/data";
import { formatCurrency } from "../lib/utils";

interface KanbanColumnProps {
  stage: Stage;
  opportunities: Opportunity[];
}

export function KanbanColumn({ stage, opportunities }: KanbanColumnProps) {
  const { setEditingStage, deleteStage, setIsAddingOpportunity } =
    useKanbanStore();
  const isSalesManager = currentUser.role === "sales_manager";

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

  const stats = calculateColumnStats(opportunities, stage.probability);

  const handleEdit = () => {
    setEditingStage(stage.id);
  };

  const handleDelete = () => {
    deleteStage(stage.id);
  };

  const handleAddCard = () => {
    setIsAddingOpportunity(true, stage.id);
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
          <h3 className="gba:font-medium gba:text-sm">{stage.name}</h3>
          {isSalesManager && (
            <div className="gba:flex gba:gap-1">
              <button
                className="gba:p-1 gba:text-gray-500 gba:hover:text-gray-700 gba:dark:text-gray-400 gba:dark:hover:text-gray-300"
                onClick={handleEdit}
              >
                <EditOutlined style={{ fontSize: "12px" }} />
              </button>
              <button
                className="gba:p-1 gba:text-gray-500 gba:hover:text-gray-700 gba:dark:text-gray-400 gba:dark:hover:text-gray-300"
                onClick={handleDelete}
              >
                <DeleteOutlined style={{ fontSize: "12px" }} />
              </button>
            </div>
          )}
        </div>
        <div className="gba:flex gba:justify-between gba:text-xs gba:text-gray-500 gba:dark:text-gray-400 gba:pt-1">
          <div>
            <span className="gba:font-medium">
              {formatCurrency(stats.weightedValue)}
            </span>
          </div>
          <div>
            <span className="gba:font-medium">{stats.count}</span>{" "}
            {stats.count === 1 ? "deal" : "deals"}
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
