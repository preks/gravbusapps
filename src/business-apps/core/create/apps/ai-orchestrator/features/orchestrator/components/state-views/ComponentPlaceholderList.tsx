/**
 * ComponentPlaceholderList - Simple list of built components for non-screen tabs.
 * Shows component name, status, and description. Placeholder for future detail views.
 */

import React from 'react'
import { Card, CardContent, Badge } from '@newwork/nw-design-system'
import { CheckCircle2, Recycle, XCircle, SkipForward, Package } from 'lucide-react'
import type { ComponentSpec } from '../../types'

interface ComponentPlaceholderListProps {
  components: ComponentSpec[]
  typeLabel: string
  emptyMessage: string
  testId?: string
}

const STATUS_CONFIG: Record<string, { icon: React.ElementType; label: string; className: string }> = {
  completed: { icon: CheckCircle2, label: 'Created', className: 'gba:text-success' },
  reused: { icon: Recycle, label: 'Reused', className: 'gba:text-info' },
  error: { icon: XCircle, label: 'Failed', className: 'gba:text-destructive' },
  skipped: { icon: SkipForward, label: 'Skipped', className: 'gba:text-muted-foreground' }
}

export const ComponentPlaceholderList: React.FC<ComponentPlaceholderListProps> = ({
  components,
  typeLabel,
  emptyMessage,
  testId = 'component-placeholder-list'
}) => {
  if (components.length === 0) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:text-center gba:space-y-3 gba:px-8"
        data-testid={testId}
      >
        <Package className="gba:w-10 gba:h-10 gba:text-muted-foreground/40" />
        <p className="gba:text-sm gba:text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="gba:p-6 gba:space-y-3 gba:max-w-3xl gba:mx-auto" data-testid={testId}>
      <h3 className="gba:text-sm gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider">
        {typeLabel}s ({components.length})
      </h3>
      {components.map(component => {
        const statusInfo = STATUS_CONFIG[component.status] || STATUS_CONFIG.completed
        const StatusIcon = statusInfo.icon
        return (
          <Card key={component.id} className="gba:border-border/60">
            <CardContent className="gba:p-3">
              <div className="gba:flex gba:items-start gba:gap-3">
                <div className="gba:flex-1 gba:min-w-0">
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                    <h4 className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{component.name}</h4>
                    <Badge variant="secondary" className="gba:text-[10px] gba:shrink-0">
                      <StatusIcon className={`gba:w-3 gba:h-3 gba:mr-1 ${statusInfo.className}`} />
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <p className="gba:text-xs gba:text-muted-foreground gba:line-clamp-2">
                    {component.userFriendlyDescription || component.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
