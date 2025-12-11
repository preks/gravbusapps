/**
 * Active Experts Bar
 *
 * Shows chips for all active experts in the conversation
 * Displayed below the conversation header
 */

import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { X } from 'lucide-react'
import type { ActiveExpert } from '../hooks/useConversationExperts'

interface ActiveExpertsBarProps {
  experts: ActiveExpert[]
  onRemoveExpert: (expertId: string) => void
  'data-testid'?: string
}

export const ActiveExpertsBar: React.FC<ActiveExpertsBarProps> = ({
  experts,
  onRemoveExpert,
  'data-testid': testId = 'active-experts-bar'
}) => {
  if (experts.length === 0) return null

  return (
    <div className="gba:px-4 gba:py-2 gba:border-b gba:border-border gba:bg-muted/20" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
        <span className="gba:text-xs gba:text-muted-foreground gba:font-medium">Active Experts:</span>
        {experts.map(expert => (
          <div
            key={expert.expertId}
            className="gba:group gba:relative"
            data-testid={`${testId}-expert-${expert.expertId}`}
          >
            <div
              className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-2 gba:py-1 gba:pr-1 gba:rounded-full gba:text-xs gba:font-medium gba:border gba:bg-background gba:transition-all group-hover:gba:border-primary/50"
              style={{
                borderColor: expert.color || '#1890ff',
                color: expert.color || '#1890ff'
              }}
            >
              {/* Avatar */}
              <div
                className="gba:w-4 gba:h-4 gba:rounded gba:flex gba:items-center gba:justify-center gba:text-[10px] gba:font-bold gba:text-primary-foreground"
                style={{
                  backgroundColor: expert.color || '#1890ff'
                }}
              >
                {expert.avatar || expert.expertName.charAt(0).toUpperCase()}
              </div>

              {/* Name */}
              <span className="gba:text-xs gba:font-medium">{expert.expertName}</span>

              {/* Remove button */}
              <Button
                size="icon"
                variant="ghost"
                className="gba:h-4 gba:w-4 gba:p-0 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity"
                onClick={() => onRemoveExpert(expert.expertId)}
                data-testid={`${testId}-remove-${expert.expertId}`}
              >
                <X className="gba:w-3 gba:h-3" />
              </Button>
            </div>

            {/* Tooltip on hover */}
            <div className="gba:absolute gba:bottom-full gba:left-1/2 gba:-translate-x-1/2 gba:mb-2 gba:hidden group-hover:gba:block gba:z-50">
              <div className="gba:bg-popover gba:text-popover-foreground gba:px-3 gba:py-2 gba:rounded-lg gba:shadow-lg gba:border gba:border-border gba:text-xs gba:whitespace-nowrap">
                {expert.specialty}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
