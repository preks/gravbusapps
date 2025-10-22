import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatCurrency } from '../lib/utils'
import { CalendarOutlined, UserOutlined, HomeOutlined, TagOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useKanbanStore } from '../lib/kanban-store'
import { FIXED_STAGES } from '../lib/stages'
import type { Opportunity } from '../lib/types'

interface OpportunityCardProps {
  opportunity: Opportunity
  onCardClick?: (id: string) => void
}

export function OpportunityCard({ opportunity, onCardClick }: OpportunityCardProps) {
  const { selectOpportunity } = useKanbanStore()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: opportunity.id,
    data: {
      type: 'opportunity',
      opportunity
    }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  let formattedDate = ''
  if (opportunity.closeDate) {
    const closeDate = new Date(opportunity.closeDate)
    formattedDate = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(closeDate)
  }

  let formattedCreatedAt = ''
  if (opportunity.createdAt) {
    const createdDate = new Date(opportunity.createdAt)
    formattedCreatedAt = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(createdDate)
  }

  const amount = opportunity.estimatedAmount || 0
  const companyName = opportunity.account?.name || ''
  const ownerName = opportunity.ownerEmployee?.fullName || ''
  const stage = FIXED_STAGES.find(stage => stage.id === opportunity.stageId)
  const stageName = stage ? stage.name : ''

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!isDragging) {
      if (onCardClick) {
        onCardClick(opportunity.id)
      } else {
        selectOpportunity(opportunity.id)
      }
    }
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      onClick={handleClick}
      className={`gba:bg-hsl(var(--background)) gba:dark:bg-gray-800 gba:rounded-md gba:shadow-sm gba:border gba:border-gray-200 gba:dark:border-gray-700 gba:flex gba:flex-col gba:cursor-pointer ${
        isDragging ? 'gba:opacity-50' : ''
      }`}
    >
      <div className="gba:p-3 gba:space-y-2" data-testid={`opportunity-card-${opportunity.id}`}>
        <div>
          <h4 className="gba:font-medium gba:text-sm gba:line-clamp-2">
            <span className="gba:text-sm gba:font-medium gba:text-gray-900 gba:dark:text-gray-100">
              {opportunity.name}
            </span>
          </h4>
          <p className="gba:text-xs gba:text-gray-500 gba:dark:text-gray-400 gba:line-clamp-1 gba:mt-1">
            {companyName}
          </p>
          {stageName && <p className="gba:text-xs gba:text-gray-400 gba:font-medium gba:mt-1">{stageName}</p>}
        </div>

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

      <div className="gba:p-3 gba:pt-0 gba:border-t gba:border-gray-100 gba:dark:border-gray-800">
        {companyName && (
          <div className="gba:flex gba:items-center gba:text-xs gba:text-gray-500 gba:dark:text-gray-400 gba:mb-2">
            <HomeOutlined style={{ fontSize: '12px', marginRight: '4px' }} />
            {companyName}
          </div>
        )}

        <div className="gba:flex gba:justify-between gba:items-center">
          {ownerName && (
            <div className="gba:flex gba:items-center gba:text-xs gba:text-gray-500 gba:dark:text-gray-400">
              <UserOutlined style={{ fontSize: '12px', marginRight: '4px' }} />
              {ownerName}
            </div>
          )}

          {formattedCreatedAt && (
            <div className="gba:flex gba:items-center gba:text-xs gba:text-gray-500 gba:dark:text-gray-400 gba:ml-auto">
              <ClockCircleOutlined style={{ fontSize: '12px', marginRight: '4px' }} />
              {formattedCreatedAt}
            </div>
          )}
        </div>
      </div>

      {opportunity.tags && opportunity.tags.length > 0 && (
        <div className="gba:p-3 gba:pt-0 gba:flex gba:flex-wrap gba:gap-1 gba:border-t gba:border-gray-100 gba:dark:border-gray-800">
          {opportunity.tags.map(tag => (
            <span
              key={tag}
              className="gba:inline-flex gba:items-center gba:px-2 gba:py-0.5 gba:rounded gba:text-xs gba:font-medium gba:bg-gray-100 gba:text-gray-800 gba:dark:bg-gray-700 gba:dark:text-gray-300"
            >
              <TagOutlined style={{ fontSize: '12px', marginRight: '4px' }} />
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default OpportunityCard
