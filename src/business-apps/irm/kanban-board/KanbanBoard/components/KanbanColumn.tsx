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
      className="flex-shrink-0 w-72 h-full flex flex-col bg-gray-50 dark:bg-gray-900 rounded-md shadow-sm border border-gray-200 dark:border-gray-800"
      {...attributes}
      {...listeners}
    >
      <div className="p-3 pb-0 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">{stage.name}</h3>
          {isSalesManager && (
            <div className="flex gap-1">
              <button
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                onClick={handleEdit}
              >
                <EditOutlined style={{ fontSize: "12px" }} />
              </button>
              <button
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                onClick={handleDelete}
              >
                <DeleteOutlined style={{ fontSize: "12px" }} />
              </button>
            </div>
          )}
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 pt-1">
          <div>
            <span className="font-medium">
              {formatCurrency(stats.weightedValue)}
            </span>
          </div>
          <div>
            <span className="font-medium">{stats.count}</span>{" "}
            {stats.count === 1 ? "deal" : "deals"}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide p-2">
        <div className="space-y-2">
          {opportunities.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} />
          ))}

          <button
            onClick={handleAddCard}
            className="w-full mt-2 py-2 px-3 border border-dashed border-gray-300 rounded flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600"
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
