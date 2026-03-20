/**
 * PreviewHeaderCard - Unified header card for orchestrator canvas previews.
 * Used by Data Model, Function, Task Expert (Agent), and Flow previews for consistent
 * icon + title + optional description + optional badges/actions.
 */

import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import type { LucideIcon } from 'lucide-react'

export interface PreviewHeaderCardProps {
  icon: LucideIcon
  title: string
  description?: string
  /** Rendered after title, before description (e.g. type badge). */
  titleSuffix?: React.ReactNode
  /** Optional row of badges below the title row. */
  badges?: React.ReactNode
  /** Optional action on the right (e.g. button). */
  action?: React.ReactNode
  'data-testid'?: string
}

export const PreviewHeaderCard: React.FC<PreviewHeaderCardProps> = ({
  icon: Icon,
  title,
  description,
  titleSuffix,
  badges,
  action,
  'data-testid': testId = 'preview-header-card'
}) => {
  return (
    <Card className="gba:shrink-0 gba:border-border gba:min-h-[75px]" data-testid={testId}>
      <CardContent className="gba:px-3 gba:py-1.5 gba:min-h-[75px]">
        <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
          <div className="gba:p-1.5 gba:rounded-lg gba:bg-primary/10 gba:shrink-0">
            <Icon className="gba:h-5 gba:w-5 gba:text-primary" />
          </div>
          <div className="gba:flex-1 gba:min-w-0 gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
            <span className="gba:text-sm gba:font-semibold gba:text-foreground gba:shrink-0">{title}</span>
            {titleSuffix}
            {description != null && description !== '' && (
              <>
                <span className="gba:text-muted-foreground gba:shrink-0" aria-hidden>
                  ·
                </span>
                <span className="gba:text-sm gba:text-muted-foreground gba:truncate gba:min-w-0">{description}</span>
              </>
            )}
          </div>
          {action == null ? null : <div className="gba:shrink-0">{action}</div>}
        </div>
        {badges == null ? null : (
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1.5 gba:mt-1.5 gba:pl-7">{badges}</div>
        )}
      </CardContent>
    </Card>
  )
}
