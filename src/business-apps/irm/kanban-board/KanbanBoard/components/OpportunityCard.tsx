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
      className={`gba:bg-white gba:dark:bg-gray-800 gba:rounded-md gba:shadow-sm gba:border gba:border-gray-200 gba:dark:border-gray-700 gba:flex gba:flex-col ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="gba:p-3 gba:space-y-2">
        <div>
          <h4 className="gba:font-medium gba:text-sm gba:line-clamp-2">
            <span className="gba:text-sm gba:font-medium gba:text-gray-900 gba:dark:text-gray-100 gba:flex gba:items-center">
              {isRotting && (
                <ClockCircleOutlined className="gba:mr-1 gba:text-red-500" title={`This opportunity has been in this stage for ${daysInStage} days (threshold: ${rottingDays} days)`} />
              )}
              {opportunity.title}
            </span>
          </h4>
          {opportunity.description && (
            <p className="gba:text-xs gba:text-gray-500 gba:dark:text-gray-400 gba:line-clamp-2 gba:mt-1">{opportunity.description}</p>
          )}
        </div>
        <div className="gba:flex gba:items-center gba:justify-between">
          <span className="gba:text-sm gba:font-medium gba:text-gray-900 gba:dark:text-gray-100">
            {formatCurrency(opportunity.value)}
          </span>
          <div className="gba:flex gba:items-center gba:text-xs gba:text-gray-500 gba:dark:text-gray-400">
            <CalendarOutlined style={{ fontSize: '12px', marginRight: '4px' }} />
            {formattedDate}
          </div>
        </div>
      </div>
      <div className="gba:p-3 gba:pt-0 gba:flex gba:flex-wrap gba:gap-2 gba:border-t gba:border-gray-100 gba:dark:border-gray-800">
        {opportunity.company && (
          <div className="gba:flex gba:items-center gba:text-xs gba:text-gray-500 gba:dark:text-gray-400">
            <HomeOutlined style={{ fontSize: '12px', marginRight: '4px' }} />
            {opportunity.company}
          </div>
        )}
        {opportunity.contact && (
          <div className="gba:flex gba:items-center gba:text-xs gba:text-gray-500 gba:dark:text-gray-400">
            <UserOutlined style={{ fontSize: '12px', marginRight: '4px' }} />
            {opportunity.contact}
          </div>
        )}
        {opportunity.stageEnteredAt && (
          <div className="gba:flex gba:items-center gba:text-xs gba:text-gray-500 gba:dark:text-gray-400" title="Days in current stage / Rotting threshold">
            <ClockCircleOutlined style={{ fontSize: '12px', marginRight: '4px', color: isRotting ? '#f5222d' : undefined }} />
            {daysInStage} / {rottingDays} days
          </div>
        )}
      </div>
      {opportunity.tags && opportunity.tags.length > 0 && (
        <div className="gba:p-3 gba:pt-0 gba:flex gba:flex-wrap gba:gap-1 gba:border-t gba:border-gray-100 gba:dark:border-gray-800">
          {opportunity.tags.map((tag) => (
            <span key={tag} className="gba:inline-flex gba:items-center gba:px-2 gba:py-0.5 gba:rounded gba:text-xs gba:font-medium gba:bg-gray-100 gba:text-gray-800 gba:dark:bg-gray-700 gba:dark:text-gray-300">
              <TagOutlined style={{ fontSize: '12px', marginRight: '4px' }} />
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default OpportunityCard;
