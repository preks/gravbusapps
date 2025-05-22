import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { formatCurrency } from "../lib/utils";
import { CalendarOutlined, UserOutlined, ClockCircleOutlined, HomeOutlined, TagOutlined } from "@ant-design/icons";
import { useKanbanStore } from "../lib/kanban-store";
import type { Opportunity } from "../lib/data";

interface OpportunityCardProps {
  opportunity: Opportunity;
}

function daysSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const { stages } = useKanbanStore();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: opportunity.id,
    data: {
      type: 'opportunity',
      opportunity,
    },
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  const currentStage = stages.find((stage) => stage.id === opportunity.stageId);

  let isRotting = false;
  let rottingDays = 0;
  let daysInStage = 0;

  if (opportunity.stageEnteredAt && currentStage?.rotting) {
    rottingDays = opportunity.rottingDays || currentStage.rottingDays;
    daysInStage = daysSince(opportunity.stageEnteredAt);
    isRotting = daysInStage >= rottingDays;
  }

  const lastActivityDate = new Date(opportunity.lastActivityAt);
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(lastActivityDate);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className={`bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="p-3 space-y-2">
        <div>
          <h4 className="font-medium text-sm line-clamp-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
              {isRotting && (
                <ClockCircleOutlined className="mr-1 text-red-500" title={`This opportunity has been in this stage for ${daysInStage} days (threshold: ${rottingDays} days)`} />
              )}
              {opportunity.title}
            </span>
          </h4>
          {opportunity.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">{opportunity.description}</p>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {formatCurrency(opportunity.value)}
          </span>
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <CalendarOutlined style={{ fontSize: '12px', marginRight: '4px' }} />
            {formattedDate}
          </div>
        </div>
      </div>
      <div className="p-3 pt-0 flex flex-wrap gap-2 border-t border-gray-100 dark:border-gray-800">
        {opportunity.company && (
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <HomeOutlined style={{ fontSize: '12px', marginRight: '4px' }} />
            {opportunity.company}
          </div>
        )}
        {opportunity.contact && (
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <UserOutlined style={{ fontSize: '12px', marginRight: '4px' }} />
            {opportunity.contact}
          </div>
        )}
        {opportunity.stageEnteredAt && (
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400" title="Days in current stage / Rotting threshold">
            <ClockCircleOutlined style={{ fontSize: '12px', marginRight: '4px', color: isRotting ? '#f5222d' : undefined }} />
            {daysInStage} / {rottingDays} days
          </div>
        )}
      </div>
      {opportunity.tags && opportunity.tags.length > 0 && (
        <div className="p-3 pt-0 flex flex-wrap gap-1 border-t border-gray-100 dark:border-gray-800">
          {opportunity.tags.map((tag) => (
            <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
              <TagOutlined style={{ fontSize: '12px', marginRight: '4px' }} />
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
