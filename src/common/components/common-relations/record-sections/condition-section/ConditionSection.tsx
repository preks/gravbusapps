import React, { useMemo, useState, useCallback, memo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Badge, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@newwork/nw-design-system'
import { QuestionIcon, CheckIcon, XIcon, CalendarBlankIcon, TimerIcon, UserCircleIcon } from '@phosphor-icons/react'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import type { AppActionCommonProps } from '@/common/hooks/useAppActionData'
import { getSalesPipelineStageBadgeVariant } from '@/common/utils/badgeUtils'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

interface ConditionSectionProps extends Partial<BusinessAppContextProps> {
  opportunity?: any
  stageConditionStatuses?: any[]
  'data-testid'?: string
  stageConditionActionProps?: Omit<AppActionCommonProps, 'accessToken'>
}

interface TransformedCondition {
  id: string
  stageConditionStatusId: string
  title: string
  description: string
  isCompleted: boolean
  generateTask: boolean
  checkedType: string
  deadlineAt: string | null
  completedAt: string | null
  completedBy: string | null
}

interface ConditionCardProps {
  condition: TransformedCondition
  isHovered: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  accessToken: string
  contextsArray: FlowContextName[]
  externalContextData: { stageConditionStatusId: string }
}

// Helper function - extracted outside to prevent recreation
const getEmployeeName = (employee: any): string => {
  if (!employee) return 'System'
  return employee?.displayName || `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || 'System'
}

// Memoized individual condition card component
const ConditionCard = memo<ConditionCardProps>(
  ({ condition, isHovered, onMouseEnter, onMouseLeave, accessToken, contextsArray, externalContextData }) => {
    return (
      <div
        key={condition.stageConditionStatusId}
        className="gba:p-4 gba:rounded-lg gba:border gba:border-gray-200 gba:bg-white hover:gba:bg-gray-50 gba:transition-colors"
      >
        <div className="gba:flex gba:items-start gba:gap-2">
          <AppActionMenu
            data-testid={`stage-condition-status-icon-${condition.stageConditionStatusId}`}
            contextsArray={contextsArray}
            externalContextData={externalContextData}
            prefixDataTestId="stage-condition-status-icon"
            accessToken={accessToken}
            emptyStateBehavior="disable"
            deferMainContextRequestsUntilClick={true}
            autoExecuteSingleAction={true}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            <span className="gba:flex-shrink-0 gba:inline-flex gba:items-center gba:cursor-pointer">
              {(() => {
                if (isHovered) {
                  return condition.isCompleted ? (
                    <XIcon size={24} weight="fill" className="gba:text-warning" />
                  ) : (
                    <CheckIcon size={24} weight="fill" className="gba:text-success" />
                  )
                }
                return condition.isCompleted ? (
                  <CheckIcon size={24} weight="fill" className="gba:text-success" />
                ) : (
                  <XIcon size={24} weight="fill" className="gba:text-muted-foreground" />
                )
              })()}
            </span>
          </AppActionMenu>
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
            <h4 className="gba:text-sm gba:font-semibold gba:text-gray-800 gba:leading-5 gba:my-0">
              {condition.title}
            </h4>
            {condition.description && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="gba:flex-shrink-0 gba:cursor-help gba:inline-flex gba:items-center">
                    <QuestionIcon size={24} weight="regular" className="gba:text-gray-400" />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="gba:max-w-xs">
                  <p className="gba:text-sm">{condition.description}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          {condition.deadlineAt && (
            <div className="gba:hidden gba:lg:flex gba:items-center gba:flex-shrink-0 gba:text-xs gba:text-gray-500 gba:bg-gray-50 gba:px-3 gba:py-1.5 gba:rounded-md gba:border">
              <CalendarBlankIcon size={20} weight="regular" className="gba:text-gray-400 gba:mr-1.5" />
              <span>{new Date(condition.deadlineAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        {condition.deadlineAt && (
          <div className="gba:hidden gba:sm:block gba:lg:hidden gba:mt-2 gba:ml-8 gba:flex gba:items-center gba:text-xs gba:text-gray-500">
            <CalendarBlankIcon size={20} weight="regular" className="gba:text-gray-400 gba:mr-1.5" />
            <span>{new Date(condition.deadlineAt).toLocaleDateString()}</span>
          </div>
        )}

        {condition.isCompleted && (condition.completedBy || condition.completedAt) && (
          <div className="gba:mt-3 gba:ml-8 gba:inline-block gba:px-3 gba:py-1.5 gba:bg-green-100 gba:border gba:border-green-300 gba:rounded-full gba:text-xs gba:text-green-800">
            <div className="gba:font-medium">
              {condition.completedAt && (
                <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                  <div className="gba:flex gba:items-center gba:gap-1.5">
                    <CalendarBlankIcon size={18} weight="regular" />
                    <span>
                      {new Date(condition.completedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-1.5">
                    <TimerIcon size={18} weight="regular" />
                    <span>
                      {new Date(condition.completedAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              )}
              {condition.completedBy && (
                <div className="gba:flex gba:items-center gba:gap-1.5 gba:mt-1">
                  <UserCircleIcon size={18} weight="regular" />
                  <span>{condition.completedBy}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  },
  // Custom comparison to prevent unnecessary re-renders
  (prevProps, nextProps) => {
    return (
      prevProps.condition.stageConditionStatusId === nextProps.condition.stageConditionStatusId &&
      prevProps.condition.isCompleted === nextProps.condition.isCompleted &&
      prevProps.condition.completedAt === nextProps.condition.completedAt &&
      prevProps.condition.completedBy === nextProps.condition.completedBy &&
      prevProps.isHovered === nextProps.isHovered &&
      prevProps.accessToken === nextProps.accessToken
    )
  }
)

ConditionCard.displayName = 'ConditionCard'

const ConditionSection: React.FC<ConditionSectionProps> = memo(
  ({ opportunity, stageConditionStatuses = [], stageConditionActionProps, ...context }) => {
    const [hoveredConditionId, setHoveredConditionId] = useState<string | null>(null)

    // Memoize mouse handlers
    const handleConditionMouseEnter = useCallback((id: string) => {
      setHoveredConditionId(id)
    }, [])

    const handleConditionMouseLeave = useCallback(() => {
      setHoveredConditionId(null)
    }, [])

    // Memoize contexts array
    const conditionContextsArray = useMemo(
      () => stageConditionActionProps?.contextsArray || [],
      [stageConditionActionProps?.contextsArray]
    )

    // Memoize transformation function
    const transformStageConditionStatusToUI = useCallback((statusData: any): TransformedCondition => {
      const conditionEntry = statusData.opportunityPipelineStageCondition
      const config = statusData.configSnapshot || conditionEntry?.objectValue || {}
      const approvedBy = getEmployeeName(statusData.completedByEmployee)
      const checkedType = config.check_type === 'MANUAL' ? 'User' : 'Automated'

      return {
        id: conditionEntry?.code || statusData.id,
        stageConditionStatusId: statusData.id,
        title: conditionEntry?.value || 'Unknown Condition',
        description: config.description || 'No description available',
        isCompleted: statusData.completed || false,
        generateTask: config.generate_task || config.generateTask || false,
        checkedType,
        deadlineAt: statusData.deadlineAt,
        completedAt: statusData.completedAt,
        completedBy: statusData.completedByEmployee ? approvedBy : null
      }
    }, [])

    // Memoize filtered and sorted conditions - this is the key optimization
    const sortedStageConditions = useMemo(() => {
      const currentStageId = opportunity?.opportunityPipelineStage?.id
      if (!currentStageId || !stageConditionStatuses?.length) {
        return []
      }

      // Filter conditions for current stage
      const currentStageConditionStatuses = stageConditionStatuses.filter(
        s => s.opportunityPipelineStageCondition?.parentEntryId === currentStageId
      )

      // Transform to UI format
      const stageConditions = currentStageConditionStatuses.map(transformStageConditionStatusToUI)

      // Sort: incomplete first, then completed (stable sort to prevent flickering)
      return [...stageConditions].sort((a, b) => {
        if (a.isCompleted === b.isCompleted) return 0
        return a.isCompleted ? 1 : -1
      })
    }, [stageConditionStatuses, opportunity?.opportunityPipelineStage?.id, transformStageConditionStatusToUI])

    const accessToken = (context as BusinessAppContextProps).accessToken

    return (
      <TooltipProvider>
        <div className="gba:w-full gba:space-y-3">
          <div className="gba:flex gba:justify-center gba:p-3 gba:bg-gray-50 gba:rounded-lg gba:border">
            <Badge variant={getSalesPipelineStageBadgeVariant(opportunity?.opportunityPipelineStage)}>
              {opportunity?.opportunityPipelineStage?.value || 'No Stage'}
            </Badge>
          </div>

          <div className="gba:space-y-3">
            {sortedStageConditions.length > 0 ? (
              sortedStageConditions.map(condition => (
                <ConditionCard
                  key={condition.stageConditionStatusId}
                  condition={condition}
                  isHovered={hoveredConditionId === condition.stageConditionStatusId}
                  onMouseEnter={() => handleConditionMouseEnter(condition.stageConditionStatusId)}
                  onMouseLeave={handleConditionMouseLeave}
                  accessToken={accessToken}
                  contextsArray={conditionContextsArray}
                  externalContextData={{ stageConditionStatusId: condition.stageConditionStatusId }}
                />
              ))
            ) : (
              <div className="gba:text-center gba:py-8 gba:text-gray-500">
                <div className="gba:flex gba:justify-center gba:mb-3">
                  <QuestionIcon size={48} weight="regular" />
                </div>
                <p className="gba:text-sm gba:font-medium">No stage conditions configured</p>
                <p className="gba:text-xs gba:mt-1.5 gba:text-gray-400">
                  Stage conditions will appear here when configured for the current pipeline stage
                </p>
              </div>
            )}
          </div>
        </div>
      </TooltipProvider>
    )
  }
)

ConditionSection.displayName = 'ConditionSection'

// Static properties for SectionWrapper
;(ConditionSection as any).sectionTitle = 'Stage Conditions'

export default ConditionSection
