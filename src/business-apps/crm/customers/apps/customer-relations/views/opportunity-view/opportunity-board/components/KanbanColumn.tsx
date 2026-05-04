import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { OpportunityCard } from './OpportunityCard'
import { formatCurrency } from '../lib/utils'
import type { Opportunity, Stage } from '../lib/types'
import { Empty } from 'antd'

interface BusinessAppContextProps {
  accessToken: string
  userInfo?: any
  employeeId?: string
  structureId?: string
}

interface KanbanColumnProps extends BusinessAppContextProps {
  stage: Stage
  opportunities: Opportunity[]
  sourceApp?: string
  isDraggedOver?: boolean
  isDragging?: boolean
  dragOverOpportunity?: string | null
  insertPosition?: 'before' | 'after' | null
  isQuickEditing?: boolean
}

export function KanbanColumn({
  stage,
  opportunities,
  sourceApp,
  isDraggedOver = false,
  isDragging = false,
  dragOverOpportunity = null,
  insertPosition = null,
  isQuickEditing = false
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: stage.id,
    data: {
      type: 'stage',
      stage
    }
  })

  return (
    <div
      ref={setNodeRef}
      className={`gba:shrink-0 gba:w-72 gba:h-[700px] gba:flex gba:flex-col gba:bg-gray-50 gba:dark:bg-gray-900 gba:rounded-md gba:shadow-sm gba:border gba:transition-all gba:duration-200 ${
        isDraggedOver && isDragging
          ? 'gba:border-blue-400 gba:border-2 gba:bg-blue-50 gba:dark:bg-blue-900/20 gba:shadow-lg gba:ring-2 gba:ring-blue-200 gba:ring-opacity-50'
          : 'gba:border-gray-200 gba:dark:border-gray-800'
      }`}
    >
      <div className="gba:p-3 gba:pb-0 gba:border-b gba:border-gray-100 gba:dark:border-gray-800">
        <div className="gba:flex gba:items-center gba:justify-between">
          <h3 className="gba:font-medium gba:text-sm" data-testid={`stage-title-${stage.id}`}>
            {stage.name}
          </h3>
        </div>

        <div className="gba:flex gba:justify-between gba:text-xs gba:text-gray-500 gba:dark:text-gray-400 gba:pt-1">
          <div>
            <span className="gba:font-medium" data-testid={`stage-total-${stage.id}`}>
              {formatCurrency(opportunities.reduce((sum, opp) => sum + (opp.estimatedAmount || 0), 0))}
            </span>
          </div>
          <div>
            <span className="gba:font-medium">{opportunities.length}</span>{' '}
            {opportunities.length === 1 ? 'deal' : 'deals'}
          </div>
        </div>
      </div>
      <div className="gba:flex-1 gba:overflow-y-auto gba:scroll-smooth gba:p-2 gba:h-[600px]">
        <SortableContext items={opportunities.map(op => op.id)} strategy={verticalListSortingStrategy}>
          <div className="gba:space-y-2">
            {opportunities.map((opportunity, index) => (
              <div key={opportunity.id}>
                {/* Show insertion indicator when dragging over this opportunity from another column */}
                {dragOverOpportunity === opportunity.id && insertPosition === 'before' && (
                  <div className="gba:h-0.5 gba:bg-blue-400 gba:rounded-full gba:shadow-lg gba:transition-all gba:duration-200 gba:animate-pulse gba:mb-2" />
                )}

                <OpportunityCard opportunity={opportunity} isQuickEditing={isQuickEditing} />

                {/* Show insertion indicator after this opportunity */}
                {dragOverOpportunity === opportunity.id && insertPosition === 'after' && (
                  <div className="gba:h-0.5 gba:bg-blue-400 gba:rounded-full gba:shadow-lg gba:transition-all gba:duration-200 gba:animate-pulse gba:mt-2" />
                )}
              </div>
            ))}

            {/* Drop indicator when dragging over empty column */}
            {isDraggedOver && isDragging && opportunities.length === 0 && (
              <div className="gba:flex gba:items-center gba:justify-center gba:h-20 gba:bg-blue-100 gba:dark:bg-blue-900/30 gba:border-2 gba:border-dashed gba:border-blue-400 gba:rounded-lg gba:transition-all gba:duration-200">
                <div className="gba:text-blue-600 gba:dark:text-blue-400 gba:text-sm gba:font-medium gba:flex gba:items-center gba:gap-2">
                  <svg className="gba:w-4 gba:h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Drop here
                </div>
              </div>
            )}

            {/* Drop indicator when dragging over column with cards */}
            {isDraggedOver && isDragging && opportunities.length > 0 && (
              <div className="gba:h-1 gba:bg-blue-400 gba:rounded-full gba:shadow-lg gba:transition-all gba:duration-200 gba:animate-pulse" />
            )}

            {opportunities.length === 0 && (!isDragging || !isDraggedOver) && (
              <div className="gba:text-center gba:py-4 gba:text-gray-500 gba:dark:text-gray-400">
                <Empty description="No opportunities" />
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}

export default KanbanColumn
