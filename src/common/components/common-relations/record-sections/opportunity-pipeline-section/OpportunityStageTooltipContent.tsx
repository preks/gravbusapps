import React from 'react'
import { CheckCircleIcon, XCircleIcon } from '@phosphor-icons/react'
import type { Stage, StageCondition } from '@/components/stage-progression/types'

interface OpportunityStageTooltipContentProps {
  stage: Stage
  conditions: StageCondition[]
}

export const OpportunityStageTooltipContent: React.FC<OpportunityStageTooltipContentProps> = ({
  stage,
  conditions
}) => {
  // Sort conditions: incomplete (false) first, then completed (true)
  const sortedConditions = [...conditions].sort((a, b) => {
    if (a.isCompleted === b.isCompleted) return 0
    return a.isCompleted ? 1 : -1 // false comes before true
  })

  return (
    <div className="gba:max-w-[280px] gba:py-1">
      <div className="gba:text-popover-foreground gba:text-sm gba:font-semibold gba:mb-2 gba:pb-1.5 gba:border-b gba:border-border">
        {stage.value} Stage Conditions
      </div>
      <div>
        {sortedConditions.length > 0 ? (
          sortedConditions.map(condition => (
            <div key={condition.id} className="gba:flex gba:items-start gba:gap-2 gba:py-1 gba:text-xs">
              {condition.isCompleted ? (
                <CheckCircleIcon
                  size={12}
                  weight="fill"
                  className="gba:text-success"
                  style={{ marginTop: '2px', flexShrink: 0 }}
                />
              ) : (
                <XCircleIcon
                  size={12}
                  weight="fill"
                  className="gba:text-muted-foreground"
                  style={{ marginTop: '2px', flexShrink: 0 }}
                />
              )}
              <div className="gba:flex-1">
                <div
                  className={
                    condition.isCompleted
                      ? 'gba:text-success gba:font-medium'
                      : 'gba:text-popover-foreground gba:font-medium'
                  }
                  style={{ lineHeight: '1.3' }}
                >
                  {condition.title}
                </div>
                {condition.isCompleted && condition.completedBy && (
                  <div className="gba:text-muted-foreground gba:text-[10px] gba:mt-0.5">
                    Completed by: {condition.completedBy}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="gba:text-muted-foreground gba:text-xs gba:italic gba:text-center gba:py-2">
            No conditions configured for this stage
          </div>
        )}
      </div>
      {conditions.length > 0 && (
        <div className="gba:text-muted-foreground gba:text-[10px] gba:mt-2 gba:pt-1.5 gba:border-t gba:border-border gba:italic">
          Click stage to change • {conditions.filter(c => c.isCompleted).length}/{conditions.length} completed
        </div>
      )}
    </div>
  )
}
