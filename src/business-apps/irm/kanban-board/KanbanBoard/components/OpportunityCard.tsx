import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { formatCurrency, formatStage } from "../lib/utils";
import { CalendarOutlined, UserOutlined, HomeOutlined, TagOutlined, ClockCircleOutlined } from "@ant-design/icons";
import type { Opportunity } from "../lib/types";

interface OpportunityCardProps {
  opportunity: Opportunity;
}

// No longer needed as we're not tracking rotting opportunities

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
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

  // Format the date for display if it exists
  let formattedDate = "";
  if (opportunity.closeDate) {
    const closeDate = new Date(opportunity.closeDate);
    formattedDate = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(closeDate);
  }
  
  // Format created date for display if it exists
  let formattedCreatedAt = "";
  if (opportunity.createdAt) {
    const createdDate = new Date(opportunity.createdAt);
    formattedCreatedAt = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(createdDate);
  }
  
  // Get amount from estimatedAmount field
  const amount = opportunity.estimatedAmount || 0;
  
  // Get company name from account.name
  const companyName = opportunity.account?.name || '';
  
  // Get owner name from ownerEmployee.fullName
  const ownerName = opportunity.ownerEmployee?.fullName || '';
  
  // Get formatted stage name
  const stageName = opportunity.stage ? formatStage(opportunity.stage) : '';

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
      <div className="gba:p-3 gba:space-y-2" data-testid={`opportunity-card-${opportunity.id}`}>
        {/* Title/Name */}
        <div>
          <h4 className="gba:font-medium gba:text-sm gba:line-clamp-2">
            <span className="gba:text-sm gba:font-medium gba:text-gray-900 gba:dark:text-gray-100">
              {opportunity.name}
            </span>
          </h4>
          {/* Company name */}
          <p className="gba:text-xs gba:text-gray-500 gba:dark:text-gray-400 gba:line-clamp-1 gba:mt-1">
            {companyName}
          </p>
          {/* Stage name */}
          {stageName && (
            <p className="gba:text-xs gba:text-gray-400 gba:font-medium gba:mt-1">
              {stageName}
            </p>
          )}
        </div>

        {/* Amount and Date - large and prominent */}
        <div className="gba:flex gba:items-center gba:justify-between">
          <span className="gba:text-md gba:font-bold gba:text-gray-900 gba:dark:text-gray-100">
            {formatCurrency(amount)}
          </span>
          {formattedDate && (
            <div className="gba:flex gba:items-center gba:text-xs gba:text-gray-500 gba:dark:text-gray-400">
              <CalendarOutlined style={{ fontSize: '12px', marginRight: '4px' }} />
              {formattedDate}
            </div>
          )}
        </div>
      </div>

      {/* Company and Owner - separate section */}
      <div className="gba:p-3 gba:pt-0 gba:border-t gba:border-gray-100 gba:dark:border-gray-800">
        {/* Company row */}
        {companyName && (
          <div className="gba:flex gba:items-center gba:text-xs gba:text-gray-500 gba:dark:text-gray-400 gba:mb-2">
            <HomeOutlined style={{ fontSize: '12px', marginRight: '4px' }} />
            {companyName}
          </div>
        )}
        
        {/* Owner and date row */}
        <div className="gba:flex gba:justify-between gba:items-center">
          {/* Owner */}
          {ownerName && (
            <div className="gba:flex gba:items-center gba:text-xs gba:text-gray-500 gba:dark:text-gray-400">
              <UserOutlined style={{ fontSize: '12px', marginRight: '4px' }} />
              {ownerName}
            </div>
          )}
          
          {/* Created At - aligned to the right */}
          {formattedCreatedAt && (
            <div className="gba:flex gba:items-center gba:text-xs gba:text-gray-500 gba:dark:text-gray-400 gba:ml-auto">
              <ClockCircleOutlined style={{ fontSize: '12px', marginRight: '4px' }} />
              {formattedCreatedAt}
            </div>
          )}
        </div>
      </div>

      {/* Tags section */}
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
