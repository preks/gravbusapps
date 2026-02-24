/**
 * BuildPlanTab - Read-only view of the agreed build plan shown after build completion.
 * Displays the user summary and each component with its actual build outcome.
 */

import React from 'react'
import { CheckCircle2, XCircle, MinusCircle, Clock, RotateCcw, Box } from 'lucide-react'
import { cn } from '@newwork/nw-design-system'
import type { ComponentSpec, BuildStatus } from '../../types/components'
import type { UserSummary, BuildAnalysis } from '../../types/build'
import { typeIcons, getComponentDescription } from '../widgets/buildPlanReview/buildPlanReview.utils'

interface BuildPlanTabProps {
  components: ComponentSpec[]
  userSummary?: UserSummary
  analysis?: BuildAnalysis
  prompt?: string
}

interface StatusConfig {
  icon: React.ElementType
  label: string
  className: string
}

const STATUS_CONFIG: Partial<Record<BuildStatus, StatusConfig>> = {
  completed: { icon: CheckCircle2, label: 'Built', className: 'gba:text-success' },
  reused: { icon: RotateCcw, label: 'Reused', className: 'gba:text-info' },
  error: { icon: XCircle, label: 'Failed', className: 'gba:text-destructive' },
  skipped: { icon: MinusCircle, label: 'Skipped', className: 'gba:text-muted-foreground' },
  cancelled: { icon: MinusCircle, label: 'Cancelled', className: 'gba:text-muted-foreground' },
  pending: { icon: Clock, label: 'Pending', className: 'gba:text-muted-foreground' },
  building: { icon: Clock, label: 'Building', className: 'gba:text-muted-foreground' }
}

const ComponentBuildItem: React.FC<{ component: ComponentSpec }> = ({ component }) => {
  const TypeIcon = typeIcons[component.type] || Box
  const statusConfig = STATUS_CONFIG[component.status]
  const StatusIcon = statusConfig?.icon ?? Clock

  return (
    <div
      className={cn(
        'gba:flex gba:items-start gba:gap-2.5 gba:py-2.5 gba:px-3 gba:rounded-lg gba:border gba:border-border gba:bg-secondary/40',
        component.status === 'error' && 'gba:border-destructive/30 gba:bg-destructive-secondary/20'
      )}
    >
      {/* Status indicator — fixed width so all rows align vertically */}
      <div
        className={cn(
          'gba:flex gba:items-center gba:gap-1 gba:w-20 gba:shrink-0 gba:mt-0.5',
          statusConfig?.className ?? 'gba:text-muted-foreground'
        )}
      >
        <StatusIcon className="gba:w-3.5 gba:h-3.5 gba:shrink-0" />
        <span className="gba:text-xs gba:font-medium gba:leading-tight">{statusConfig?.label ?? component.status}</span>
      </div>

      {/* Component type icon */}
      <TypeIcon className="gba:w-[18px] gba:h-[18px] gba:mt-0.5 gba:shrink-0 gba:text-foreground" />

      {/* Name + description */}
      <div className="gba:flex-1 gba:min-w-0">
        <div className="gba:flex gba:items-baseline gba:gap-2">
          <span className="gba:text-sm gba:font-medium gba:text-foreground gba:leading-tight gba:shrink-0">
            {component.name}
          </span>
          <span className="gba:text-xs gba:text-muted-foreground gba:truncate gba:flex-1">
            {getComponentDescription(component)}
          </span>
        </div>
        {component.status === 'error' && component.errorMessage && (
          <p className="gba:text-xs gba:text-destructive gba:mt-1 gba:leading-snug">{component.errorMessage}</p>
        )}
      </div>
    </div>
  )
}

export const BuildPlanTab: React.FC<BuildPlanTabProps> = ({ components, userSummary, prompt }) => {
  const completedCount = components.filter(c => c.status === 'completed' || c.status === 'reused').length
  const failedCount = components.filter(c => c.status === 'error').length

  return (
    <div className="no-scrollbar gba:h-full gba:overflow-y-auto gba:p-4 gba:space-y-5">
      {/* Header */}
      <div className="gba:space-y-0.5">
        <h2 className="gba:text-sm gba:font-semibold gba:text-foreground">Build Plan</h2>
        <p className="gba:text-xs gba:text-muted-foreground">What you approved before the build started</p>
      </div>

      {/* Original prompt */}
      {prompt && (
        <div className="gba:rounded-lg gba:border gba:border-border gba:bg-muted/40 gba:px-3 gba:py-2.5">
          <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1">Your request</p>
          <p className="gba:text-sm gba:text-foreground gba:leading-relaxed">{prompt}</p>
        </div>
      )}

      {/* User summary */}
      {userSummary && (
        <div className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div className="gba:space-y-1.5">
              <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Features & Capabilities</h3>
              <ul className="gba:space-y-1">
                {userSummary.whatYouGet.map(item => (
                  <li
                    key={`get-${item.slice(0, 30)}`}
                    className="gba:flex gba:gap-2 gba:text-sm gba:text-foreground gba:leading-relaxed"
                  >
                    <span className="gba:text-muted-foreground gba:mt-0.5">•</span>
                    <span className="gba:flex-1">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="gba:space-y-1.5">
              <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Your App Can</h3>
              <ul className="gba:space-y-1">
                {userSummary.whatYouCanDo.map(item => (
                  <li
                    key={`do-${item.slice(0, 30)}`}
                    className="gba:flex gba:gap-2 gba:text-sm gba:text-foreground gba:leading-relaxed"
                  >
                    <span className="gba:text-muted-foreground gba:mt-0.5">•</span>
                    <span className="gba:flex-1">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="gba:space-y-1.5">
            <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Business Impact</h3>
            <p className="gba:text-sm gba:text-foreground gba:leading-relaxed">{userSummary.businessValue}</p>
          </div>
        </div>
      )}

      {/* Components with build outcomes */}
      <div className="gba:space-y-2.5">
        <div className="gba:flex gba:items-center gba:justify-between">
          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">
            Components ({components.length} {components.length === 1 ? 'item' : 'items'})
          </h3>
          <div className="gba:flex gba:items-center gba:gap-3">
            {completedCount > 0 && (
              <span className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-success gba:font-medium">
                <CheckCircle2 className="gba:w-3.5 gba:h-3.5" />
                {completedCount} built
              </span>
            )}
            {failedCount > 0 && (
              <span className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-destructive gba:font-medium">
                <XCircle className="gba:w-3.5 gba:h-3.5" />
                {failedCount} failed
              </span>
            )}
          </div>
        </div>
        <div className="gba:space-y-1.5">
          {components.map(comp => (
            <ComponentBuildItem key={comp.id} component={comp} />
          ))}
        </div>
      </div>
    </div>
  )
}
