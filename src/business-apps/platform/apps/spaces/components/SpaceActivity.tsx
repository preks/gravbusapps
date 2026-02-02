/**
 * SpaceActivity - Activity feed component
 *
 * Simple activity list following NEWWORK design system
 */

import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { FileText, Edit3, Share2, MessageCircle, Plus, Activity } from 'lucide-react'
import type { SpaceActivity as SpaceActivityType } from '../types/space.types'

export interface SpaceActivityProps {
  activities: SpaceActivityType[]
  isLoading?: boolean
  'data-testid'?: string
}

const activityConfig: Record<string, { icon: typeof FileText; label: string }> = {
  created: { icon: Plus, label: 'created' },
  edited: { icon: Edit3, label: 'edited' },
  shared: { icon: Share2, label: 'shared' },
  commented: { icon: MessageCircle, label: 'commented on' }
}

export const SpaceActivity: React.FC<SpaceActivityProps> = ({
  activities,
  isLoading = false,
  'data-testid': testId = 'space-activity'
}) => {
  if (isLoading) {
    return (
      <div className="gba:space-y-3" data-testid={testId}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="gba:flex gba:gap-3 gba:animate-pulse">
            <div className="gba:w-8 gba:h-8 gba:rounded-md gba:bg-muted/50" />
            <div className="gba:flex-1 gba:space-y-2">
              <div className="gba:h-4 gba:bg-muted/50 gba:rounded gba:w-3/4" />
              <div className="gba:h-3 gba:bg-muted/50 gba:rounded gba:w-1/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="gba:text-center gba:py-8" data-testid={testId}>
        <Activity className="gba:w-8 gba:h-8 gba:text-muted-foreground/40 gba:mx-auto gba:mb-2" />
        <p className="gba:text-sm gba:text-muted-foreground">No activity yet</p>
        <p className="gba:text-xs gba:text-muted-foreground/70 gba:mt-1">Activity will appear as content is modified</p>
      </div>
    )
  }

  return (
    <div className="gba:space-y-1" data-testid={testId}>
      {activities.map(activity => {
        const config = activityConfig[activity.action] || activityConfig.edited
        const Icon = config.icon

        return (
          <div
            key={activity.id}
            className="gba:flex gba:gap-3 gba:p-2 gba:rounded-md gba:transition-colors hover:gba:bg-muted/30"
            data-testid={`${testId}-item-${activity.id}`}
          >
            {/* Icon */}
            <div className="gba:w-8 gba:h-8 gba:rounded-md gba:bg-muted gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
              <Icon className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
            </div>

            {/* Content */}
            <div className="gba:flex-1 gba:min-w-0">
              <p className="gba:text-sm gba:text-foreground">
                <span className="gba:font-medium">{activity.userId}</span>
                <span className="gba:text-muted-foreground"> {config.label} </span>
                <span className="gba:font-medium">{activity.entityType}</span>
              </p>
              <p className="gba:text-xs gba:text-muted-foreground">
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default SpaceActivity
